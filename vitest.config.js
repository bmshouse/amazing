// vitest.config.js - Test configuration with DOM environment
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      exclude: [
        'libs/**',
        'node_modules/**',
        'tests/**',
        '**/*.test.js',
        '**/setup.js'
      ]
    }
  }
});