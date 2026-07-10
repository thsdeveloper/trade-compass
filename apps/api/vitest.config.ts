import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load environment variables from .env file for tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
