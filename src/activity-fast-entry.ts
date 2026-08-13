import app from "./manager-fast-entry";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  ADMIN_EMAILS?: string;
  [key: string]: unknown;
};

const activityIndexKey = "activities/index.json";
const activitySnapshotKey = "activities/snapshot.json";
const monthlySnapshotKey = "flex/monthly-activity-effective.json";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function json(data: unknown, status = 200, timing?: Record<string, number>) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid,x-aiwe-token,x-line-signature"
  });
  if (timing) {
    const value = Object.entries(timing).map(([key, ms]) => `${key};dur=${Math.max(0, Math.round(ms))}`).join(", ");
    headers.set("server-timing", value);
    headers.set("x-tdea-activity-save-timing", JSON.stringify(timing));
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function nowMs() {
  return performance.now();
}

function activityRecordKey(id: string) {
  return `activities/records/${encodeURIComponent(id)}.json`;
}

function adminIdentity(request: Request) {
  return {
    email: clean(request.headers.get("x-admin-email")).toLowerCase(),
    memberNo: clean(request.headers.get("x-admin-member-no")).toUpperCase(),
    lineUserId: clean(request.headers.get("x-line-user-id") || request.headers.get("x-line-uid"))
  };
}

function identityMatches(row: Record<string, unknown>, identity: ReturnType<typeof adminIdentity>) {
  if (row.enabled === false || row.loginAccess === false) return false;
  const email = clean(row.email).toLowerCase();
  const memberNo = clean(row.memberNo).toUpperCase();
  const lineUserId = clean(row.lineUserId || row.lineUid || row.uid || row.LINE_user_id);
  return Boolean(
    (identity.email && email && identity.email === email) ||
    (identity.memberNo && memberNo && identity.memberNo === memberNo) ||
    (identity.lineUserId && lineUserId && identity.lineUserId === lineUserId)
  );
}

async function authorize(request: Request, env: Env) {
  const identity = adminIdentity(request);
  const staticAdmins = clean(env.ADMIN_EMAILS).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (identity.email && staticAdmins.includes(identity.email)) return true;
  if (!env.ASSETS_BUCKET) return false;

  const whitelistObject = await env.ASSETS_BUCKET.get("line/admin-whitelist.json");
  if (whitelistObject) {
    const data = await whitelistObject.json().catch(() => ({})) as unknown;
    const rows = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).records)
        ? (data as Record<string, unknown>).records as unknown[]
        : [];
    if (rows.some((row) => row && typeof row === "object" && identityMatches(row as Record<string, unknown>, identity))) return true;
  }

  const accessObject = await env.ASSETS_BUCKET.get("line/admin-access.json");
  if (accessObject) {
    const data = await accessObject.json().catch(() => ({})) as unknown;
    const rows = data && typeof data === "object" && !Array.isArray(data) ? Object.values(data as Record<string, unknown>) : [];
    if (rows.some((row) => row && typeof row === "object" && identityMatches(row as Record<string, unknown>, identity))) return true;
  }
  return false;
}

async function readJsonObject(env: Env, key: string) {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
}

async function readActivityIds(env: Env) {
  if (!env.ASSETS_BUCKET) return [] as string[];
  const object = await env.ASSETS_BUCKET.get(activityIndexKey);
  const data = object ? await object.json().catch(() => []) : [];
  return Array.isArray(data) ? [...new Set(data.map(clean).filter(Boolean))] : [];
}

async function ensureActivityIndex(env: Env, id: string) {
  if (!env.ASSETS_BUCKET) return;
  const ids = await readActivityIds(env);
  if (ids.includes(id)) return;
  await env.ASSETS_BUCKET.put(activityIndexKey, JSON.stringify([id, ...ids], null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

async function rebuildActivitySnapshotInBackground(env: Env) {
  if (!env.ASSETS_BUCKET) return;
  const ids = await readActivityIds(env);
  const records = (await Promise.all(ids.map(async (id) => {
    const object = await env.ASSETS_BUCKET!.get(activityRecordKey(id));
    if (!object) return null;
    const data = await object.json().catch(() => null);
    return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
  }))).filter((item): item is Record<string, unknown> => Boolean(item));
  await env.ASSETS_BUCKET.put(activitySnapshotKey, JSON.stringify({ updatedAt: new Date().toISOString(), count: records.length, activities: records }, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

function isActivityOnline(activity: Record<string, unknown>) {
  const status = clean(activity.status || activity["狀態"]);
  if (activity.archived === true || activity.deleted === true || clean(activity.deletedAt)) return false;
  if (["已封存", "封存", "下架"].includes(status)) return false;
  return !status || status === "上架" || /online|active|published/i.test(status);
}

function patchMonthlyPage(page: Record<string, unknown>, activity: Record<string, unknown>) {
  const id = clean(activity.id);
  const activityNo = clean(activity.activityNo);
  const pageMatches = [page.id, page.activityId, page.activityNo].map(clean).some((value) => value && (value === id || (activityNo && value === activityNo)));
  if (!pageMatches) return page;
  return {
    ...page,
    manual: false,
    activityId: id || clean(page.activityId),
    activityNo: activityNo || clean(page.activityNo),
    activityName: clean(activity.name || page.activityName),
    imageUrl: clean(activity.imageUrl || activity.posterUrl || activity.formImageUrl || page.imageUrl),
    formImageUrl: clean(activity.formImageUrl || activity.imageUrl || activity.posterUrl || page.formImageUrl),
    detailTitle: clean(activity.name || page.detailTitle),
    detailText: clean(activity.detailText || activity.description || page.detailText),
    formUrl: clean(activity.nativeFormUrl || activity.formUrl || page.formUrl)
  };
}

async function patchMonthlySnapshotInBackground(env: Env, activity: Record<string, unknown>) {
  if (!env.ASSETS_BUCKET) return;
  const snapshot = await readJsonObject(env, monthlySnapshotKey);
  if (!snapshot || !Array.isArray(snapshot.pages)) return;
  const pages = (snapshot.pages as unknown[]).filter((page): page is Record<string, unknown> => Boolean(page) && typeof page === "object" && !Array.isArray(page));
  const id = clean(activity.id);
  const activityNo = clean(activity.activityNo);
  const matches = (page: Record<string, unknown>) => [page.id, page.activityId, page.activityNo].map(clean).some((value) => value && (value === id || (activityNo && value === activityNo)));
  const nextPages = isActivityOnline(activity)
    ? pages.map((page) => patchMonthlyPage(page, activity))
    : pages.filter((page) => !matches(page));
  if (JSON.stringify(nextPages) === JSON.stringify(pages)) return;
  await env.ASSETS_BUCKET.put(monthlySnapshotKey, JSON.stringify({ ...snapshot, pages: nextPages, updatedAt: new Date().toISOString() }, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

async function fastActivityUpdate(request: Request, env: Env, ctx: ExecutionContext, id: string) {
  const started = nowMs();
  const timing: Record<string, number> = {};
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);

  let mark = nowMs();
  const allowed = await authorize(request, env);
  timing.auth = nowMs() - mark;
  if (!allowed) return json({ success: false, message: "Unauthorized" }, 401, { ...timing, total: nowMs() - started });

  mark = nowMs();
  const text = await request.text();
  timing.body = nowMs() - mark;
  let input: Record<string, unknown>;
  try { input = JSON.parse(text || "{}"); }
  catch (_) { return json({ success: false, message: "Invalid activity payload" }, 400, { ...timing, total: nowMs() - started }); }

  mark = nowMs();
  const existing = await readJsonObject(env, activityRecordKey(id));
  timing.r2_get = nowMs() - mark;
  const identity = adminIdentity(request);
  const actor = identity.email || identity.memberNo || identity.lineUserId || "admin";
  const now = new Date().toISOString();
  const record: Record<string, unknown> = {
    ...(existing || {}),
    ...input,
    id,
    createdAt: clean(existing?.createdAt) || clean(input.createdAt) || now,
    createdBy: clean(existing?.createdBy) || clean(input.createdBy) || actor,
    updatedAt: now,
    updatedBy: actor,
    revision: Number(existing?.revision || 0) + 1
  };

  mark = nowMs();
  await env.ASSETS_BUCKET.put(activityRecordKey(id), JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  timing.r2_put = nowMs() - mark;

  const background = Promise.allSettled([
    ensureActivityIndex(env, id),
    rebuildActivitySnapshotInBackground(env),
    patchMonthlySnapshotInBackground(env, record)
  ]).then(() => undefined);
  ctx.waitUntil(background);

  timing.total = nowMs() - started;
  return json({ success: true, data: record, fastPath: true, backgroundRefresh: true, timing }, 200, timing);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const match = request.method === "PUT" ? url.pathname.match(/^\/api\/activities\/([^/]+)$/) : null;
    if (match) return fastActivityUpdate(request, env, ctx, decodeURIComponent(match[1]));
    return app.fetch(request, env, ctx);
  }
};
