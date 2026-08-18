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
  const rows = Array.isArray(data[type])
    ? (data[type] as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];

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
