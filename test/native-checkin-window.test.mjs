import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nativeCheckinAvailability, nativeCheckinStart } from "../src/native-checkin-window.ts";

const backend = await readFile(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");
const frontend = await readFile(new URL("../public/native-form.js", import.meta.url), "utf8");

test("活動時間依台北時區開放核銷", () => {
  const activity = { courseTime: "2026/09/12 10:00-14:00" };
  const start = nativeCheckinStart(activity);
  assert.equal(new Date(start.timestamp).toISOString(), "2026-09-12T02:00:00.000Z");

  const early = nativeCheckinAvailability(activity, Date.parse("2026-09-12T01:59:59.000Z"));
  assert.equal(early.canCheckIn, false);
  assert.match(early.checkinReminder, /活動尚未開始/);
  assert.match(early.checkinReminder, /2026\/09\/12.*10:00/);

  const opened = nativeCheckinAvailability(activity, Date.parse("2026-09-12T02:00:00.000Z"));
  assert.equal(opened.canCheckIn, true);
  assert.equal(opened.checkinReminder, "");
});

test("只有活動日期時從台北當日開始開放", () => {
  const start = nativeCheckinStart({ courseTime: "2026年09月05日（六）～09月06日（日）" });
  assert.equal(start.hasTime, false);
  assert.equal(new Date(start.timestamp).toISOString(), "2026-09-04T16:00:00.000Z");
});

test("明確時區與舊格式皆維持相容", () => {
  const iso = nativeCheckinStart({ startsAt: "2026-09-12T10:00:00+08:00" });
  assert.equal(new Date(iso.timestamp).toISOString(), "2026-09-12T02:00:00.000Z");
  assert.equal(nativeCheckinAvailability({ courseTime: "下週下午" }, 0).canCheckIn, true);
  assert.equal(nativeCheckinStart({ courseTime: "2026/02/30 10:00" }), null);
});

test("預覽提供提醒且確認端再次阻擋提前核銷", () => {
  const verifyStart = backend.indexOf("async function verifyNativeCheckin");
  const confirmStart = backend.indexOf("async function confirmNativeCheckin", verifyStart);
  const confirmEnd = backend.indexOf("function opnFormIntroProperties", confirmStart);
  const verifyRoute = backend.slice(verifyStart, confirmStart);
  const confirmRoute = backend.slice(confirmStart, confirmEnd);
  assert.match(verifyRoute, /nativeCheckinAvailability\(entry\.activity \|\| \{\}\)/);
  assert.match(verifyRoute, /canCheckIn: Boolean\(entry\.checkedInAt\) \|\| availability\.canCheckIn/);
  assert.match(confirmRoute, /CHECKIN_NOT_OPEN/);
  assert.ok(confirmRoute.indexOf("!availability.canCheckIn") < confirmRoute.indexOf("syncCheckinPoints"));
});

test("前端提早掃描時顯示提醒並保持按鈕停用", () => {
  assert.match(frontend, /const canCheckIn = row\.canCheckIn !== false/);
  assert.match(frontend, /row\.checkinReminder/);
  assert.match(frontend, /尚未開放核銷/);
  assert.match(frontend, /if \(alreadyCheckedIn \|\| !canCheckIn\) return/);
});
