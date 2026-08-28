import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const loader = await readFile(new URL("../public/admin-login.js", import.meta.url), "utf8");
const editor = await readFile(new URL("../public/activity-canonical-editor.js", import.meta.url), "utf8");
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const canonicalWorker = await readFile(new URL("../src/activity-canonical-entry.ts", import.meta.url), "utf8");
const monthlyWorker = await readFile(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");

test("活動編輯只由正式 canonical 編輯器接管", () => {
  assert.doesNotMatch(index, /activity-edit-canonical-hotfix\.js/);
  assert.doesNotMatch(index, /activity-edit-fast-save\.js/);
  assert.match(index, /admin-login\.js\?v=admin-entry34/);
  assert.match(loader, /activity-canonical-editor\.js\?v=canonical10/);
  assert.match(loader, /app\.js\?v=activity-editor10/);
  assert.match(editor, /window\.__tdeaCanonicalActivitySaveOwner = true/);
  assert.match(app, /!window\.__tdeaCanonicalActivitySaveOwner/);
});

test("舊儲存路徑不會把已刪除的自訂題目從舊設定補回", () => {
  assert.match(app, /const systemBaseFieldKeys = new Set\(\[\.\.\.defaultRegistrationFieldKeys, \.\.\.managedFieldKeys\]\)/);
  assert.match(app, /return systemBaseFieldKeys\.has\(key\) && !managedFieldKeys\.has\(key\)/);
  assert.doesNotMatch(app, /!customFields\.some\(\(customField\) =>\s*String\(customField\?\.label/);
  assert.match(app, /const savedCustomFields = verifyFields\.filter/);
  assert.match(app, /expectedSignatures/);
  assert.match(app, /自訂問題儲存後與畫面不一致/);
});

test("正式編輯器上傳輪播圖並驗證刪除後的選項與活動狀態", () => {
  assert.match(editor, /data-activity-gallery-file/);
  assert.match(editor, /await uploadFile\(galleryFiles\[i\], id\)/);
  assert.match(editor, /for \(const expected of fields\)/);
  assert.match(editor, /活動狀態儲存驗證失敗/);
  assert.match(editor, /輪播圖儲存驗證失敗/);
  assert.match(editor, /fd\.has\("galleryUrls"\)/);
  assert.match(editor, /tdea:activity-canonical-saved/);
  assert.match(app, /tdea:activity-canonical-saved/);
  assert.match(editor, /deletedFields/);
  assert.match(editor, /欄位「\$\{deleted\.label \|\| remained\.label\}」刪除驗證失敗/);
  assert.match(canonicalWorker, /api\/activities\/\$\{encodeURIComponent\(activityId\)\}/);
  assert.match(monthlyWorker, /if \(itemMatch && request\.method === "GET"\)/);
  assert.match(editor, /custom-option-remove/);
  assert.match(editor, /deletedOptions/);
  assert.match(editor, /選項「\$\{deleted\.option\}」刪除驗證失敗/);
  assert.match(canonicalWorker, /removeDeletedOptions/);
  assert.match(editor, /function bindCanonicalActivityForm/);
  assert.match(editor, /form\.addEventListener\("submit", handleCanonicalActivitySubmit\)/);
  assert.match(editor, /new MutationObserver\(bindCanonicalActivityForms\)/);
  assert.match(editor, /result\.url \|\| result\.data\?\.url/);
  assert.match(editor, /圖片已上傳，但伺服器未回傳圖片網址/);
  assert.match(editor, /form\.getAttribute\("id"\) === "drawer-activity"/);
  assert.doesNotMatch(editor, /form\.id (?:===|!==) "drawer-activity"/);
});
