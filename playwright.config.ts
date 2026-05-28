import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Playwright config — outer loop E2E against NetSuite Sandbox.
 * Key cost lever: log in ONCE in auth.setup.ts, persist session to
 * playwright/.auth/state.json, then every spec reuses it (no 2FA per test).
 *
 * @author Wichit Wongta
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // NetSuite SB shares state; keep serial to avoid data races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000, // NS pages render slowly
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: process.env.NS_BASE_URL, // e.g. https://1234567-sb1.app.netsuite.com
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/state.json' },
      dependencies: ['setup'],
    },
  ],
});
