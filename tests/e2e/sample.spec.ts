import { test, expect } from '@playwright/test';
import { seed, teardown } from './helpers/tdm';

/**
 * Sample outer-loop E2E. Replace selectors/URL with your actual Suitelet.
 * Pattern: seed deterministic data -> drive UI -> capture screenshot -> teardown.
 *
 * @author Wichit Wongta
 */
let runId: string;

test.beforeAll(async ({ request }) => {
  const { runId: id } = await seed(request, 'item_fulfillment_happy_path');
  runId = id;
});

test.afterAll(async ({ request }) => {
  if (runId) await teardown(request, runId);
});

test('Suitelet loads and renders the grid', async ({ page }) => {
  await page.goto('/app/site/hosting/scriptlet.nl?script=customscript_xxx_sl&deploy=1');
  await expect(page.locator('#xxx-grid')).toBeVisible();
  await page.screenshot({ path: `playwright-report/shots/grid-${runId}.png`, fullPage: true });
});
