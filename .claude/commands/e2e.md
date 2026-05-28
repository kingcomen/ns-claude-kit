# /e2e — outer loop end-to-end

1. Ensure SB has the latest deploy.
2. `npm run e2e` — auth.setup reuses session; specs seed via ns-tdm, capture screenshots.
3. `npm run e2e:summary` to generate playwright-report/SUMMARY.md.
4. On failure: read trace/screenshot, return to /dev. Do not patch on SB directly.
