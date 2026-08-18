import app from "./native-form-schema-sync-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const MANAGER_KEY = "manager/state.json";
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function isCustomField(field: Row) {
  const key = clean(field?.key, 120);
  return Boolean(field && typeof field === "object" && !["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"].includes(key));
}

function normalizeType(value: unknown) {
  const type = clean(value, 40).toLowerCase();
  return ["text","email","paragraph","radio","checkbox","dropdown","file"].includes(type) ? type : "text";
}

function fingerprint(field: Row) {
  const label = clean(field.label, 240).toLowerCase().replace(/\s+/g, " ");
  const type = normalizeType(field.type);
  const options = Array.isArray(field.options) ? field.options.map((x: unknown) => clean(x, 240).toLowerCase()).filter(Boolean).join("|") : "";
  return `${label}::${type}::${options}`;
}

function permanentId(existing?: Row) {
  const current = clean(existing?.fieldId || existing?.key, 120);
  if (/^fld_[a-z0-9_-]{8,}$/i.test(current)) return current;
  return `fld_${crypto.randomUUID().replace(/-/g, "")}`;
}

function migrateCustomFields(nextFields: unknown, previousFields: unknown) {
  const incoming = Array.isArray(nextFields) ? nextFields.filter((f): f is Row => Boolean(f) && typeof f === "object") : [];
  const previous = Array.isArray(previousFields) ? previousFields.filter((f): f is Row => Boolean(f) && typeof f === "object") : [];
  const used = new Set<string>();

  return incoming.map((field, index) => {
    const supplied = clean(field.fieldId || field.key, 120);
    let matched: Row | undefined;

    if (/^fld_/i.test(supplied)) {
      matched = previous.find((old) => clean(old.fieldId || old.key, 120) === supplied);
    }
    if (!matched) {
      const fp = fingerprint(field);
      matched = previous.find((old) => !used.has(clean(old.fieldId || old.key, 120)) && fingerprint(old) === fp);
    }
    if (!matched && previous[index] && !used.has(clean(previous[index].fieldId || previous[index].key, 120))) {
      matched = previous[index];
    }
    if (!matched && supplied) {
      matched = previous.find((old) => !used.has(clean(old.fieldId || old.key, 120)) && clean(old.legacyKey || old.key, 120) === supplied);
    }

    const fieldId = permanentId(matched || (/^fld_/i.test(supplied) ? field : undefined));
    used.add(fieldId);
    return {
      ...field,
      fieldId,
      key: fieldId,
      legacyKey: clean(field.legacyKey || (!/^fld_/i.test(supplied) ? supplied : matched?.legacyKey), 120),
      order: index,
      type: normalizeType(field.type),
    };
  });
}

async function readManager(env: Env): Promise<Row> {
  if (!env.ASSETS_BUCKET) return {};
  const object = await env.ASSETS_BUCKET.get(MANAGER_KEY);
  const data = object ? await object.json().catch(() => ({})) : {};
  return data && typeof data === "object" && !Array.isArray(data) ? data as Row : {};
}

async function writeManager(env: Env, manager: Row) {
  if (!env.ASSETS_BUCKET) return;
  manager.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(MANAGER_KEY, JSON.stringify(manager, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

function migrateSettingsMap(nextMap: Row, previousMap: Row) {
  const result: Row = { ...nextMap };
  for (const [activityKey, raw] of Object.entries(nextMap || {})) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const settings = raw as Row;
    const previous = previousMap?.[activityKey] && typeof previousMap[activityKey] === "object" ? previousMap[activityKey] as Row : {};
    if (!Array.isArray(settings.customFields)) continue;
    result[activityKey] = {
      ...settings,
      customFields: migrateCustomFields(settings.customFields, previous.customFields),
      customFieldIdVersion: 1,
    };
  }
  return result;
}

async function ensureStoredManagerIds(env: Env) {
  if (!env.ASSETS_BUCKET) return false;
  const manager = await readManager(env);
  const map = manager.formSettings && typeof manager.formSettings === "object" && !Array.isArray(manager.formSettings) ? manager.formSettings as Row : {};
  let changed = false;
  const migrated: Row = { ...map };
  for (const [activityKey, raw] of Object.entries(map)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const settings = raw as Row;
    if (!Array.isArray(settings.customFields)) continue;
    const next = migrateCustomFields(settings.customFields, settings.customFields);
    if (JSON.stringify(next) !== JSON.stringify(settings.customFields) || settings.customFieldIdVersion !== 1) {
      migrated[activityKey] = { ...settings, customFields: next, customFieldIdVersion: 1 };
      changed = true;
    }
  }
  if (changed) {
    manager.formSettings = migrated;
    await writeManager(env, manager);
  }
  return changed;
}

async function interceptManagerSave(request: Request, env: Env, ctx: ExecutionContext) {
  const raw = await request.text();
  let payload: Row;
  try { payload = JSON.parse(raw || "{}"); }
  catch (_) { return app.fetch(new Request(request.url, { method: request.method, headers: request.headers, body: raw }), env as never, ctx); }

  if (payload.formSettings && typeof payload.formSettings === "object" && !Array.isArray(payload.formSettings)) {
    const previous = await readManager(env);
    const previousMap = previous.formSettings && typeof previous.formSettings === "object" && !Array.isArray(previous.formSettings) ? previous.formSettings as Row : {};
    payload.formSettings = migrateSettingsMap(payload.formSettings as Row, previousMap);
  }

  const rebuilt = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(payload)
  });
  return app.fetch(rebuilt, env as never, ctx);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === "PUT" && url.pathname === "/api/manager-data") {
      return interceptManagerSave(request, env, ctx);
    }

    if (request.method === "GET" && /^\/api\/native-forms\/[^/]+$/.test(url.pathname)) {
      await ensureStoredManagerIds(env).catch(() => false);
    }

    const response = await app.fetch(request, env as never, ctx);
    if (request.method === "GET" && /^\/api\/native-forms\/[^/]+$/.test(url.pathname) && response.ok) {
      const headers = new Headers(response.headers);
      headers.set("x-tdea-custom-field-id", "1");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
