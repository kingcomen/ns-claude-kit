# Contributing Guide

## Branch naming

| ประเภท | รูปแบบ | ตัวอย่าง |
|---|---|---|
| Feature | `feat/PREFIX-<issue#>` | `feat/WMS-42` |
| Bug fix | `fix/<issue#>` | `fix/57` |
| Refactor | `refactor/<topic>` | `refactor/wms-service` |

`PREFIX` คือ 3-letter topic prefix ที่ลงทะเบียนใน `PREFIXES.md` ของ ns-tdm shared repo แล้วเท่านั้น

## Registering a new prefix

ก่อนเริ่ม feature ใหม่ ถ้า prefix ยังไม่มี:
1. PR ไปที่ ns-tdm shared repo — เพิ่มบรรทัดใน `PREFIXES.md`
2. PR นั้นต้อง merge ก่อนถึงเริ่ม code ได้
3. Scenario handler ของ feature นี้ก็ PR ไปพร้อมกันได้เลยใน PR เดียวกัน

## Two-loop workflow

```
feat/PREFIX-<n>  →  inner loop (npm run inner)  →  deploy SB (npm run deploy:sb)
                 →  outer loop (npm run e2e)     →  PR → Gate 2
```

ห้าม deploy SB ถ้า inner loop ยังไม่ green ห้าม open PR ถ้า outer loop ยังไม่ผ่าน

## Commit messages

- ภาษาอังกฤษ imperative mood: `add`, `fix`, `remove` ไม่ใช่ `added`, `fixes`
- ไม่ใส่ชื่อบริษัท/ลูกค้าใน message
- ตัวอย่าง: `add WMS item fulfillment Suitelet`, `fix missing id validation in handlePost`

## PR process (Gate 2)

1. กรอก PR template ให้ครบ — โดยเฉพาะ E2E Summary
2. CI ต้องผ่านทั้ง inner-loop และ outer-loop jobs
3. ต้องมี review approval อย่างน้อย 1 คน
4. Merge แบบ **squash only** — GitHub settings enforce อยู่แล้ว

## Tagging after merge

หลัง squash merge เข้า `main` ให้ tag ทันที:

```bash
git tag 2026-05-28        # ถ้า deploy ครั้งแรกของวัน
git tag 2026-05-28.2      # ถ้ามี deploy หลายครั้งวันเดียวกัน
git push origin --tags
```

## Setting up a new developer SB

1. สร้าง NetSuite SB account ใหม่ (ขอ admin สร้างให้)
2. Deploy ns-tdm RESTlet ลง SB ของตัวเอง (ดู README ใน ns-tdm repo)
3. รัน setup ตาม README ของ template นี้ (`npm install`, `suitecloud account:setup`, ฯลฯ)
4. Copy `.env.example` → `.env` แล้วกรอก SB credentials ของตัวเอง
5. รัน `npm run inner` เพื่อ verify local environment

## CI SB — owner responsibilities

Primary owner และ Backup ต้องสามารถ:
- Rotate TBA token ใน GitHub Environment `sandbox-ci` เมื่อ expire
- Deploy ns-tdm RESTlet version ใหม่ลง CI SB เมื่อมี update
- Approve prefix registration PR ใน ns-tdm shared repo
