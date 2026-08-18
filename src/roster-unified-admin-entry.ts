import app from "./roster-unified-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key: string]: unknown };
type Row = Record<string, unknown>;

const MANAGER_KEY = "manager/state.json";
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const memberNoOf = (row: Row) => clean(row.memberNo || row.rosterMemberNo || row.memberNumber, 100).toUpperCase();
const lineUidOf = (row: Row) => clean(row.lineUserId || row.uid || row.lineUid, 256);

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

function generalRows(data: Record<string, unknown>): Row[] {
  return Array.isArray(data.general)
    ? (data.general as unknown[]).filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];
}

function fromLegacyGeneral(row: Row): Row {
  const now = new Date().toISOString();
  const memberNo = clean(row.memberNumber || row.memberNo, 100).toUpperCase();
  const lineUserId = lineUidOf(row);
  const name = clean(row.fullName || row.displayName, 180);
  return {
    id: clean(row.id, 160) || `id-${crypto.randomUUID()}`,
    memberType: "general",
    type: "general",
    memberNo,
    rosterMemberNo: memberNo,
    name,
    displayName: clean(row.displayName || name, 180),
    phone: clean(row.phone, 60),
    email: clean(row.email, 320),
    gender: clean(row.gender, 30),
    birthday: clean(row.birthday, 30),
    lineUserId,
    uid: lineUserId,
    loginAccess: Boolean(lineUserId),
    allowLogin: Boolean(lineUserId),
    canLogin: Boolean(lineUserId),
    qualification: "Y",
    tdeaDesignUserId: clean(row.userId, 180),
    identityBoundAt: clean(row.profileCompletedAt, 40) || (lineUserId ? now : ""),
    source: "tdea-design-general-backfill",
    createdAt: clean(row.createdAt, 40) || now,
    updatedAt: now,
  };
}

function sameGeneral(left: Row, right: Row) {
  const leftUser = clean(left.tdeaDesignUserId || left.userId, 180);
  const rightUser = clean(right.tdeaDesignUserId || right.userId, 180);
  if (leftUser && rightUser && leftUser === rightUser) return true;
  const leftNo = memberNoOf(left), rightNo = memberNoOf(right);
  if (leftNo && rightNo && leftNo === rightNo) return true;
  const leftUid = lineUidOf(left), rightUid = lineUidOf(right);
  return Boolean(leftUid && rightUid && leftUid === rightUid);
}

function publicGeneral(row: Row, legacy: Row | undefined) {
  return {
    userId: clean(row.tdeaDesignUserId || legacy?.userId || row.id, 180),
    memberNumber: memberNoOf(row),
    fullName: clean(row.name || row.fullName || row.displayName, 180),
    displayName: clean(row.displayName || row.name, 180),
    lineUserId: lineUidOf(row),
    phone: clean(row.phone, 60),
    email: clean(row.email, 320),
    gender: clean(row.gender, 30),
    birthday: clean(row.birthday, 30),
    profileCompletedAt: clean(row.identityBoundAt || legacy?.profileCompletedAt || row.updatedAt, 40),
    pointBalance: Number(legacy?.pointBalance || 0),
    memberType: "general",
    source: MANAGER_KEY,
  };
}

async function unifiedGeneralMembers(request: Request, env: Env, ctx: ExecutionContext) {
  // 先呼叫舊 API：同時沿用既有管理員授權，並取得 D1 舊會員供第一次自動搬移與點數顯示。
  const legacyResponse = await app.fetch(request.clone(), env as never, ctx);
  if (!legacyResponse.ok) return legacyResponse;
  const legacyPayload = await legacyResponse.clone().json().catch(() => null) as Record<string, any> | null;
  const legacyMembers: Row[] = Array.isArray(legacyPayload?.data?.members)
    ? legacyPayload!.data.members.filter((row: unknown): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];

  const state = await readState(env);
  const rows = generalRows(state);
  let changed = false;
  for (const legacy of legacyMembers) {
    if (!clean(legacy.memberNumber || legacy.memberNo, 100)) continue;
    if (rows.some((row) => sameGeneral(row, legacy))) continue;
    rows.push(fromLegacyGeneral(legacy));
    changed = true;
  }
  if (changed) {
    state.general = rows;
    await writeState(env, state);
  }

  const members = rows.map((row) => {
    const legacy = legacyMembers.find((item) => sameGeneral(row, item));
    return publicGeneral(row, legacy);
  });
  return json({ success: true, data: { members }, source: MANAGER_KEY, migratedFromD1: changed });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/general-members") {
      try { return await unifiedGeneralMembers(request, env, ctx); }
      catch (error) { return json({ success: false, message: error instanceof Error ? error.message : String(error) }, 500); }
    }
    return app.fetch(request, env as never, ctx);
  }
};
