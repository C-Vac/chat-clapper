// ui/src/services/configService.ts

// --- TypeScript Declaration Augmentation ---
// Tell TypeScript that our custom properties might exist on the window
declare global {
    interface Window {
        chatClapper_GM_getValue?: typeof GM_getValue; // Use the original type signature
        chatClapper_GM_setValue?: typeof GM_setValue; // Use the original type signature
        chatClapper_isGmReady?: boolean;
    }
}
// --- Type Definitions ---
// Define the structure of the configuration object
// (These should match the types expected by the userscript and UI)
export type Selector = {
  container: string;
  author: string;
  content: string;
};

export type Site = {
  label?: string; // Optional display name
  users: string[]; // List of usernames to block
  selectors: Selector;
};

export type Config = {
  global: {
     replacementText: string; // Text to replace blocked messages with
     delaySeconds: number; // Delay before replacing message
  }
  sites: Record<string, Site>; // Key is the URL pattern string
};
// --- End Types ---

// Internal constant for the storage key - not exposed to the UI component
const CONFIG_KEY = 'chatClapperConfig';

// Default configuration structure
const DEFAULT_CONFIG: Config = {
  global: {
    replacementText: "[Message Clapped by Goblin]",
    delaySeconds: 3
  },
  sites: {} // Start with no sites configured
};

export const checkGmReady = (): boolean => {
  // Prefer checking the explicit flag set by the userscript bridge,
  // otherwise check for the functions themselves.
  const ready = typeof window !== 'undefined' &&
                (window.chatClapper_isGmReady === true ||
                 (typeof window.chatClapper_GM_getValue === 'function' &&
                  typeof window.chatClapper_GM_setValue === 'function'));

  console.log(`ConfigService: checkGmReady() result = ${ready}`);
  return ready;
};

/**
 * Loads the entire configuration object from userscript storage.
 * Assumes the underlying bridged GM_getValue function exists.
 * Returns the loaded config or a default config if not found or on error.
 * @returns {Promise<Config>} The loaded or default configuration object.
 */
export const getConfig = async (): Promise<Config> => {
  console.log("ConfigService: getConfig() called.");

  // Check if the required bridged function exists on window
  if (typeof window.chatClapper_GM_getValue !== 'function') {
      const errorMsg = "ConfigService: FATAL - Bridged function window.chatClapper_GM_getValue not found!";
      console.error(errorMsg);
      throw new Error(errorMsg);
  }

  try {
    // Call the bridged function, providing the specific key and a default value (null)
    const storedValue = await window.chatClapper_GM_getValue(CONFIG_KEY, null);

    // Basic validation of the loaded structure
    if (storedValue === null || typeof storedValue !== 'object' || !storedValue.global || !storedValue.sites) {
      console.warn("ConfigService: No valid config found in storage or structure mismatch. Returning defaults.");
      // Return a deep copy of the default config
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    } else {
      console.log("ConfigService: Valid config loaded:", storedValue);
      // Return the validated, stored config
      return storedValue as Config;
    }
  } catch (e) {
    console.error("ConfigService: Error during getConfig execution:", e);
    // Return a deep copy of the default config on any error during the async call
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
};

/**
 * Saves the entire configuration object to userscript storage.
 * Assumes the underlying bridged GM_setValue function exists.
 * @param {Config} configObject - The complete configuration object to save.
 * @returns {Promise<void>}
 */
export const setConfig = async (configObject: Config): Promise<void> => {
  console.log("ConfigService: setConfig() called with:", configObject);

   // Check if the required bridged function exists on window
   if (typeof window.chatClapper_GM_setValue !== 'function') {
       const errorMsg = "ConfigService: FATAL - Bridged function window.chatClapper_GM_setValue not found! Cannot save.";
       console.error(errorMsg);
       throw new Error(errorMsg);
  }

  try {
    // Call the bridged function with the specific key and the config object
    await window.chatClapper_GM_setValue(CONFIG_KEY, configObject);
    console.log("ConfigService: Config saved successfully.");
  } catch (e) {
    console.error("ConfigService: Error during setConfig execution:", e);
    // Rethrow or handle as needed
    // throw e;
  }
};