# NetSuite × Claude Code — Two-Loop Workflow Kit

สรุป flow การทำงาน + tech stack + config สำหรับพัฒนา NetSuite ด้วย Claude Code
ดรอปทั้งโฟลเดอร์นี้ลง repo ใหม่ของแต่ละ feature ได้เลย

---

## 1. Flow loop

```
PRD (GitHub issue) ──► [Gate 1: คน confirm]
   │
   ▼
INNER LOOP (local, เร็ว)      dev → Jest → lint   ↻ จนเขียว        → npm run inner
   │
   ▼
Deploy SB (SDF)                                                      → npm run deploy:sb
   │
   ▼
OUTER LOOP (SB, แพง)         ns-tdm seed → Playwright → auto report ↻ → npm run outer
   │
   ▼
[Gate 2: PR review] ──► squash merge + tag ──► user guide
   ▲
   └── Bug → issue ใหม่ → fix branch → กลับเข้า INNER LOOP (ห้าม hotfix ขึ้น SB ตรง)
```

แก่นคือ **แยก 2 ลูป**: inner วนถูก/เร็วใน local, outer แตะ SB เท่าที่จำเป็น และมี human gate แค่ 2 จุด

---

## 2. Tech stack

| ชั้น | เครื่องมือ | บทบาท |
|---|---|---|
| AI dev | Claude Code (Sonnet ทั่วไป / Opus งานหนัก) | driver ทุกขั้น |
| VCS + review | GitHub + gh CLI | Issue = PRD, PR = Gate 2 |
| Unit test | Jest 29 + `@oracle/suitecloud-unit-testing` | จับ bug ก่อนแตะ SB (ROI สูงสุด) |
| Lint/format | ESLint + Prettier | กัน undeclared var / style drift |
| Deploy | SuiteCloud CLI 3.1.2 + SDF (NS 2025.2) | validate + deploy |
| E2E UI | Playwright | seed→drive→screenshot→report |
| Test data | ns-tdm (RESTlet seed/teardown) | deterministic state |
| CI | GitHub Actions | lint + Jest + local validate (ไม่ใช้ secrets) |
| Runtime | Node.js LTS 20+, npm | — |

---

## 3. Config ในชุดนี้

```
package.json              scripts: inner / outer / ci / deploy:sb / e2e ...
jest.config.js            Oracle SuiteCloud Jest preset (N/* stubs + AMD transform)
playwright.config.ts      storageState reuse, trace/screenshot/video, JSON+HTML report
.github/workflows/ci.yml  PR: setup-java(17) → npm ci → lint → Jest → suitecloud validate
.env.example              NS SB creds + ns-tdm endpoints (+ optional TBA for CI deploy)
CLAUDE.md                 workflow rules + coding standards + model tiering
.claude/commands/*.md     /prd /dev /test /deploy-sb /e2e /guide /bugfix
tests/e2e/                auth.setup.ts, sample.spec.ts, helpers/tdm.ts, make-summary.js
tests/guide/              guide.steps.mjs (source of truth), guide.capture.mjs, build-guide.mjs
.gitignore
```

### User guide — two-phase (token-locked)

ต้นทุน token อยู่ที่ Phase A ครั้งเดียว Phase B ฟรีเสมอ:

- **Phase A — authoring (ครั้งเดียว, กิน token):** ใช้ Sonnet + Playwright MCP สำรวจ Suitelet หา selector แล้วเขียน `tests/guide/guide.steps.mjs` (id, หัวข้อ, คำอธิบาย, target) ทำซ้ำเฉพาะตอนโครงสร้าง UI เปลี่ยน
- **Phase B — regenerate (`npm run guide`, 0 LLM token):** `node` รัน capture (reuse session + ns-tdm seed + กรอบแดง + screenshot) แล้ว build เป็น HTML ไทย A4 → กด "บันทึกเป็น PDF" ได้ User Manual ทันที UI ขยับแต่โครงสร้างเดิม → rerun ฟรี ไม่มี AI ใน loop

---

## 4. Setup (ครั้งเดียว)

```bash
npm install
npm install -g --acceptSuiteCloudSDKLicense @oracle/suitecloud-cli
npx playwright install chromium
suitecloud account:setup          # browser OAuth → SB
cp .env.example .env               # แล้วกรอกค่าจริง
```

## 5. รันแต่ละลูป

```bash
npm run inner      # dev loop: lint + Jest (วนจนเขียว)
npm run deploy:sb  # ขึ้น SB
npm run outer      # validate + deploy + Playwright + summary
```

---

## 6. Cost lever (ทำให้คุ้มจริง)

1. **Model tiering** — Sonnet เป็น default, Opus เฉพาะงานออกแบบ/refactor หนัก
2. **Jest กันก่อน SB** — ทุก bug ที่จับได้ใน local = ประหยัด deploy + governance หนึ่งรอบ
3. **Playwright storageState** — login NS ครั้งเดียว reuse ทุกเทส เลี่ยง 2FA
4. **CI ทำแค่ของถูก** — local validate ไม่ต้องมี secret; deploy + E2E รัน local ก่อน ค่อยย้ายขึ้น CI เมื่อ flow นิ่ง

อย่า over-engineer: ไม่ต้อง Jenkins, Cypress, Docker, monorepo tooling จนกว่าจะจำเป็นจริง
