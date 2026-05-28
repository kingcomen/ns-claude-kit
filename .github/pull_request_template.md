## Summary
<!-- อธิบาย feature/fix ใน 2-3 ประโยค -->

Closes #<!-- issue number -->

## Type
- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — no behaviour change

## Prefix
<!-- 3-letter topic prefix ที่ใช้ใน feature นี้ (ต้องลงใน PREFIXES.md ใน ns-tdm repo ก่อน) -->
Prefix: `XXX`

## Inner loop checklist
- [ ] `npm run lint` — green
- [ ] `npm run test:cov` — green, coverage ไม่ตกจาก threshold
- [ ] `suitecloud project:validate` — no errors

## Outer loop checklist
- [ ] `npm run deploy:sb` สำเร็จบน SB ของตัวเอง
- [ ] `npm run e2e` — ทุก spec ผ่าน
- [ ] `playwright-report/SUMMARY.md` แนบไว้ด้านล่าง หรือ screenshots ใน PR

## ns-tdm scenario (ถ้ามี scenario ใหม่)
- [ ] เพิ่ม handler ใน `scenarios/XXX/` ใน ns-tdm shared repo แล้ว
- [ ] PR นั้น merge แล้ว และ deploy บน CI SB แล้ว

## E2E Summary
<!-- paste playwright-report/SUMMARY.md ที่นี่ -->
```
```
