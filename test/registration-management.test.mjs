import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const backend = await readFile(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");
const frontend = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

test("一般名單預設排除已取消，管理端可切換查看", () => {
  assert.match(backend, /includeCancelled \? current : filterActiveStatus\(current\)/);
  assert.match(frontend, /includeCancelled=1&keys=/);
  assert.match(frontend, /data-toggle-cancelled-registrations/);
});

test("永久刪除有管理驗證與帳務稽核保護", () => {
  assert.match(backend, /async function deleteNativeRegistration/);
  assert.match(backend, /const guard = await requireAdmin\(request, env\)/);
  assert.match(backend, /已有付款、匯款或退款紀錄，不能永久刪除/);
  assert.match(backend, /ASSETS_BUCKET!\.delete/);
  assert.match(frontend, /請輸入「永久刪除」/);
});

test("取消資料可安全恢復並保留取消歷程", () => {
  assert.match(backend, /async function restoreNativeRegistration/);
  assert.match(backend, /cancellationHistory/);
  assert.match(frontend, /data-restore-registration/);
});
