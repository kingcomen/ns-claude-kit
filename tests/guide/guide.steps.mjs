/**
 * SINGLE SOURCE OF TRUTH for the SDB Sales Dashboard user guide.
 *
 * Phase A (one-time, costs tokens): authored by Claude Code from the SDB Suitelet HTML.
 * Phase B (every regenerate, 0 LLM tokens): guide.capture.mjs + build-guide.mjs
 * read this file and produce screenshots + an HTML/PDF guide.
 *
 * Re-author this file only when the UI structure changes.
 *
 * @author Wichit Wongta
 */
export const meta = {
  title: 'คู่มือการใช้งาน — Sales Dashboard',
  version: '1.0',
  scenario: null, // SDB reads existing transaction data — no TDM seed needed
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
    title: 'เปิดหน้า Sales Dashboard',
    instruction:
      'เปิดเมนู Teibto ERP แล้วเลือก Sales Dashboard ระบบจะโหลดข้อมูล' +
      'ของเดือนปัจจุบันอัตโนมัติ',
    url: '/app/site/hosting/scriptlet.nl?script=3292&deploy=1',
    target: null, // full-page overview — no highlight
  },
  {
    id: '02-filter',
    title: 'กำหนดช่วงวันที่',
    instruction:
      'เลือก "ตั้งแต่วันที่" และ "ถึงวันที่" ที่ต้องการวิเคราะห์' +
      ' ค่าเริ่มต้นคือวันแรกของเดือน ถึงวันนี้',
    target: '#filter-form',
  },
  {
    id: '03-load',
    title: 'กดโหลดข้อมูล',
    instruction:
      'กดปุ่ม "โหลดข้อมูล" เพื่อดึงข้อมูลตามช่วงวันที่และพนักงานขายที่เลือก',
    target: '#btn-load',
  },
  {
    id: '04-revenue',
    title: 'รายได้รายเดือน',
    instruction:
      'ตารางแสดงยอดรายได้รวมจากใบแจ้งหนี้ลูกค้า แยกตามเดือน' +
      ' เรียงจากเดือนแรกถึงเดือนล่าสุดในช่วงที่เลือก',
    target: '#section-revenue',
  },
  {
    id: '05-customers',
    title: 'ลูกค้ายอดสูงสุด 10 ราย',
    instruction:
      'ตารางแสดง 10 ลูกค้าที่มียอดซื้อสูงสุดในช่วงที่เลือก' +
      ' เรียงจากมากไปน้อย',
    target: '#section-customers',
  },
  {
    id: '06-pipeline',
    title: 'Pipeline โอกาสขาย',
    instruction:
      'ตารางแสดงจำนวนและมูลค่าคาดการณ์ของโอกาสขายแต่ละขั้นตอน' +
      ' เรียงตามมูลค่าจากมากไปน้อย',
    target: '#section-pipeline',
  },
  {
    id: '07-items',
    title: 'สินค้าขายดี 10 รายการ',
    instruction:
      'ตารางแสดง 10 สินค้าที่มียอดขายสูงสุดในช่วงที่เลือก' +
      ' แสดงทั้งจำนวนและยอดรวม',
    target: '#section-items',
  },
];
