import app from "./native-form-single-save-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const clean = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);
const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type":"application/json; charset=utf-8", "cache-control":"no-store" } });
}

async function authorize(request: Request, env: Env, ctx: ExecutionContext) {
  const probe = new Request(new URL("/api/admin-access", request.url), { method:"GET", headers:request.headers });
  return (await app.fetch(probe, env as never, ctx)).ok;
}

async function readJson(env: Env, key: string): Promise<Row | null> {
  if (!env.ASSETS_BUCKET) return null;
  const obj = await env.ASSETS_BUCKET.get(key);
  if (!obj) return null;
  return await obj.json().catch(() => null) as Row | null;
}

async function putJson(env: Env, key: string, value: unknown) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket is not configured");
  await env.ASSETS_BUCKET.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType:"application/json; charset=utf-8", cacheControl:"no-store" }
  });
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
    const identity = (clean(field.label, 300).toLowerCase().replace(/\s+/g, " ") || clean(field.key, 160));
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    out.push(field);
  }
  return out;
}

function customOnly(fields: Row[]) {
  return fields.filter((field) => !systemKeys.has(clean(field.key, 160)));
}

async function getActivity(request: Request, env: Env, ctx: ExecutionContext, activityId: string) {
  const response = await app.fetch(new Request(new URL("/api/activities", request.url), { headers:request.headers, method:"GET" }), env as never, ctx);
  const result = await response.json().catch(() => ({})) as Row;
  const rows = Array.isArray(result?.data?.activities) ? result.data.activities : Array.isArray(result?.activities) ? result.activities : [];
  return rows.find((row: Row) => clean(row?.id, 160) === activityId || clean(row?.activityNo, 160) === activityId) || null;
}

async function saveCanonical(request: Request, env: Env, ctx: ExecutionContext, activityId: string) {
  if (!env.ASSETS_BUCKET) return json({ success:false, message:"R2 bucket is not configured" }, 503);
  if (!await authorize(request, env, ctx)) return json({ success:false, message:"Unauthorized" }, 401);
  const input = await request.json().catch(() => ({})) as Row;
  const incomingActivity = input.activity && typeof input.activity === "object" ? input.activity as Row : {};
  const incomingSettings = input.settings && typeof input.settings === "object" ? input.settings as Row : {};
  const formId = clean(input.formId || incomingActivity.nativeFormId || incomingActivity.formId || activityId, 160);
  const currentActivity = await getActivity(request, env, ctx, activityId) || {};
  const currentForm = await readJson(env, `forms/native/${encodeURIComponent(formId)}.json`);
  if (!currentForm) return json({ success:false, message:"找不到正式報名表" }, 404);

  const fields = dedupeFields(input.fields ?? incomingSettings.fields ?? currentForm.fields ?? []);
  const customFields = customOnly(fields);
  const sessions = Array.isArray(input.sessions) ? input.sessions : Array.isArray(incomingSettings.sessions) ? incomingSettings.sessions : (Array.isArray(currentForm.sessions) ? currentForm.sessions : []);
  const nextActivity = { ...currentActivity, ...incomingActivity, id: clean(currentActivity.id || activityId, 160) || activityId };
  const nextSettings = { ...(currentForm.settings || {}), ...incomingSettings, fields, customFields, sessions };
  const nextForm: Row = {
    ...currentForm,
    activity: { ...(currentForm.activity || {}), ...nextActivity },
    settings: nextSettings,
    fields,
    sessions,
    updatedAt: new Date().toISOString()
  };

  await putJson(env, `forms/native/${encodeURIComponent(formId)}.json`, nextForm);

  const activityResponse = await app.fetch(new Request(new URL(`/api/activities/${encodeURIComponent(activityId)}`, request.url), {
    method:"PUT",
    headers:new Headers(request.headers),
    body:JSON.stringify(nextActivity)
  }), env as never, ctx);
  const activityResult = await activityResponse.json().catch(() => ({})) as Row;
  if (!activityResponse.ok || activityResult.success === false) {
    return json({ success:false, message:activityResult.message || "活動基本資料儲存失敗", formSaved:true }, activityResponse.status || 500);
  }

  const manager = (await readJson(env, "manager/state.json")) || {};
  const settingsMap = manager.formSettings && typeof manager.formSettings === "object" && !Array.isArray(manager.formSettings) ? manager.formSettings as Row : {};
  const snapshot = { ...nextSettings, nativeFormId:formId, nativeFormUrl:clean(nextForm.formUrl || nextActivity.formUrl || nextActivity.nativeFormUrl) };
  for (const key of [...new Set([activityId, clean(nextActivity.activityNo, 160), formId].filter(Boolean))]) settingsMap[key] = snapshot;
  manager.formSettings = settingsMap;
  manager.updatedAt = new Date().toISOString();
  await putJson(env, "manager/state.json", manager);

  return json({ success:true, activity:nextActivity, form:nextForm, formId, fields, customFields, sessions, updatedAt:nextForm.updatedAt });
}

async function getCanonical(request: Request, env: Env, ctx: ExecutionContext, activityId: string) {
  if (!await authorize(request, env, ctx)) return json({ success:false, message:"Unauthorized" }, 401);
  const activity = await getActivity(request, env, ctx, activityId);
  if (!activity) return json({ success:false, message:"找不到活動" }, 404);
  const formId = clean(activity.nativeFormId || activity.formId || activity.id || activity.activityNo || activityId, 160);
  const form = await readJson(env, `forms/native/${encodeURIComponent(formId)}.json`);
  return json({ success:true, activity, form, formId });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/admin-activities\/([^/]+)\/canonical$/);
    if (match && request.method === "OPTIONS") return new Response(null, { status:204, headers:cors });
    if (match && request.method === "GET") return getCanonical(request, env, ctx, decodeURIComponent(match[1]));
    if (match && request.method === "PUT") return saveCanonical(request, env, ctx, decodeURIComponent(match[1]));
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
