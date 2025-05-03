// script/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Use JSDOM for browser-like environment
    globals: true, // Optional: Make vitest globals available without imports
    setupFiles: ['./tests/mocks/gmAPI.mock.js'], // Optional: Run mock setup before tests
  },
});