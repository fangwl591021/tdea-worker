import app from "./activity-canonical-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const clean = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);
const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type":"application/json; charset=utf-8", "cache-control":"no-store" } });
}

async function authorize(request: Request, env: Env, ctx: ExecutionContext) {
  const probe = new Request(new URL("/api/admin-access", request.url), { method:"GET", headers:request.headers });
  return (await app.fetch(probe, env as never, ctx)).ok;
}

async function putJson(env: Env, key: string, value: unknown) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket is not configured");
  await env.ASSETS_BUCKET.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType:"application/json; charset=utf-8", cacheControl:"no-store" }
  });
}

async function readJson(env: Env, key: string): Promise<Row | null> {
  if (!env.ASSETS_BUCKET) return null;
  const obj = await env.ASSETS_BUCKET.get(key);
  if (!obj) return null;
  return await obj.json().catch(() => null) as Row | null;
}

function normalizeField(field: Row, index: number) {
  const requestedType = clean(field.type || "text", 40).toLowerCase();
  const type = ["text","email","paragraph","radio","checkbox","dropdown","file"].includes(requestedType) ? requestedType : "text";
  const key = clean(field.key, 160) || `field_${index + 1}`;
  const label = clean(field.label || key, 300);
  const options = Array.isArray(field.options) ? field.options.map((x: unknown) => clean(x, 300)).filter(Boolean) : [];
  return { key, label, type, required: field.required === true, ...(options.length ? { options } : {}) };
}

function dedupeFields(fields: unknown): Row[] {
  const list = Array.isArray(fields) ? fields.filter((x): x is Row => Boolean(x) && typeof x === "object") : [];
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const raw of list) {
    const field = normalizeField(raw, out.length);
    const identity = clean(field.label, 300).toLowerCase().replace(/\s+/g, " ") || clean(field.key, 160);
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    out.push(field);
  }
  return out;
}

async function createCanonical(request: Request, env: Env, ctx: ExecutionContext) {
  if (!env.ASSETS_BUCKET) return json({ success:false, message:"R2 bucket is not configured" }, 503);
  if (!await authorize(request, env, ctx)) return json({ success:false, message:"Unauthorized" }, 401);

  const input = await request.json().catch(() => ({})) as Row;
  const incomingActivity = input.activity && typeof input.activity === "object" ? input.activity as Row : input;
  const incomingSettings = input.settings && typeof input.settings === "object" ? input.settings as Row : {};
  const id = clean(incomingActivity.id, 160) || `id-${crypto.randomUUID()}`;
  const name = clean(incomingActivity.name, 300);
  if (!name) return json({ success:false, message:"活動名稱為必填" }, 400);

  const fields = dedupeFields(input.fields ?? incomingSettings.fields ?? []);
  const customFields = fields.filter((field) => !systemKeys.has(clean(field.key, 160)));
  const sessions = Array.isArray(input.sessions) ? input.sessions : Array.isArray(incomingSettings.sessions) ? incomingSettings.sessions : [];
  const now = new Date().toISOString();
  const activity: Row = {
    ...incomingActivity,
    id,
    createdAt:clean(incomingActivity.createdAt) || now,
    updatedAt:now
  };
  const settings: Row = { ...incomingSettings, fields, customFields, sessions };

  const activityResponse = await app.fetch(new Request(new URL("/api/activities", request.url), {
    method:"POST",
    headers:new Headers(request.headers),
    body:JSON.stringify(activity)
  }), env as never, ctx);
  const activityResult = await activityResponse.json().catch(() => ({})) as Row;
  if (!activityResponse.ok || activityResult.success === false) {
    return json({ success:false, message:activityResult.message || "活動基本資料建立失敗" }, activityResponse.status || 500);
  }
  const savedActivity = (activityResult.data && typeof activityResult.data === "object" ? activityResult.data : activityResult.activity) || activity;
  const savedId = clean(savedActivity.id || id, 160) || id;
  const nativeActivity = { ...activity, ...savedActivity, id:savedId };

  // Reuse the established native-form engine so create/update/read all share one schema builder.
  const nativeResponse = await app.fetch(new Request(new URL("/api/native-forms/create", request.url), {
    method:"POST",
    headers:new Headers(request.headers),
    body:JSON.stringify({ activity:nativeActivity, settings })
  }), env as never, ctx);
  const nativeResult = await nativeResponse.json().catch(() => ({})) as Row;
  if (!nativeResponse.ok || nativeResult.success === false) {
    return json({ success:false, message:nativeResult.message || "正式報名表建立失敗", activity:nativeActivity, activitySaved:true }, nativeResponse.status || 500);
  }

  const formId = clean(nativeResult.formId || nativeResult.nativeFormId || savedId, 160);
  const formUrl = clean(nativeResult.formUrl || nativeResult.nativeFormUrl, 1000);
  const finalActivity: Row = {
    ...nativeActivity,
    formId,
    nativeFormId:formId,
    formUrl,
    nativeFormUrl:formUrl,
    formMode:"native_form",
    updatedAt:new Date().toISOString()
  };
  const finalSettings: Row = {
    ...settings,
    formId,
    nativeFormId:formId,
    formUrl,
    nativeFormUrl:formUrl,
    formMode:"native_form"
  };

  const syncActivityResponse = await app.fetch(new Request(new URL(`/api/activities/${encodeURIComponent(savedId)}`, request.url), {
    method:"PUT",
    headers:new Headers(request.headers),
    body:JSON.stringify(finalActivity)
  }), env as never, ctx);
  const syncActivityResult = await syncActivityResponse.json().catch(() => ({})) as Row;
  if (!syncActivityResponse.ok || syncActivityResult.success === false) {
    return json({ success:false, message:syncActivityResult.message || "活動報名入口同步失敗", activity:finalActivity, formId, formSaved:true }, syncActivityResponse.status || 500);
  }

  const manager = (await readJson(env, "manager/state.json")) || {};
  const settingsMap = manager.formSettings && typeof manager.formSettings === "object" && !Array.isArray(manager.formSettings) ? manager.formSettings as Row : {};
  for (const key of [...new Set([savedId, clean(finalActivity.activityNo, 160), formId].filter(Boolean))]) settingsMap[key] = finalSettings;
  manager.formSettings = settingsMap;
  manager.updatedAt = new Date().toISOString();
  await putJson(env, "manager/state.json", manager);

  const verify = await readJson(env, `forms/native/${encodeURIComponent(formId)}.json`);
  if (!verify || clean(verify.id, 160) !== formId || !Array.isArray(verify.fields) || !verify.activity || !verify.settings) {
    return json({ success:false, message:"活動已建立，但正式報名表驗證失敗", activity:finalActivity, formId }, 500);
  }

  return json({
    success:true,
    activity:{ ...(syncActivityResult.data || {}), ...finalActivity },
    form:verify,
    formId,
    fields:verify.fields,
    sessions:verify.sessions || [],
    canonicalCreate:true,
    nativeEngine:true
  });
}


const liffEntryLogKey = "line/liff-entry-visitors.json";
const memberEntryLiffId = "2005868456-3Ip8H1Bx";
const memberEntryChannelId = "2005868456";

async function verifyLineIdToken(idToken: string) {
  const body = new URLSearchParams();
  body.set("id_token", idToken);
  body.set("client_id", memberEntryChannelId);

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  const result = await response.json().catch(() => ({})) as Row;

  if (!response.ok || !clean(result.sub, 200)) {
    throw new Error(clean(result.error_description || result.error || "LINE ID Token ????", 500));
  }

  return result;
}

async function recordLiffEntry(request: Request, env: Env) {
  if (!env.ASSETS_BUCKET) {
    return json({ success:false, message:"R2 bucket is not configured" }, 503);
  }

  const input = await request.json().catch(() => ({})) as Row;
  const idToken = clean(input.idToken, 5000);
  const liffId = clean(input.liffId, 100);

  if (liffId !== memberEntryLiffId) {
    return json({ success:false, message:"Unknown LIFF entry" }, 400);
  }

  if (!idToken) {
    return json({ success:false, message:"LINE ID Token is required" }, 400);
  }

  let verified: Row;

  try {
    verified = await verifyLineIdToken(idToken);
  } catch (error) {
    return json({
      success:false,
      message:error instanceof Error ? error.message : String(error)
    }, 401);
  }

  const lineUserId = clean(verified.sub, 200);

  if (!lineUserId) {
    return json({ success:false, message:"LINE UID not found in verified token" }, 401);
  }

  const now = new Date().toISOString();

  const existing = (await readJson(env, liffEntryLogKey)) || {};
  const visitors =
    existing.visitors &&
    typeof existing.visitors === "object" &&
    !Array.isArray(existing.visitors)
      ? existing.visitors as Row
      : {};

  const previous =
    visitors[lineUserId] &&
    typeof visitors[lineUserId] === "object"
      ? visitors[lineUserId] as Row
      : {};

  const visitCount = Math.max(0, Number(previous.visitCount) || 0) + 1;

  const record: Row = {
    lineUserId,
    displayName: clean(verified.name || previous.displayName, 300),
    pictureUrl: clean(verified.picture || previous.pictureUrl, 1500),
    liffId: memberEntryLiffId,
    firstSeenAt: clean(previous.firstSeenAt, 100) || now,
    lastSeenAt: now,
    visitCount,
    lastUrl: clean(input.href, 2000),
    lastUserAgent: clean(input.userAgent, 1000),
    source: clean(input.source, 200) || "member-entry",
    memberMatched: previous.memberMatched === true,
    memberNo: clean(previous.memberNo, 100),
    memberName: clean(previous.memberName, 300),
    status: clean(previous.status, 100) || "seen"
  };

  visitors[lineUserId] = record;

  const previousRecent = Array.isArray(existing.recent) ? existing.recent : [];

  const recent = [
    {
      at: now,
      lineUserId,
      displayName: record.displayName,
      liffId: memberEntryLiffId,
      href: record.lastUrl,
      source: record.source
    },
    ...previousRecent
  ].slice(0, 500);

  await putJson(env, liffEntryLogKey, {
    updatedAt: now,
    count: Object.keys(visitors).length,
    visitors,
    recent
  });

  return json({
    success:true,
    data:{
      lineUserId,
      displayName:record.displayName,
      firstSeenAt:record.firstSeenAt,
      lastSeenAt:record.lastSeenAt,
      visitCount
    }
  });
}

async function readLiffEntryLog(
  request: Request,
  env: Env,
  ctx: ExecutionContext
) {
  if (!await authorize(request, env, ctx)) {
    return json({ success:false, message:"Unauthorized" }, 401);
  }

  const data = (await readJson(env, liffEntryLogKey)) || {
    updatedAt:"",
    count:0,
    visitors:{},
    recent:[]
  };

  return json({ success:true, data });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/api/liff-entry-log" && request.method === "OPTIONS") {
      return new Response(null, { status:204, headers:cors });
    }

    if (url.pathname === "/api/liff-entry-log" && request.method === "POST") {
      return recordLiffEntry(request, env);
    }

    if (url.pathname === "/api/liff-entry-log" && request.method === "GET") {
      return readLiffEntryLog(request, env, ctx);
    }
    if (url.pathname === "/api/admin-activities/canonical" && request.method === "OPTIONS") return new Response(null, { status:204, headers:cors });
    if (url.pathname === "/api/admin-activities/canonical" && request.method === "POST") return createCanonical(request, env, ctx);
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) { return (app as any).scheduled?.(controller, env, ctx); }
};
