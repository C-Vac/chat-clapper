// test/e2e.spec.js
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium } from 'playwright';
import { startServer, stopServer } from './server.js'; // Adjust path if needed
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants ---
const PORT = 3005; // Must match server.js
const BASE_URL = `http://localhost:${PORT}`;
const USERSCRIPT_PATH = path.join(__dirname, '..', 'userscript.refactored.user.js'); // Adjust path to your userscript file

// --- Test Config ---
const testConfig = {
    global: {
        replacementText: "[TEST CLAP]",
        delaySeconds: 0.1 // Use short delay for faster tests
    },
    sites: {
        [`${BASE_URL}/site1`]: { // Use template literal for dynamic port/base
            label: "Test Site 1",
            users: ["eve_the_target", "goofyuser"], // Lowercase!
            selectors: {
                container: "#chat-box",
                author: ".message .author", // More specific selector
                content: ".message .content" // More specific selector
            }
        },
        [`${BASE_URL}/site2`]: {
            label: "Test Site 2",
            users: ["heidi_target"], // Lowercase!
            selectors: { // Can be same structure, different site
                container: "#chat-box",
                author: ".message .author",
                content: ".message .content"
            }
        },
        // Add a site that *won't* match to test exclusion
        "https://nevermatch.example.com": {
            users: ["no_one"],
            selectors: { container: "body", author: "h1", content: "h1" }
        }
    }
};

// --- Playwright & Server Setup ---
let browser;
let page;
let context; // Use context for better isolation

beforeAll(async () => {
    await startServer();
    browser = await chromium.launch({
        // headless: false, // Uncomment to see the browser window
        // slowMo: 50 // Slow down operations for debugging
    });
});

afterAll(async () => {
    await browser?.close();
    await stopServer();
});

// --- Helper Functions ---

// Injects mocks and the userscript *before* page navigation
async function setupPageWithUserscript(pageInstance, config) {
    const userscriptContent = fs.readFileSync(USERSCRIPT_PATH, 'utf8');

    await pageInstance.addInitScript((configToInject) => {
        // --- Mock GM functions ---
        window.chatClapper_GM_getValue = async (key, defaultValue) => {
            console.log(`[Mock GM_getValue] Called with key: ${key}`);
            if (key === 'chatClapperConfig') {
                // Return the specific config for this test setup
                return Promise.resolve(JSON.stringify(configToInject));
            }
            return Promise.resolve(defaultValue);
        };
        window.chatClapper_GM_setValue = async (key, value) => {
            console.log(`[Mock GM_setValue] Called with key: ${key}`, value);
            // Could potentially store this in a variable for verification if needed
            return Promise.resolve();
        };
        // Mock ready flag (Userscript sets this)
        // window.chatClapper_isGmReady = true; // The userscript itself should set this

        // Mock unsafeWindow for bridging if the script uses it directly
        window.unsafeWindow = window;

        console.log('[Mock InitScript] GM mocks installed.');

        // --- Mock IndexedDB (Optional - Usually better to use real one) ---
        // Using the real IndexedDB provided by the browser context is generally
        // better for E2E testing fidelity. If you *need* fake-indexeddb here:
        // import FakeIndexedDB from 'fake-indexeddb'; // Requires bundling or different setup
        // window.indexedDB = new FakeIndexedDB();

    }, config); // Pass the config object to the init script

    // Inject the actual userscript code AFTER the mocks are set up
    await pageInstance.addInitScript(userscriptContent);

    console.log(`[Test Setup] Injected mocks and userscript.`);
}

// Clears IndexedDB for the current origin
async function clearIndexedDB(pageInstance) {
    await pageInstance.evaluate(async (dbName) => {
        console.log(`[Test Util] Clearing IndexedDB: ${dbName}`);
        try {
            const databases = await indexedDB.databases();
            const dbInfo = databases.find(db => db.name === dbName);

            if (dbInfo) {
                await new Promise((resolve, reject) => {
                    const deleteRequest = indexedDB.deleteDatabase(dbName);
                    deleteRequest.onsuccess = () => {
                        console.log(`[Test Util] DB ${dbName} deleted successfully.`);
                        resolve();
                    };
                    deleteRequest.onerror = (event) => {
                        console.error(`[Test Util] Error deleting DB ${dbName}:`, event.target.error);
                        reject(event.target.error);
                    };
                    deleteRequest.onblocked = () => {
                        console.warn(`[Test Util] Deleting DB ${dbName} blocked. Close connections?`);
                        // This might happen if the userscript still holds a connection.
                        // Might need a reload or more robust handling.
                        reject(new Error('DB delete blocked'));
                    };
                });
            } else {
                console.log(`[Test Util] DB ${dbName} not found, skipping delete.`);
            }
        } catch (error) {
            // Handle environments where indexedDB.databases() isn't available or fails
            if (error.name === 'SecurityError') {
                console.warn('[Test Util] Cannot list IndexedDB databases due to security restrictions. Attempting direct delete.');
                // Fallback: try direct deletion without checking existence
                await new Promise((resolve, reject) => {
                    const deleteRequest = indexedDB.deleteDatabase(dbName);
                    deleteRequest.onsuccess = resolve;
                    deleteRequest.onerror = reject;
                    deleteRequest.onblocked = () => reject(new Error('DB delete blocked'));
                }).catch(err => console.error(`[Test Util] Direct DB delete failed for ${dbName}:`, err));

            } else {
                console.error('[Test Util] Error accessing indexedDB.databases():', error);
            }
        }
    }, 'chatClapperHistoryDB'); // Pass DB name from userscript
    // Add a small delay to allow deletion process to complete if needed
    await pageInstance.waitForTimeout(100);
}


// --- Test Suites ---
describe('Chat Clapper Userscript E2E', () => {

    beforeEach(async () => {
        context = await browser.newContext(); // New context for isolation
        page = await context.newPage();

        // Log console messages from the page to the test output
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            // Filter out less important messages if needed
            // if (text.includes('Some noisy message')) return;
            console.log(`[Browser Console.${type}] ${text}`);
        });
        page.on('pageerror', error => {
            console.error(`[Browser Page Error] ${error}`);
        });

        // Clear IndexedDB before each test for the origin we'll visit
        // Need to navigate first to establish an origin context for DB operations
        await page.goto(BASE_URL); // Go to base first
        await clearIndexedDB(page);
    });

    afterEach(async () => {
        await context?.close(); // Close context to clean up resources
    });

    // --- Test Scenario 1: Site 1 ---
    describe('Site 1 Functionality', () => {
        const site1Url = `${BASE_URL}/site1`;

        beforeEach(async () => {
            // Setup mocks and script *before* navigation to the actual test page
            await setupPageWithUserscript(page, testConfig);
            await page.goto(site1Url);
            // Wait for the chat box to be present (basic check)
            await page.waitForSelector('#chat-box');
            // Optional: Wait for a specific log message from the userscript indicating readiness
            await page.waitForFunction(() => window.chatClapper_isGmReady === true, null, { timeout: 5000 });
            console.log(`[Test] Navigated to ${site1Url} and userscript should be ready.`);
        });

        it('should load and find the chat container', async () => {
            // The beforeEach already waited for #chat-box
            const chatBox = page.locator('#chat-box');
            await expect(chatBox).toBeVisible();
        });

        it('should clap a message from a target user after delay', async () => {
            const targetUser = 'Eve_The_Target'; // Matches config (case-insensitive)
            const originalMessage = 'This message must be clapped!';
            const expectedClapText = testConfig.global.replacementText;

            // Add the message using the page's function
            await page.evaluate(([author, text]) => window.addChatMessage(author, text), [targetUser, originalMessage]);

            // Wait for slightly longer than the configured delay
            await page.waitForTimeout(testConfig.global.delaySeconds * 1000 + 100); // e.g., 100ms + 100ms

            // Find the message content element
            // Need a way to uniquely identify the added message if multiple exist
            // Using :last-child is brittle, better to use IDs if possible (added in fixture)
            const lastMessage = page.locator('.message:last-child'); // Assuming last added
            const messageContent = lastMessage.locator('.content');

            // Assert content replacement
            await expect(messageContent).toHaveText(expectedClapText);

            // Assert styling (opacity and font-style)
            await expect(lastMessage).toHaveCSS('opacity', '0.5');
            await expect(lastMessage).toHaveCSS('font-style', 'italic');
        });

        it('should NOT clap a message from a non-target user', async () => {
            const normalUser = 'Alice';
            const originalMessage = 'This is a normal message.';

            await page.evaluate(([author, text]) => window.addChatMessage(author, text), [normalUser, originalMessage]);
            await page.waitForTimeout(testConfig.global.delaySeconds * 1000 + 100);

            const lastMessage = page.locator('.message:last-child');
            const messageContent = lastMessage.locator('.content');

            // Assert content is UNCHANGED
            await expect(messageContent).toHaveText(originalMessage);

            // Assert styling is NOT applied
            await expect(lastMessage).not.toHaveCSS('opacity', '0.5');
            await expect(lastMessage).not.toHaveCSS('font-style', 'italic');
        });

        it('should store clapped message details in IndexedDB', async () => {
            const targetUser = 'GoofyUser'; // Second user from site1 config
            const originalMessage = 'Clap me too!';
            const siteKey = `${BASE_URL}/site1`; // Key used in config

            await page.evaluate(([author, text]) => window.addChatMessage(author, text), [targetUser, originalMessage]);
            await page.waitForTimeout(testConfig.global.delaySeconds * 1000 + 100);

            // Verify IndexedDB content
            const dbMessages = await page.evaluate(async (dbName, storeName) => {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(dbName);
                    request.onerror = (event) => reject(`DB open error: ${event.target.error}`);
                    request.onsuccess = (event) => {
                        const db = event.target.result;
                        try {
                            const transaction = db.transaction([storeName], 'readonly');
                            const store = transaction.objectStore(storeName);
                            const getAllRequest = store.getAll();
                            getAllRequest.onerror = (event) => reject(`Store getAll error: ${event.target.error}`);
                            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
                        } catch (e) {
                            reject(`Transaction/Store error: ${e.message}`);
                        }
                    };
                });
            }, 'chatClapperHistoryDB', 'blockedMessages');

            expect(dbMessages).toBeInstanceOf(Array);
            expect(dbMessages).toHaveLength(1); // Only this message should be clapped in this test run

            const storedMsg = dbMessages[0];
            expect(storedMsg.author).toBe(targetUser.toLowerCase()); // Userscript stores lowercase
            expect(storedMsg.originalContent).toBe(originalMessage);
            expect(storedMsg.clappedContent).toBe(testConfig.global.replacementText);
            expect(storedMsg.site).toBe(siteKey);
            expect(storedMsg.timestamp).toBeTypeOf('number');
            expect(storedMsg.id).toBeTypeOf('number'); // Should have auto-incremented ID
        });
    });

    // --- Test Scenario 2: Site 2 ---
    describe('Site 2 Functionality', () => {
        const site2Url = `${BASE_URL}/site2`;

        beforeEach(async () => {
            await setupPageWithUserscript(page, testConfig);
            await page.goto(site2Url);
            await page.waitForSelector('#chat-box');
            await page.waitForFunction(() => window.chatClapper_isGmReady === true, null, { timeout: 5000 });
            console.log(`[Test] Navigated to ${site2Url} and userscript should be ready.`);
        });

        it('should clap message from site 2 target user', async () => {
            const targetUser = 'Heidi_Target';
            const originalMessage = 'Site 2 clap!';

            await page.evaluate(([author, text]) => window.addChatMessage(author, text), [targetUser, originalMessage]);
            await page.waitForTimeout(testConfig.global.delaySeconds * 1000 + 100);

            const lastMessage = page.locator('.message:last-child');
            const messageContent = lastMessage.locator('.content');

            await expect(messageContent).toHaveText(testConfig.global.replacementText);
            await expect(lastMessage).toHaveCSS('opacity', '0.5');
        });

        it('should NOT clap message from site 1 target user on site 2', async () => {
            const site1TargetUser = 'Eve_The_Target'; // Configured for site 1, not site 2
            const originalMessage = 'Should not clap here.';

            await page.evaluate(([author, text]) => window.addChatMessage(author, text), [site1TargetUser, originalMessage]);
            await page.waitForTimeout(testConfig.global.delaySeconds * 1000 + 100);

            const lastMessage = page.locator('.message:last-child');
            const messageContent = lastMessage.locator('.content');

            await expect(messageContent).toHaveText(originalMessage); // Unchanged
            await expect(lastMessage).not.toHaveCSS('opacity', '0.5');
        });

        it('should store site 2 clapped message with correct site key', async () => {
            const targetUser = 'Heidi_Target';
            const originalMessage = 'Storing for site 2';
            const siteKey = `${BASE_URL}/site2`; // Key used in config

            await page.evaluate(([author, text]) => window.addChatMessage(author, text), [targetUser, originalMessage]);
            await page.waitForTimeout(testConfig.global.delaySeconds * 1000 + 100);

            const dbMessages = await page.evaluate(async (dbName, storeName) => {
                // (Same DB access logic as in site 1 test)
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(dbName);
                    request.onerror = (event) => reject(`DB open error: ${event.target.error}`);
                    request.onsuccess = (event) => {
                        const db = event.target.result;
                        try {
                            const transaction = db.transaction([storeName], 'readonly');
                            const store = transaction.objectStore(storeName);
                            const getAllRequest = store.getAll();
                            getAllRequest.onerror = (event) => reject(`Store getAll error: ${event.target.error}`);
                            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
                        } catch (e) {
                            reject(`Transaction/Store error: ${e.message}`);
                        }
                    };
                });
            }, 'chatClapperHistoryDB', 'blockedMessages');

            expect(dbMessages).toHaveLength(1);
            const storedMsg = dbMessages[0];
            expect(storedMsg.author).toBe(targetUser.toLowerCase());
            expect(storedMsg.originalContent).toBe(originalMessage);
            expect(storedMsg.site).toBe(siteKey); // Verify correct site key
        });
    });

    // --- Test Scenario 3: Unconfigured Site ---
    // (Optional but good) - Test that the script doesn't run on a page not matching any config
    // This requires a page the server doesn't explicitly handle or one that doesn't match patterns.
    // For simplicity, we can assume the server's default '/' route is not in the config.
    describe('Unconfigured Site', () => {
        const unconfiguredUrl = `${BASE_URL}/`; // Assuming '/' is not in testConfig.sites

        beforeEach(async () => {
            await setupPageWithUserscript(page, testConfig);
            await page.goto(unconfiguredUrl);
            // Wait for body or some basic element
            await page.waitForSelector('body');
            console.log(`[Test] Navigated to unconfigured URL ${unconfiguredUrl}.`);
        });

        it('should not initialize the observer if no site config matches', async () => {
            // Check for a log message that indicates *no* site config was found
            // This relies on specific logging in the userscript.
            // Alternatively, check that the observer wasn't attached or DB wasn't fully initialized.
            // We can check if the 'chatClapper_getRecentMessages' was exposed (it should be if DB init happened)
            // but the observer setup logs shouldn't appear.

            // Example: Check if a known "success" log from observer init *doesn't* appear
            let observerSuccessLogFound = false;
            page.on('console', msg => {
                if (msg.text().includes('[ChatClapper] [SUCCESS] Observer attached and watching')) {
                    observerSuccessLogFound = true;
                }
            });

            // Give script time to potentially initialize if it were going to
            await page.waitForTimeout(500);

            expect(observerSuccessLogFound).toBe(false);

            // Also check if the DB init *did* happen (it should, before site check)
            const isDbGetterExposed = await page.evaluate(() => typeof window.chatClapper_getRecentMessages === 'function');
            expect(isDbGetterExposed).toBe(true); // DB init should still run

        });
    });

});