// ==UserScript==
// @name         Chat Clapper 3000
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Clap goofy chatters on multiple sites using dynamic config from GM_getValue
// @match        *://*/*
// @match        http://localhost:5173/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @sandbox      JavaScript
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG_KEY = 'chatClapperConfig'; // Ensure this matches configService

    // --- Bridge GM functions for UI ---
    // This runs immediately at document-start
    console.log('%c ChatClapper: Bridging GM functions...', 'color: orange; font-weight: bold;');
    // Check if the GM functions are available in the userscript's scope
    if (typeof GM_getValue === 'function' && typeof GM_setValue === 'function') {
        // Use unsafeWindow to access the page's window object
        // Assign the functions to uniquely named properties on the page's window
        unsafeWindow.chatClapper_GM_getValue = GM_getValue;
        unsafeWindow.chatClapper_GM_setValue = GM_setValue;
        unsafeWindow.chatClapper_isGmReady = true; // Flag for the UI's checkGmReady
        console.log('%c ChatClapper: Bridged functions attached to unsafeWindow.', 'color: green; font-weight: bold;');
    } else {
        console.error('%c ChatClapper: GM_getValue/GM_setValue NOT found in userscript scope!', 'color: red; font-weight: bold;');
        // Ensure the flag reflects reality if bridging fails
        unsafeWindow.chatClapper_isGmReady = false;
    }
    // --- End Bridging ---


    // --- Main Script Logic (Async Initialization) ---
    /**
     * Initializes the core logic for finding and replacing chat messages.
     * Loads configuration asynchronously and sets up DOM observers.
     */
    async function initializeClapperLogic() {
        console.log("[INFO] Initializing Chat Clapper main logic (async)...");

        // Don't run clapping logic on the config UI page itself
        if (window.location.href.startsWith('http://localhost:5173')) {
            console.log("[INFO] On config UI page, skipping clapper initialization.");
            return;
        }

        /** @type {any} */ // JSDoc type hint
        let config = {};
        try {
            // Use await with GM_getValue. Provide a default value ('{}').
            const storedConfig = await GM_getValue(CONFIG_KEY, '{}');
            config = JSON.parse(storedConfig); // Parse the string result
            console.log("[CONFIG] Async loaded config:", config);
        } catch (e) {
            console.error("[FAIL] Failed to load or parse config asynchronously:", e);
            return; // Stop if config loading fails
        }

        // --- Get Global and Site-Specific Settings ---
        const globalConfig = config.global || {};
        const sitesConfig = config.sites || {};
        const currentUrl = window.location.href; // URL of the target page

        let siteKey = null;
        let siteConfig = null;

        // Find the first matching site configuration
        for (const pattern in sitesConfig) {
            try {
                // Escape regex special characters in the pattern, then replace wildcard *
                const regexPattern = pattern
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\\\*/g, '.*');
                const regex = new RegExp(`^${regexPattern}$`);

                if (regex.test(currentUrl)) {
                    siteKey = pattern;
                    siteConfig = sitesConfig[pattern];
                    console.log(`[CONFIG] Matched site config for pattern: ${siteKey}`);
                    break; // Use the first match found
                }
            } catch (e) {
                console.error(`[WARN] Invalid regex pattern in config sites key: "${pattern}"`, e);
            }
        }

        // Exit if no configuration matches the current site
        if (!siteConfig) {
            console.log(`[INFO] No site configuration found matching current URL: ${currentUrl}`);
            return;
        }

        // --- Validate Required Config Parts ---
        const replacementText = globalConfig.replacementText || "[Message Clapped]";
        const delaySeconds = typeof globalConfig.delaySeconds === 'number' ? globalConfig.delaySeconds : 3;
        // Ensure users are lowercase strings for case-insensitive comparison
        const usersToBlock = (siteConfig.users || []).map(u => String(u || '').toLowerCase());
        const selectors = siteConfig.selectors || {};
        const containerSelector = selectors.container;
        const authorSelector = selectors.author;
        const contentSelector = selectors.content;

        // Check for essential selectors
        if (!containerSelector || !authorSelector || !contentSelector) {
            console.error(`[FAIL] Missing required selectors (container, author, or content) for site: ${siteKey}`);
            return;
        }
        if (usersToBlock.length === 0) {
            console.warn(`[WARN] No users configured to block for site: ${siteKey}`);
            // Continue running even if no users are listed
        }

        console.log(`[CONFIG] Using settings for ${siteKey}:`, {
            users: usersToBlock,
            selectors: { container: containerSelector, author: authorSelector, content: contentSelector },
            replacement: replacementText,
            delay: delaySeconds
        });

        // --- Wait for Chat Container & Initialize Observer ---
        // Pass necessary parameters to the waiting function
        waitForChatContainer(containerSelector, (chatContainerElement) => {
            // Once the container is found, initialize the observer
            initializeChatObserver(chatContainerElement, usersToBlock, selectors, replacementText, delaySeconds);
        });
    }

    /**
     * Waits for an element matching the selector to appear in the DOM.
     * @param {string} selector - The CSS selector for the target element.
     * @param {(element: Element) => void} callback - Function to execute once the element is found.
     */
    function waitForChatContainer(selector, callback) {
        const checkIntervalMs = 500;
        const maxWaitSeconds = 30;
        let checkAttempts = 0;
        const maxAttempts = (maxWaitSeconds * 1000) / checkIntervalMs;

        console.log(`[INFO] Waiting for chat container: "${selector}"`);

        const intervalId = setInterval(() => {
            checkAttempts++;
            // Query the document for the container element
            const container = document.querySelector(selector);

            if (container) {
                // Element found
                console.log(`[SUCCESS] Found chat container "${selector}" after ${checkAttempts} attempts.`);
                clearInterval(intervalId); // Stop checking
                callback(container); // Execute the provided callback
            } else if (checkAttempts > maxAttempts) {
                // Timeout reached
                clearInterval(intervalId);
                console.error(`[FAIL] Couldn't find chat container "${selector}" after ${maxWaitSeconds} seconds. Script stopping for this page.`);
            }
        }, checkIntervalMs);
    }


    /**
     * Initializes and attaches a MutationObserver to watch for new chat messages.
     * @param {Element} chatContainer - The DOM element containing chat messages.
     * @param {string[]} users - Array of lowercase usernames to block.
     * @param {{container: string, author: string, content: string}} selectors - Object containing CSS selectors.
     * @param {string} replaceWith - The text to replace blocked messages with.
     * @param {number} delaySec - Delay in seconds before replacing the message.
     */
    function initializeChatObserver(chatContainer, users, selectors, replaceWith, delaySec) {
        console.log("[INFO] Attaching MutationObserver to chat container.");

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // Process only element nodes
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        /** @type {Element} */ // JSDoc type hint
                        const elementNode = node;
                        // Find the author element within the newly added node
                        const authorElement = elementNode.querySelector(selectors.author);

                        if (authorElement) {
                            // Extract author name, handle potential colon, trim, and lowercase
                            const authorName = (authorElement.textContent || "").split(':')[0].trim().toLowerCase();

                            // Check if the author is in the block list
                            if (authorName && users.includes(authorName)) {
                                console.log(`[ACTION] Spotted target user "${authorName}". Setting ${delaySec}s timer... ⏳`);
                                // Set a timeout to replace the message content after the delay
                                setTimeout(() => {
                                    // Re-find the content element within the same node (it might have changed)
                                    const contentElement = elementNode.querySelector(selectors.content);
                                    if (contentElement) {
                                        console.log(`[ACTION] Clapping message from "${authorName}" 💥`);
                                        contentElement.textContent = replaceWith; // Perform the replacement
                                        // Optional styling: Apply to the parent node of the message
                                        if (elementNode instanceof HTMLElement) {
                                            elementNode.style.opacity = '0.5';
                                            elementNode.style.fontStyle = 'italic';
                                        }
                                    } else {
                                        // Log a warning if the content element is gone before the timeout fires
                                        console.warn(`[WARN] Timeout fired for "${authorName}", but couldn't find content element with selector "${selectors.content}" anymore.`);
                                    }
                                }, delaySec * 1000); // Convert seconds to milliseconds
                            }
                        }
                    }
                });
            });
        });

        // Start observing the chat container for added child nodes and subtree changes
        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log("[SUCCESS] Observer attached and watching. Script ready. 💯");
    }


    // --- Trigger Initialization ---
    // Ensure the main logic runs only after the DOM is ready.
    // Check if the DOM is already interactive/complete
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initializeClapperLogic();
    } else {
        // Otherwise, wait for the DOMContentLoaded event
        window.addEventListener('DOMContentLoaded', initializeClapperLogic, { once: true });
    }

})(); // End of IIFE
