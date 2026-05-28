/**
 * PHASE B — build (0 LLM tokens). Assembles the captured screenshots + step
 * text from guide.steps.mjs into a single Thai, A4, print-to-PDF HTML guide.
 * Open guide-output/index.html and click "บันทึกเป็น PDF".
 *
 * Run:  npm run guide:build
 *
 * @author Wichit Wongta
 */
import fs from 'node:fs';
import { meta, steps } from './guide.steps.mjs';

const OUT = 'guide-output';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toc = steps
  .map((s, i) => `<li><a href="#${s.id}">${i + 1}. ${esc(s.title)}</a></li>`)
  .join('');

const sections = steps
  .map((s, i) => {
    const img = fs.existsSync(`${OUT}/shots/${s.id}.png`)
      ? `<img src="shots/${s.id}.png" alt="${esc(s.title)}">`
      : `<div class="missing">ยังไม่มี screenshot — รัน guide:capture</div>`;
    return `<section id="${s.id}" class="step">
      <h2><span class="num">${i + 1}</span>${esc(s.title)}</h2>
      <p>${esc(s.instruction)}</p>
      ${img}
    </section>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<title>${esc(meta.title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Sarabun","TH Sarabun New",-apple-system,sans-serif; color:#1f2937; margin:0; line-height:1.6; }
  .bar { position:sticky; top:0; background:#111827; padding:12px 20px; }
  .bar button { background:#2563eb; color:#fff; border:0; padding:8px 16px; border-radius:6px; font-size:14px; cursor:pointer; }
  .wrap { max-width:800px; margin:0 auto; padding:24px; }
  .cover { text-align:center; padding:80px 0; border-bottom:2px solid #e5e7eb; margin-bottom:24px; }
  .cover h1 { font-size:28px; margin:0 0 8px; }
  .cover .v { color:#6b7280; }
  .toc { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 24px; margin-bottom:24px; }
  .toc ul { margin:8px 0 0; padding-left:20px; } .toc a { color:#2563eb; text-decoration:none; }
  .step { padding:20px 0; border-bottom:1px solid #f1f5f9; page-break-inside:avoid; }
  .step h2 { font-size:20px; display:flex; align-items:center; gap:10px; }
  .num { background:#2563eb; color:#fff; width:30px; height:30px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:15px; }
  .step img { width:100%; border:1px solid #e5e7eb; border-radius:8px; margin-top:10px; }
  .missing { color:#b91c1c; background:#fef2f2; padding:12px; border-radius:8px; }
  @media print { .bar { display:none; } .wrap { max-width:none; padding:0; } a { color:#1f2937; } }
</style></head>
<body>
  <div class="bar"><button onclick="window.print()">📄 บันทึกเป็น PDF</button></div>
  <div class="wrap">
    <div class="cover"><h1>${esc(meta.title)}</h1><div class="v">เวอร์ชัน ${esc(meta.version)}</div></div>
    <div class="toc"><strong>สารบัญ</strong><ul>${toc}</ul></div>
    ${sections}
  </div>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/index.html`, html);
console.log(`Wrote ${OUT}/index.html (${steps.length} steps). Open it and click "บันทึกเป็น PDF".`);
