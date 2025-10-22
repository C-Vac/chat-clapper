// ==UserScript==
// @name         Button Clicker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically clicks a specified button when it becomes available.
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_SELECTOR = 'button#zoot-game-play-button'; // This will be configurable per-site in the future.

    function clickButton(button) {
        console.log('Attempting to click button:', button);
        const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        button.dispatchEvent(event);
        console.log('Button click event dispatched.');
    }

    function observeDOM() {
        const observer = new MutationObserver((mutationsList, observer) => {
            const button = document.querySelector(BUTTON_SELECTOR);
            if (button && !button.disabled) {
                console.log('Button found:', button);
                clickButton(button);
                // Optionally disconnect observer after first click if only one click is needed
                // observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log('MutationObserver started for button:', BUTTON_SELECTOR);

        // Initial check in case the button is already present
        const initialButton = document.querySelector(BUTTON_SELECTOR);
        if (initialButton) {
            console.log('Button found on initial check:', initialButton);
            clickButton(initialButton);
        }
    }

    // Start observing the DOM once the document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeDOM);
    } else {
        observeDOM();
    }

})();