import app from "./smart-activity-publish-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type":"application/json; charset=utf-8", "cache-control":"no-store" } });
}

async function authorize(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL("/api/admin-access", request.url);
  const probe = new Request(url.toString(), { method:"GET", headers:request.headers });
  const response = await app.fetch(probe, env as never, ctx);
  return response.ok;
}

async function readJson(env: Env, key: string) {
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
  const key = clean(field.key, 120) || `custom_${index + 1}`;
  const label = clean(field.label || key, 240);
  const options = Array.isArray(field.options) ? field.options.map((x: unknown) => clean(x, 240)).filter(Boolean) : [];
  return { key, label, type, required: field.required === true, ...(options.length ? { options } : {}) };
}

function systemBaseFields(fields: Row[]) {
  const keep = new Set(["name","phone","email","company","memberNo"]);
  return fields.filter((field) => keep.has(clean(field.key, 120)));
}

async function directSync(request: Request, env: Env, ctx: ExecutionContext, requestedFormId: string) {
  if (!env.ASSETS_BUCKET) return json({ success:false, message:"R2 bucket is not configured" }, 503);
  if (!await authorize(request, env, ctx)) return json({ success:false, message:"Unauthorized" }, 401);

  const input = await request.json().catch(() => ({})) as Row;
  const activityId = clean(input.activityId, 160);
  const activityNo = clean(input.activityNo, 160);
  const requestedFields = Array.isArray(input.fields) ? input.fields.filter((x: unknown) => x && typeof x === "object") as Row[] : [];
  if (!requestedFields.length && input.allowEmpty !== true) return json({ success:false, message:"沒有可同步的自訂題目" }, 400);

  const candidates = [...new Set([requestedFormId, clean(input.formId, 160), activityId, activityNo].filter(Boolean))];
  let formId = "";
  let form: Row | null = null;
  for (const candidate of candidates) {
    const hit = await readJson(env, `forms/native/${encodeURIComponent(candidate)}.json`);
    if (hit) { formId = candidate; form = hit; break; }
  }
  if (!form || !formId) return json({ success:false, message:"找不到正式報名表，請先建立報名表" }, 404);

  const normalized = requestedFields.map(normalizeField).filter((field) => field.label);
  const currentFields = Array.isArray(form.fields) ? form.fields.filter((x: unknown) => x && typeof x === "object") as Row[] : [];
  const nextFields: Row[] = [...systemBaseFields(currentFields), ...normalized];
  if (!normalized.some((field) => clean(field.label) === "備註")) {
    const currentNote = currentFields.find((field) => clean(field.key) === "note");
    nextFields.push(currentNote || { key:"note", label:"備註", type:"paragraph", required:false });
  }

  form.fields = nextFields;
  form.settings = { ...(form.settings || {}), customFields: normalized, fields: nextFields };
  form.updatedAt = new Date().toISOString();

  const manager = (await readJson(env, "manager/state.json")) || {};
  const settingsMap = manager.formSettings && typeof manager.formSettings === "object" && !Array.isArray(manager.formSettings) ? manager.formSettings as Row : {};
  const keys = [...new Set([activityId, activityNo, formId].filter(Boolean))];
  for (const key of keys) {
    const previous = settingsMap[key] && typeof settingsMap[key] === "object" ? settingsMap[key] as Row : {};
    settingsMap[key] = { ...previous, customFields: normalized, fields: nextFields, nativeFormId: formId, nativeFormUrl: clean(form.formUrl || previous.nativeFormUrl) };
  }
  manager.formSettings = settingsMap;
  manager.updatedAt = new Date().toISOString();

  await Promise.all([
    putJson(env, `forms/native/${encodeURIComponent(formId)}.json`, form),
    putJson(env, "manager/state.json", manager)
  ]);

  return json({ success:true, formId, fields:nextFields, customFields:normalized, count:normalized.length, updatedAt:form.updatedAt });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/native-forms\/([^/]+)\/direct-fields$/);
    if (request.method === "OPTIONS" && match) return new Response(null, { status:204, headers:cors });
    if (match && request.method === "PUT") return directSync(request, env, ctx, decodeURIComponent(match[1]));
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
