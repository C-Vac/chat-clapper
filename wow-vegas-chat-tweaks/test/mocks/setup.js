import { vi, beforeEach } from 'vitest';
import { IDBPFactory } from 'fake-indexeddb'; // Import fake-indexeddb

// Mock global objects/functions needed by the script
global.GM_getValue = vi.fn();
global.GM_setValue = vi.fn();
global.unsafeWindow = { // Mock unsafeWindow structure
    chatClapper_GM_getValue: undefined,
    chatClapper_GM_setValue: undefined,
    chatClapper_isGmReady: undefined,
    chatClapper_getRecentMessages: undefined,
};
global.indexedDB = new IDBPFactory(); // Use fake-indexeddb
global.CustomEvent = class CustomEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail;
    }
};
global.window.dispatchEvent = vi.fn();

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    // Reset fake IndexedDB before each test
    global.indexedDB = new IDBPFactory();
    // Reset unsafeWindow state
    global.unsafeWindow.chatClapper_GM_getValue = undefined;
    global.unsafeWindow.chatClapper_GM_setValue = undefined;
    global.unsafeWindow.chatClapper_isGmReady = undefined;
    global.unsafeWindow.chatClapper_getRecentMessages = undefined;
    // Reset GM mocks with default behavior if needed
    global.GM_getValue.mockResolvedValue('{}'); // Default: empty config
});
