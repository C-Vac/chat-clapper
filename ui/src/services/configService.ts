// ui/src/services/configService.ts

const CONFIG_KEY = 'chatClapperConfig';

// --- DEVELOPMENT MODE ---
// In dev, we might not have real GM_* functions.
// Option 1: Use localStorage as a stand-in during 'npm run dev'
// Option 2: Directly use mocked GM functions if possible/tests run UI
// Option 3: (Shown here) Fallback to localStorage if GM_* not found.

export const loadConfig = async (): Promise<object> => {
  try {
    let configJson = '{}';
    if (typeof GM_getValue === 'function') {
      configJson = await GM_getValue(CONFIG_KEY, '{}'); // Real GM is async usually
      console.log("Loaded config via GM_getValue");
    } else {
      console.warn("GM_getValue not found, using localStorage fallback for DEV.");
      configJson = localStorage.getItem(CONFIG_KEY) || '{}';
    }
    return JSON.parse(configJson);
  } catch (e) {
    console.error("Failed to load or parse config:", e);
    return {}; // Return empty object on error
  }
};

export const saveConfig = async (configObject: object): Promise<void> => {
  try {
    const configJson = JSON.stringify(configObject, null, 2); // Pretty print JSON
    if (typeof GM_setValue === 'function') {
      await GM_setValue(CONFIG_KEY, configJson); // Real GM is async usually
      console.log("Saved config via GM_setValue");
    } else {
      console.warn("GM_setValue not found, using localStorage fallback for DEV.");
      localStorage.setItem(CONFIG_KEY, configJson);
    }
  } catch (e) {
    console.error("Failed to save config:", e);
  }
};