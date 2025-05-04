// ui/src/test/setup.ts
import '@testing-library/jest-dom'; // Extend expect with DOM matchers
import { vi } from 'vitest';

// --- Mock GM_* functions globally for UI tests ---
// (Similar mock logic as before, using localStorage or in-memory)
// Make sure this runs *before* tests that need GM_*
const mockStorage: Record<string, string> = {}; // In-memory mock store
const CONFIG_KEY_TEST = 'chatClapperConfig_TEST';

global.GM_getValue = vi.fn(async (key: string, defaultValue: any): Promise<any> => {
    console.log(`[Test Mock GM_getValue] key: ${key}`);
    const stored = mockStorage[key];
    if (stored === undefined) return defaultValue;
    try { return JSON.parse(stored); } catch { return defaultValue; }
});

global.GM_setValue = vi.fn(async (key: string, value: any): Promise<void> => {
    console.log(`[Test Mock GM_setValue] key: ${key}, value:`, value);
    mockStorage[key] = JSON.stringify(value);
});

// Declare types again if needed within test environment scope
declare global {
    // Re-declare namespace if needed, or ensure tsconfig handles it
    // namespace NodeJS { ... }
    // Re-declare window types if needed
    interface Window {
        GM_getValue: (key: string, defaultValue: any) => Promise<any>;
        GM_setValue: (key: string, value: any) => Promise<void>;
    }
}