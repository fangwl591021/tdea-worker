import app from "./roster-single-crud-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key: string]: unknown };
type Row = Record<string, unknown>;
type MemberType = "general" | "association" | "vendor";

const MANAGER_KEY = "manager/state.json";
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const normalizePhone = (value: unknown) => {
  let phone = clean(value, 60).replace(/[^0-9+]/g, "");
  if (phone.startsWith("+886")) phone = `0${phone.slice(4)}`;
  return phone.replace(/\D/g, "");
};
const memberNoOf = (row: Row) => clean(row.memberNo || row.rosterMemberNo || row.member_no, 100).toUpperCase();
const lineUidOf = (row: Row) => clean(row.lineUserId || row.LINE_user_id || row.uid || row.lineUid || row.line_user_id, 256);
const normalizeType = (value: unknown): MemberType | "" => {
  const type = clean(value, 30).toLowerCase();
  return type === "general" || type === "association" || type === "vendor" ? type : "";
};
const internalRequest = (request: Request) => new URL(request.url).hostname === "tdea-roster.internal";

async function readState(env: Env): Promise<Record<string, unknown>> {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket is not configured");
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

function rowsOf(data: Record<string, unknown>, type: MemberType): Row[] {
  return Array.isArray(data[type])
    ? (data[type] as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];
}

function allRows(data: Record<string, unknown>) {
  return (["general", "association", "vendor"] as MemberType[])
    .flatMap((type) => rowsOf(data, type).map((row) => ({ type, row })));
}

function memberName(input: Row, type: MemberType) {
  if (type === "vendor") return clean(input.companyName || input.company || input.fullName || input.name || input.displayName, 220);
  return clean(input.fullName || input.name || input.displayName || input.rosterName, 180);
}

function unifiedMember(existing: Row, input: Row, type: MemberType) {
  const now = new Date().toISOString();
  const memberNo = clean(input.memberNumber || input.memberNo || input.rosterMemberNo || memberNoOf(existing), 100).toUpperCase();
  const lineUserId = clean(input.lineUserId || input.uid || lineUidOf(existing), 256);
  const phone = normalizePhone(input.phone || existing.phone || existing.mobile);
  const name = memberName(input, type) || memberName(existing, type);
  const loginAccess = input.loginAccess === false ? false : Boolean(lineUserId || input.loginAccess === true || existing.loginAccess === true);
  return {
    ...existing,
    id: clean(existing.id || input.id, 160) || `id-${crypto.randomUUID()}`,
    memberType: type,
    type,
    memberNo,
    rosterMemberNo: memberNo,
    ...(type === "vendor" ? { companyName: name } : { name }),
    displayName: clean(input.displayName || existing.displayName || name, 180),
    phone,
    email: clean(input.email || existing.email, 320),
    gender: clean(input.gender || existing.gender, 30),
    birthday: clean(input.birthday || existing.birthday, 30),
    lineUserId,
    uid: lineUserId,
    loginAccess,
    allowLogin: loginAccess,
    canLogin: loginAccess,
    qualification: clean(existing.qualification || input.qualification, 30) || "Y",
    tdeaDesignUserId: clean(input.tdeaDesignUserId || existing.tdeaDesignUserId, 180),
    identityBoundAt: lineUserId ? clean(existing.identityBoundAt, 40) || now : clean(existing.identityBoundAt, 40),
    source: clean(existing.source || input.source, 80) || "tdea-design",
    updatedAt: now,
  };
}

async function handleUpsert(request: Request, env: Env) {
  if (!internalRequest(request)) return json({ success: false, message: "Not found" }, 404);
  const input = await request.json().catch(() => ({})) as Row;
  const type = normalizeType(input.memberType || input.type);
  if (!type) return json({ success: false, message: "會員類型錯誤" }, 400);

  const lineUserId = clean(input.lineUserId || input.uid, 256);
  if (lineUserId && !/^U[0-9a-f]{32}$/i.test(lineUserId)) return json({ success: false, message: "LINE UID 格式錯誤" }, 400);

  const data = await readState(env);
  const rows = rowsOf(data, type);
  const memberNo = clean(input.memberNumber || input.memberNo || input.rosterMemberNo, 100).toUpperCase();

  if (lineUserId) {
    const occupied = allRows(data).find(({ row }) => lineUidOf(row) === lineUserId && (!memberNo || memberNoOf(row) !== memberNo));
    if (occupied) return json({ success: false, message: "此 LINE UID 已綁定其他會員", code: "line_uid_already_bound" }, 409);
  }

  let index = memberNo ? rows.findIndex((row) => memberNoOf(row) === memberNo) : -1;
  if (index < 0 && lineUserId) index = rows.findIndex((row) => lineUidOf(row) === lineUserId);

  if (type !== "general" && index < 0) {
    return json({ success: false, message: `查無正式會員編號 ${memberNo || ""}`.trim(), code: "formal_roster_member_not_found" }, 404);
  }

  if (type === "general" && index < 0 && !memberNo) {
    return json({ success: false, message: "一般會員必須提供會員編號", code: "member_number_required" }, 400);
  }

  const existing = index >= 0 ? rows[index] : {};
  const next = unifiedMember(existing, input, type);
  if (!memberNoOf(next)) return json({ success: false, message: "會員編號不可為空" }, 400);
  if (!memberName(next, type)) return json({ success: false, message: type === "vendor" ? "公司名稱不可為空" : "姓名不可為空" }, 400);

  const sameNumberElsewhere = allRows(data).find(({ type: otherType, row }) =>
    !(otherType === type && row === existing) && memberNoOf(row) === memberNoOf(next)
  );
  if (sameNumberElsewhere) return json({ success: false, message: `會員編號 ${memberNoOf(next)} 已由其他會員使用` }, 409);

  if (index >= 0) rows[index] = next;
  else rows.unshift(next);
  data[type] = rows;
  await writeState(env, data);

  return json({ success: true, data: next, memberType: type, source: MANAGER_KEY, created: index < 0, verified: true }, index < 0 ? 201 : 200);
}

async function handleByLine(request: Request, env: Env) {
  if (!internalRequest(request)) return json({ success: false, message: "Not found" }, 404);
  const uid = clean(new URL(request.url).searchParams.get("uid"), 256);
  if (!uid) return json({ success: false, message: "uid is required" }, 400);
  const data = await readState(env);
  const found = allRows(data).find(({ row }) => lineUidOf(row) === uid);
  if (!found) return json({ success: true, found: false, data: null });
  return json({ success: true, found: true, memberType: found.type, data: found.row, source: MANAGER_KEY });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/internal/tdea-design/member-upsert") {
      try { return await handleUpsert(request, env); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    if (request.method === "GET" && url.pathname === "/api/internal/tdea-design/member-by-line") {
      try { return await handleByLine(request, env); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    return app.fetch(request, env as never, ctx);
  }
};
