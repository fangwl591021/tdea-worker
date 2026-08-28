import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const frontend = await readFile(new URL("../public/monthly-activity.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");
const loader = await readFile(new URL("../public/admin-login.js", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");

test("詳細說明固定走獨立 Worker 頁，報名仍使用表單網址", () => {
  assert.match(frontend, /monthly-detail\/\$\{encodeURIComponent\(target\)\}/);
  assert.match(worker, /monthly-detail\/\$\{encodeURIComponent\(target\)\}/);
  assert.match(frontend, /const formUri = registerUrlForPage\(page\) \|\| detailUri/);
  assert.match(worker, /const formUri = registerUrlForPage\(page\) \|\| detailUri/);
  assert.match(loader, /monthly-activity\.js\?v=monthly-detail-route1/);
  assert.match(wrangler, /run_worker_first\s*=\s*\["\/api\/\*", "\/line-webhook", "\/monthly-detail\/\*"\]/);
});

test("舊快照連結會正規化且說明頁只使用上傳圖集與說明文字", () => {
  assert.match(worker, /function canonicalMonthlyDetailUrls/);
  assert.match(worker, /const normalized = canonicalMonthlyDetailUrls\(data\)/);
  assert.match(worker, /detailBaseUrl: `\$\{workerBaseUrl\}\/monthly-detail\/\{id\}`/);
  assert.match(worker, /detailUrl: detailUrlForPage\(page, normalized\)/);
  assert.match(worker, /function hydrateMonthlyActivity/);
  assert.match(worker, /galleryUrls: monthlyUrlList\(\[activity\.galleryUrls, settings\.galleryUrls\]\)/);
  assert.match(worker, /detailText: firstClean\(activity\.detailText, activity\.description, settings\.detailText, settings\.description\)/);
  assert.match(worker, /function monthlySliderHtml/);
  assert.match(worker, /function monthlyGalleryImages/);
  assert.match(worker, /if \(galleryImages\.length\) return galleryImages/);
  assert.match(worker, /setInterval\(\(\)=>go\(i\+1\),3000\)/);
  assert.match(worker, /<div class="text">\$\{esc\(page\.detailText/);
  assert.doesNotMatch(worker, /<a class="btn" href="\$\{esc\(formUrl\)\}">前往報名<\/a>/);
  assert.match(worker, /label: "詳細說明", uri: detailUri/);
  assert.match(worker, /if \(incomingActivities\.length\) await refreshMonthlySnapshot\(env\)/);
  assert.match(worker, /url\.pathname === "\/api\/monthly-activity"\) return json\(\{ success: true, data: await readEffectiveMonthly\(env\) \}\)/);
  assert.match(worker, /url\.pathname === "\/api\/monthly-activity\/flex"\) \{ const config = await readEffectiveMonthly\(env\)/);
});
