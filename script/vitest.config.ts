import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Increase timeout for E2E tests which involve browser startup, navigation etc.
    testTimeout: 30000, // 30 seconds (adjust as needed)
    hookTimeout: 40000, // Timeout for beforeAll/afterAll hooks
    // Define specific test inclusion pattern if needed
    include: ['test/e2e.spec.js'],
    // Ensure Node.js environment for server/playwright control
    environment: 'node',
    // Turn off globals if you prefer explicit imports (import { describe, it ... } from 'vitest')
    globals: true, // Or false
     // Required for ES Modules in Node (like import express from 'express')
     poolOptions: {
       threads: {
         // Required for top-level await, ES Modules etc. in worker threads
         // See: https://vitest.dev/config/#pooloptions-threads-singlethread
         // singleThread: true // Use if facing issues with server/browser setup in parallel threads
       },
     },
  },
   // Required if using ES modules in Node.js tests/server files
   resolve: {
     // Add '.js' if not already present for imports without extension
     extensions: ['.js', '.mjs', '.ts'],
   },
});