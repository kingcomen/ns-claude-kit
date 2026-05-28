import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * Runs ONCE before the chromium project. Logs into NetSuite SB and persists
 * the authenticated session so every spec reuses it (no re-login per test).
 *
 * 2FA handling:
 *   - Preferred: dedicated CI/test user with 2FA disabled in SB.
 *   - If 2FA is required: set NS_TOTP_SECRET to the base32 seed from the
 *     authenticator app setup screen. The TOTP code is generated automatically.
 *
 * @author Wichit Wongta
 */

const STATE = 'playwright/.auth/state.json';

setup('authenticate', async ({ page }) => {
  fs.mkdirSync('playwright/.auth', { recursive: true });

  await page.goto('/');
  await page.fill('#email', process.env.NS_EMAIL!);
  await page.fill('#password', process.env.NS_PASSWORD!);
  await page.click('#submitButton, [type="submit"]');

  if (process.env.NS_TOTP_SECRET) {
    const { TOTP } = await import('otpauth');
    const totp = new TOTP({ secret: process.env.NS_TOTP_SECRET, digits: 6, period: 30 });

    // Wait up to 10s for the 2FA prompt — skip silently if it never appears
    const otpField = page.locator('input[name="pin"], #pin, input[type="tel"]').first();
    const appeared = await otpField.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

    if (appeared) {
      const code = totp.generate();
      console.log(`[auth] OTP generated: ${code} at ${new Date().toISOString()}`);
      await otpField.fill(code);
      // Press Enter on the OTP field to submit — more reliable than button click
      await otpField.press('Enter');
      console.log(`[auth] OTP submitted via Enter, waiting for redirect...`);
      // Wait for NS to redirect away from the 2FA challenge page (SB can be slow)
      await page.waitForURL(url => !url.includes('loginchallenge'), { timeout: 60_000 }).catch(() => {
        console.log('[auth] waitForURL timed out — still on loginchallenge after 60s');
      });
    }
  }

  // Let page settle without blocking on full networkidle (NS home has background XHRs)
  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
  await expect(page).not.toHaveURL(/login/i, { timeout: 10_000 });

  await page.context().storageState({ path: STATE });
});
