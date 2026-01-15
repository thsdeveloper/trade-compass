import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MoneyCompass e2e tests
 *
 * Tests run against the Next.js frontend (port 3000) and Fastify backend (port 3001)
 * Both servers must be running before executing tests.
 */
export default defineConfig({
  testDir: './e2e/tests',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: 'html',

  // Shared settings for all projects
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev servers before starting the tests
  // Note: This assumes you have init.sh that starts both servers
  // For manual testing, start servers separately:
  // - Backend: cd back && pnpm dev (port 3001)
  // - Frontend: cd front && pnpm dev (port 3000)
  webServer: [
    {
      command: 'cd back && pnpm dev',
      port: 3001,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd front && pnpm dev',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
