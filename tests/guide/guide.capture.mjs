/**
 * PHASE B — capture (0 LLM tokens). Plain Playwright library run with `node`.
 * Reads guide.steps.mjs, reuses the saved NetSuite session, seeds deterministic
 * data via ns-tdm, then for each step: highlight the target with a red box +
 * number badge and screenshot it.
 *
 * Run:  npm run guide:capture
 *
 * @author Wichit Wongta
 */
import { chromium } from '@playwright/test';
import 'dotenv/config';
import fs from 'node:fs';
import { meta, steps } from './guide.steps.mjs';

const STATE = 'playwright/.auth/state.json';
const OUT = 'guide-output/shots';

// Injected into the page to draw a red outline + numbered badge on the target.
// Receives a single {selector, label} object — page.evaluate only passes one arg.
function highlight({ selector, label }) {
  const el = document.querySelector(selector);
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect();
  const box = document.createElement('div');
  box.id = '__guide_hl';
  Object.assign(box.style, {
    position: 'fixed', left: r.left - 4 + 'px', top: r.top - 4 + 'px',
    width: r.width + 8 + 'px', height: r.height + 8 + 'px',
    border: '3px solid #e02424', borderRadius: '4px',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.04)', zIndex: 999999, pointerEvents: 'none',
  });
  const tag = document.createElement('div');
  tag.textContent = label;
  Object.assign(tag.style, {
    position: 'fixed', left: r.left - 4 + 'px', top: r.top - 28 + 'px',
    background: '#e02424', color: '#fff', font: '600 13px sans-serif',
    padding: '2px 8px', borderRadius: '4px', zIndex: 1000000, pointerEvents: 'none',
  });
  tag.id = '__guide_tag';
  document.body.append(box, tag);
  return true;
}
function clearHighlight() {
  document.getElementById('__guide_hl')?.remove();
  document.getElementById('__guide_tag')?.remove();
}

async function seedIfConfigured() {
  if (!process.env.TDM_SEED_URL || !meta.scenario) return null;
  const res = await fetch(process.env.TDM_SEED_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: meta.scenario }),
  });
  if (!res.ok) throw new Error(`ns-tdm seed failed: ${res.status}`);
  return (await res.json()).runId;
}
async function teardownIfConfigured(runId) {
  if (!runId || !process.env.TDM_TEARDOWN_URL) return;
  await fetch(process.env.TDM_TEARDOWN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId }),
  });
}

(async () => {
  if (!fs.existsSync(STATE)) {
    console.error(`No session at ${STATE}. Run \`npm run e2e\` once to create it.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const runId = await seedIfConfigured();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    storageState: STATE, baseURL: process.env.NS_BASE_URL, viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  try {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.url) {
        await page.goto(s.url);
        await page.waitForLoadState('load');
        // Let SPA / web-component JS settle without waiting for persistent WS connections
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      }
      for (const b of s.before || []) {
        if (b.action === 'fill') await page.fill(b.selector, b.value);
        if (b.action === 'click') await page.click(b.selector);
      }
      if (s.target) await page.evaluate(highlight, { selector: s.target, label: String(i + 1) }).catch(() => {});
      await page.screenshot({ path: `${OUT}/${s.id}.png`, fullPage: false });
      if (s.target) await page.evaluate(clearHighlight).catch(() => {});
      console.log(`✔ captured ${s.id}`);
    }
  } finally {
    await browser.close();
    await teardownIfConfigured(runId);
  }
  console.log(`\nDone. ${steps.length} screenshots in ${OUT}/`);
})();
