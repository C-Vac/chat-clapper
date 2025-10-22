import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/mocks/setup.js'],
    include: ['**/*.spec.js'],
    testTimeout: 30000, // Increase timeout for Playwright tests
    hookTimeout: 30000,
  },
});
