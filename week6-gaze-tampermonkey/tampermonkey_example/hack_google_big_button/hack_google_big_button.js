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

    const makeSearchButtonBigger = () => {
        Array.from(document.querySelectorAll('button, input'))
            .filter(el => (el.textContent || el.value || '').trim() === 'Google Search')
            .forEach(btn => {
                btn.style.position = 'absolute';
                btn.style.left = '10px';
                btn.style.top = '50%';
                btn.style.zIndex = '9999';
                btn.style.fontSize = '24px';
                btn.style.padding = '18px 28px';
                btn.style.minWidth = '220px';
                btn.style.minHeight = '64px';
                btn.style.borderRadius = '12px';
                btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                btn.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
                btn.style.transform = 'translateY(0%) scale(1.35)';
                btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(0%) scale(1.45)');
                btn.addEventListener('mouseleave', () => btn.style.transform = 'translateY(0%) scale(1.35)');
            });
    };

    makeSearchButtonBigger();

    setTimeout(() => {
        makeSearchButtonBigger();
    }, 1000); // Retry for dynamic content
})();