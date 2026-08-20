import app from "./activity-canonical-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const clean = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);
const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
const nativeLiffBase = "https://liff.line.me/2005868456-cfANNVou";
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
  const formId = clean(input.formId || incomingActivity.nativeFormId || incomingActivity.formId, 160) || id;
  const formUrl = clean(incomingActivity.nativeFormUrl || incomingActivity.formUrl, 1000) || `${nativeLiffBase}?register=${encodeURIComponent(formId)}`;
  const activity: Row = { ...incomingActivity, id, nativeFormId:formId, nativeFormUrl:formUrl, formUrl, formMode:"native_form", createdAt:clean(incomingActivity.createdAt) || now, updatedAt:now };
  const settings = { ...incomingSettings, fields, customFields, sessions, nativeFormId:formId, nativeFormUrl:formUrl };
  const form: Row = { id:formId, formId, formUrl, activity:{ ...activity }, settings, fields, sessions, createdAt:now, updatedAt:now };

  const activityResponse = await app.fetch(new Request(new URL("/api/activities", request.url), { method:"POST", headers:new Headers(request.headers), body:JSON.stringify(activity) }), env as never, ctx);
  const activityResult = await activityResponse.json().catch(() => ({})) as Row;
  if (!activityResponse.ok || activityResult.success === false) return json({ success:false, message:activityResult.message || "活動基本資料建立失敗" }, activityResponse.status || 500);
  const savedActivity = (activityResult.data && typeof activityResult.data === "object" ? activityResult.data : activityResult.activity) || activity;
  const savedId = clean(savedActivity.id || id, 160) || id;
  activity.id = savedId;
  form.activity = { ...activity };

  await putJson(env, `forms/native/${encodeURIComponent(formId)}.json`, form);
  const manager = (await readJson(env, "manager/state.json")) || {};
  const settingsMap = manager.formSettings && typeof manager.formSettings === "object" && !Array.isArray(manager.formSettings) ? manager.formSettings as Row : {};
  for (const key of [...new Set([savedId, clean(activity.activityNo, 160), formId].filter(Boolean))]) settingsMap[key] = settings;
  manager.formSettings = settingsMap;
  manager.updatedAt = now;
  await putJson(env, "manager/state.json", manager);
  const verify = await readJson(env, `forms/native/${encodeURIComponent(formId)}.json`);
  if (!verify || !Array.isArray(verify.fields)) return json({ success:false, message:"活動已建立，但正式報名表驗證失敗", activity:savedActivity }, 500);
  return json({ success:true, activity:{ ...savedActivity, ...activity, id:savedId }, form:verify, formId, fields:verify.fields, sessions:verify.sessions || [], canonicalCreate:true });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/api/admin-activities/canonical" && request.method === "OPTIONS") return new Response(null, { status:204, headers:cors });
    if (url.pathname === "/api/admin-activities/canonical" && request.method === "POST") return createCanonical(request, env, ctx);
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) { return (app as any).scheduled?.(controller, env, ctx); }
};
