// ==UserScript==
// @name         Google Search Vertical Menu
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Vertical menu.
// @author       Gemini
// @match        *://www.google.com/search*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.innerHTML = `
        /* Hide original Google navigation */
        div[role="navigation"], #hdtb, .hdtb-msb {
            display: none !important;
        }
        .Fgyi2e, .wZQcA {
            display: none !important;
        }

        #fan-menu-container {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 100000;
            width: 250px; /* Wider hit-box */
            height: 60px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        /* The container expands to allow hovering over the items below */
        #fan-menu-container:hover {
            height: 600px;
        }

        .fan-trigger {
            width: 55px;
            height: 55px;
            background: #4285f4;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: background 0.3s ease;
            position: relative;
            z-index: 10; /* Lower than items to ensure items are clickable */
        }

        .fan-menu-item {
            position: absolute;
            left: 0;
            top: 0; /* Starting point */
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            z-index: 20; /* Higher than trigger */
        }

        .fan-menu-item a {
            display: block;
            min-width: 180px;
            padding: 16px 24px;
            background: #ffffff;
            border: 2px solid #efefef;
            border-radius: 12px;
            text-decoration: none;
            color: #202124;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 18px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }

        .fan-menu-item a:hover {
            background-color: #4285f4;
            color: white;
            border-color: #4285f4;
            transform: translateX(10px);
        }

        /* Interaction Logic */
        #fan-menu-container:hover .fan-trigger {
            background: #1a73e8;
        }

        #fan-menu-container:hover .fan-menu-item {
            opacity: 1;
            visibility: visible;
        }

        /* VERTICAL OFFSETS
           The trigger is 55px + 20px margin = 75px.
           We start item-0 at 85px to ensure a clear gap.
        */
        #fan-menu-container:hover .item-0 { transform: translateY(85px); transition-delay: 0.0s; }
        #fan-menu-container:hover .item-1 { transform: translateY(165px); transition-delay: 0.05s; }
        #fan-menu-container:hover .item-2 { transform: translateY(245px); transition-delay: 0.1s; }
        #fan-menu-container:hover .item-3 { transform: translateY(325px); transition-delay: 0.15s; }
        #fan-menu-container:hover .item-4 { transform: translateY(405px); transition-delay: 0.2s; }
        #fan-menu-container:hover .item-5 { transform: translateY(485px); transition-delay: 0.25s; }
    `;
    document.head.appendChild(style);

    const initMenu = () => {
        // Broad selector to capture Images, Videos, News, etc.
        const tabs = document.querySelectorAll('div[role="navigation"] a, .hdtb-mitem a, g-menu-item a, a.LatpMc');
        if (tabs.length === 0) return;

        const container = document.createElement('div');
        container.id = 'fan-menu-container';

        const trigger = document.createElement('div');
        trigger.className = 'fan-trigger';
        trigger.innerText = '☰';
        container.appendChild(trigger);

        const seen = new Set();
        let addedCount = 0;

        tabs.forEach((tab) => {
            const text = tab.innerText.split('\n')[0].trim();
            // Filter out empty strings or "Tools" which is usually a button, not a tab
            if (text && text !== "Tools" && !seen.has(text) && addedCount < 6) {
                seen.add(text);
                const item = document.createElement('div');
                item.className = `fan-menu-item item-${addedCount}`;

                const link = document.createElement('a');
                link.href = tab.href;
                link.innerText = text;

                item.appendChild(link);
                container.appendChild(item);
                addedCount++;
            }
        });

        document.body.appendChild(container);
    };

    // Initialize after a short delay for dynamic content
    window.addEventListener('load', () => {
        setTimeout(initMenu, 800);
    });
})();