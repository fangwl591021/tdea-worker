import app from "./monthly-entry";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  [key: string]: unknown;
};

type NativeField = { key?: string; label?: string };
type NativeForm = {
  activity?: Record<string, unknown>;
  fields?: NativeField[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = clean(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function normalizeName(value: unknown) {
  return clean(value).toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g, "");
}

function activityUnitAmount(activity: Record<string, unknown>) {
  return Math.max(0, numberValue(activity.paymentAmount || activity.feeAmount || activity.registrationFee || activity.amount));
}

function isCanonicalHeadcountField(field: NativeField) {
  const key = normalizeName(field.key);
  const label = normalizeName(field.label);
  return (
    label === "報名人數含本人" ||
    label === "報名人數" ||
    key === "registrationheadcount" ||
    key === "registrationcount" ||
    key === "participantunit"
  );
}

function isLegacyHeadcountField(field: NativeField) {
  const key = normalizeName(field.key);
  const label = normalizeName(field.label);
  const names = [key, label].filter(Boolean);
  return names.some((name) =>
    name === "人數" ||
    name.includes("參加人數") ||
    name.includes("參與人數") ||
    name.includes("同行人數") ||
    name.includes("attendeecount") ||
    name.includes("participantcount") ||
    name.includes("peoplecount") ||
    name === "quantity" ||
    name === "qty"
  );
}

function registrationHeadcount(form: NativeForm, answers: Record<string, unknown>) {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  const field = fields.find(isCanonicalHeadcountField) || fields.find(isLegacyHeadcountField);
  if (!field) return 1;
  const raw = answers[clean(field.key)] ?? answers[clean(field.label)];
  const count = Math.floor(numberValue(raw));
  return Number.isFinite(count) && count > 0 ? Math.min(count, 1000) : 1;
}

function registrationKeys(activity: Record<string, unknown>, formId: string) {
  return [...new Set([activity.id, activity.activityNo, activity.name, formId].map(clean).filter(Boolean))];
}

function updatePayment(payment: Record<string, unknown>, unitAmount: number, quantity: number) {
  const amount = unitAmount * quantity;
  const now = new Date().toISOString();
  const transactions = Array.isArray(payment.transactions)
    ? payment.transactions.map((item) => {
        if (!item || typeof item !== "object") return item;
        const row = { ...(item as Record<string, unknown>) };
        if (clean(row.type) === "created") {
          row.amount = amount;
          row.unitAmount = unitAmount;
          row.quantity = quantity;
        }
        return row;
      })
    : [];
  return { ...payment, amount, unitAmount, quantity, updatedAt: now, transactions };
}

async function serveRosterAsset(request: Request, env: Env) {
  if (!env.ASSETS?.fetch) {
    return new Response(JSON.stringify({ success: false, error: "Roster asset binding unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
  const assetUrl = new URL("/roster.json", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: "GET",
    headers: { accept: "application/json", "cache-control": "no-cache" }
  }));
  if (!assetResponse.ok) {
    return new Response(JSON.stringify({ success: false, error: "Roster asset not found" }), {
      status: assetResponse.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
  const headers = new Headers(assetResponse.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.delete("content-length");
  return new Response(assetResponse.body, { status: 200, headers });
}

async function patchStoredRegistration(
  env: Env,
  registrationId: string,
  formId: string,
  activity: Record<string, unknown>,
  unitAmount: number,
  quantity: number
) {
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) return;
  const registrationKey = `registrations/native/${encodeURIComponent(registrationId)}.json`;
  const registrationObject = await bucket.get(registrationKey);
  if (!registrationObject) throw new Error("registration record missing after submit");
  const entry = await registrationObject.json() as Record<string, unknown>;
  const payment = updatePayment((entry.payment && typeof entry.payment === "object" ? entry.payment : {}) as Record<string, unknown>, unitAmount, quantity);
  entry.payment = payment;
  await bucket.put(registrationKey, JSON.stringify(entry, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });

  for (const key of registrationKeys(activity, formId)) {
    const listKey = `registrations/by-key/${encodeURIComponent(key)}.json`;
    const object = await bucket.get(listKey);
    if (!object) continue;
    const list = await object.json().catch(() => []) as unknown;
    if (!Array.isArray(list)) continue;
    let changed = false;
    const updated = list.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      if (clean(row.id) !== registrationId) return row;
      changed = true;
      return { ...row, payment };
    });
    if (changed) {
      await bucket.put(listKey, JSON.stringify(updated, null, 2), {
        httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
      });
    }
  }
}

async function handleNativeRegistrationAmount(request: Request, env: Env, ctx: ExecutionContext, formId: string) {
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) return app.fetch(request, env, ctx);

  const input = await request.clone().json().catch(() => ({})) as Record<string, unknown>;
  const answers = input.answers && typeof input.answers === "object" ? input.answers as Record<string, unknown> : {};
  const formObject = await bucket.get(`forms/native/${encodeURIComponent(formId)}.json`);
  if (!formObject) return app.fetch(request, env, ctx);
  const form = await formObject.json().catch(() => ({})) as NativeForm;
  const activity = form.activity && typeof form.activity === "object" ? form.activity : {};
  const unitAmount = activityUnitAmount(activity);
  const quantity = registrationHeadcount(form, answers);

  const response = await app.fetch(request, env, ctx);
  if (!response.ok || unitAmount <= 0 || quantity <= 1) return response;

  const payload = await response.clone().json().catch(() => null) as Record<string, any> | null;
  if (!payload?.success || payload?.data?.duplicate) return response;
  const registrationId = clean(payload?.data?.registrationId);
  if (!registrationId) return response;

  const currentAmount = numberValue(payload?.data?.payment?.amount);
  const expectedAmount = unitAmount * quantity;
  if (currentAmount === expectedAmount) return response;

  await patchStoredRegistration(env, registrationId, formId, activity, unitAmount, quantity);

  payload.data.payment = updatePayment(
    (payload.data.payment && typeof payload.data.payment === "object" ? payload.data.payment : {}) as Record<string, unknown>,
    unitAmount,
    quantity
  );
  payload.data.registrationCount = quantity;
  payload.data.unitAmount = unitAmount;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/roster") return serveRosterAsset(request, env);
    const match = request.method === "POST" ? url.pathname.match(/^\/api\/native-forms\/([^/]+)$/) : null;
    if (match) return handleNativeRegistrationAmount(request, env, ctx, decodeURIComponent(match[1]));
    return app.fetch(request, env, ctx);
  }
};
