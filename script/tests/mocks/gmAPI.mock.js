// script/tests/mocks/gmAPI.mock.js
import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Load initial config from a fixture for tests
let mockStorage = {};
try {
    const configPath = path.resolve(__dirname, '../fixtures/config.dev.json');
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    mockStorage['chatClapperConfig'] = rawConfig; // Store the raw JSON string
    console.log('Mock GM_API: Loaded config.dev.json');
} catch (err) {
    console.error('Mock GM_API: Failed to load config.dev.json', err);
    mockStorage['chatClapperConfig'] = '{}'; // Default if file missing/error
}


global.GM_getValue = vi.fn((key, defaultValue) => {
    console.log(`Mock GM_getValue called for key: ${key}`);
    return mockStorage[key] !== undefined ? mockStorage[key] : defaultValue;
});

global.GM_setValue = vi.fn((key, value) => {
    console.log(`Mock GM_setValue called for key: ${key}`);
    mockStorage[key] = value;
    // Optionally write back to config.dev.json if you want persistence between test runs
    // try {
    //    if (key === 'chatClapperConfig') {
    //       const configPath = path.resolve(__dirname, '../fixtures/config.dev.json');
    //       fs.writeFileSync(configPath, value, 'utf-8');
    //    }
    // } catch (err) { console.error('Mock GM_setValue: Failed to write config', err); }
});

// Mock other GM functions if needed (GM_addStyle, etc.)