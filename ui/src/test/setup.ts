// ui/src/test/setup.ts
import '@testing-library/jest-dom'; // Extend expect with DOM matchers
import { vi } from 'vitest';

// --- Mock Bridged GM_* functions on window for UI tests ---
const mockStorage: Record<string, string> = {}; // In-memory mock store
const CONFIG_KEY_TEST = 'chatClapperConfig_TEST'; // Use if needed

// Define the functions directly on the test environment's window
window.chatClapper_GM_getValue = vi.fn(async (key: string, defaultValue: any): Promise<any> => {
    console.log(`[Test Mock window.chatClapper_GM_getValue] key: ${key}`);
    const stored = mockStorage[key];
    if (stored === undefined) {
        console.log(`[Test Mock window.chatClapper_GM_getValue] returning default:`, defaultValue);
        return defaultValue;
    }
    try {
        const parsed = JSON.parse(stored);
        console.log(`[Test Mock window.chatClapper_GM_getValue] returning parsed:`, parsed);
        return parsed;
    } catch {
        console.log(`[Test Mock window.chatClapper_GM_getValue] returning default after parse error:`, defaultValue);
        return defaultValue;
    }
});

window.chatClapper_GM_setValue = vi.fn(async (key: string, value: any): Promise<void> => {
    console.log(`[Test Mock window.chatClapper_GM_setValue] key: ${key}, value:`, value);
    mockStorage[key] = JSON.stringify(value);
});

// Mock the readiness flag as well
window.chatClapper_isGmReady = true; // Default to ready for most tests

// --- TypeScript Declarations for Test Environment ---
// Re-declare global augmentation if needed within test setup scope,
// although having it once in configService.ts might be sufficient
// if your tsconfig includes test files correctly.
declare global {
    interface Window {
        chatClapper_GM_getValue?: typeof GM_getValue;
        chatClapper_GM_setValue?: typeof GM_setValue;
        chatClapper_isGmReady?: boolean;
    }
}