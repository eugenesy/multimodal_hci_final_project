// ==UserScript==
// @name         TikTok Face Gaze Controls
// @namespace    http://tampermonkey.net/
// @version      0.3.13
// @description  Face-first TikTok controls with dwell nav, jaw comments toggle, smile-heart, right-side unheart/mute dwell controls, and multi-point dot calibration.
// @author       Eugene
// @match        https://www.tiktok.com/*
// @run-at       document-idle
// @grant        unsafeWindow
// @grant        GM_addStyle
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==

(function () {
    "use strict";

    if (window.__tfgFaceGazeLoaded) {
        return;
    }
    window.__tfgFaceGazeLoaded = true;
    console.info("[TFG] userscript injected", location.href);

    const CONFIG = Object.freeze({
        wsUrl: "ws://127.0.0.1:8765",
        staleTrackingMs: 1500,
        minConfidence: 0.45,
        confidenceRecoverThreshold: 0.52,
        gazeSmoothingAlpha: 0.34,
        videoRectRefreshMs: 160,
        snapRadiusPx: 230,
        snapStrength: 0.56,
        dwellMs: 860,
        dwellCooldownMs: 880,
        smileActionCooldownMs: 1000,
        jawModeThreshold: 0.2,
        jawModeHoldMs: 900,
        jawModeCooldownMs: 1400,
        eyesClosedTriggerThreshold: 0.62,
        eyesClosedRecalibrationHoldMs: 1000,
        commentsEnforceRetryMs: 460,
        browClutchThreshold: 0.5,
        lowConfidenceFreezeMs: 2000,
        recoveryHoldMs: 900,
        commentsScrollFraction: 0.72,
        commentsNavGapPx: 24,
        recenterBiasClamp: 0.35,
        onboardingMs: 9000,
        onboardingStorageKey: "tfg_onboarding_seen_v2",
        calibrationStorageKey: "tfg_calibration_bias_v1",
        calibrationPauseRefreshMs: 650,
        toastMs: 1200,
        navInsetPx: 12,
        navWidthRatio: 0.28,
        navMinWidthPx: 130,
        navMaxWidthPx: 220,
        navMinHeightPx: 240,
        viewportMarginPx: 8
    });

    const state = {
        connected: false,
        wsError: "",
        wsErrorNotified: false,
        tracking: null,
        lastTrackingAt: 0,
        lastUrl: location.href,
        smoothX: window.innerWidth * 0.5,
        smoothY: window.innerHeight * 0.5,
        activeTargetKey: null,
        activeTargetStartedAt: 0,
        cooldownUntilByTarget: {
            previous: 0,
            next: 0,
            commentsUp: 0,
            commentsDown: 0,
            unheart: 0,
            muteToggle: 0
        },
        smileCooldownUntil: 0,
        lastActionLabel: "none",
        lastSmileScore: 0,
        lastBrowScore: 0,
        lastJawScore: 0,
        mode: "feed",
        jawHoldStartedAt: 0,
        jawHoldLatched: false,
        modeToggleCooldownUntil: 0,
        commentsEnforceCooldownUntil: 0,
        clutchActive: false,
        confidenceLocked: false,
        lowConfidenceSince: 0,
        recoverySince: 0,
        gazeBiasX: 0,
        gazeBiasY: 0,
        onboardingVisible: false,
        toolsOpen: false,
        calibrationActive: false,
        calibrationStepIndex: 0,
        calibrationOffsets: [],
        lastCalibrationPauseAt: 0,
        eyesClosedSince: 0,
        eyesClosedTriggered: false,
        cachedVideoRect: null,
        cachedVideoRectAt: 0,
        targetRects: {
            previous: null,
            next: null,
            commentsUp: null,
            commentsDown: null,
            unheart: null,
            muteToggle: null
        },
        onboardingTimer: 0
    };

    const CALIBRATION_STEPS = Object.freeze([
        { key: "topLeft", point: { x: 0.18, y: 0.18 }, prompt: "Step 1/7: look at the red dot (top-left), then press Space." },
        { key: "topRight", point: { x: 0.82, y: 0.18 }, prompt: "Step 2/7: look at the red dot (top-right), then press Space." },
        { key: "center", point: { x: 0.5, y: 0.5 }, prompt: "Step 3/7: look at the red dot (center), then press Space." },
        { key: "left", point: { x: 0.18, y: 0.5 }, prompt: "Step 4/7: look at the red dot (left), then press Space." },
        { key: "right", point: { x: 0.82, y: 0.5 }, prompt: "Step 5/7: look at the red dot (right), then press Space." },
        { key: "bottomLeft", point: { x: 0.18, y: 0.82 }, prompt: "Step 6/7: look at the red dot (bottom-left), then press Space." },
        { key: "bottomRight", point: { x: 0.82, y: 0.82 }, prompt: "Step 7/7: look at the red dot (bottom-right), then press Space." }
    ]);

    function nowMs() {
        return Date.now();
    }

    function clamp(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function isTikTokPage() {
        return location.hostname.includes("tiktok.com");
    }

    function hasFeedDom() {
        return Boolean(document.querySelector("section[data-e2e='feed-video'], article[data-e2e='recommend-list-item-container']"));
    }

    function isTrackingStale() {
        if (!state.lastTrackingAt) {
            return true;
        }
        return nowMs() - state.lastTrackingAt > CONFIG.staleTrackingMs;
    }

    function isTrackingUsable() {
        const tracking = state.tracking;
        if (!tracking) {
            return false;
        }
        if (isTrackingStale()) {
            return false;
        }
        if (!tracking.faceDetected) {
            return false;
        }
        return Number(tracking.trackingConfidence || 0) >= CONFIG.minConfidence;
    }

    function getViewportPoint(normalized) {
        return {
            x: clamp(Number(normalized?.x ?? 0.5), 0, 1) * window.innerWidth,
            y: clamp(Number(normalized?.y ?? 0.5), 0, 1) * window.innerHeight
        };
    }

    function getBiasedViewportPoint(normalized) {
        return getViewportPoint({
            x: clamp(Number(normalized?.x ?? 0.5) + state.gazeBiasX, 0, 1),
            y: clamp(Number(normalized?.y ?? 0.5) + state.gazeBiasY, 0, 1)
        });
    }

    class TrackerWebSocketClient {
        constructor(url, handlers = {}) {
            this.url = url;
            this.handlers = handlers;
            this.socket = null;
            this.reconnectTimer = null;
            this.isStopped = false;
        }

        start() {
            this.isStopped = false;
            clearTimeout(this.reconnectTimer);
            this._connect();
        }

        stop() {
            this.isStopped = true;
            clearTimeout(this.reconnectTimer);
            if (this.socket) {
                this.socket.close();
            }
        }

        _connect() {
            if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
                return;
            }

            const constructors = [];
            if (typeof WebSocket !== "undefined") {
                constructors.push(WebSocket);
            }
            if (typeof unsafeWindow !== "undefined" && unsafeWindow && typeof unsafeWindow.WebSocket !== "undefined") {
                constructors.push(unsafeWindow.WebSocket);
            }

            let lastError = null;
            for (const WebSocketCtor of constructors) {
                try {
                    this.socket = new WebSocketCtor(this.url);
                    break;
                } catch (error) {
                    lastError = error;
                    this.socket = null;
                }
            }

            if (!this.socket) {
                this.handlers.onError?.(lastError || new Error("No usable WebSocket constructor"));
                this._scheduleReconnect();
                return;
            }

            this.socket.addEventListener("open", () => {
                this.handlers.onOpen?.();
            });

            this.socket.addEventListener("message", (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    this.handlers.onMessage?.(payload);
                } catch (error) {
                    this.handlers.onError?.(error);
                }
            });

            this.socket.addEventListener("close", () => {
                this.socket = null;
                this.handlers.onClose?.();
                this._scheduleReconnect();
            });

            this.socket.addEventListener("error", (error) => {
                this.handlers.onError?.(error);
            });
        }

        _scheduleReconnect() {
            if (this.isStopped) {
                return;
            }
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = window.setTimeout(() => this._connect(), 1400);
        }
    }

    function isNodeVisible(node) {
        if (!(node instanceof HTMLElement)) {
            return false;
        }
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return false;
        }
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
            return false;
        }
        const style = window.getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01;
    }

    function pointInRect(point, rect) {
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    }

    function getVisibleArea(rect) {
        const left = Math.max(0, rect.left);
        const right = Math.min(window.innerWidth, rect.right);
        const top = Math.max(0, rect.top);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        const w = Math.max(0, right - left);
        const h = Math.max(0, bottom - top);
        return w * h;
    }

    function getActiveFeedCard() {
        const cards = Array.from(document.querySelectorAll("article[data-e2e='recommend-list-item-container']"));
        if (!cards.length) {
            return null;
        }

        const viewportCenterY = window.innerHeight * 0.5;
        let best = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        for (const card of cards) {
            const rect = card.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                continue;
            }
            const visibleArea = getVisibleArea(rect);
            if (visibleArea <= 0) {
                continue;
            }
            const centerY = rect.top + rect.height * 0.5;
            const proximity = -Math.abs(centerY - viewportCenterY);
            const score = visibleArea * 0.0002 + proximity;
            if (score > bestScore) {
                best = card;
                bestScore = score;
            }
        }

        return best;
    }

    function getLargestVisibleVideoSection() {
        const sections = Array.from(document.querySelectorAll("section[data-e2e='feed-video']"));
        let best = null;
        let bestArea = 0;
        for (const section of sections) {
            const rect = section.getBoundingClientRect();
            const area = getVisibleArea(rect);
            if (area > bestArea) {
                bestArea = area;
                best = section;
            }
        }
        return best;
    }

    function getActiveVideoRect(force = false) {
        const now = nowMs();
        if (!force && state.cachedVideoRect && now - state.cachedVideoRectAt < CONFIG.videoRectRefreshMs) {
            return state.cachedVideoRect;
        }

        let section = null;
        const card = getActiveFeedCard();
        if (card) {
            section = card.querySelector("section[data-e2e='feed-video']");
        }
        if (!section) {
            section = getLargestVisibleVideoSection();
        }

        if (!section) {
            state.cachedVideoRect = null;
            state.cachedVideoRectAt = now;
            return null;
        }

        const rect = section.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            state.cachedVideoRect = null;
            state.cachedVideoRectAt = now;
            return null;
        }

        const payload = {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
        };

        state.cachedVideoRect = payload;
        state.cachedVideoRectAt = now;
        return payload;
    }

    function getFeedScrollContainer() {
        const card = getActiveFeedCard();
        if (card) {
            let node = card.parentElement;
            while (node && node !== document.body) {
                const style = window.getComputedStyle(node);
                const canScroll = (style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 10;
                if (canScroll) {
                    return node;
                }
                node = node.parentElement;
            }
        }
        return document.scrollingElement || document.documentElement;
    }

    function getFeedNavButtons() {
        const container = document.querySelector("aside [class*='DivFeedNavigationContainer']");
        if (!container) {
            return { previous: null, next: null };
        }
        const buttons = Array.from(container.querySelectorAll("button")).filter((node) => isNodeVisible(node));
        if (!buttons.length) {
            return { previous: null, next: null };
        }
        buttons.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        return {
            previous: buttons[0] || null,
            next: buttons[buttons.length - 1] || null
        };
    }

    function clickButton(node) {
        if (!(node instanceof HTMLElement)) {
            return false;
        }
        if (!isNodeVisible(node)) {
            return false;
        }
        if (node.hasAttribute("disabled")) {
            return false;
        }
        if ((node.getAttribute("aria-disabled") || "").toLowerCase() === "true") {
            return false;
        }
        try {
            node.click();
            return true;
        } catch (error) {
            return false;
        }
    }

    function getLikeButton() {
        const direct = Array.from(document.querySelectorAll("button")).filter((node) => node.querySelector("[data-e2e='like-icon']"));
        const candidates = direct.filter((node) => isNodeVisible(node));
        if (candidates.length) {
            const viewportCenterY = window.innerHeight * 0.5;
            candidates.sort((a, b) => {
                const ay = Math.abs(a.getBoundingClientRect().top + a.getBoundingClientRect().height * 0.5 - viewportCenterY);
                const by = Math.abs(b.getBoundingClientRect().top + b.getBoundingClientRect().height * 0.5 - viewportCenterY);
                return ay - by;
            });
            return candidates[0];
        }

        const fallback = Array.from(document.querySelectorAll("button[aria-label]"));
        for (const node of fallback) {
            const label = String(node.getAttribute("aria-label") || "").toLowerCase();
            if (label.includes("like video") || label.includes("unlike") || label.includes("likes")) {
                if (isNodeVisible(node)) {
                    return node;
                }
            }
        }
        return null;
    }

    function getLikeState(button = getLikeButton()) {
        if (!(button instanceof HTMLElement)) {
            return "unknown";
        }

        const ariaPressed = String(button.getAttribute("aria-pressed") || "").toLowerCase();
        if (ariaPressed === "true") {
            return "liked";
        }
        if (ariaPressed === "false") {
            return "unliked";
        }

        const label = String(button.getAttribute("aria-label") || "").toLowerCase();
        if (label.includes("unlike") || label.includes("liked")) {
            return "liked";
        }
        if (label.includes("like")) {
            return "unliked";
        }

        return "unknown";
    }

    function ensureHeartState(targetLiked) {
        const button = getLikeButton();
        const stateLabel = getLikeState(button);

        if (stateLabel !== "unknown") {
            const isLiked = stateLabel === "liked";
            if (isLiked === targetLiked) {
                return true;
            }
            return clickButton(button);
        }

        if (targetLiked) {
            if (clickButton(button)) {
                return true;
            }
            return dispatchDoubleClickOnActiveVideo();
        }

        return false;
    }

    function getCommentButton() {
        const direct = Array.from(document.querySelectorAll("button")).filter((node) => node.querySelector("[data-e2e='comment-icon']"));
        const candidates = direct.filter((node) => isNodeVisible(node));
        if (candidates.length) {
            const viewportCenterY = window.innerHeight * 0.5;
            candidates.sort((a, b) => {
                const ay = Math.abs(a.getBoundingClientRect().top + a.getBoundingClientRect().height * 0.5 - viewportCenterY);
                const by = Math.abs(b.getBoundingClientRect().top + b.getBoundingClientRect().height * 0.5 - viewportCenterY);
                return ay - by;
            });
            return candidates[0];
        }

        const fallback = Array.from(document.querySelectorAll("button[aria-label]"));
        for (const node of fallback) {
            const label = String(node.getAttribute("aria-label") || "").toLowerCase();
            if ((label.includes("comment") || label.includes("comments")) && isNodeVisible(node)) {
                return node;
            }
        }

        return null;
    }

    function dispatchDoubleClickOnActiveVideo() {
        const section = getLargestVisibleVideoSection();
        if (!section) {
            return false;
        }
        const rect = section.getBoundingClientRect();
        const x = rect.left + rect.width * 0.5;
        const y = rect.top + rect.height * 0.5;
        const event = new MouseEvent("dblclick", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y
        });
        section.dispatchEvent(event);
        return true;
    }

    function getActiveVideoElement() {
        const card = getActiveFeedCard();
        if (card) {
            const video = card.querySelector("section[data-e2e='feed-video'] video");
            if (video instanceof HTMLVideoElement && isNodeVisible(video)) {
                return video;
            }
        }

        const videos = Array.from(document.querySelectorAll("section[data-e2e='feed-video'] video")).filter((node) => isNodeVisible(node));
        if (!videos.length) {
            return null;
        }
        videos.sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            return getVisibleArea(br) - getVisibleArea(ar);
        });
        return videos[0] || null;
    }

    function findScrollableAncestor(node) {
        let current = node;
        while (current && current !== document.body && current !== document.documentElement) {
            if (!(current instanceof HTMLElement)) {
                break;
            }
            const style = window.getComputedStyle(current);
            const canScroll = (style.overflowY === "auto" || style.overflowY === "scroll") && current.scrollHeight > current.clientHeight + 10;
            if (canScroll) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    function getCommentScrollContainer() {
        const selectors = [
            "[data-e2e='comment-list']",
            "[data-e2e='browse-comment-list']",
            "[class*='DivCommentListContainer']",
            "[class*='CommentListContainer']",
            "[class*='comment-list']"
        ];

        for (const selector of selectors) {
            const nodes = Array.from(document.querySelectorAll(selector)).filter((node) => isNodeVisible(node));
            for (const node of nodes) {
                const directScrollable = node.scrollHeight > node.clientHeight + 10 ? node : null;
                const ancestorScrollable = findScrollableAncestor(node);
                const target = directScrollable || ancestorScrollable;
                if (target instanceof HTMLElement) {
                    return target;
                }
            }
        }

        return null;
    }

    function getCommentPanelRect() {
        const scroller = getCommentScrollContainer();
        if (!(scroller instanceof HTMLElement)) {
            return null;
        }

        const rect = scroller.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return null;
        }

        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
        };
    }

    function isCommentsPanelOpen() {
        return Boolean(getCommentScrollContainer());
    }

    function openCommentsPanel() {
        if (isCommentsPanelOpen()) {
            return true;
        }

        const button = getCommentButton();
        return clickButton(button);
    }

    function dispatchEscapeKey() {
        const down = new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
        });
        const up = new KeyboardEvent("keyup", {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(down);
        document.dispatchEvent(up);

        const target = document.activeElement;
        if (target instanceof HTMLElement) {
            target.dispatchEvent(down);
            target.dispatchEvent(up);
        }

        return true;
    }

    function closeCommentsPanel() {
        if (!isCommentsPanelOpen()) {
            return true;
        }

        const directSelectors = [
            "button[data-e2e='browse-close']",
            "button[data-e2e='comment-close']",
            "button[aria-label='Close']",
            "button[aria-label='Close comments']"
        ];

        for (const selector of directSelectors) {
            const button = Array.from(document.querySelectorAll(selector)).find((node) => isNodeVisible(node));
            if (clickButton(button)) {
                return true;
            }
        }

        const ariaCandidates = Array.from(document.querySelectorAll("button[aria-label]")).filter((node) => isNodeVisible(node));
        for (const button of ariaCandidates) {
            const label = String(button.getAttribute("aria-label") || "").toLowerCase();
            if (label.includes("close") || label.includes("dismiss") || label.includes("back")) {
                if (clickButton(button)) {
                    return true;
                }
            }
        }

        const toggleButton = getCommentButton();
        if (clickButton(toggleButton)) {
            return true;
        }

        return dispatchEscapeKey();
    }

    function enforceCommentsPanelFromMode() {
        if (state.calibrationActive) {
            return;
        }

        const now = nowMs();
        if (now < state.commentsEnforceCooldownUntil) {
            return;
        }

        if (state.mode === "comments") {
            if (!isCommentsPanelOpen()) {
                openCommentsPanel();
                state.commentsEnforceCooldownUntil = now + CONFIG.commentsEnforceRetryMs;
            }
            return;
        }

        if (isCommentsPanelOpen()) {
            closeCommentsPanel();
            state.commentsEnforceCooldownUntil = now + CONFIG.commentsEnforceRetryMs;
        }
    }

    function togglePlayPause() {
        const video = getActiveVideoElement();
        if (!(video instanceof HTMLVideoElement)) {
            return false;
        }

        if (video.paused) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(() => {});
            }
            return true;
        }

        video.pause();
        return true;
    }

    function toggleMuteUnmute() {
        const video = getActiveVideoElement();
        if (!(video instanceof HTMLVideoElement)) {
            return false;
        }

        const currentlyMuted = video.muted || video.volume <= 0.001;
        if (currentlyMuted) {
            video.muted = false;
            if (video.volume <= 0.001) {
                video.volume = 0.5;
            }
            return true;
        }

        video.muted = true;
        return true;
    }

    function normalizeForFeedNavigation() {
        if (state.mode !== "comments" && !isCommentsPanelOpen()) {
            return;
        }

        closeCommentsPanel();
        state.mode = "feed";
        state.commentsEnforceCooldownUntil = nowMs() + CONFIG.commentsEnforceRetryMs;
    }

    const actions = {
        previous: () => {
            normalizeForFeedNavigation();
            const scroller = getFeedScrollContainer();
            if (scroller && typeof scroller.scrollBy === "function") {
                scroller.scrollBy({ top: -window.innerHeight * 0.92, behavior: "smooth" });
                return true;
            }
            const nav = getFeedNavButtons();
            return clickButton(nav.previous);
        },
        next: () => {
            normalizeForFeedNavigation();
            const scroller = getFeedScrollContainer();
            if (scroller && typeof scroller.scrollBy === "function") {
                scroller.scrollBy({ top: window.innerHeight * 0.92, behavior: "smooth" });
                return true;
            }
            const nav = getFeedNavButtons();
            return clickButton(nav.next);
        },
        heartOn: () => ensureHeartState(true),
        heartOff: () => ensureHeartState(false),
        unheart: () => ensureHeartState(false),
        muteToggle: () => toggleMuteUnmute(),
        togglePlayPause: () => togglePlayPause(),
        commentsPrevious: () => {
            const scroller = getCommentScrollContainer();
            if (!scroller || typeof scroller.scrollBy !== "function") {
                return false;
            }
            const amount = Math.max(120, scroller.clientHeight * CONFIG.commentsScrollFraction);
            scroller.scrollBy({ top: -amount, behavior: "smooth" });
            return true;
        },
        commentsNext: () => {
            const scroller = getCommentScrollContainer();
            if (!scroller || typeof scroller.scrollBy !== "function") {
                return false;
            }
            const amount = Math.max(120, scroller.clientHeight * CONFIG.commentsScrollFraction);
            scroller.scrollBy({ top: amount, behavior: "smooth" });
            return true;
        },
        openComments: () => openCommentsPanel()
    };

    function getModeLabel() {
        return state.mode === "comments" ? "Comments" : "Feed";
    }

    function getSafetyLabel() {
        if (state.confidenceLocked) {
            return "Paused-low";
        }
        if (state.clutchActive) {
            return "Clutch";
        }
        return "Armed";
    }

    function getQualityLabel(tracking, conf) {
        if (!tracking || isTrackingStale() || !tracking.faceDetected) {
            return "Lost";
        }
        if (state.confidenceLocked) {
            return "Recovering";
        }
        if (conf < CONFIG.minConfidence) {
            return "Low";
        }
        const biasMagnitude = Math.hypot(state.gazeBiasX, state.gazeBiasY);
        if (biasMagnitude > 0.22) {
            return "Bias-high";
        }
        if (state.clutchActive) {
            return "Clutched";
        }
        return "Good";
    }

    function updateModeFromJaw(tracking) {
        const jawScore = clamp(Number(tracking?.gestures?.jawOpenScore || 0), 0, 1);
        state.lastJawScore = jawScore;

        if (!tracking || isTrackingStale() || !tracking.faceDetected) {
            state.jawHoldStartedAt = 0;
            state.jawHoldLatched = false;
            return;
        }

        const now = nowMs();
        if (jawScore >= CONFIG.jawModeThreshold) {
            if (state.jawHoldLatched) {
                return;
            }

            if (!state.jawHoldStartedAt) {
                state.jawHoldStartedAt = now;
            }

            if (now >= state.modeToggleCooldownUntil && (now - state.jawHoldStartedAt) >= CONFIG.jawModeHoldMs) {
                state.modeToggleCooldownUntil = now + CONFIG.jawModeCooldownMs;
                state.jawHoldStartedAt = 0;
                state.jawHoldLatched = true;
                state.activeTargetKey = null;
                setTargetActive(null, 0);
                ui.focus.textContent = "none";

                const commentsOpen = state.mode === "comments" || isCommentsPanelOpen();
                if (commentsOpen) {
                    const closed = closeCommentsPanel();
                    state.mode = "feed";
                    state.commentsEnforceCooldownUntil = now + CONFIG.commentsEnforceRetryMs;
                    showToast(closed ? "Mode: Feed" : "Feed close pending", 900);
                } else {
                    const opened = openCommentsPanel();
                    if (opened || isCommentsPanelOpen()) {
                        state.mode = "comments";
                        state.commentsEnforceCooldownUntil = now + CONFIG.commentsEnforceRetryMs;
                        showToast("Mode: Comments", 900);
                    } else {
                        state.mode = "feed";
                        showToast("Comments button not found", 1100);
                    }
                }
            }
            return;
        }

        state.jawHoldStartedAt = 0;
        state.jawHoldLatched = false;
    }

    function updateEyesClosedRecalibration(tracking) {
        if (state.calibrationActive || !tracking || isTrackingStale() || !tracking.faceDetected) {
            state.eyesClosedSince = 0;
            state.eyesClosedTriggered = false;
            return;
        }

        const leftClosed = clamp(Number(tracking.gestures?.winkLeftScore || 0), 0, 1);
        const rightClosed = clamp(Number(tracking.gestures?.winkRightScore || 0), 0, 1);
        const bothClosed = leftClosed >= CONFIG.eyesClosedTriggerThreshold && rightClosed >= CONFIG.eyesClosedTriggerThreshold;
        const now = nowMs();

        if (bothClosed) {
            if (!state.eyesClosedSince) {
                state.eyesClosedSince = now;
            }

            if (!state.eyesClosedTriggered && (now - state.eyesClosedSince) >= CONFIG.eyesClosedRecalibrationHoldMs) {
                state.eyesClosedTriggered = true;
                startCalibration();
                showToast("Eyes closed: recalibration", 1200);
            }
            return;
        }

        state.eyesClosedSince = 0;
        state.eyesClosedTriggered = false;
    }

    function buildUi() {
        document.querySelector("#tfg-root")?.remove();
        document.querySelector("#tfg-style")?.remove();

        const css = `
        #tfg-root {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 2147483647;
            font-family: "Avenir Next", "Helvetica Neue", sans-serif;
        }

        html.tfg-calibration-mode,
        body.tfg-calibration-mode {
            background: #ffffff !important;
        }

        body.tfg-calibration-mode {
            overflow: hidden !important;
        }

        body.tfg-calibration-mode > :not(#tfg-root) {
            visibility: hidden !important;
        }

        #tfg-beacon {
            position: fixed;
            right: 12px;
            top: 12px;
            z-index: 2147483647;
            background: rgba(0, 0, 0, 0.74);
            color: #8fffd7;
            border: 1px solid rgba(143, 255, 215, 0.55);
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            pointer-events: none;
        }

        #tfg-cursor {
            position: fixed;
            width: 24px;
            height: 24px;
            border-radius: 999px;
            border: 2px solid rgba(246, 252, 255, 0.95);
            background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.06));
            box-shadow: 0 0 20px rgba(147, 215, 255, 0.58);
            transform: translate(-50%, -50%);
            transition: opacity 120ms linear, width 90ms linear, height 90ms linear, box-shadow 90ms linear;
            opacity: 0;
        }

        #tfg-cursor.magnetized {
            box-shadow: 0 0 26px rgba(133, 233, 255, 0.74);
        }

        #tfg-ring {
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            --progress: 0;
            background: conic-gradient(
                rgba(128, 222, 255, 0.95) calc(var(--progress) * 1turn),
                rgba(128, 222, 255, 0.12) 0
            );
            -webkit-mask: radial-gradient(circle, transparent 58%, black 60%);
            mask: radial-gradient(circle, transparent 58%, black 60%);
        }

        .tfg-target {
            position: fixed;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(7, 12, 28, 0.82);
            border: 2px solid rgba(130, 191, 255, 0.52);
            color: #eef6ff;
            font-size: 42px;
            font-weight: 800;
            line-height: 1;
            overflow: hidden;
            opacity: 0.97;
        }

        .tfg-target::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: calc(var(--progress, 0) * 100%);
            background: linear-gradient(0deg, rgba(88, 192, 255, 0.34), rgba(129, 250, 214, 0.2));
            transition: height 90ms linear;
        }

        .tfg-target > span {
            position: relative;
            text-shadow: 0 0 14px rgba(114, 215, 255, 0.62);
        }

        #tfg-target-prev {
            border-radius: 24px 24px 0 0;
            border-bottom-width: 1px;
        }

        #tfg-target-next {
            border-radius: 0 0 24px 24px;
            border-top-width: 1px;
        }

        #tfg-target-comments-up,
        #tfg-target-comments-down {
            font-size: 32px;
            opacity: 0;
        }

        #tfg-target-unheart,
        #tfg-target-mute {
            font-size: 13px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            opacity: 0;
        }

        #tfg-target-comments-up {
            border-radius: 22px 22px 0 0;
            border-bottom-width: 1px;
        }

        #tfg-target-comments-down {
            border-radius: 0 0 22px 22px;
            border-top-width: 1px;
        }

        #tfg-target-unheart,
        #tfg-target-mute {
            border-radius: 14px;
        }

        .tfg-target.active {
            border-color: rgba(169, 245, 255, 0.96);
            box-shadow: 0 0 24px rgba(111, 216, 255, 0.45);
        }

        #tfg-hud {
            position: fixed;
            left: 16px;
            top: 16px;
            min-width: 228px;
            padding: 12px 13px;
            border-radius: 12px;
            background: rgba(8, 12, 24, 0.74);
            border: 1px solid rgba(170, 198, 255, 0.32);
            color: #edf4ff;
            backdrop-filter: blur(6px);
        }

        .tfg-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #9fcbff;
            margin-bottom: 8px;
        }

        .tfg-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;
            margin: 3px 0;
        }

        .tfg-row > span {
            opacity: 0.82;
        }

        #tfg-tools-btn {
            position: fixed;
            right: 12px;
            top: 42px;
            z-index: 2147483647;
            padding: 6px 10px;
            border-radius: 999px;
            border: 1px solid rgba(140, 215, 255, 0.58);
            background: rgba(9, 16, 33, 0.86);
            color: #e7f4ff;
            font-size: 11px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            pointer-events: auto;
            cursor: pointer;
        }

        #tfg-tools-panel {
            position: fixed;
            right: 12px;
            top: 78px;
            width: min(330px, calc(100vw - 24px));
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(158, 213, 255, 0.42);
            background: rgba(7, 12, 27, 0.92);
            color: #ebf5ff;
            pointer-events: auto;
            display: none;
        }

        #tfg-tools-panel.visible {
            display: block;
        }

        #tfg-tools-panel h4 {
            margin: 0 0 6px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #9fd1ff;
        }

        #tfg-bias-readout {
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 8px;
        }

        .tfg-tool-actions {
            display: grid;
            gap: 7px;
        }

        .tfg-tool-actions button {
            border: 1px solid rgba(146, 209, 255, 0.45);
            background: rgba(15, 27, 53, 0.9);
            color: #ecf7ff;
            border-radius: 9px;
            padding: 8px 10px;
            font-size: 12px;
            text-align: left;
            cursor: pointer;
        }

        #tfg-onboarding {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: min(460px, calc(100vw - 28px));
            border-radius: 16px;
            padding: 16px 18px;
            background: rgba(6, 10, 23, 0.92);
            border: 1px solid rgba(163, 204, 255, 0.45);
            color: #f0f7ff;
            opacity: 0;
            transition: opacity 220ms linear;
            pointer-events: none;
        }

        #tfg-onboarding.visible {
            opacity: 1;
            pointer-events: auto;
        }

        #tfg-onboarding h3 {
            margin: 0 0 8px;
            font-size: 14px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #9bd2ff;
        }

        #tfg-onboarding p {
            margin: 6px 0;
            font-size: 13px;
            line-height: 1.35;
        }

        #tfg-calibration {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: min(420px, calc(100vw - 24px));
            padding: 16px 18px;
            border-radius: 14px;
            border: 1px solid rgba(170, 225, 255, 0.54);
            background: rgba(5, 11, 25, 0.94);
            color: #eef6ff;
            opacity: 0;
            pointer-events: none;
            transition: opacity 180ms linear;
        }

        #tfg-calibration.visible {
            opacity: 1;
            pointer-events: auto;
        }

        #tfg-calibration h4 {
            margin: 0 0 7px;
            font-size: 13px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #9ed9ff;
        }

        #tfg-calibration p {
            margin: 6px 0;
            font-size: 13px;
            line-height: 1.35;
        }

        #tfg-calibration-dot {
            position: fixed;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid rgba(255, 228, 228, 0.95);
            background: rgba(255, 64, 64, 0.95);
            box-shadow: 0 0 18px rgba(255, 56, 56, 0.8);
            transform: translate(-50%, -50%);
            pointer-events: none;
            opacity: 0;
            transition: opacity 120ms linear;
        }

        #tfg-calibration-dot.visible {
            opacity: 1;
        }

        #tfg-toast {
            position: fixed;
            left: 50%;
            bottom: 26px;
            transform: translateX(-50%);
            padding: 10px 15px;
            border-radius: 999px;
            background: rgba(7, 11, 24, 0.88);
            border: 1px solid rgba(181, 204, 255, 0.5);
            color: #eff6ff;
            font-size: 12px;
            opacity: 0;
            transition: opacity 170ms linear;
        }

        #tfg-toast.visible {
            opacity: 1;
        }

        #tfg-root.calibrating #tfg-beacon,
        #tfg-root.calibrating #tfg-cursor,
        #tfg-root.calibrating #tfg-target-prev,
        #tfg-root.calibrating #tfg-target-next,
        #tfg-root.calibrating #tfg-target-comments-up,
        #tfg-root.calibrating #tfg-target-comments-down,
        #tfg-root.calibrating #tfg-target-unheart,
        #tfg-root.calibrating #tfg-target-mute,
        #tfg-root.calibrating #tfg-hud,
        #tfg-root.calibrating #tfg-onboarding,
        #tfg-root.calibrating #tfg-tools-btn,
        #tfg-root.calibrating #tfg-tools-panel,
        #tfg-root.calibrating #tfg-toast {
            display: none !important;
        }

        #tfg-root.calibrating #tfg-calibration {
            background: rgba(255, 255, 255, 0.97);
            color: #111;
            border-color: rgba(10, 10, 10, 0.22);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        #tfg-root.calibrating #tfg-calibration h4 {
            color: #111;
        }

        [class*='DivSideNavContainer'] {
            display: none !important;
        }

        aside [class*='DivFeedNavigationContainer'] {
            display: none !important;
        }

        section[data-e2e='feed-video'] {
            max-height: calc(100vh - 220px) !important;
            margin-top: 90px !important;
            margin-bottom: 90px !important;
        }

        section[data-e2e='feed-video'] video {
            max-height: calc(100vh - 220px) !important;
        }
        `;

        if (typeof GM_addStyle === "function") {
            GM_addStyle(css);
        } else {
            const style = document.createElement("style");
            style.id = "tfg-style";
            style.textContent = css;
            document.head.appendChild(style);
        }

        const root = document.createElement("div");
        root.id = "tfg-root";
        root.innerHTML = `
        <div id="tfg-beacon">TFG on</div>
        <div id="tfg-cursor"><div id="tfg-ring"></div></div>
        <div id="tfg-target-prev" class="tfg-target"><span>^</span></div>
        <div id="tfg-target-next" class="tfg-target"><span>v</span></div>
        <div id="tfg-target-comments-up" class="tfg-target"><span>^</span></div>
        <div id="tfg-target-comments-down" class="tfg-target"><span>v</span></div>
        <div id="tfg-target-unheart" class="tfg-target"><span>UNHEART</span></div>
        <div id="tfg-target-mute" class="tfg-target"><span>MUTE</span></div>
        <button id="tfg-tools-btn" type="button">Tools</button>
        <div id="tfg-tools-panel">
            <h4>Calibration</h4>
            <div id="tfg-bias-readout">Bias: x=0.000 y=0.000</div>
            <div class="tfg-tool-actions">
                <button id="tfg-tool-calibrate" type="button">Start gaze calibration</button>
                <button id="tfg-tool-onboarding" type="button">Show onboarding</button>
                <button id="tfg-tool-reset" type="button">Reset saved bias</button>
                <button id="tfg-tool-close" type="button">Close panel</button>
            </div>
        </div>
        <div id="tfg-hud">
            <div class="tfg-title">TikTok Face Control</div>
            <div class="tfg-row"><span>WebSocket</span><strong id="tfg-ws">Disconnected</strong></div>
            <div class="tfg-row"><span>Tracking</span><strong id="tfg-track">Lost</strong></div>
            <div class="tfg-row"><span>Confidence</span><strong id="tfg-conf">0.00</strong></div>
            <div class="tfg-row"><span>Smile teeth</span><strong id="tfg-smile">0.00</strong></div>
            <div class="tfg-row"><span>Jaw open</span><strong id="tfg-jaw">0.00</strong></div>
            <div class="tfg-row"><span>Brow raise</span><strong id="tfg-brow">0.00</strong></div>
            <div class="tfg-row"><span>Mode</span><strong id="tfg-mode">Feed</strong></div>
            <div class="tfg-row"><span>Safety</span><strong id="tfg-safety">Armed</strong></div>
            <div class="tfg-row"><span>Quality</span><strong id="tfg-quality">Good</strong></div>
            <div class="tfg-row"><span>Focus</span><strong id="tfg-focus">none</strong></div>
            <div class="tfg-row"><span>Action</span><strong id="tfg-action">none</strong></div>
        </div>
        <div id="tfg-onboarding">
            <h3>Face Controls Ready</h3>
            <p>Dwell upper rail: previous video. Dwell lower rail: next video.</p>
            <p>When comments are open, use comment-up and comment-down pads.</p>
            <p>Smile with teeth: heart. Right-side UNHEART appears only when liked.</p>
            <p>Right-side MUTE/UNMUTE pad toggles audio with dwell.</p>
            <p>Hold jaw open: open or close comments mode.</p>
            <p>Close both eyes for 1 second: restart calibration.</p>
            <p>Press Space (or click this panel) to dismiss.</p>
        </div>
        <div id="tfg-calibration">
            <h4>Gaze Calibration</h4>
            <p id="tfg-calibration-step">Look at the highlighted target and press Space.</p>
            <p>Press Esc to cancel.</p>
        </div>
        <div id="tfg-calibration-dot"></div>
        <div id="tfg-toast"></div>
        `;

        (document.body || document.documentElement).appendChild(root);

        return {
            root,
            cursor: root.querySelector("#tfg-cursor"),
            ring: root.querySelector("#tfg-ring"),
            targetPrev: root.querySelector("#tfg-target-prev"),
            targetNext: root.querySelector("#tfg-target-next"),
            targetCommentsUp: root.querySelector("#tfg-target-comments-up"),
            targetCommentsDown: root.querySelector("#tfg-target-comments-down"),
            targetUnheart: root.querySelector("#tfg-target-unheart"),
            targetMute: root.querySelector("#tfg-target-mute"),
            ws: root.querySelector("#tfg-ws"),
            track: root.querySelector("#tfg-track"),
            conf: root.querySelector("#tfg-conf"),
            smile: root.querySelector("#tfg-smile"),
            jaw: root.querySelector("#tfg-jaw"),
            brow: root.querySelector("#tfg-brow"),
            mode: root.querySelector("#tfg-mode"),
            safety: root.querySelector("#tfg-safety"),
            quality: root.querySelector("#tfg-quality"),
            focus: root.querySelector("#tfg-focus"),
            action: root.querySelector("#tfg-action"),
            toolsBtn: root.querySelector("#tfg-tools-btn"),
            toolsPanel: root.querySelector("#tfg-tools-panel"),
            biasReadout: root.querySelector("#tfg-bias-readout"),
            toolCalibrate: root.querySelector("#tfg-tool-calibrate"),
            toolOnboarding: root.querySelector("#tfg-tool-onboarding"),
            toolReset: root.querySelector("#tfg-tool-reset"),
            toolClose: root.querySelector("#tfg-tool-close"),
            onboarding: root.querySelector("#tfg-onboarding"),
            calibration: root.querySelector("#tfg-calibration"),
            calibrationStep: root.querySelector("#tfg-calibration-step"),
            calibrationDot: root.querySelector("#tfg-calibration-dot"),
            toast: root.querySelector("#tfg-toast")
        };
    }

    const ui = buildUi();

    function ensureUiMounted() {
        const host = document.body || document.documentElement;
        if (!host.contains(ui.root)) {
            host.appendChild(ui.root);
        }
    }

    function showToast(message, durationMs = CONFIG.toastMs) {
        ui.toast.textContent = message;
        ui.toast.classList.add("visible");
        clearTimeout(showToast._timer);
        showToast._timer = window.setTimeout(() => {
            ui.toast.classList.remove("visible");
        }, durationMs);
    }

    function getCurrentCalibrationStep() {
        return CALIBRATION_STEPS[state.calibrationStepIndex] || null;
    }

    function setToolsPanelVisible(visible) {
        state.toolsOpen = Boolean(visible);
        ui.toolsPanel.classList.toggle("visible", state.toolsOpen);
    }

    function updateBiasReadout() {
        ui.biasReadout.textContent = `Bias: x=${state.gazeBiasX.toFixed(3)} y=${state.gazeBiasY.toFixed(3)}`;
    }

    function persistCalibrationBias() {
        try {
            localStorage.setItem(CONFIG.calibrationStorageKey, JSON.stringify({
                x: state.gazeBiasX,
                y: state.gazeBiasY,
                savedAt: nowMs()
            }));
        } catch (error) {
            // Ignore storage write failures (privacy mode or blocked storage).
        }
    }

    function loadCalibrationBias() {
        try {
            const raw = localStorage.getItem(CONFIG.calibrationStorageKey);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            const x = Number(parsed?.x);
            const y = Number(parsed?.y);
            if (Number.isFinite(x) && Number.isFinite(y)) {
                state.gazeBiasX = clamp(x, -CONFIG.recenterBiasClamp, CONFIG.recenterBiasClamp);
                state.gazeBiasY = clamp(y, -CONFIG.recenterBiasClamp, CONFIG.recenterBiasClamp);
            }
        } catch (error) {
            // Ignore invalid calibration payloads.
        }
    }

    function markOnboardingSeen() {
        try {
            localStorage.setItem(CONFIG.onboardingStorageKey, "1");
        } catch (error) {
            // Ignore storage write failures.
        }
    }

    function hasSeenOnboarding() {
        try {
            return localStorage.getItem(CONFIG.onboardingStorageKey) === "1";
        } catch (error) {
            return false;
        }
    }

    function hideOnboarding(markSeen = false) {
        state.onboardingVisible = false;
        clearTimeout(state.onboardingTimer);
        ui.onboarding.classList.remove("visible");
        if (markSeen) {
            markOnboardingSeen();
        }
    }

    function showOnboarding(force = false) {
        if (!force && hasSeenOnboarding()) {
            return;
        }
        state.onboardingVisible = true;
        ui.onboarding.classList.add("visible");
        clearTimeout(state.onboardingTimer);
        state.onboardingTimer = window.setTimeout(() => {
            hideOnboarding(true);
        }, CONFIG.onboardingMs);
    }

    function getNormalizedPointFromRectCenter(rect) {
        return {
            x: clamp((rect.left + rect.width * 0.5) / window.innerWidth, 0, 1),
            y: clamp((rect.top + rect.height * 0.5) / window.innerHeight, 0, 1)
        };
    }

    function getCalibrationTargetNormalized(step) {
        const point = step?.point || { x: 0.5, y: 0.5 };
        return {
            x: clamp(Number(point.x ?? 0.5), 0, 1),
            y: clamp(Number(point.y ?? 0.5), 0, 1)
        };
    }

    function updateCalibrationTargetVisuals() {
        const step = getCurrentCalibrationStep();
        if (!state.calibrationActive || !step) {
            ui.calibrationDot.classList.remove("visible");
            return;
        }

        const target = getCalibrationTargetNormalized(step);
        const x = target.x * window.innerWidth;
        const y = target.y * window.innerHeight;
        ui.calibrationDot.style.left = `${x}px`;
        ui.calibrationDot.style.top = `${y}px`;
        ui.calibrationDot.classList.add("visible");
    }

    function updateCalibrationPrompt() {
        const step = getCurrentCalibrationStep();
        if (!state.calibrationActive || !step) {
            ui.calibration.classList.remove("visible");
            return;
        }

        ui.calibration.classList.add("visible");
        ui.calibrationStep.textContent = step.prompt;
        updateCalibrationTargetVisuals();
    }

    function pauseAllVideosForCalibration() {
        const videos = Array.from(document.querySelectorAll("video"));
        for (const video of videos) {
            if (!(video instanceof HTMLVideoElement)) {
                continue;
            }
            if (!video.paused) {
                try {
                    video.pause();
                } catch (error) {
                    // Ignore playback pause failures.
                }
            }
        }
    }

    function setCalibrationPresentation(active) {
        const enabled = Boolean(active);
        ui.root.classList.toggle("calibrating", enabled);
        document.documentElement?.classList.toggle("tfg-calibration-mode", enabled);
        document.body?.classList.toggle("tfg-calibration-mode", enabled);

        if (enabled) {
            pauseAllVideosForCalibration();
            state.lastCalibrationPauseAt = nowMs();
        }
    }

    function enforceCalibrationPlaybackPause() {
        if (!state.calibrationActive) {
            return;
        }

        const now = nowMs();
        if ((now - state.lastCalibrationPauseAt) < CONFIG.calibrationPauseRefreshMs) {
            return;
        }

        pauseAllVideosForCalibration();
        state.lastCalibrationPauseAt = now;
    }

    function stopCalibration() {
        state.calibrationActive = false;
        state.calibrationStepIndex = 0;
        state.calibrationOffsets = [];
        state.lastCalibrationPauseAt = 0;
        setCalibrationPresentation(false);
        ui.calibration.classList.remove("visible");
        ui.calibrationDot.classList.remove("visible");
        setTargetActive(null, 0);
    }

    function finishCalibration() {
        if (!state.calibrationOffsets.length) {
            stopCalibration();
            showToast("Calibration cancelled", 900);
            return;
        }

        const sum = state.calibrationOffsets.reduce(
            (acc, item) => {
                acc.x += item.x;
                acc.y += item.y;
                return acc;
            },
            { x: 0, y: 0 }
        );

        const avgX = sum.x / state.calibrationOffsets.length;
        const avgY = sum.y / state.calibrationOffsets.length;
        state.gazeBiasX = clamp(avgX, -CONFIG.recenterBiasClamp, CONFIG.recenterBiasClamp);
        state.gazeBiasY = clamp(avgY, -CONFIG.recenterBiasClamp, CONFIG.recenterBiasClamp);
        state.smoothX = window.innerWidth * 0.5;
        state.smoothY = window.innerHeight * 0.5;
        persistCalibrationBias();
        updateBiasReadout();
        stopCalibration();
        showToast(`Calibration saved x=${state.gazeBiasX.toFixed(3)} y=${state.gazeBiasY.toFixed(3)}`, 1500);
    }

    function captureCalibrationSample() {
        const step = getCurrentCalibrationStep();
        if (!state.calibrationActive || !step) {
            return;
        }

        const tracking = state.tracking;
        if (!tracking || isTrackingStale() || !tracking.faceDetected) {
            showToast("Calibration paused: face not tracked", 1100);
            return;
        }

        const confidence = Number(tracking.trackingConfidence || 0);
        if (confidence < CONFIG.minConfidence) {
            showToast("Calibration paused: low confidence", 1100);
            return;
        }

        const target = getCalibrationTargetNormalized(step);
        const rawX = clamp(Number(tracking.gaze?.x ?? 0.5), 0, 1);
        const rawY = clamp(Number(tracking.gaze?.y ?? 0.5), 0, 1);
        state.calibrationOffsets.push({
            x: target.x - rawX,
            y: target.y - rawY
        });

        state.calibrationStepIndex += 1;
        if (state.calibrationStepIndex >= CALIBRATION_STEPS.length) {
            finishCalibration();
            return;
        }

        updateCalibrationPrompt();
        showToast("Sample saved", 700);
    }

    function startCalibration(silent = false) {
        state.calibrationOffsets = [];
        state.calibrationStepIndex = 0;
        state.calibrationActive = true;
        setCalibrationPresentation(true);
        setToolsPanelVisible(false);
        updateCalibrationPrompt();
        if (!silent) {
            showToast("Calibration started", 900);
        }
    }

    function resetCalibrationBias() {
        state.gazeBiasX = 0;
        state.gazeBiasY = 0;
        state.smoothX = window.innerWidth * 0.5;
        state.smoothY = window.innerHeight * 0.5;
        persistCalibrationBias();
        updateBiasReadout();
    }

    function isTypingTarget(node) {
        if (!(node instanceof HTMLElement)) {
            return false;
        }
        if (node.isContentEditable) {
            return true;
        }
        const tag = node.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function handleGlobalKeydown(event) {
        if (event.repeat) {
            return;
        }
        if (isTypingTarget(event.target)) {
            return;
        }

        if (event.code === "Escape") {
            if (state.calibrationActive) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === "function") {
                    event.stopImmediatePropagation();
                }
                stopCalibration();
                showToast("Calibration cancelled", 900);
                return;
            }
            if (state.toolsOpen) {
                setToolsPanelVisible(false);
                return;
            }
            if (state.onboardingVisible) {
                hideOnboarding(true);
                return;
            }
        }

        if (event.code === "Space") {
            if (state.calibrationActive) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === "function") {
                    event.stopImmediatePropagation();
                }
                captureCalibrationSample();
                return;
            }
            if (state.onboardingVisible) {
                event.preventDefault();
                hideOnboarding(true);
            }
        }
    }

    function handleGlobalKeyup(event) {
        if (!state.calibrationActive) {
            return;
        }
        if (isTypingTarget(event.target)) {
            return;
        }

        if (event.code === "Space" || event.code === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") {
                event.stopImmediatePropagation();
            }
        }
    }

    function bindUiEvents() {
        ui.toolsBtn.addEventListener("click", () => {
            setToolsPanelVisible(!state.toolsOpen);
        });

        ui.toolClose.addEventListener("click", () => {
            setToolsPanelVisible(false);
        });

        ui.toolCalibrate.addEventListener("click", () => {
            startCalibration();
        });

        ui.toolOnboarding.addEventListener("click", () => {
            showOnboarding(true);
            setToolsPanelVisible(false);
        });

        ui.toolReset.addEventListener("click", () => {
            resetCalibrationBias();
            showToast("Bias reset", 900);
        });

        ui.onboarding.addEventListener("click", () => {
            hideOnboarding(true);
        });

        document.addEventListener("keydown", handleGlobalKeydown, true);
        document.addEventListener("keyup", handleGlobalKeyup, true);
    }

    function setTargetRect(node, key, left, top, width, height) {
        node.style.left = `${left}px`;
        node.style.top = `${top}px`;
        node.style.width = `${width}px`;
        node.style.height = `${height}px`;
        state.targetRects[key] = {
            left,
            top,
            right: left + width,
            bottom: top + height,
            width,
            height,
            centerX: left + width * 0.5,
            centerY: top + height * 0.5
        };
    }

    function layoutTargets(videoRect) {
        if (!videoRect) {
            ui.targetPrev.style.opacity = "0.2";
            ui.targetNext.style.opacity = "0.2";
            ui.targetCommentsUp.style.opacity = "0";
            ui.targetCommentsDown.style.opacity = "0";
            ui.targetUnheart.style.opacity = "0";
            ui.targetMute.style.opacity = "0";
            state.targetRects.previous = null;
            state.targetRects.next = null;
            state.targetRects.commentsUp = null;
            state.targetRects.commentsDown = null;
            state.targetRects.unheart = null;
            state.targetRects.muteToggle = null;
            return;
        }

        ui.targetPrev.style.opacity = "0.95";
        ui.targetNext.style.opacity = "0.95";

        const safeMargin = CONFIG.viewportMarginPx;
        const inset = CONFIG.navInsetPx;

        const baseWidth = clamp(videoRect.width * CONFIG.navWidthRatio, CONFIG.navMinWidthPx, CONFIG.navMaxWidthPx);
        const idealHeight = Math.max(CONFIG.navMinHeightPx, videoRect.height - inset * 2);
        const maxHeight = Math.max(120, window.innerHeight - safeMargin * 2);
        const totalHeight = Math.min(idealHeight, maxHeight);

        const availableLeft = Math.max(0, videoRect.left - inset - safeMargin);
        const availableRight = Math.max(0, window.innerWidth - safeMargin - (videoRect.right + inset));

        let width = baseWidth;
        let left = safeMargin;

        if (availableLeft >= CONFIG.navMinWidthPx) {
            width = Math.min(baseWidth, availableLeft);
            left = videoRect.left - inset - width;
        } else if (availableRight >= CONFIG.navMinWidthPx) {
            width = Math.min(baseWidth, availableRight);
            left = videoRect.right + inset;
        } else {
            width = Math.min(baseWidth, Math.max(CONFIG.navMinWidthPx, window.innerWidth - safeMargin * 2));
            left = clamp(videoRect.left + inset, safeMargin, Math.max(safeMargin, window.innerWidth - width - safeMargin));
        }

        const topIdeal = videoRect.top + (videoRect.height - totalHeight) * 0.5;
        const top = clamp(topIdeal, safeMargin, Math.max(safeMargin, window.innerHeight - totalHeight - safeMargin));

        const previousHeight = Math.floor(totalHeight * 0.5);
        const nextHeight = Math.max(1, totalHeight - previousHeight);

        setTargetRect(ui.targetPrev, "previous", left, top, width, previousHeight);
        setTargetRect(ui.targetNext, "next", left, top + previousHeight, width, nextHeight);

        const commentRect = getCommentPanelRect();
        if (commentRect) {
            const controlWidth = clamp(commentRect.width * 0.24, 86, 136);
            const idealColumnHeight = Math.max(180, commentRect.height - 16);
            const maxColumnHeight = Math.max(120, window.innerHeight - safeMargin * 2);
            const columnHeight = Math.min(idealColumnHeight, maxColumnHeight);
            const commentGap = CONFIG.commentsNavGapPx;

            const availableCommentLeft = Math.max(0, commentRect.left - commentGap - safeMargin);
            const availableCommentRight = Math.max(0, window.innerWidth - safeMargin - (commentRect.right + commentGap));

            let controlLeft = safeMargin;
            if (availableCommentLeft >= 68) {
                controlLeft = commentRect.left - commentGap - controlWidth;
            } else if (availableCommentRight >= 68) {
                controlLeft = commentRect.right + commentGap;
            } else {
                controlLeft = clamp(
                    commentRect.left + 8,
                    safeMargin,
                    Math.max(safeMargin, window.innerWidth - controlWidth - safeMargin)
                );
            }

            const columnTopIdeal = commentRect.top + (commentRect.height - columnHeight) * 0.5;
            const columnTop = clamp(
                columnTopIdeal,
                safeMargin,
                Math.max(safeMargin, window.innerHeight - columnHeight - safeMargin)
            );

            const commentsUpHeight = Math.floor(columnHeight * 0.5);
            const commentsDownHeight = Math.max(1, columnHeight - commentsUpHeight);

            setTargetRect(ui.targetCommentsUp, "commentsUp", controlLeft, columnTop, controlWidth, commentsUpHeight);
            setTargetRect(ui.targetCommentsDown, "commentsDown", controlLeft, columnTop + commentsUpHeight, controlWidth, commentsDownHeight);
            ui.targetCommentsUp.style.opacity = "0.95";
            ui.targetCommentsDown.style.opacity = "0.95";
        } else {
            ui.targetCommentsUp.style.opacity = "0";
            ui.targetCommentsDown.style.opacity = "0";
            state.targetRects.commentsUp = null;
            state.targetRects.commentsDown = null;
        }

        const utilityWidth = clamp(videoRect.width * 0.17, 94, 132);
        const utilityHeight = clamp(videoRect.height * 0.16, 64, 94);
        const utilityGap = 10;

        const likeState = getLikeState();
        const showUnheart = likeState === "liked";
        const utilityColumnHeight = showUnheart
            ? (utilityHeight * 2 + utilityGap)
            : utilityHeight;

        const utilityTop = clamp(
            videoRect.top + inset,
            safeMargin,
            Math.max(safeMargin, window.innerHeight - utilityColumnHeight - safeMargin)
        );

        const preferredOutsideLeft = videoRect.right + inset;
        const utilityLeft = clamp(
            preferredOutsideLeft,
            safeMargin,
            Math.max(safeMargin, window.innerWidth - utilityWidth - safeMargin)
        );

        const activeVideo = getActiveVideoElement();
        const currentlyMuted = Boolean(activeVideo && (activeVideo.muted || activeVideo.volume <= 0.001));
        const muteLabel = currentlyMuted ? "UNMUTE" : "MUTE";
        const muteTextNode = ui.targetMute.querySelector("span");
        if (muteTextNode) {
            muteTextNode.textContent = muteLabel;
        }
        setTargetRect(ui.targetMute, "muteToggle", utilityLeft, utilityTop, utilityWidth, utilityHeight);
        ui.targetMute.style.opacity = "0.95";

        if (showUnheart) {
            setTargetRect(
                ui.targetUnheart,
                "unheart",
                utilityLeft,
                utilityTop + utilityHeight + utilityGap,
                utilityWidth,
                utilityHeight
            );
            ui.targetUnheart.style.opacity = "0.95";
        } else {
            ui.targetUnheart.style.opacity = "0";
            state.targetRects.unheart = null;
        }
    }

    function setTargetActive(activeKey, progress01) {
        const prevActive = activeKey === "previous";
        const nextActive = activeKey === "next";
        const commentsUpActive = activeKey === "commentsUp";
        const commentsDownActive = activeKey === "commentsDown";
        const unheartActive = activeKey === "unheart";
        const muteActive = activeKey === "muteToggle";

        ui.targetPrev.classList.toggle("active", prevActive);
        ui.targetNext.classList.toggle("active", nextActive);
        ui.targetCommentsUp.classList.toggle("active", commentsUpActive);
        ui.targetCommentsDown.classList.toggle("active", commentsDownActive);
        ui.targetUnheart.classList.toggle("active", unheartActive);
        ui.targetMute.classList.toggle("active", muteActive);

        ui.targetPrev.style.setProperty("--progress", prevActive ? String(progress01) : "0");
        ui.targetNext.style.setProperty("--progress", nextActive ? String(progress01) : "0");
        ui.targetCommentsUp.style.setProperty("--progress", commentsUpActive ? String(progress01) : "0");
        ui.targetCommentsDown.style.setProperty("--progress", commentsDownActive ? String(progress01) : "0");
        ui.targetUnheart.style.setProperty("--progress", unheartActive ? String(progress01) : "0");
        ui.targetMute.style.setProperty("--progress", muteActive ? String(progress01) : "0");

        ui.ring.style.setProperty("--progress", String(progress01));
    }

    function collectAdaptiveAnchors() {
        const anchors = [];

        if (state.targetRects.previous) {
            anchors.push({
                key: "previous",
                rect: state.targetRects.previous,
                centerX: state.targetRects.previous.centerX,
                centerY: state.targetRects.previous.centerY
            });
        }

        if (state.targetRects.next) {
            anchors.push({
                key: "next",
                rect: state.targetRects.next,
                centerX: state.targetRects.next.centerX,
                centerY: state.targetRects.next.centerY
            });
        }

        if (state.targetRects.commentsUp) {
            anchors.push({
                key: "commentsUp",
                rect: state.targetRects.commentsUp,
                centerX: state.targetRects.commentsUp.centerX,
                centerY: state.targetRects.commentsUp.centerY
            });
        }

        if (state.targetRects.commentsDown) {
            anchors.push({
                key: "commentsDown",
                rect: state.targetRects.commentsDown,
                centerX: state.targetRects.commentsDown.centerX,
                centerY: state.targetRects.commentsDown.centerY
            });
        }

        if (state.targetRects.unheart) {
            anchors.push({
                key: "unheart",
                rect: state.targetRects.unheart,
                centerX: state.targetRects.unheart.centerX,
                centerY: state.targetRects.unheart.centerY
            });
        }

        if (state.targetRects.muteToggle) {
            anchors.push({
                key: "muteToggle",
                rect: state.targetRects.muteToggle,
                centerX: state.targetRects.muteToggle.centerX,
                centerY: state.targetRects.muteToggle.centerY
            });
        }

        const likeButton = getLikeButton();
        if (likeButton) {
            const rect = likeButton.getBoundingClientRect();
            anchors.push({
                key: "heart",
                rect: {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height,
                    centerX: rect.left + rect.width * 0.5,
                    centerY: rect.top + rect.height * 0.5
                },
                centerX: rect.left + rect.width * 0.5,
                centerY: rect.top + rect.height * 0.5
            });
        }

        return anchors;
    }

    function evaluateFocus(rawPoint) {
        const anchors = collectAdaptiveAnchors();
        if (!anchors.length) {
            return { key: null, point: rawPoint, magnet: 0 };
        }

        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const anchor of anchors) {
            const dx = anchor.centerX - rawPoint.x;
            const dy = anchor.centerY - rawPoint.y;
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDistance) {
                nearest = anchor;
                nearestDistance = dist;
            }
        }

        if (!nearest || nearestDistance > CONFIG.snapRadiusPx) {
            return { key: null, point: rawPoint, magnet: 0 };
        }

        const t = clamp((1 - nearestDistance / CONFIG.snapRadiusPx) * CONFIG.snapStrength, 0, 0.8);
        const snappedPoint = {
            x: lerp(rawPoint.x, nearest.centerX, t),
            y: lerp(rawPoint.y, nearest.centerY, t)
        };

        let focusedKey = null;
        if (
            nearest.key === "previous"
            || nearest.key === "next"
            || nearest.key === "commentsUp"
            || nearest.key === "commentsDown"
            || nearest.key === "unheart"
            || nearest.key === "muteToggle"
        ) {
            if (pointInRect(snappedPoint, nearest.rect)) {
                focusedKey = nearest.key;
            }
        }

        return {
            key: focusedKey,
            point: snappedPoint,
            magnet: t / 0.8
        };
    }

    function triggerAction(label, fn) {
        const ok = fn();
        state.lastActionLabel = ok ? label : `${label} failed`;
        ui.action.textContent = state.lastActionLabel;
        showToast(state.lastActionLabel);
    }

    function processDwell(focusedKey) {
        if (!focusedKey) {
            state.activeTargetKey = null;
            setTargetActive(null, 0);
            ui.focus.textContent = "none";
            return;
        }

        ui.focus.textContent = focusedKey;

        const now = nowMs();
        if (state.activeTargetKey !== focusedKey) {
            state.activeTargetKey = focusedKey;
            state.activeTargetStartedAt = now;
        }

        const cooldownUntil = Number(state.cooldownUntilByTarget[focusedKey] || 0);
        if (now < cooldownUntil) {
            setTargetActive(focusedKey, 0);
            return;
        }

        const progress = clamp((now - state.activeTargetStartedAt) / CONFIG.dwellMs, 0, 1);
        setTargetActive(focusedKey, progress);

        if (progress < 1) {
            return;
        }

        if (focusedKey === "previous") {
            triggerAction("Previous", actions.previous);
        } else if (focusedKey === "next") {
            triggerAction("Next", actions.next);
        } else if (focusedKey === "commentsUp") {
            triggerAction("Comments up", actions.commentsPrevious);
        } else if (focusedKey === "commentsDown") {
            triggerAction("Comments down", actions.commentsNext);
        } else if (focusedKey === "unheart") {
            triggerAction("Unheart", actions.unheart);
        } else if (focusedKey === "muteToggle") {
            const activeVideo = getActiveVideoElement();
            const currentlyMuted = Boolean(activeVideo && (activeVideo.muted || activeVideo.volume <= 0.001));
            triggerAction(currentlyMuted ? "Unmute" : "Mute", actions.muteToggle);
        }

        state.cooldownUntilByTarget[focusedKey] = now + CONFIG.dwellCooldownMs;
        state.activeTargetStartedAt = now;
        setTargetActive(focusedKey, 0);
    }

    function handleGestureEvent(payload) {
        if (!payload || typeof payload.gesture !== "string") {
            return;
        }

        if (!isTrackingUsable()) {
            showToast("Gesture ignored: low confidence", 900);
            return;
        }

        const now = nowMs();

        if (payload.gesture === "smile_teeth_heart") {
            if (now < state.smileCooldownUntil) {
                return;
            }
            state.smileCooldownUntil = now + CONFIG.smileActionCooldownMs;
            triggerAction("Heart (smile)", actions.heartOn);
            return;
        }

        if (payload.gesture === "mouth_pucker_toggle") {
            // Legacy fallback for older tracker versions.
            if (now < state.smileCooldownUntil) {
                return;
            }
            state.smileCooldownUntil = now + CONFIG.smileActionCooldownMs;
            triggerAction("Heart (legacy)", actions.heartOn);
        }
    }

    function updateHud() {
        if (state.connected) {
            ui.ws.textContent = "Connected";
        } else if (state.wsError) {
            ui.ws.textContent = "Error";
        } else {
            ui.ws.textContent = "Disconnected";
        }

        const tracking = state.tracking;
        if (!tracking || isTrackingStale()) {
            ui.track.textContent = "Lost";
            ui.conf.textContent = "0.00";
            ui.smile.textContent = "0.00";
            ui.jaw.textContent = "0.00";
            ui.brow.textContent = "0.00";
            ui.mode.textContent = getModeLabel();
            ui.safety.textContent = getSafetyLabel();
            ui.quality.textContent = "Lost";
            ui.cursor.style.opacity = "0";
            return;
        }

        const conf = clamp(Number(tracking.trackingConfidence || 0), 0, 1);
        state.lastSmileScore = clamp(Number(tracking.gestures?.smileScore ?? tracking.gestures?.puckerScore ?? 0), 0, 1);
        state.lastJawScore = clamp(Number(tracking.gestures?.jawOpenScore || 0), 0, 1);
        state.lastBrowScore = clamp(Number(tracking.gestures?.browRaiseScore || 0), 0, 1);

        ui.track.textContent = tracking.faceDetected ? "Live" : "No face";
        ui.conf.textContent = conf.toFixed(2);
        ui.smile.textContent = state.lastSmileScore.toFixed(2);
        ui.jaw.textContent = state.lastJawScore.toFixed(2);
        ui.brow.textContent = state.lastBrowScore.toFixed(2);
        ui.mode.textContent = getModeLabel();
        ui.safety.textContent = getSafetyLabel();
        ui.quality.textContent = getQualityLabel(tracking, conf);
        ui.action.textContent = state.lastActionLabel;
        ui.cursor.style.opacity = tracking.faceDetected ? "1" : "0.25";
    }

    function frameLoop() {
        ensureUiMounted();

        if (state.lastUrl !== location.href) {
            state.lastUrl = location.href;
            state.cachedVideoRect = null;
            state.cachedVideoRectAt = 0;
            state.activeTargetKey = null;
            setTargetActive(null, 0);
            ui.focus.textContent = "none";
            console.info("[TFG] route update", state.lastUrl);
        }

        const active = isTikTokPage() && hasFeedDom();
        ui.root.style.display = "block";

        if (!active) {
            state.targetRects.previous = null;
            state.targetRects.next = null;
            state.targetRects.commentsUp = null;
            state.targetRects.commentsDown = null;
            state.targetRects.unheart = null;
            state.targetRects.muteToggle = null;
            ui.targetPrev.style.opacity = "0";
            ui.targetNext.style.opacity = "0";
            ui.targetCommentsUp.style.opacity = "0";
            ui.targetCommentsDown.style.opacity = "0";
            ui.targetUnheart.style.opacity = "0";
            ui.targetMute.style.opacity = "0";
            ui.calibrationDot.classList.remove("visible");
            ui.focus.textContent = "waiting-feed";
            updateHud();
            requestAnimationFrame(frameLoop);
            return;
        }

        const videoRect = getActiveVideoRect();
        layoutTargets(videoRect);
        updateCalibrationTargetVisuals();
        enforceCommentsPanelFromMode();
        enforceCalibrationPlaybackPause();

        const tracking = state.tracking;
        const usable = isTrackingUsable();

        if (tracking && !isTrackingStale()) {
            updateEyesClosedRecalibration(tracking);
            updateModeFromJaw(tracking);
            const rawPoint = getBiasedViewportPoint(tracking.gaze);
            state.smoothX = lerp(state.smoothX, rawPoint.x, CONFIG.gazeSmoothingAlpha);
            state.smoothY = lerp(state.smoothY, rawPoint.y, CONFIG.gazeSmoothingAlpha);

            const focusResult = evaluateFocus({ x: state.smoothX, y: state.smoothY });
            const drawPoint = focusResult.point;
            const magnet = clamp(focusResult.magnet || 0, 0, 1);
            const cursorSize = 24 + 18 * magnet;

            ui.cursor.style.width = `${cursorSize}px`;
            ui.cursor.style.height = `${cursorSize}px`;
            ui.cursor.classList.toggle("magnetized", magnet > 0.28);
            ui.cursor.style.transform = `translate(${drawPoint.x}px, ${drawPoint.y}px) translate(-50%, -50%)`;

            if (usable) {
                if (state.calibrationActive) {
                    setTargetActive(null, 0);
                    ui.focus.textContent = `cal-${state.calibrationStepIndex + 1}`;
                } else {
                    processDwell(focusResult.key);
                }
            } else {
                if (state.calibrationActive) {
                    setTargetActive(null, 0);
                    ui.focus.textContent = "cal-wait";
                } else {
                    state.activeTargetKey = null;
                    setTargetActive(null, 0);
                    ui.focus.textContent = "none";
                }
            }
        } else {
            state.eyesClosedSince = 0;
            state.eyesClosedTriggered = false;
            if (state.calibrationActive) {
                setTargetActive(null, 0);
                ui.focus.textContent = "cal-wait";
            } else {
                state.activeTargetKey = null;
                setTargetActive(null, 0);
                ui.focus.textContent = "none";
            }
        }

        updateHud();
        requestAnimationFrame(frameLoop);
    }

    loadCalibrationBias();
    updateBiasReadout();
    bindUiEvents();
    startCalibration(true);

    const ws = new TrackerWebSocketClient(CONFIG.wsUrl, {
        onOpen: () => {
            state.connected = true;
            state.wsError = "";
            state.wsErrorNotified = false;
            showToast("Tracker connected", 900);
        },
        onClose: () => {
            state.connected = false;
        },
        onError: (error) => {
            state.wsError = String(error?.message || error || "unknown");
            if (!state.wsErrorNotified) {
                state.wsErrorNotified = true;
                showToast("Tracker socket error", 1200);
                console.warn("[TFG] socket error", state.wsError);
            }
        },
        onMessage: (payload) => {
            if (!payload || typeof payload !== "object") {
                return;
            }

            if (payload.type === "tracking_state") {
                state.tracking = payload;
                state.lastTrackingAt = nowMs();
                return;
            }

            if (payload.type === "gesture_event") {
                handleGestureEvent(payload);
            }
        }
    });

    ws.start();
    frameLoop();

    window.addEventListener("beforeunload", () => {
        setCalibrationPresentation(false);
    });
})();
