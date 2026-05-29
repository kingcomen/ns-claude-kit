import { test, expect } from '@playwright/test';

/**
 * SO Suitelet smoke + visual verification.
 * @author Wichit Wongta
 */

const URL = '/app/site/hosting/scriptlet.nl?script=customscript_so&deploy=customdeploy_so';

test('SO renders + tbt-* register + typeahead reachable', async ({ page }) => {
  test.setTimeout(120_000);

  const consoleErrors: string[] = [];
  const failedReq: Array<{ url: string; status: number }> = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) failedReq.push({ url: r.url(), status: r.status() }); });

  const resp = await page.goto(URL, { waitUntil: 'domcontentloaded' });
  console.log('[HTTP]', resp?.status());
  expect(resp?.status()).toBe(200);

  await page.waitForTimeout(4000);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'playwright-report/shots/so.png', fullPage: true });

  const ce = await page.evaluate(() => {
    const tags = ['tbt-app-shell', 'tbt-sidebar', 'tbt-section', 'tbt-search',
                  'tbt-dropdown', 'tbt-datepicker', 'tbt-input', 'tbt-button',
                  'tbt-modal', 'tbt-table', 'tbt-field-grid', 'tbt-alert'];
    return tags.map(t => ({ tag: t, defined: !!customElements.get(t) }));
  });
  const undef = ce.filter(x => !x.defined);
  console.log('[customElements undefined]', undef);

  const probe = await page.evaluate(async (url) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search_customer', q: 'a' }),
    });
    return { status: r.status, body: (await r.text()).substring(0, 200) };
  }, URL);
  console.log('[search_customer probe]', JSON.stringify(probe));

  console.log('[console errors]', JSON.stringify(consoleErrors));
  console.log('[failed requests]', JSON.stringify(failedReq));

  expect(undef).toHaveLength(0);
  expect(probe.status).toBe(200);
});
