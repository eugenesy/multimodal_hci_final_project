// ==UserScript==
// @name         Google logo face tracker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Moves the Google logo based on Python MediaPipe face tracking
// @author       You
// @match        https://www.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const socket = new WebSocket('ws://localhost:8765');
    let logo = null;

    // Function to find the Google logo
    const getLogo = () => {
        const el = document.querySelector('.k1zIA');
        if (el && !logo) {
            logo = el;
            if (logo.parentElement) {
                logo.parentElement.style.overflow = "visible";
            }
            console.log("Logo with class .k1zIA found");
        }
        return logo;
    };

    socket.onmessage = function(event) {
        const target = getLogo();
        if (!target) return;

        try {
            const data = JSON.parse(event.data);
            const offset = data.offset;

            window.requestAnimationFrame(() => {
                target.style.transition = "transform 0.1s ease-out";
                target.style.transform = `translateX(${offset}px)`;
            });
        } catch (e) {
            console.error("Error parsing socket data:", e);
        }
    };

    socket.onopen = () => {
        console.log("%c Connected to Python face tracker");
    };

    socket.onclose = () => {
        console.log("%c Disconnected from Python server");
    };

    socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
    };
})();