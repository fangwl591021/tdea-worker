import app from "./custom-field-direct-sync-entry";

type Env = Record<string, unknown>;
type Row = Record<string, any>;

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);

function dedupeByLabelPreferLast(fields: unknown): Row[] {
  const list = Array.isArray(fields) ? fields.filter((x): x is Row => Boolean(x) && typeof x === "object") : [];
  const seen = new Set<string>();
  const reversed: Row[] = [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const field = list[index];
    const label = clean(field.label, 240).toLowerCase().replace(/\s+/g, " ");
    const key = clean(field.key, 120);
    const identity = label || key;
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    reversed.push(field);
  }
  return reversed.reverse();
}

function normalizeSettings(settings: Row) {
  const fields = dedupeByLabelPreferLast(settings.fields);
  const explicitCustom = dedupeByLabelPreferLast(settings.customFields);
  const customFields = explicitCustom.length
    ? explicitCustom
    : fields.filter((field) => !systemKeys.has(clean(field.key, 120)));
  return { ...settings, fields, customFields };
}

async function normalizeNativeFormPut(request: Request, env: Env, ctx: ExecutionContext) {
  const raw = await request.text();
  let payload: Row;
  try { payload = JSON.parse(raw || "{}"); }
  catch (_) { return app.fetch(new Request(request.url, { method: request.method, headers: request.headers, body: raw }), env as never, ctx); }

  if (payload.settings && typeof payload.settings === "object" && !Array.isArray(payload.settings)) {
    payload.settings = normalizeSettings(payload.settings as Row);
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
    if (request.method === "PUT" && /^\/api\/native-forms\/[^/]+$/.test(url.pathname)) {
      return normalizeNativeFormPut(request, env, ctx);
    }
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
