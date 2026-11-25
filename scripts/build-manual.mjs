// 관리자 매뉴얼 PDF를 만듭니다 (docs/manual/README.md).
//
//   node scripts/build-manual.mjs
//
// docs/manual/admin-manual.html을 Chromium으로 열어 A4 PDF(docs/manual/관리자 매뉴얼.pdf)로 인쇄합니다.
// Playwright가 필요합니다. 없으면: npm i -D playwright && npx playwright install chromium
// 글꼴(Noto Sans KR)은 Google Fonts에서 받으므로 인터넷이 연결되어 있어야 합니다.

import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright가 없습니다. npm i -D playwright && npx playwright install chromium 뒤 다시 실행하세요.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = join(root, "docs/manual/admin-manual.html");
const pdf = join(root, "docs/manual/관리자 매뉴얼.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: pdf,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:8px;color:#888;padding:0 15mm;display:flex;justify-content:space-between;font-family:sans-serif">' +
    '<span>호서대학교 멘토링 관리자 매뉴얼</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
  preferCSSPageSize: false,
});
await browser.close();
console.log("만들었습니다:", pdf);
