// ==UserScript==
// @name         Chat Clapper v4 (Dynamic Config)
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Clap goofy chatters on multiple sites using dynamic config from GM_getValue
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG_KEY = 'chatClapperConfig'; // Key used to store/retrieve the config object

    console.log("------- Chat Clapper v4 Activated -------");

    // --- Load Config ---
    let config = {};
    try {
        const storedConfig = GM_getValue(CONFIG_KEY, '{}'); // Default to empty object string
        config = JSON.parse(storedConfig);
        console.log("[CONFIG] Loaded config:", config);
    } catch (e) {
        console.error("[FAIL] Failed to parse config from GM_getValue:", e);
        return; // Stop if config is busted
    }

    // --- Get Global and Site-Specific Settings ---
    const globalConfig = config.global || {};
    const sitesConfig = config.sites || {};
    const currentUrl = window.location.href;

    let siteKey = null;
    let siteConfig = null;

    // Find the first matching site configuration based on URL pattern (key)
    for (const pattern in sitesConfig) {
        // Basic wildcard matching (can be improved with regex if needed)
        // Escape regex special chars in pattern, then replace * with .*
        const regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);

        if (regex.test(currentUrl)) {
            siteKey = pattern;
            siteConfig = sitesConfig[pattern];
            console.log(`[CONFIG] Matched site config for pattern: ${siteKey}`);
            break; // Use the first match
        }
    }

    if (!siteConfig) {
        console.log(`[INFO] No site configuration found matching current URL: ${currentUrl}`);
        return; // No config for this site, do nothing
    }

    // --- Validate Required Config Parts ---
    const replacementText = globalConfig.replacementText || "[Message Clapped by Big Ounce]"; // Default replacement
    const delaySeconds = typeof globalConfig.delaySeconds === 'number' ? globalConfig.delaySeconds : 3; // Default delay
    const usersToBlock = (siteConfig.users || []).map(u => u.toLowerCase()); // Lowercase for case-insensitive compare
    const selectors = siteConfig.selectors || {};
    const containerSelector = selectors.container;
    const authorSelector = selectors.author;
    const contentSelector = selectors.content;

    if (!containerSelector || !authorSelector || !contentSelector) {
        console.error(`[FAIL] Missing required selectors (container, author, or content) for site: ${siteKey}`);
        return;
    }
    if (usersToBlock.length === 0) {
        console.warn(`[WARN] No users configured to block for site: ${siteKey}`);
        // continue running, maybe user just wants to test selectors? Or return here if desired.
    }

    console.log(`[CONFIG] Using settings for ${siteKey}:`, {
        users: usersToBlock,
        selectors: selectors,
        replacement: replacementText,
        delay: delaySeconds
    });

    // --- Wait for Chat Container ---
    const checkIntervalMs = 500;
    const maxWaitSeconds = 30;
    let checkAttempts = 0;
    const maxAttempts = (maxWaitSeconds * 1000) / checkIntervalMs;

    console.log(`[INFO] Waiting for chat container: "${containerSelector}"`);

    const waitForChatInterval = setInterval(() => {
        checkAttempts++;
        const chatContainer = document.querySelector(containerSelector);

        if (chatContainer) {
            console.log(`[SUCCESS] Found "${containerSelector}" after ${checkAttempts} attempts. Initializing observer.`);
            clearInterval(waitForChatInterval);
            initializeChatClapper(chatContainer, usersToBlock, selectors, replacementText, delaySeconds);
        } else if (checkAttempts > maxAttempts) {
            clearInterval(waitForChatInterval);
            console.error(`[FAIL] Couldn't find chat container "${containerSelector}" after ${maxWaitSeconds} seconds. Script stopping for this page.`);
        }
    }, checkIntervalMs);


    // --- Initialize the Observer Logic ---
    function initializeChatClapper(chatContainer, users, selectors, replaceWith, delaySec) {
        console.log("[INFO] Attaching MutationObserver.");

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Check if it's an element node
                        const authorElement = node.querySelector(selectors.author);

                        if (authorElement) {
                            // Extract author name, handle potential colon, make lowercase
                            const authorName = (authorElement.textContent || "").split(':')[0].trim().toLowerCase();

                            if (authorName && users.includes(authorName)) {
                                console.log(`[SUCCESS] Spotted target user "${authorName}". Setting ${delaySec}s timer... ⏳`);
                                setTimeout(() => {
                                    const contentElement = node.querySelector(selectors.content);
                                    if (contentElement) {
                                        console.log(`[SUCCESS] Clapping message from "${authorName}" 💥`);
                                        contentElement.textContent = replaceWith;
                                        // Optional styling
                                        node.style.opacity = '0.5';
                                        node.style.fontStyle = 'italic';
                                    } else {
                                        console.warn(`[WARN] Timeout fired for "${authorName}", but couldn't find content element with selector "${selectors.content}" anymore.`);
                                    }
                                }, delaySec * 1000);
                            }
                        }
                    }
                });
            });
        });

        observer.observe(chatContainer, { childList: true });
        console.log("[SUCCESS] Observer attached and watching. Script ready. 💯");
    }

})(); // End of IIFE