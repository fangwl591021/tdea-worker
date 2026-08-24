import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { explicitLoginAccessForRosterRow } from "../src/admin-access-policy.ts";

const staleRosterRow = {
  memberNo: "Z1160603",
  name: "王子齊",
  lineUserId: "Ub57e4cee100000000000000057cefd0a",
  loginAccess: true,
  allowLogin: true,
  canLogin: true
};

test("明確取消權限覆蓋名冊中的舊 true", () => {
  const result = explicitLoginAccessForRosterRow({
    Z1160603: { memberNo: "Z1160603", loginAccess: false }
  }, staleRosterRow);
  assert.equal(result, false);
});

test("明確授權仍允許登入", () => {
  const result = explicitLoginAccessForRosterRow({
    Z1160603: { memberNo: "Z1160603", loginAccess: true }
  }, staleRosterRow);
  assert.equal(result, true);
});

test("沒有明確權限紀錄時保留舊資料相容路徑", () => {
  assert.equal(explicitLoginAccessForRosterRow({}, staleRosterRow), null);
});

test("可用 LINE UID 對應明確取消紀錄", () => {
  const result = explicitLoginAccessForRosterRow({
    legacy: { lineUserId: "Ub57e4cee100000000000000057cefd0a", loginAccess: false }
  }, { lineUid: "Ub57e4cee100000000000000057cefd0a", loginAccess: true });
  assert.equal(result, false);
});

test("cached session 必須向 Worker 複驗且失敗時清除", async () => {
  const source = await readFile(new URL("../public/admin-login.js", import.meta.url), "utf8");
  assert.match(source, /\/api\/admin-login\/validate/);
  assert.match(source, /const session = cachedSession\(\)/);
  assert.match(source, /await validateIdentity\(session\)/);
  assert.match(source, /clearIdentity\(\)/);
});

test("Worker 提供 session 驗證路由並同步所有 legacy 權限欄位", async () => {
  const source = await readFile(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");
  assert.match(source, /\/api\/admin-login\/validate/);
  assert.match(source, /next\.loginAccess = loginAccess/);
  assert.match(source, /next\.allowLogin = loginAccess/);
  assert.match(source, /next\.canLogin = loginAccess/);
  assert.match(source, /next\.adminAccess = loginAccess/);
});
