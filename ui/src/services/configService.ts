const CONFIG_KEY = "chatClapperConfig";

export const loadConfig = async (): Promise<object> => {
  try {
    let configJson = "{}";
    if (typeof GM_getValue === "function") {
      configJson = await GM_getValue(CONFIG_KEY, "{}");
      console.log("UI: Loaded config via GM_getValue");
    } else {
      console.warn("UI: GM_getValue not found, using localStorage fallback for DEV.");
      configJson = localStorage.getItem(CONFIG_KEY) || "{}";
    }
    return JSON.parse(configJson);
  } catch (e) {
    console.error("UI: Failed to load or parse config:", e);
    return {};
  }
};

export const saveConfig = async (configObject: object): Promise<void> => {
  try {
    const configJson = JSON.stringify(configObject, null, 2);
    if (typeof GM_setValue === "function") {
      await GM_setValue(CONFIG_KEY, configJson);
      console.log("UI: Saved config via GM_setValue");
    } else {
      console.warn("UI: GM_setValue not found, using localStorage fallback for DEV.");
      localStorage.setItem(CONFIG_KEY, configJson);
    }
  } catch (e) {
    console.error("UI: Failed to save config:", e);
  }
};

export const checkGmReady = (): boolean => {
 return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
};