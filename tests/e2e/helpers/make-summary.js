/**
 * Turns playwright-report/results.json into a markdown summary for the PR.
 * This is the automated "สรุปผล" step — no manual write-up.
 *
 * @author Wichit Wongta
 */
const fs = require('node:fs');

const RESULTS = 'playwright-report/results.json';
const OUT = 'playwright-report/SUMMARY.md';

if (!fs.existsSync(RESULTS)) {
  console.error('No results.json — run `npm run e2e` first.');
  process.exit(1);
}

const r = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
const flat = [];
const walk = (suites = []) =>
  suites.forEach((s) => {
    (s.specs || []).forEach((spec) =>
      spec.tests.forEach((t) =>
        flat.push({ title: spec.title, status: t.results.at(-1)?.status })
      )
    );
    walk(s.suites);
  });
walk(r.suites);

const pass = flat.filter((t) => t.status === 'passed').length;
const fail = flat.filter((t) => t.status !== 'passed').length;
const lines = [
  `# E2E Summary`,
  ``,
  `**${pass} passed · ${fail} failed** — ${new Date().toISOString()}`,
  ``,
  ...flat.map((t) => `- ${t.status === 'passed' ? '✅' : '❌'} ${t.title}`),
  ``,
  `Screenshots: \`playwright-report/shots/\` · Full report: \`playwright-report/index.html\``,
];
fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${OUT} (${pass} passed, ${fail} failed)`);
process.exit(fail > 0 ? 1 : 0);
