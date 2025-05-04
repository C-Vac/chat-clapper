// ui/src/services/configService.ts

// --- Define the structure Types (duplicate from prompt for clarity) ---
interface Config {
  global: GlobalSettings;
  sites: Record<string, SiteConfig>; // Key is the URL match pattern string
}

interface GlobalSettings {
  replacementText: string;
  delaySeconds: number;
}

interface SiteConfig {
  label?: string; // Optional display name
  users: string[]; // List of usernames
  selectors: {
    container: string;
    author: string;
    content: string;
  };
}
// --- End Types ---

const CONFIG_KEY = 'chatClapperConfig';

// --- Default Config Structure ---
// Ensures we always start with a valid, non-null object structure
const DEFAULT_CONFIG: Config = {
  global: {
    replacementText: "[Message Clapped by User]", // Default replacement text
    delaySeconds: 3                           // Default delay
  },
  sites: {} // Start with no sites configured by default
};

// --- Load Config Function (Handles Defaults) ---
export const loadConfig = async (): Promise<Config> => {
  console.log("ConfigService: Attempting to load config...");
  try {
    // Try to get the stored value, default to null if not found
    const storedValue = await GM_getValue(CONFIG_KEY, null);

    // Basic validation: Check if it exists and looks like an object with core keys
    if (
        storedValue === null ||
        typeof storedValue !== 'object' ||
        !storedValue.global || // Check if 'global' key exists
        !storedValue.sites    // Check if 'sites' key exists
       ) {
      console.warn("ConfigService: No valid config found in storage or structure mismatch. Initializing with defaults.");
      // Return a DEEP COPY of the default config
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    } else {
      console.log("ConfigService: Valid config loaded from storage:", storedValue);
      // TODO: Optionally perform a deep merge with defaults here
      // to ensure *all* expected fields exist if the stored structure
      // might be missing newer fields. For now, assume loaded structure is sufficient.
      return storedValue as Config; // Cast to Config type, assuming it's valid
    }
  } catch (e) {
    console.error("ConfigService: Error during config load, returning defaults.", e);
    // Return a DEEP COPY of default config on any error
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
};

// --- Save Config Function ---
export const saveConfig = async (configObject: Config): Promise<void> => {
  console.log("ConfigService: Attempting to save config...", configObject);
  try {
    // Assume configObject is always a valid Config structure from the UI state
    await GM_setValue(CONFIG_KEY, configObject);
    console.log("ConfigService: Config saved successfully.");
  } catch (e) {
    console.error("ConfigService: Error saving config.", e);
  }
};

// --- Check GM Readiness ---
// (Keep this as before, used by App.tsx to decide view)
export const checkGmReady = (): boolean => {
 return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
};