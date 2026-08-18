import fs from 'node:fs';

const file = 'src/monthly-entry.ts';
let src = fs.readFileSync(file, 'utf8');

function replaceExact(oldText, newText, label) {
  if (!src.includes(oldText)) throw new Error(`missing anchor: ${label}`);
  src = src.replace(oldText, newText);
}

function functionRange(name) {
  const marker = `function ${name}(`;
  let start = src.indexOf(marker);
  if (start < 0) {
    const asyncMarker = `async function ${name}(`;
    start = src.indexOf(asyncMarker);
  }
  if (start < 0) throw new Error(`function not found: ${name}`);
  const brace = src.indexOf('{', start);
  let depth = 0, quote = '', escape = false, lineComment = false, blockComment = false;
  for (let i = brace; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return [start, i + 1];
    }
  }
  throw new Error(`unterminated function: ${name}`);
}

function replaceFunction(name, transform) {
  const [start, end] = functionRange(name);
  const before = src.slice(start, end);
  const after = transform(before);
  if (after === before) throw new Error(`no change in function: ${name}`);
  src = src.slice(0, start) + after + src.slice(end);
}

const rawAnchor = `async function readManagerDataRaw(env: Env) {\n  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(managerDataKey) : null;\n  if (!object) return null;\n  const data = await object.json().catch(() => null) as Record<string, unknown> | null;\n  return data && typeof data === "object" ? data : null;\n}`;
const rawWithHelpers = `${rawAnchor}\n\nfunction managerRosterRowsFromData(data: Record<string, unknown> | null) {\n  if (!data) return [] as Array<Record<string, unknown>>;\n  const association = Array.isArray(data.association) ? data.association.map(asRecord).map((row) => ({ ...row, rosterType: "association" })) : [];\n  const vendor = Array.isArray(data.vendor) ? data.vendor.map(asRecord).map((row) => ({ ...row, rosterType: "vendor" })) : [];\n  return [...association, ...vendor];\n}\n\nasync function readManagerRosterMembers(env: Env) {\n  return managerRosterRowsFromData(await readManagerDataRaw(env));\n}\n\nasync function bindManagerRosterUid(env: Env, memberNoInput: string, lineUserId: string, requiredName = "") {\n  if (!env.ASSETS_BUCKET) return { success: false as const, reason: "r2-not-configured" };\n  const raw = await readManagerDataRaw(env);\n  if (!raw) return { success: false as const, reason: "member-not-found" };\n  const memberNo = clean(memberNoInput).toUpperCase();\n  const uid = clean(lineUserId);\n  for (const type of ["association", "vendor"] as const) {\n    const rows = Array.isArray(raw[type]) ? raw[type] as Array<Record<string, unknown>> : [];\n    const index = rows.findIndex((row) => rowMatchesMemberNo(row, memberNo));\n    if (index < 0) continue;\n    const row = rows[index];\n    if (requiredName && !rowMatchesMemberName(row, requiredName)) return { success: false as const, reason: "name-mismatch", memberNo };\n    const currentUid = memberLineUid(row);\n    if (validLineUid(currentUid) && currentUid.toLowerCase() !== uid.toLowerCase()) return { success: false as const, reason: "uid-conflict", memberNo };\n    row.lineUserId = uid;\n    row.LINE_user_id = uid;\n    row.uid = uid;\n    row.updatedAt = new Date().toISOString();\n    row.syncSource = "manager-roster";\n    rows[index] = row;\n    raw[type] = rows;\n    await writeManagerData(env, raw, "manager-roster-bind");\n    return { success: true as const, memberNo, row: { ...row, rosterType: type }, type };\n  }\n  return { success: false as const, reason: "member-not-found", memberNo };\n}`;
replaceExact(rawAnchor, rawWithHelpers, 'manager roster helpers');

replaceFunction('readManagerData', (body) => body.replace(
  /const data = \{ \.\.\.raw \};[\s\S]*?return \{ \.\.\.data, activities: await listActivityRecords\(env, raw\) \};/,
  'const data = { ...raw };\n  return { ...data, activities: await listActivityRecords(env, raw) };'
));

replaceFunction('writeManagerData', (body) => body.replace(
  /\n  const motherRows = await readAiweMembers\(env\)\.catch\(\(\) => \[\] as Array<Record<string, unknown>>\);\n  if \(motherRows\.length\) mergeMotherUidIntoManagerRoster\(data, motherRows\);/,
  ''
));

replaceFunction('resolveLineLoginMember', (body) => {
  const marker = '  const rows = await readAiweMembers(env);';
  const idx = body.indexOf(marker);
  return idx >= 0 ? body.slice(0, idx) + '  return null;\n}' : body;
});

replaceFunction('updateAdminAccessApi', (body) => {
  const start = body.indexOf('  const rows = await readAiweMembers(env);');
  const end = body.indexOf('  return json({ success: true, data: records[memberNo] });');
  if (start < 0 || end < 0) return body;
  const replacement = `  const rosterRows = await readManagerRosterMembers(env);\n  const matchedMember = rosterRows.find((row) => rowMatchesMemberNo(row, memberNo)) || null;\n  if (!lineUserId && matchedMember) lineUserId = memberLineUid(matchedMember);\n  if (!email && matchedMember) email = clean(matchedMember.email).toLowerCase();\n  if (!name && matchedMember) name = firstClean(matchedMember.name, matchedMember.rosterName, matchedMember.companyName);\n  const records = await readAdminAccess(env);\n  records[memberNo] = {\n    memberNo,\n    email: email || undefined,\n    lineUserId: lineUserId || undefined,\n    name,\n    loginAccess: Boolean(input.loginAccess),\n    updatedAt: new Date().toISOString(),\n    updatedBy: adminEmailFromRequest(request)\n  };\n  await writeAdminAccess(env, records);\n  if (matchedMember) {\n    const raw = await readManagerDataRaw(env);\n    if (raw) {\n      for (const type of ["association", "vendor"] as const) {\n        const rows = Array.isArray(raw[type]) ? raw[type] as Array<Record<string, unknown>> : [];\n        const index = rows.findIndex((row) => rowMatchesMemberNo(row, memberNo));\n        if (index < 0) continue;\n        rows[index] = { ...rows[index], loginAccess: Boolean(input.loginAccess), ...(lineUserId ? { lineUserId } : {}), ...(email && !clean(rows[index].email) ? { email } : {}), updatedAt: new Date().toISOString() };\n        raw[type] = rows;\n        break;\n      }\n      await writeManagerData(env, raw, "admin-access");\n    }\n  }\n`;
  return body.slice(0, start) + replacement + body.slice(end);
});

replaceFunction('resolveAndBindClaimedMember', (body) => {
  const start = body.indexOf('  const rows = await readAiweMembers(env);');
  const end = body.indexOf('  return resolveLineLoginMember(env, uid);');
  if (start < 0 || end < 0) return body;
  return body.slice(0, start) + `  const bound = await bindManagerRosterUid(env, claim.memberNo, uid, claim.name);\n  if (!bound.success) {\n    if (bound.reason === "uid-conflict") throw new Error("此會員編號已綁定其他 LINE UID，請由後台確認後再變更。");\n    return null;\n  }\n  await syncBoundMemberPoints(env, uid);\n` + body.slice(end);
});

replaceFunction('verifyAndBindMemberCheckin', () => `async function verifyAndBindMemberCheckin(env: Env, lineUserId: string, memberNo: string, memberName: string) {\n  const uid = clean(lineUserId);\n  const normalizedMemberNo = clean(memberNo).toUpperCase();\n  const bound = await bindManagerRosterUid(env, normalizedMemberNo, uid, clean(memberName));\n  if (!bound.success) return { success: false, reason: bound.reason, memberNo: normalizedMemberNo };\n  const row = bound.row;\n  return { success: true, memberNo: normalizedMemberNo, name: firstClean(row.name, row.rosterName, row.companyName), updated: 1, crm: { written: true, type: bound.type, memberNo: normalizedMemberNo } };\n}`);

replaceFunction('bindLineUidEvents', () => `async function bindLineUidEvents(events: LineEvent[], env: Env) {\n  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);\n  const rows = await readManagerRosterMembers(env);\n  const replies = [];\n  const results = [];\n  for (const event of events) {\n    const lineUserId = clean(event.source?.userId);\n    const parsed = parseUidBindKeyword(extractTriggerText(event));\n    if (!lineUserId) {\n      const message = { type: "text", text: "系統尚未取得你的 LINE UID，請從 LINE 官方帳號聊天室重新觸發會員報到。" };\n      replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });\n      results.push({ success: false, message: message.text });\n      continue;\n    }\n    const inferred = parsed.memberNo\n      ? { memberNo: parsed.memberNo, reason: "input" }\n      : normalizeKeyword(extractTriggerText(event)) === uidBindKeyword\n        ? inferUidBindMemberNo(rows, lineUserId, env)\n        : { memberNo: "", reason: "" };\n    if (!inferred.memberNo) {\n      const message = { type: "text", text: "請輸入你的會員編號完成 LINE 綁定。\\n格式：會員報到+會員編號\\n範例：會員報到+A1090001", quickReply: quickReply([fixedKeyword, "取消"]) };\n      replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });\n      results.push({ success: false, lineUserId, message: "missing-member-no" });\n      continue;\n    }\n    const bound = await bindManagerRosterUid(env, inferred.memberNo, lineUserId);\n    if (!bound.success) {\n      const text = bound.reason === "uid-conflict" ? "此會員編號已綁定其他 LINE 帳號，請聯絡協會後台確認。" : `已取得你的 LINE UID：${lineUserId}\\n但查無會員編號 ${inferred.memberNo}，請確認會員編號是否正確。`;\n      replies.push(event.replyToken ? await replyToLine(event.replyToken, [{ type: "text", text }], env) : { ok: false, status: 400, message: "Missing replyToken" });\n      results.push({ success: false, lineUserId, memberNo: inferred.memberNo, message: bound.reason });\n      continue;\n    }\n    const pointSync = await syncBoundMemberPoints(env, lineUserId) as Record<string, unknown>;\n    const pointText = pointSync.success === true ? `\\n目前點數：${numberValue(pointSync.balance)} 點` : "\\n點數同步：稍後可在後台重新同步";\n    const message = { type: "text", text: `UID 已綁定。\\n會員編號：${inferred.memberNo}\\nLINE UID：${lineUserId}\\n更新筆數：1${pointText}` };\n    replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });\n    results.push({ success: true, lineUserId, memberNo: inferred.memberNo, updated: 1, reason: inferred.reason, pointSync });\n  }\n  return json({ success: true, mode: "uid-bind", results, lineReplies: replies });\n}`);

const allowAiwe = new Set([
  'readAiweMembers','writeAiweMembers','listAiweMembersPublicApi','syncAiweMembersFromMotherApi','importAiweMembersApi','fetchGoogleMemberSheet','mergeMotherUidIntoManagerRoster','syncMotherRegisterRecordsApi','captureMotherRegisterFormApi','submitMotherRegisterApi'
]);

const functionRegex = /(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;
let match;
const names = [];
while ((match = functionRegex.exec(src))) names.push(match[1]);
for (const name of [...new Set(names)]) {
  if (allowAiwe.has(name)) continue;
  let range;
  try { range = functionRange(name); } catch { continue; }
  const [start, end] = range;
  const body = src.slice(start, end);
  if (!body.includes('readAiweMembers(env)')) continue;
  const next = body.replaceAll('readAiweMembers(env)', 'readManagerRosterMembers(env)');
  src = src.slice(0, start) + next + src.slice(end);
}

for (const name of [...new Set(names)]) {
  if (allowAiwe.has(name)) continue;
  let range;
  try { range = functionRange(name); } catch { continue; }
  const body = src.slice(range[0], range[1]);
  if (body.includes('writeAiweMembers(env')) throw new Error(`business flow still writes AIWE: ${name}`);
}

fs.writeFileSync(file, src);
console.log('canonical manager roster patch applied');
// retrigger: 2026-08-18 canonical roster source-of-truth
