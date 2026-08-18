import app from "./roster-contact-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key: string]: unknown };
type Row = Record<string, unknown>;

const MANAGER_KEY = "manager/state.json";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const memberNoOf = (row: Row) => clean(row.memberNo || row.rosterMemberNo || row.member_no, 100).toUpperCase();
const lineUidOf = (row: Row) => clean(row.lineUserId || row.LINE_user_id || row.uid || row.lineUid || row.line_user_id, 256);
const normalizedSearch = (value: unknown) => clean(value, 240).toLocaleLowerCase().replace(/\s+/g, "");
const normalizedPhone = (value: unknown) => {
  let phone = clean(value, 60).replace(/[^0-9+]/g, "");
  if (phone.startsWith("+886")) phone = `0${phone.slice(4)}`;
  return phone.replace(/\D/g, "");
};

function loginAllowed(row: Row) {
  if ([row.loginAccess, row.loginAllowed, row.allowLogin, row.canLogin, row.adminAccess].some((value) => value === true)) return true;
  return [row.loginAccess, row.loginAllowed, row.allowLogin, row.canLogin, row.adminAccess]
    .some((value) => ["1", "TRUE", "Y", "YES", "ALLOW", "ALLOWED", "允許", "啟用"].includes(clean(value, 30).toUpperCase()));
}

async function adminAllowed(request: Request, env: Env, ctx: ExecutionContext) {
  const probeUrl = new URL(request.url);
  probeUrl.pathname = "/api/manager-data";
  probeUrl.search = "";
  const probe = new Request(probeUrl.toString(), { method: "GET", headers: request.headers });
  const response = await app.fetch(probe, env as never, ctx);
  return response.ok;
}

async function readState(env: Env): Promise<Record<string, unknown>> {
  if (!env.ASSETS_BUCKET) return {};
  const object = await env.ASSETS_BUCKET.get(MANAGER_KEY);
  const data = object ? await object.json().catch(() => ({})) : {};
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
}

async function writeState(env: Env, data: Record<string, unknown>) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket is not configured");
  data.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(MANAGER_KEY, JSON.stringify(data, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

function normalizeType(value: unknown): "association" | "vendor" | "" {
  const type = clean(value, 30).toLowerCase();
  return type === "association" || type === "vendor" ? type : "";
}

function rosterRows(data: Record<string, unknown>, type: "association" | "vendor"): Row[] {
  return Array.isArray(data[type])
    ? (data[type] as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];
}

function rowTimestamp(row: Row) {
  const value = clean(row.updatedAt || row.updated_at || row.modifiedAt || row.modified_at || row.createdAt || row.created_at, 80);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowCompleteness(row: Row) {
  return Object.values(row).reduce((score, value) => score + (clean(value, 500) ? 1 : 0), 0);
}

function dedupeRosterRows(rows: Row[]): Row[] {
  const byMemberNo = new Map<string, Row>();
  for (const row of rows) {
    const memberNo = memberNoOf(row);
    if (!memberNo) continue;
    const previous = byMemberNo.get(memberNo);
    if (!previous) {
      byMemberNo.set(memberNo, row);
      continue;
    }
    const previousTime = rowTimestamp(previous);
    const currentTime = rowTimestamp(row);
    if (currentTime > previousTime || (currentTime === previousTime && rowCompleteness(row) > rowCompleteness(previous))) {
      byMemberNo.set(memberNo, row);
    }
  }
  return [...byMemberNo.values()];
}

function hasCompletedProfileMarker(row: Row) {
  return Boolean(clean(
    row.profileCompletedAt ||
    row.profile_completed_at ||
    row.rosterVerifiedAt ||
    row.roster_verified_at ||
    row.registrationCompletedAt ||
    row.registration_completed_at ||
    row.completedAt ||
    row.completed_at,
    80
  ));
}

function preferCompletedCandidates(rows: Row[]): Row[] {
  if (rows.length <= 1) return rows;
  const completed = rows.filter(hasCompletedProfileMarker);
  return completed.length ? completed : rows;
}

function rosterNameOf(row: Row, type: "association" | "vendor") {
  return type === "association"
    ? clean(row.name || row.rosterName || row.memberName || row.displayName, 240)
    : clean(row.companyName || row.company || row.name || row.rosterName || row.displayName, 240);
}

function rosterPhoneOf(row: Row) {
  return clean(row.phone || row.mobile || row.tel || row.telephone || row.contactPhone, 60);
}

function rosterBirthdayOf(row: Row) {
  return clean(row.birthday || row.birthDate || row.birth_date || row["生日"], 30);
}

function internalRosterRequest(request: Request) {
  return new URL(request.url).hostname === "tdea-roster.internal";
}

function lookupMatch(row: Row, type: "association" | "vendor") {
  return {
    memberNumber: memberNoOf(row),
    rosterName: rosterNameOf(row, type),
    source: MANAGER_KEY,
    phone: rosterPhoneOf(row)
  };
}

async function handleMemberNumberLookup(request: Request, env: Env) {
  if (!internalRosterRequest(request)) return json({ success: false, message: "Not found" }, 404);
  const input = await request.json().catch(() => ({})) as Row;
  const type = normalizeType(input.memberType);
  const fullName = clean(input.fullName, 240);
  if (!type) return json({ success: false, message: "會員類型錯誤" }, 400);
  if (!fullName) return json({ success: false, message: "請輸入姓名／公司名稱" }, 400);

  const data = await readState(env);
  const rows = dedupeRosterRows(rosterRows(data, type).filter((row) => memberNoOf(row) && rosterNameOf(row, type)));
  const needle = normalizedSearch(fullName);
  const exact = rows.filter((row) => normalizedSearch(rosterNameOf(row, type)) === needle);
  let matches = exact;
  if (!matches.length) matches = rows.filter((row) => normalizedSearch(rosterNameOf(row, type)).includes(needle));
  matches = preferCompletedCandidates(matches);

  if (!matches.length) {
    return json({ success: false, message: `查無「${fullName}」的${type === "association" ? "協會" : "廠商"}會員資料` }, 404);
  }
  if (matches.length > 1) {
    return json({ success: false, message: `找到 ${matches.length} 筆不同會員編號的相符資料，請輸入更完整的${type === "association" ? "姓名" : "公司名稱"}` }, 409);
  }

  return json({ success: true, match: lookupMatch(matches[0], type) });
}

async function handleMemberLookup(request: Request, env: Env) {
  if (!internalRosterRequest(request)) return json({ success: false, message: "Not found" }, 404);
  const input = await request.json().catch(() => ({})) as Row;
  const type = normalizeType(input.memberType);
  const memberNumber = clean(input.memberNumber || input.memberNo, 100).toUpperCase();
  const fullName = clean(input.fullName, 240);
  if (!type) return json({ success: false, message: "會員類型錯誤" }, 400);
  if (!memberNumber) return json({ success: false, message: "請提供會員編號" }, 400);

  const data = await readState(env);
  const row = dedupeRosterRows(rosterRows(data, type)).find((item) => memberNoOf(item) === memberNumber);
  if (!row) return json({ success: false, message: `查無會員編號 ${memberNumber}` }, 404);

  const rosterName = rosterNameOf(row, type);
  if (fullName && normalizedSearch(rosterName) !== normalizedSearch(fullName)) {
    return json({ success: false, message: "會員姓名／公司名稱與名冊不符" }, 409);
  }

  const requestPhone = normalizedPhone(input.phone);
  const rosterPhone = normalizedPhone(rosterPhoneOf(row));
  if (requestPhone && rosterPhone && requestPhone !== rosterPhone) {
    return json({ success: false, message: "會員電話與名冊不符" }, 409);
  }

  const requestBirthday = clean(input.birthday, 30).replace(/[^0-9]/g, "");
  const rosterBirthday = rosterBirthdayOf(row).replace(/[^0-9]/g, "");
  if (requestBirthday && rosterBirthday && requestBirthday !== rosterBirthday) {
    return json({ success: false, message: "會員生日與名冊不符" }, 409);
  }

  return json({ success: true, match: lookupMatch(row, type) });
}

function normalizeMember(input: Row, type: "association" | "vendor") {
  const now = new Date().toISOString();
  const memberNo = memberNoOf(input);
  const id = clean(input.id, 160) || `id-${crypto.randomUUID()}`;
  const loginAccess = input.loginAccess === true || clean(input.loginAccess).toUpperCase() === "Y";
  return {
    ...input,
    id,
    memberNo,
    rosterMemberNo: memberNo,
    loginAccess,
    allowLogin: loginAccess,
    canLogin: loginAccess,
    qualification: clean(input.qualification, 30) || "Y",
    ...(type === "association"
      ? { name: clean(input.name || input.rosterName, 180) }
      : { companyName: clean(input.companyName || input.name, 220) }),
    updatedAt: now
  };
}

async function internalAdminSubjects(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.hostname !== "tdea-permission.internal") return json({ success: false, message: "Not found" }, 404);
  const data = await readState(env);
  const rows: Row[] = ["association", "vendor"].flatMap((type) =>
    Array.isArray(data[type])
      ? (data[type] as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
      : []
  );
  const lineUserIds = Array.from(new Set(rows.filter(loginAllowed).map(lineUidOf).filter((uid) => /^U[0-9a-f]{32}$/i.test(uid))));
  return json({ success: true, lineUserIds, total: lineUserIds.length, source: MANAGER_KEY });
}

async function handleMemberCrud(request: Request, env: Env, ctx: ExecutionContext) {
  if (!await adminAllowed(request, env, ctx)) return json({ success: false, message: "Unauthorized" }, 401);
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);

  const input = await request.json().catch(() => ({})) as Row;
  const type = normalizeType(input.memberType || input.type);
  if (!type) return json({ success: false, message: "會員類型錯誤" }, 400);

  const data = await readState(env);
  const rows = rosterRows(data, type);

  if (request.method === "POST") {
    const member = normalizeMember(input, type);
    const memberNo = memberNoOf(member);
    if (!memberNo) return json({ success: false, message: "請輸入會員編號" }, 400);
    const displayName = type === "association" ? clean(member.name) : clean(member.companyName);
    if (!displayName) return json({ success: false, message: type === "association" ? "請輸入姓名" : "請輸入公司名稱" }, 400);
    if (rows.some((row) => memberNoOf(row) === memberNo)) return json({ success: false, message: `會員編號 ${memberNo} 已存在` }, 409);
    rows.unshift(member);
    data[type] = rows;
    await writeState(env, data);
    const verify = await readState(env);
    const savedRows = Array.isArray(verify[type]) ? verify[type] as Row[] : [];
    const saved = savedRows.find((row) => memberNoOf(row) === memberNo);
    if (!saved) return json({ success: false, message: "會員寫入後驗證失敗" }, 500);
    return json({ success: true, data: saved, source: MANAGER_KEY, verified: true }, 201);
  }

  const id = clean(input.id, 160);
  const memberNo = memberNoOf(input);
  const index = rows.findIndex((row) => (id && clean(row.id, 160) === id) || (memberNo && memberNoOf(row) === memberNo));
  if (index < 0) return json({ success: false, message: "找不到會員" }, 404);

  if (request.method === "PUT") {
    const member = normalizeMember({ ...rows[index], ...input, id: clean(rows[index].id) || id }, type);
    const nextNo = memberNoOf(member);
    if (!nextNo) return json({ success: false, message: "請輸入會員編號" }, 400);
    if (rows.some((row, i) => i !== index && memberNoOf(row) === nextNo)) return json({ success: false, message: `會員編號 ${nextNo} 已存在` }, 409);
    rows[index] = member;
    data[type] = rows;
    await writeState(env, data);
    return json({ success: true, data: member, source: MANAGER_KEY, verified: true });
  }

  if (request.method === "DELETE") {
    const [removed] = rows.splice(index, 1);
    data[type] = rows;
    await writeState(env, data);
    return json({ success: true, data: removed, source: MANAGER_KEY, verified: true });
  }

  return json({ success: false, message: "Method not allowed" }, 405);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/internal/tdea-design/member-number-lookup") {
      try { return await handleMemberNumberLookup(request, env); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    if (request.method === "POST" && url.pathname === "/api/internal/tdea-design/member-lookup") {
      try { return await handleMemberLookup(request, env); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    if (request.method === "GET" && url.pathname === "/api/internal/tdea-design/admin-subjects") {
      try { return await internalAdminSubjects(request, env); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    if (url.pathname === "/api/roster/member" && ["POST", "PUT", "DELETE"].includes(request.method)) {
      try { return await handleMemberCrud(request, env, ctx); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    return app.fetch(request, env as never, ctx);
  }
};