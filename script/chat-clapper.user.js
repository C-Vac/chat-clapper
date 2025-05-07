// ==UserScript==
// @name         Chat Clapper 3000 EXPERIMENTAL
// @author       GG, Goblini, contrib. Big Ounce, misc goblins, et. al
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Clap goofy chatters on multiple sites using dynamic config from GM_getValue
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @sandbox      JavaScript
// @run-at       document-start
// @noframes
// @downloadURL  https://github.com/C-Vac/chat-clapper/raw/refs/heads/dev/script/chat-clapper.user.js
// @updateURL    https://github.com/C-Vac/chat-clapper/raw/refs/heads/dev/script/chat-clapper.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- Constants ---
    const CONFIG_KEY = 'chatClapperConfig';
    const DB_NAME = 'chatClapperHistoryDB';
    const GLOBAL_RECENT_HISTORY_KEY = 'chatClapperGlobalRecentHistory';
    const MAX_GLOBAL_RECENT_MESSAGES = 100; const STORE_NAME = 'blockedMessages';
    const CONFIG_UI_URL_PREFIX = 'http://localhost:5173';
    const LOG_PREFIX = '[ChatClapper]';

    // --- Logger ---
    const Logger = {
        warn: (...args) => console.warn(`${LOG_PREFIX} [WARN]`, ...args),
        info: (...args) => console.info(`${LOG_PREFIX} [INFO]`, ...args),
        action: (...args) => console.log(`${LOG_PREFIX} [ACTION]`, ...args),
        success: (...args) => console.log(`${LOG_PREFIX} [SUCCESS]`, ...args),
        fail: (...args) => console.error(`${LOG_PREFIX} [FAIL]`, ...args),
        debug: (...args) => console.debug(`${LOG_PREFIX} [DEBUG]`, ...args),
    };

    // --- Database Service ---
    const DatabaseService = {
        db: null,

        GlobalHistoryManager: {
            /**
             * Adds a message to the global recent history list in GM_storage.
             * Keeps the list pruned to MAX_GLOBAL_RECENT_MESSAGES.
             * Expects messageData to be a complete BlockedMessage object (including an id from local DB).
             */
            async addMessageToGlobalRecentHistory(messageData, gmGetValue, gmSetValue) {
                if (typeof gmGetValue !== 'function' || typeof gmSetValue !== 'function') {
                    Logger.fail("GM_getValue/setValue not available for global recent history.");
                    return;
                }
                try {
                    let globalRecentHistory = await gmGetValue(GLOBAL_RECENT_HISTORY_KEY, []);
                    if (!Array.isArray(globalRecentHistory)) {
                        Logger.warn("Global recent history from GM was not an array, resetting.");
                        globalRecentHistory = [];
                    }

                    // Add the new message (which should already have its ID from local DB and timestamp)
                    globalRecentHistory.unshift(messageData); // Add to the beginning

                    // Prune to keep only the last MAX_GLOBAL_RECENT_MESSAGES
                    if (globalRecentHistory.length > MAX_GLOBAL_RECENT_MESSAGES) {
                        globalRecentHistory = globalRecentHistory.slice(0, MAX_GLOBAL_RECENT_MESSAGES);
                    }

                    await gmSetValue(GLOBAL_RECENT_HISTORY_KEY, globalRecentHistory);
                    Logger.success(`Message ID ${messageData.id} added to global GM history. Count: ${globalRecentHistory.length}`);
                } catch (e) {
                    Logger.fail("Error updating global GM recent history:", e);
                }
            },

            /**
             * Retrieves recent messages from the global list in GM_storage.
             * The list in GM_storage is already sorted with the newest first.
             */
            async getGlobalRecentMessages(limit = 10, gmGetValue) {
                if (typeof gmGetValue !== 'function') {
                    Logger.fail("GM_getValue not available for global recent history retrieval.");
                    return [];
                }
                try {
                    const globalRecentHistory = await gmGetValue(GLOBAL_RECENT_HISTORY_KEY, []);
                    if (!Array.isArray(globalRecentHistory)) {
                        Logger.warn("Global recent history from GM is not an array, returning empty.");
                        return [];
                    }
                    // The list is stored newest first, so slice directly
                    return globalRecentHistory.slice(0, limit);
                } catch (e) {
                    Logger.fail("Error retrieving global recent messages from GM:", e);
                    return [];
                }
            }
        },

        async initDB() {
            return new Promise((resolve, reject) => {
                // Logger.debug(`Initializing IndexedDB: ${DB_NAME}`);
                // Check if IndexedDB is available (e.g., in some testing environments it might not be)
                if (typeof indexedDB === 'undefined') {
                    Logger.fail("IndexedDB API not available in this environment.");
                    return reject(new Error("IndexedDB not available"));
                }
                const request = indexedDB.open(DB_NAME, 1);

                request.onerror = (event) => {
                    Logger.fail("Error opening IndexedDB:", event.target.error);
                    reject(event.target.error);
                };

                request.onsuccess = (event) => {
                    Logger.success("IndexedDB opened successfully.");
                    this.db = event.target.result;
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    // Logger.debug("Upgrading IndexedDB schema...");
                    const tempDb = event.target.result;
                    if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                        const store = tempDb.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        Logger.info(`Object store "${STORE_NAME}" created.`);
                    } else {
                        // Logger.debug(`Object store "${STORE_NAME}" already exists.`);
                    }
                };
            });
        },

        async addBlockedMessage(messageData) {
            if (!this.db) {
                Logger.fail("Database not initialized. Cannot add message.");
                return Promise.reject(new Error("Database not initialized"));
            }
            return new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const messageToStore = { ...messageData, timestamp: Date.now() };
                    const request = store.add(messageToStore);

                    request.onsuccess = (event) => {
                        Logger.success(`Message added to DB with ID: ${event.target.result}`);
                        resolve(event.target.result);
                    };

                    request.onerror = (event) => {
                        Logger.fail("Error adding message to DB:", event.target.error);
                        reject(event.target.error);
                    };
                } catch (error) {
                    Logger.fail("Error creating DB transaction:", error);
                    reject(error);
                }
            });
        },

        async getRecentMessages(limit = 10) {
            if (!this.db) {
                Logger.fail("Database not initialized. Cannot get messages.");
                return Promise.resolve([]); // Return empty array if DB not ready
            }
            return new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction([STORE_NAME], 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const index = store.index('timestamp');
                    const messages = [];
                    let cursorRequest = index.openCursor(null, 'prev'); // newest first

                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && messages.length < limit) {
                            messages.push(cursor.value);
                            cursor.continue();
                        } else {
                            Logger.success(`Retrieved ${messages.length} recent messages from DB.`);
                            resolve(messages);
                        }
                    };

                    cursorRequest.onerror = (event) => {
                        Logger.fail("Error retrieving messages from DB:", event.target.error);
                        reject(event.target.error);
                    };
                } catch (error) {
                    Logger.fail("Error creating DB transaction for retrieval:", error);
                    reject(error);
                }
            });
        },
    };

    // --- Bridge Service ---
    const BridgeService = {
        // Need to check unsafeWindow availability *inside* the functions
        // because it might not exist at the top level in all environments (like tests)
        bridgeGmFunctions(gmGetValue, gmSetValue) {
            // Logger.debug('Attempting to bridge GM functions...');
            if (typeof unsafeWindow === 'undefined') {
                Logger.warn('unsafeWindow not available, cannot bridge GM functions.');
                return false;
            }
            if (typeof gmGetValue === 'function' && typeof gmSetValue === 'function') {
                unsafeWindow.chatClapper_GM_getValue = gmGetValue;
                unsafeWindow.chatClapper_GM_setValue = gmSetValue;
                // Logger.debug('Bridged GM functions attached to unsafeWindow.');
                return true;
            } else {
                unsafeWindow.chatClapper_isGmReady = false;
                Logger.fail('GM_getValue/GM_setValue NOT found in userscript scope!');
                return false;
            }
        },

        exposeDbGetter(getRecentMessagesFn) {
            // Logger.debug('Attempting to expose DB getter function...');
            if (typeof unsafeWindow === 'undefined') {
                Logger.warn('unsafeWindow not available, cannot expose DB getter.');
                return false;
            }
            if (typeof getRecentMessagesFn === 'function') {
                unsafeWindow.chatClapper_getRecentMessages = getRecentMessagesFn;
                // Logger.debug('Exposed getRecentMessages function to unsafeWindow.');
                return true;
            } else {
                Logger.fail('Provided getRecentMessagesFn is not a function.');
                return false;
            }
        },
    };

    // --- Config Service ---
    const ConfigService = {
        config: null, // Cache loaded config

        async loadConfig(gmGetValue) {
            // Logger.debug("Loading configuration...");
            if (typeof gmGetValue !== 'function') {
                Logger.fail("GM_getValue function is not available.");
                throw new Error("GM_getValue is not available");
            }
            try {
                const storedConfig = await gmGetValue(CONFIG_KEY, '{}');
                this.config = storedConfig;
                Logger.success("Configuration loaded:", this.config);
                return this.config;
            } catch (e) {
                Logger.fail("Failed to load config:", e);
                this.config = {};
                throw e; // Re-throw error after logging
            }
        },

        findSiteConfig(url) {
            // Logger.debug(`Finding site config for URL: ${url}`);
            if (!this.config || !this.config.sites) {
                Logger.warn("No sites configured or config not loaded.");
                return { siteKey: null, siteConfig: null, globalConfig: this.config?.global || {} };
            }

            const globalConfig = this.config.global || {};
            const sitesConfig = this.config.sites;

            for (const pattern in sitesConfig) {
                try {
                    // Escape regex special characters, then replace wildcard * with .*
                    const regexPattern = pattern
                        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape most specials
                        .replace(/\\\*/g, '.*'); // Replace \* with .*
                    const regex = new RegExp(`^${regexPattern}$`); // Match whole string

                    if (regex.test(url)) {
                        Logger.success(`Matched site config for pattern: ${pattern}`);
                        return { siteKey: pattern, siteConfig: sitesConfig[pattern], globalConfig };
                    }
                } catch (e) {
                    Logger.warn(`Invalid regex pattern in config sites key: "${pattern}"`, e);
                    // Continue checking other patterns
                }
            }

            Logger.warn(`No site configuration found matching current URL.`);
            return { siteKey: null, siteConfig: null, globalConfig };
        },

        getValidatedConfig(siteKey, siteConfig, globalConfig) {
            // Logger.debug("Validating configuration parts...");
            if (!siteConfig) {
                Logger.warn("No siteConfig provided for validation.");
                return null;
            }

            const replacementText = globalConfig?.replacementText || "[Message Clapped]";
            const delaySeconds = typeof globalConfig?.delaySeconds === 'number' ? globalConfig.delaySeconds : 3;
            // Ensure users are lowercase strings, filtering out empty/null values
            const usersToBlock = (siteConfig.users || [])
                .map(u => String(u || '').trim().toLowerCase())
                .filter(u => u.length > 0);

            const selectors = siteConfig.selectors || {};
            const { container: containerSelector, author: authorSelector, content: contentSelector } = selectors;

            if (!containerSelector || !authorSelector || !contentSelector) {
                Logger.fail(`Missing required selectors (container, author, or content) for site: ${siteKey}`);
                return null;
            }

            if (usersToBlock.length === 0) {
                Logger.warn(`No valid users configured to block for site: ${siteKey}. Clapper will run but block no one.`);
            }

            const validated = {
                replacementText,
                delaySeconds,
                usersToBlock,
                selectors: { containerSelector, authorSelector, contentSelector },
                siteKey
            };
            Logger.success("Configuration validated:", validated);
            return validated;
        }
    };

    // --- DOM Service ---
    const DomService = {
        waitForElement(selector, timeoutSeconds = 30) {
            // Logger.debug(`Waiting for element: "${selector}" (max ${timeoutSeconds}s)`);
            return new Promise((resolve, reject) => {
                const checkIntervalMs = 500;
                let attempts = 0;
                const maxAttempts = (timeoutSeconds * 1000) / checkIntervalMs;

                const intervalId = setInterval(() => {
                    attempts++;
                    const element = document.querySelector(selector);

                    if (element) {
                        Logger.success(`Found element "${selector}" after ${attempts} attempts.`);
                        clearInterval(intervalId);
                        resolve(element);
                    } else if (attempts > maxAttempts) {
                        clearInterval(intervalId);
                        Logger.fail(`Couldn't find element "${selector}" after ${timeoutSeconds} seconds.`);
                        reject(new Error(`Element not found: ${selector}`));
                    } else {
                        // Logger.debug(`Element "${selector}" not found, attempt ${attempts}/${maxAttempts}`);
                    }
                }, checkIntervalMs);
            });
        },

        getElementText(element, selector) {
            // Logger.debug(`[getElementText] Called with selector: "${selector}" on element:`, element);
            const target = element.querySelector(selector);

            // Extract text, handle potential colon, trim, and lowercase for author comparison
            const text = target?.textContent || "";

            const processedName = text.split(':')[0].trim().toLowerCase();
            // Logger.debug(`[getElementText] Returning processed name: "${processedName}"`);
            return processedName;
        },

        replaceElementContent(element, selector, replacementText) {
            const contentElement = element.querySelector(selector);
            if (contentElement) {
                // Logger.debug(`Replacing content in selector "${selector}"`);
                contentElement.textContent = replacementText;
                return contentElement.textContent; // Return original for history
            } else {
                Logger.warn(`Could not find content element with selector "${selector}" to replace.`);
                return null; // Indicate failure
            }
        },

        styleClappedElement(element) {
            if (element instanceof HTMLElement) {
                // Logger.debug(`Applying clap styling to element.`);
                element.style.opacity = '0.5';
                element.style.fontStyle = 'italic';
            } else {
                Logger.warn(`Cannot apply style, node is not an HTMLElement.`);
            }
        },

        dispatchEvent(eventName, detail) {
            try {
                Logger.debug(`Dispatching event "${eventName}"`);
                const event = new CustomEvent(eventName, { detail });
                window.dispatchEvent(event);
            } catch (error) {
                Logger.fail(`Failed to dispatch event "${eventName}":`, error);
            }
        }
    };

    // --- Observer Service ---
    const ObserverService = {
        observer: null,

        startObserver(
            containerElement,
            validatedConfig,
            dbService,
            domService
        ) {
            // Logger.debug("Initializing Observer...");

            const {
                usersToBlock,
                selectors,
                replacementText,
                delaySeconds,
                siteKey
            } = validatedConfig;

            this.observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            /** @type {Element} */
                            const messageElement = node;
                            // Check if the added node *itself* matches the container selector's descendant structure
                            // or if a relevant child was added deeper in the tree.
                            // A simple check: does it contain an author element?
                            // Logger.debug(`[Observer] Processing ELEMENT_NODE:`, messageElement.tagName, messageElement.className, messageElement.id);

                            const authorElement = messageElement.querySelector(selectors.authorSelector);

                            if (authorElement) {
                                // Get author using DomService method for consistency
                                const authorName = domService.getElementText(messageElement, selectors.authorSelector);
                                // Logger.debug(`[Observer] Node Added. Extracted Author: "${authorName}". Configured users:`, usersToBlock);
                                if (authorName) { // Only log the check if authorName is not empty
                                    // Logger.debug(`[Observer] Checking if "${authorName}" is in [${usersToBlock.join(', ')}]. Result: ${usersToBlock.includes(authorName)}`);
                                }
                                if (authorName && usersToBlock.includes(authorName)) {
                                    // Logger.debug(`Spotted target user "${authorName}". Setting ${delaySeconds}s timer... ⏳`);

                                    setTimeout(async () => {
                                        // Logger.debug(`Timer finished for "${authorName}". Attempting clap.`);
                                        const contentElement = messageElement.querySelector(selectors.contentSelector);

                                        if (!contentElement) {
                                            Logger.warn(`Timeout fired for "${authorName}", but couldn't find content element using selector "${selectors.contentSelector}" anymore.`);
                                            return; // Content element disappeared before clapping
                                        }
                                        const originalContent = contentElement.textContent; // Get original content *before* replacing

                                        domService.replaceElementContent(messageElement, selectors.contentSelector, replacementText);
                                        domService.styleClappedElement(messageElement);
                                        Logger.action(`Clapped message from "${authorName}" 💥`);

                                        // --- Store and Dispatch ---
                                        try {
                                            const messageDetails = {
                                                author: authorName,
                                                originalContent: originalContent || "[Content not captured]",
                                                clappedContent: replacementText,
                                                site: siteKey,
                                            };
                                            // 1. Add to local per-site IndexedDB (this also adds a timestamp)
                                            //    This `addBlockedMessage` should return the ID it generated.
                                            const messageIdFromLocalDB = await DatabaseService.addBlockedMessage(messageDetails);

                                            // 2. Prepare the consistent payload for global history and event dispatch
                                            const consistentTimestamp = Date.now(); // Use a single timestamp for this event cycle
                                            const messagePayload = {
                                                ...messageDetails,
                                                id: messageIdFromLocalDB, // Use the ID from the per-site IndexedDB
                                                timestamp: consistentTimestamp
                                            };

                                            // 3. Add to global recent history (passing actual GM_getValue, GM_setValue)
                                            //    Ensure GM_getValue and GM_setValue are accessible here.
                                            //    If ObserverService doesn't have direct access, you might need to pass them
                                            //    or call a method on a service that does.
                                            if (typeof GM_getValue === 'function' && typeof GM_setValue === 'function') {
                                                await DatabaseService.GlobalHistoryManager.addMessageToGlobalRecentHistory(messagePayload, GM_getValue, GM_setValue);
                                            } else {
                                                Logger.warn("GM functions not directly available in ObserverService to update global history.");
                                            }

                                            // 4. Dispatch event with the consistent payload
                                            DomService.dispatchEvent('chatClapperMessageBlocked', messagePayload);


                                        } catch (error) {
                                            Logger.fail("Error storing message or dispatching event after clap:", error);
                                        }
                                    }, delaySeconds * 1000);
                                }
                            } else {
                                // Logger.debug("Added node did not contain author element, skipping.", node)
                            }
                        }
                    });
                });
            });

            // Observe the container for added child nodes and subtree changes
            this.observer.observe(containerElement, { childList: true, subtree: true });
            Logger.success("Observer attached and watching. Script ready. 💯");
        },

        disconnectObserver() {
            if (this.observer) {
                Logger.info("Disconnecting Observer.");
                this.observer.disconnect();
                this.observer = null;
            }
        }
    };

    // --- Main Initialization Logic ---
    async function initialize() {
        Logger.info("Chat Clapper initializing...");

        // --- 1. Bridging (Run early at document-start) ---
        // Bridge GM functions immediately if available.
        // GM functions are passed directly from the userscript grant scope.
        BridgeService.bridgeGmFunctions(
            typeof GM_getValue === 'function' ? GM_getValue : undefined,
            typeof GM_setValue === 'function' ? GM_setValue : undefined
        );

        // --- Wait for DOMContentLoaded for the rest ---
        // Make sure the DOM is ready before trying to access/manipulate it or load config that might depend on it indirectly.
        if (document.readyState === 'loading') {
            // Logger.debug('DOM not ready, waiting for DOMContentLoaded...');
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
            // Logger.debug('DOMContentLoaded event fired.');
        } else {
            // Logger.debug('DOM already interactive or complete.');
        }

        // --- 2. Check if on Config UI Page ---
        if (window.location.href.startsWith(CONFIG_UI_URL_PREFIX)) {
            Logger.warn("On config UI page, initializing DB and exposing global history getter.");
            try {
                // Init DB for potential history viewing on config page
                await DatabaseService.initDB();
                // Expose the getter, binding `this` to DatabaseService
                BridgeService.exposeDbGetter((limit) => DatabaseService.GlobalHistoryManager.getGlobalRecentMessages(limit, GM_getValue));
                Logger.info("DB initialized and getter exposed for config UI.");
            } catch (error) {
                Logger.fail("Failed to initialize DB for config UI:", error);
            }
            // Stop further execution for the main clapping logic
            return;
        }

        Logger.info("Not on config UI page, proceeding with full initialization.");

        // --- 3. Initialize Database ---
        try {
            await DatabaseService.initDB();
            // Expose DB getter here too, after DB init
            BridgeService.exposeDbGetter(DatabaseService.getRecentMessages.bind(DatabaseService));
        } catch (error) {
            Logger.fail("Failed to initialize database. Clapper cannot run without DB history features.", error);
            // Decide if we should stop entirely. For now, we stop.
            return;
        }

        // --- 4. Load Configuration ---
        let config;
        try {
            // Pass the actual GM_getValue function
            config = await ConfigService.loadConfig(
                typeof GM_getValue === 'function' ? GM_getValue : undefined
            );
            if (!config) { throw new Error("Failed to load config."); }
        } catch (error) {
            Logger.fail("Failed to load configuration. Stopping.", error);
            return; // Stop if config fails
        }

        // --- 5. Find and Validate Site-Specific Configuration ---
        const { siteKey, siteConfig, globalConfig } = ConfigService.findSiteConfig(window.location.href);

        if (!siteKey || !siteConfig) {
            Logger.warn("No matching site configuration found for this URL. Stopping clapper logic for this page.");
            return;
        }

        const validatedConfig = ConfigService.getValidatedConfig(siteKey, siteConfig, globalConfig);

        if (!validatedConfig) {
            Logger.fail("Configuration validation failed. Stopping.");
            return;
        }

        // --- 6. Wait for Chat Container ---
        let chatContainerElement;
        try {
            chatContainerElement = await DomService.waitForElement(validatedConfig.selectors.containerSelector);
        } catch (error) {
            Logger.fail(`Could not find chat container "${validatedConfig.selectors.containerSelector}". Stopping.`, error);
            return;
        }

        // --- 7. Start the Observer ---
        // Pass validated config and service instances
        ObserverService.startObserver(
            chatContainerElement,
            validatedConfig,
            DatabaseService, // Pass the service itself
            DomService
        );

        Logger.info("Chat Clapper initialization complete.");

        if (typeof unsafeWindow !== 'undefined') {
            unsafeWindow.chatClapper_isGmReady = true;
            // Logger.debug("Signaling readiness to test/UI (chatClapper_isGmReady = true)");
        }
    }

    // --- Start Initialization ---
    // Run the async initialization function. Errors within are caught and logged.
    initialize().catch(err => {
        Logger.fail("Unhandled error during initialization:", err);
    });

})(); // End of IIFE