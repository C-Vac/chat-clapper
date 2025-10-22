// ui/src/services/configService.ts

// --- TypeScript Declaration Augmentation ---
// Tell TypeScript that our custom properties might exist on the window
declare global {
    interface Window {
        // Config functions bridged from userscript
        chatClapper_GM_getValue?: (key: string, defaultValue: any) => Promise<any>; // Allowing more generic types for the raw bridge
        chatClapper_GM_setValue?: (key: string, value: Config) => Promise<void>;
        chatClapper_isGmReady?: boolean;

        // History function bridged from userscript
        chatClapper_getRecentMessages?: (limit?: number) => Promise<BlockedMessage[]>;
    }
}

const Logger = {
    log: (service: string, ...args: any[]) => { console.log(`[${service}]`, ...args); }, // Changed ...args to any[] for flexibility
    warn: (service: string, ...args: any[]) => { console.warn(`[${service}] [WARN]`, ...args); },
    error: (service: string, ...args: any[]) => { console.error(`[${service}] [ERROR]`, ...args); }
}

// --- Type Definitions ---

// Define the history message type (ensure this matches the userscript's structure)
export type BlockedMessage = {
    id: number; // Auto-incrementing ID from IndexedDB
    timestamp: number; // Timestamp when the message was stored (Date.now())
    author: string;
    originalContent?: string; // The content before it was clapped
    clappedContent: string; // The replacement text used
    site?: string; // The site key (URL pattern) where it was clapped
};

// Define the structure of the configuration object
export type Selector = {
    container: string;
    author: string;
    content: string;
};

export type Site = {
    label?: string; // Optional display name for the UI
    users: string[]; // List of usernames to block
    selectors: Selector;
};

export type Config = {
    global: {
        replacementText: string; // Text to replace blocked messages with
        delaySeconds: number; // Delay before replacing message
    }
    sites: Record<string, Site>; // Key is the URL pattern string (e.g., "https://*.example.com/*")
};
// --- End Types ---

const SERVICE_NAME = 'ConfigService';
const CONFIG_KEY = 'chatClapperConfig'; // Must match userscript

// Default configuration structure - used if nothing is loaded
const DEFAULT_CONFIG: Config = {
    global: {
        replacementText: "[Message Clapped]",
        delaySeconds: 3
    },
  sites: {
    // Example structure - UI could add more
    // "https://www.example-chat.com/*": {
    //   label: "Example Chat",
    //   users: ["badUser1", "annoyingGuy"],
    //   selectors: {
    //     container: "#chat-messages",
    //     author: ".username",
    //     content: ".message-text"
    //   }
    // }
  }
};

/**
 * Checks if the necessary userscript bridge functions are available on the window.
 * Prefers checking the explicit flag set by the userscript.
 * @returns {boolean} True if the bridge seems ready, false otherwise.
 */
export const checkGmReady = (): boolean => {
    const isReady = typeof window !== 'undefined' &&
        (window.chatClapper_isGmReady === true ||
            (typeof window.chatClapper_GM_getValue === 'function' &&
                typeof window.chatClapper_GM_setValue === 'function'));

    Logger.log(SERVICE_NAME, `checkGmReady() result = ${isReady}`);
    return isReady;
};

/**
 * Loads the entire configuration object from userscript storage via the bridge.
 * Returns the loaded config or a deep copy of the default config if not found or on error.
 * Throws an error if the required GM_getValue bridge function is missing.
 * @returns {Promise<Config>} The loaded or default configuration object.
 */
export const getConfig = async (): Promise<Config> => {
    // Logger.log(SERVICE_NAME, "getConfig() called.");

    if (typeof window.chatClapper_GM_getValue !== 'function') {
        const errorMsg = `${SERVICE_NAME}: FATAL - Bridged function window.chatClapper_GM_getValue not found! Cannot load config.`;
        Logger.error(SERVICE_NAME, errorMsg);
        throw new Error(errorMsg);
    }

    try {
        // Default value passed to GM_getValue is null to distinguish "not set" from "set to {}"
        const storedValue = await window.chatClapper_GM_getValue(CONFIG_KEY, null) as Config | null | undefined; // Explicitly cast what we expect

        // Validate the basic structure of the loaded config
        if (storedValue && typeof storedValue === 'object' && storedValue.global && storedValue.sites) {
            // Logger.log(SERVICE_NAME, "Valid config loaded from storage:", JSON.stringify(storedValue)); // Stringify for better console object inspection
            return storedValue as Config; // Assume structure is correct if basic checks pass
        } else if (storedValue === null || storedValue === undefined) {
            Logger.warn(SERVICE_NAME, "No config found in storage (GM_getValue returned null/undefined). Returning default config.");
            return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Return deep copy
        } else {
            Logger.warn(SERVICE_NAME, "Invalid config structure found in storage. Returning default config. Found:", JSON.stringify(storedValue));
            return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Return deep copy
        }
    } catch (e: any) { // Catch as any to access e.message
        Logger.error(SERVICE_NAME, "Error during getConfig execution:", e.message, e);
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
};

/**
 * Saves the entire configuration object to userscript storage via the bridge.
 * Throws an error if the required GM_setValue bridge function is missing or if saving fails.
 * @param {Config} configObject - The complete configuration object to save.
 * @returns {Promise<void>}
 */
export const setConfig = async (configObject: Config): Promise<void> => {
    // Logger.log(SERVICE_NAME, "setConfig() called with:", JSON.stringify(configObject));

    if (typeof window.chatClapper_GM_setValue !== 'function') {
        const errorMsg = `${SERVICE_NAME}: FATAL - Bridged function window.chatClapper_GM_setValue not found! Cannot save config.`;
        Logger.error(SERVICE_NAME, errorMsg);
        throw new Error(errorMsg);
    }

    try {
        await window.chatClapper_GM_setValue(CONFIG_KEY, JSON.parse(JSON.stringify(configObject))); // Ensure a clean object is passed
        // Logger.log(SERVICE_NAME, "Config saved successfully via bridge.");
    } catch (e: any) {
        Logger.error(SERVICE_NAME, "Error during setConfig execution via bridge:", e.message, e);
        throw e; // Rethrow the error
    }
};

/**
 * Retrieves recent blocked message history from the userscript via the bridge.
 * Throws an error if the required getRecentMessages bridge function is missing.
 * Returns an empty array if the retrieval fails for other reasons or response is invalid.
 * @param {number} [limit=10] - The maximum number of messages to retrieve.
 * @returns {Promise<BlockedMessage[]>} A promise resolving to an array of blocked messages.
 */
export const getMessageHistory = async (limit: number = 10): Promise<BlockedMessage[]> => {
    // Logger.log(SERVICE_NAME, `getMessageHistory(limit=${limit}) called.`);

    if (typeof window.chatClapper_getRecentMessages !== 'function') {
        const errorMsg = `${SERVICE_NAME}: FATAL - Bridged function window.chatClapper_getRecentMessages not found! Cannot load history.`;
        Logger.error(SERVICE_NAME, errorMsg);
        throw new Error(errorMsg);
    }

    try {
        const messages = await window.chatClapper_getRecentMessages(limit);
        // Logger.log(SERVICE_NAME, `Retrieved ${messages ? messages.length : 'null/undefined'} history messages via bridge.`);
        
        if (!Array.isArray(messages)) {
            Logger.warn(SERVICE_NAME, `Received non-array response from chatClapper_getRecentMessages. Returning empty array. Response:`, messages);
            return [];
        }
        return messages;
    } catch (e: any) {
        Logger.error(SERVICE_NAME, "Error during getMessageHistory execution via bridge:", e.message, e);
        return [];
    }
};