# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Execution guide for Claude Code on this NetSuite feature repo.

## Workflow — two loops, two gates

```
PRD (GitHub issue) → [Gate 1: human confirm]
  → INNER LOOP (local, fast):  dev → Jest → lint   ↻ until green   (npm run inner)
  → Deploy SB (SDF)
  → OUTER LOOP (SB):  ns-tdm seed → Playwright → auto report   ↻   (npm run outer)
  → [Gate 2: PR review] → squash merge + tag → user guide
Bug found → new issue → fix branch → re-enter INNER LOOP (never hotfix straight to SB)
```

Rules:
- Stay in the inner loop until Jest + lint are green. Do NOT deploy to SB to "see if it works" — that is what Jest is for.
- Only touch SB in the outer loop, and batch changes before deploying.
- Never add human checkpoints beyond Gate 1 and Gate 2.

## Commands

```bash
# Inner loop (run after every change)
npm run inner          # lint + Jest — must be green before deploy

# Unit tests
npm test               # run all unit tests
npm run test:watch     # watch mode
npm run test:cov       # with coverage (enforces thresholds from jest.config.js)
npx jest -t "test name pattern"   # run a single test

# Outer loop (SB)
npm run validate       # SDF local validate (needs Java 17; no SB auth)
npm run deploy:sb      # suitecloud project:deploy to SB
npm run outer          # validate + deploy + e2e + summary in one shot

# E2E (Playwright)
npm run e2e            # run all specs
npm run e2e:ui         # interactive Playwright UI
npm run e2e:report     # open HTML report
npm run e2e:summary    # generate playwright-report/SUMMARY.md

# User guide (token-locked — see Guide section below)
npm run guide          # Phase B: capture screenshots + build HTML (0 LLM tokens)
npm run guide:capture  # screenshot only
npm run guide:build    # HTML build only

# CI equivalent
npm run ci             # lint + Jest + local validate (no secrets needed)
```

## First-time setup

```bash
npm install
npm install -g --acceptSuiteCloudSDKLicense @oracle/suitecloud-cli
npx playwright install chromium
suitecloud account:setup   # browser OAuth → SB
cp .env.example .env       # fill in real SB credentials
```

CI requires Java 17 for `suitecloud project:validate` (see `.github/workflows/ci.yml`).

## Slash commands (.claude/commands)

`/prd` `/dev` `/test` `/deploy-sb` `/e2e` `/guide` `/bugfix` — each maps to one stage above.

## Model tiering (cost lever)

- Default driver: **Sonnet** for routine dev, tests, bug fixes.
- Escalate to **Opus** only for architecture, PRD authoring, heavy refactors.
- Do not burn Opus on boilerplate.

## Coding standards (hard rules)

- Code is always in English. Never put a company/client name in code files. Use `@author Wichit Wongta`.
- No silent fallbacks server-side. If data is missing, surface the error for debugging — ห้ามใส่ fallback ที่ซ่อน bug.
- Naming: Custom Record / List / Transaction must carry a 3-letter topic prefix —
  `customrecord_XXX_name`, `customlist_XXX_name`, `customtransaction_XXX_name`.
- Dates: internal format `YYYY-MM-DD`. Server: `format.parse()` → JS Date → manual `MM/DD/YYYY` for SuiteQL
  (never `format.format` for SQL). SQL display: `TO_CHAR(field,'YYYY-MM-DD')`. See SKILL_NetSuite_Date_Handling.md.
- TWMS Ship/Outbound critical path: realtime sync only — never Map/Reduce / Scheduled / task.create.
- Profiling: keep the `makeProfiler` / `PerfTimer` pattern in every script.
- No inline code dumps in chat — deliver as files/patches.

## UI layer — tbt-ds (Teibto Design System)

Suitelet pages use **tbt-ds** Lit 3 Web Components. The bundle is deployed once per SB to File Cabinet and reused by all feature repos.

**File Cabinet structure:**
```
/SuiteScripts/Teibto/ds/v1.26.2/   ← tbt-ds bundle (deploy from tbt-ds repo)
  tbt-theme.css
  index.js

/SuiteScripts/Teibto/XXX/          ← this feature's files
  sl_xxx_main.js                    Suitelet entry (GET → serve HTML, POST → JSON API)
  sl_xxx_main.html                  page template (uses tbt-* components)
  lib_xxx_service.js                business logic
```

**Standard page `<head>` (pin exact version — never `/latest/`):**
```html
<link rel="stylesheet" href="/sc/SuiteScripts/Teibto/ds/v1.26.2/tbt-theme.css">
<script type="module" src="/sc/SuiteScripts/Teibto/ds/v1.26.2/index.js"></script>
```

**tbt-ds governance rules (hard):**
- No hex colors in component code — use `var(--tbt-*)` design tokens only
- No `<style>` blocks on consumer HTML pages — styles belong inside components
- No `style="..."` visual attributes on elements
- No raw HTML primitives when a `tbt-*` component exists for the same purpose
- Sentence case for all UI labels ("Document info" not "Document Info")
- Version-pin every File Cabinet path — changing DS version requires updating all `<head>` references

## Project layout

```
src/                         SDF project root
  FileCabinet/SuiteScripts/
    XXX/                     feature scripts + HTML template
  Objects/                   SDF object XML (scripts, records, fields)
  manifest.xml / deploy.xml  SDF deploy descriptors
tests/unit/                  Jest specs (*.test.js) — mock N/* via SuiteCloud preset
tests/e2e/                   Playwright specs + auth.setup.ts + helpers/tdm.ts
tests/guide/                 guide.steps.mjs (source of truth), capture + build scripts
.github/workflows/           CI: inner-loop (lint+Jest+validate) + outer-loop (deploy+E2E)
.claude/commands/            slash-command rituals
```

## Test architecture

**Unit (Jest):** Oracle's SuiteCloud Jest preset handles N/* module stubs and AMD→CJS transform automatically. Tests live in `tests/unit/**/*.test.js`. Coverage thresholds: 50% branches, 60% functions/lines/statements.

**E2E (Playwright):** Runs serially (NS SB shares state). Auth happens once in `auth.setup.ts`, persisting session to `playwright/.auth/state.json` — every spec reuses it. Timeout: 90s per test, 15s per assertion.

**Test data (ns-tdm):** Use `seed(request, scenario)` / `teardown(request, runId)` from `tests/e2e/helpers/tdm.ts` to get deterministic SB state before each spec. Seed returns record IDs the spec uses; teardown rolls back after.

## User guide (two-phase, token-locked)

Phase A costs tokens (once). Phase B is always free.

- **Phase A — authoring (one-time):** Use Sonnet + Playwright MCP to walk the Suitelet, find stable selectors (prefer ids/data-attrs), and write `tests/guide/guide.steps.mjs`. Re-run only when UI structure changes.
- **Phase B — regenerate (`npm run guide`, 0 LLM tokens):** Reuses saved session, seeds via ns-tdm, highlights each target with a red box + number, screenshots → assembles Thai A4 HTML at `guide-output/index.html` → print-to-PDF = User Manual.
