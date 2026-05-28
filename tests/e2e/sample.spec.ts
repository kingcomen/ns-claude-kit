import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies the SDB Suitelet is reachable and returns a non-error page.
 *
 * @author Wichit Wongta
 */

test('Suitelet responds without error', async ({ page }) => {
  const response = await page.goto(
    '/app/site/hosting/scriptlet.nl?script=3292&deploy=1',
  );
  expect(response?.status()).not.toBe(404);
  expect(response?.status()).not.toBe(500);
  await page.screenshot({ path: 'playwright-report/shots/smoke.png', fullPage: true });
});
