# /guide — user guide (two-phase, token-locked)

Run once after a feature is merged. Token cost lives ONLY in Phase A.

## Phase A — authoring (one-time, costs tokens · use Sonnet + Playwright MCP)
1. Seed the scenario via ns-tdm so the screens are realistic.
2. With Playwright MCP, walk the Suitelet and find STABLE selectors for each
   user step (prefer ids / data attributes over brittle nth-child).
3. Edit `tests/guide/guide.steps.mjs`: set `meta` + one entry per step
   (id, Thai title, Thai instruction, url, target selector, optional before[]).
4. Use `includeSnapshot: false` on MCP actions once you know the selector —
   pull a snapshot only when you actually need to locate an element.
5. Commit guide.steps.mjs. Re-run Phase A only when the UI structure changes.

## Phase B — regenerate (every time · 0 LLM tokens · plain node)
```
npm run guide          # = guide:capture + guide:build
```
- `guide:capture` reuses the saved session, seeds via ns-tdm, highlights each
  target with a red box + number, screenshots to guide-output/shots/.
- `guide:build` assembles a Thai A4 print-to-PDF HTML at guide-output/index.html.
- UI moved but structure same? Just re-run Phase B — free. No AI in the loop.

Output: open guide-output/index.html → "บันทึกเป็น PDF" → User Manual / Training Material.
