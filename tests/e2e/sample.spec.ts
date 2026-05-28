import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies the Suitelet is reachable and returns a non-error page.
 * Replace this with real feature specs once ns-tdm scenarios are defined.
 *
 * @author Wichit Wongta
 */

// Enable once customscript_xxx_sl is replaced with a real script object
test.skip('Suitelet responds without error', async ({ page }) => {
  const response = await page.goto(
    '/app/site/hosting/scriptlet.nl?script=customscript_xxx_sl&deploy=1',
  );
  expect(response?.status()).not.toBe(404);
  expect(response?.status()).not.toBe(500);
  await page.screenshot({ path: 'playwright-report/shots/smoke.png', fullPage: true });
});
