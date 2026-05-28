/**
 * SINGLE SOURCE OF TRUTH for the user guide.
 *
 * Phase A (one-time, costs tokens): Claude Code + Playwright MCP explores the
 * Suitelet, finds stable selectors, and writes/edits this file.
 * Phase B (every regenerate, 0 LLM tokens): guide.capture.mjs + build-guide.mjs
 * read this file and produce screenshots + an HTML/PDF guide.
 *
 * Re-author this file only when the UI structure changes.
 *
 * @author Wichit Wongta
 */
export const meta = {
  title: 'คู่มือการใช้งาน — XXX Suitelet',
  version: '1.0',
  scenario: 'item_fulfillment_happy_path', // ns-tdm scenario to seed before capture
};

/**
 * Each step:
 *  id          unique slug (becomes the screenshot filename)
 *  title       หัวข้อ (Thai)
 *  instruction คำอธิบายให้ผู้ใช้ทำ (Thai)
 *  url         optional — navigate before capturing (relative to baseURL)
 *  target      optional CSS selector to highlight with a red box
 *  before      optional array of {action, selector, value} to set up the screen
 */
export const steps = [
  {
    id: '01-open',
    title: 'เปิดหน้าจอ',
    instruction: 'ไปที่เมนูแล้วเปิดหน้า XXX Suitelet ระบบจะแสดงตารางรายการ',
    url: '/app/site/hosting/scriptlet.nl?script=customscript_xxx_sl&deploy=1',
    target: '#xxx-grid',
  },
  {
    id: '02-search',
    title: 'ค้นหารายการ',
    instruction: 'พิมพ์เลขที่เอกสารในช่องค้นหา แล้วกด Enter',
    target: '#xxx-search',
    before: [{ action: 'fill', selector: '#xxx-search', value: 'IF-0001' }],
  },
  {
    id: '03-confirm',
    title: 'ยืนยันรายการ',
    instruction: 'ตรวจสอบข้อมูลแล้วกดปุ่ม "ยืนยัน" เพื่อบันทึก',
    target: '#xxx-confirm-btn',
  },
];
