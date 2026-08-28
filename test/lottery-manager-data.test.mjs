import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const lottery = await readFile(new URL("../public/lottery.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../public/admin-login.js", import.meta.url), "utf8");

test("抽獎管理等待正式管理資料並讀取正式活動", () => {
  assert.match(app, /whenManagerDataReady\(\)/);
  assert.match(app, /getLotteryData\(\)/);
  assert.match(lottery, /await waitForManagerData\(\)/);
  assert.match(lottery, /window\.TDEAApp\?\.getLotteryData/);
});

test("獎品與中獎紀錄由遠端管理資料保存", () => {
  assert.match(app, /async saveLotteryData\(lottery\)/);
  assert.match(app, /return saveManagerDataRemoteChecked\(\)/);
  assert.match(lottery, /await window\.TDEAApp\.saveLotteryData\(data\.lottery\)/);
  assert.doesNotMatch(lottery, /localStorage/);
});

test("管理入口載入新版抽獎資產", () => {
  assert.match(loader, /lottery\.js\?v=lottery12/);
});

test("抽獎先播放過場影片，結束後再揭曉結果", () => {
  assert.match(lottery, /\/lottery-transition\.mp4\?v=20260826-1/);
  assert.match(lottery, /video\.addEventListener\("ended", showResult/);
  assert.match(lottery, /await revealWinner\(\{ winner: winnerRecord, prize, test: false \}\)/);
  assert.match(lottery, /await revealWinner\(\{ winner, prize, test: true \}\)/);
  assert.match(lottery, /此為測試結果，不會寫入中獎紀錄/);
  assert.match(lottery, /中獎結果已安全寫入紀錄/);
});

test("抽獎流程會立即鎖定並阻止快速連點", () => {
  assert.match(lottery, /let drawInProgress = false/);
  assert.match(lottery, /function runDrawAction\(action\)/);
  assert.match(lottery, /if \(drawInProgress\) return/);
  assert.match(lottery, /setDrawBusy\(true\)/);
  assert.match(lottery, /\.finally\(\(\) => \{/);
  assert.match(lottery, /runDrawAction\(\(\) => draw\(activityId, registrations\)\)/);
  assert.match(lottery, /runDrawAction\(\(\) => testDraw\(activityId, registrations\)\)/);
});

test("影片只在抽獎時載入且慢速網路不強制提前公布", () => {
  assert.doesNotMatch(lottery, /preloadTransitionVideo/);
  assert.doesNotMatch(lottery, /setTimeout\(showResult, 15000\)/);
  assert.match(lottery, /影片載入較慢，可略過動畫/);
  assert.match(lottery, /video\.addEventListener\("ended", showResult/);
});

test("抽獎對話框接管鍵盤焦點並支援 Escape", () => {
  assert.match(lottery, /soundButton\.focus\(\{ preventScroll: true \}\)/);
  assert.match(lottery, /document\.addEventListener\("keydown", handleOverlayKeydown\)/);
  assert.match(lottery, /if \(event\.key === "Escape"\)/);
  assert.match(lottery, /!button\.closest\("\[hidden\]"\)/);
  assert.match(lottery, /document\.removeEventListener\("keydown", handleOverlayKeydown\)/);
});

test("測試抽獎不主動寫入遠端抽獎資料", () => {
  const body = lottery.slice(lottery.indexOf("async function testDraw"), lottery.indexOf("async function redraw"));
  assert.doesNotMatch(body, /await savePrizeInputs/);
  assert.doesNotMatch(body, /await save\(/);
  assert.match(body, /const data = syncPrizeInputs\(activityId\)/);
});

test("獎品草稿在重畫前同步，儲存後更新抽獎品項", () => {
  assert.match(lottery, /function syncPrizeInputs\(activityId/);
  assert.match(lottery, /async function savePrizeInputs\(activityId, showMessage = false, refresh = false\)/);
  assert.match(lottery, /if \(refresh\) await render\(activityId, selectedPrizeId\)/);
  assert.match(lottery, /const data = syncPrizeInputs\(activityId\)/);
});

test("獎品排序以原輸入順序作為同順位的穩定條件", () => {
  assert.match(lottery, /function stableSortPrizes\(prizes\)/);
  assert.match(lottery, /left\.index - right\.index/);
  assert.match(lottery, /record\.prizes = stableSortPrizes\(record\.prizes\)/);
});

test("編輯獎品時立即刷新抽獎品項並自動儲存", () => {
  assert.match(lottery, /function refreshPrizeSelect\(activityId/);
  assert.match(lottery, /function schedulePrizeAutoSave\(activityId\)/);
  assert.match(lottery, /\[data-prize-name\],\[data-prize-qty\],\[data-prize-sort\]/);
  assert.match(lottery, /refreshPrizeSelect\(activityId, data, selectedPrizeId\)/);
  assert.match(lottery, /runAction\(\(\) => savePrizeInputs\(activityId\)\)/);
});

test("獎品表操作欄保持可見並提供刪除按鈕", () => {
  assert.match(lottery, /class="table-wrap prize-table-wrap"/);
  assert.match(lottery, /class="prize-table"/);
  assert.match(lottery, /data-prize-delete/);
  assert.match(lottery, /position:sticky;right:0/);
});

test("抽獎雙欄優先保留獎品表寬度", () => {
  assert.match(lottery, /grid-template-columns:minmax\(560px,1\.35fr\) minmax\(360px,\.85fr\)/);
  assert.match(lottery, /@media\(max-width:1100px\)\{\.lottery-split,\.lottery-controls\{grid-template-columns:1fr\}\}/);
});

test("新增刪除立即重畫並沿用已載入報名名單", () => {
  assert.match(lottery, /registrationSnapshot = null/);
  assert.match(lottery, /Array\.isArray\(registrationSnapshot\) \? registrationSnapshot : \[\]/);
  assert.match(lottery, /addPrize\(activityId, registrations\)/);
  assert.match(lottery, /deletePrize\(activityId, button\.dataset\.prizeDelete, registrations\)/);
  const add = lottery.slice(lottery.indexOf("async function addPrize"), lottery.indexOf("async function deletePrize"));
  const remove = lottery.slice(lottery.indexOf("async function deletePrize"), lottery.indexOf("async function importPrizeFile"));
  assert.ok(add.indexOf("await render") < add.indexOf("await save"));
  assert.ok(remove.indexOf("await render") < remove.indexOf("await save"));
});
