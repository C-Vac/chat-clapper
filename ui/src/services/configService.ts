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

// --- Define the structure Types (duplicate from prompt for clarity) ---
interface Config {
    global: GlobalSettings;
    sites: Record<string, SiteConfig>;
}
interface GlobalSettings {
    replacementText: string;
    delaySeconds: number;
}
interface SiteConfig {
    label?: string;
    users: string[];
    selectors: { container: string; author: string; content: string; };
}
// --- End Types ---

const CONFIG_KEY = 'chatClapperConfig';

const DEFAULT_CONFIG: Config = {
  global: { replacementText: "[Message Clapped by User]", delaySeconds: 3 },
  sites: {}
};

// --- Check GM Readiness (Updated) ---
export const checkGmReady = (): boolean => {
  console.log(`UI checkGmReady: Checking window.chatClapper_isGmReady = ${window.chatClapper_isGmReady}`);
  // Check the flag set by the userscript OR check the functions directly on window
  return window.chatClapper_isGmReady === true ||
         (typeof window.chatClapper_GM_getValue === 'function' &&
          typeof window.chatClapper_GM_setValue === 'function');
};

// --- Load Config Function (Updated) ---
export const loadConfig = async (): Promise<Config> => {
  console.log("ConfigService: Attempting to load config using bridged functions...");
  // Ensure checkGmReady is true before calling this, or handle potential errors
  if (!checkGmReady() || !window.chatClapper_GM_getValue) {
      console.warn("ConfigService: Bridged GM functions not ready. Returning defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  try {
    // Use the bridged function attached to window
    const storedValue = await window.chatClapper_GM_getValue(CONFIG_KEY, null);

    if (storedValue === null || typeof storedValue !== 'object' || !storedValue.global || !storedValue.sites) {
      console.warn("ConfigService: No valid config found via bridged function or structure mismatch. Initializing with defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    } else {
      console.log("ConfigService: Valid config loaded via bridged function:", storedValue);
      return storedValue as Config;
    }
  } catch (e) {
    console.error("ConfigService: Error during config load via bridged function, returning defaults.", e);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
};

// --- Save Config Function (Updated) ---
export const saveConfig = async (configObject: Config): Promise<void> => {
  console.log("ConfigService: Attempting to save config using bridged functions...", configObject);
   // Ensure checkGmReady is true before calling this, or handle potential errors
  if (!checkGmReady() || !window.chatClapper_GM_setValue) {
       console.error("ConfigService: Bridged GM functions not ready. Cannot save.");
       return; // Or throw an error
  }

  try {
    // Use the bridged function attached to window
    await window.chatClapper_GM_setValue(CONFIG_KEY, configObject);
    console.log("ConfigService: Config saved successfully via bridged function.");
  } catch (e) {
    console.error("ConfigService: Error saving config via bridged function.", e);
  }
};