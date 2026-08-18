import app from "./registration-payment-entry";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

type NativeField = { key?: string; label?: string };
type NativeForm = { activity?: Record<string, unknown>; fields?: NativeField[] };

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

function isHeadcountName(value: unknown) {
  const name = normalizeName(value);
  return (
    name === "報名人數含本人" ||
    name === "報名人數" ||
    name === "人數" ||
    name.includes("參加人數") ||
    name.includes("參與人數") ||
    name.includes("同行人數") ||
    name === "registrationheadcount" ||
    name === "registrationcount" ||
    name === "participantunit" ||
    name.includes("attendeecount") ||
    name.includes("participantcount") ||
    name.includes("peoplecount") ||
    name === "quantity" ||
    name === "qty"
  );
}

function headcountFromAnswers(form: NativeForm, answers: Record<string, unknown>) {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  for (const field of fields) {
    if (!isHeadcountName(field.label) && !isHeadcountName(field.key)) continue;
    const raw = answers[clean(field.key)] ?? answers[clean(field.label)];
    const count = Math.floor(numberValue(raw));
    if (count > 0) return Math.min(count, 1000);
  }

  for (const [key, value] of Object.entries(answers)) {
    if (!isHeadcountName(key)) continue;
    const count = Math.floor(numberValue(value));
    if (count > 0) return Math.min(count, 1000);
  }

  return 1;
}

async function readRawRegistration(env: Env, registrationId: string) {
  if (!env.ASSETS_BUCKET || !registrationId) return null;
  const object = await env.ASSETS_BUCKET.get(`registrations/native/${encodeURIComponent(registrationId)}.json`);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, any> : null;
}

async function readNativeForm(env: Env, formId: string) {
  if (!env.ASSETS_BUCKET || !formId) return null;
  const object = await env.ASSETS_BUCKET.get(`forms/native/${encodeURIComponent(formId)}.json`);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as NativeForm : null;
}

async function correctItem(env: Env, item: Record<string, any>, ctx: ExecutionContext) {
  const registrationId = clean(item.id || item.registrationId);
  const raw = await readRawRegistration(env, registrationId);
  const source = raw || item;
  const formId = clean(source.formId || item.formId);
  const form = await readNativeForm(env, formId) || {};
  const rawPayment = source.payment && typeof source.payment === "object" ? source.payment as Record<string, unknown> : {};
  const responsePayment = item.payment && typeof item.payment === "object" ? item.payment as Record<string, unknown> : {};
  const answers = source.answers && typeof source.answers === "object" ? source.answers as Record<string, unknown> : (item.answers || {});
  const activity = form.activity && typeof form.activity === "object" ? form.activity : (source.activity || item.activity || {});

  const savedUnitAmount = numberValue(rawPayment.unitAmount || responsePayment.unitAmount);
  const unitAmount = savedUnitAmount > 0 ? savedUnitAmount : activityUnitAmount(activity);
  const savedQuantity = Math.floor(numberValue(rawPayment.quantity || responsePayment.quantity));
  const quantity = savedQuantity > 0 ? savedQuantity : headcountFromAnswers(form, answers);
  if (unitAmount <= 0 || quantity <= 0) return item;

  const amount = unitAmount * quantity;
  const payment = {
    ...rawPayment,
    ...responsePayment,
    amount,
    unitAmount,
    quantity,
    updatedAt: clean(rawPayment.updatedAt || responsePayment.updatedAt) || new Date().toISOString()
  };

  if (raw && env.ASSETS_BUCKET && registrationId) {
    const rawAmount = numberValue(rawPayment.amount);
    const rawQuantity = Math.floor(numberValue(rawPayment.quantity));
    const rawUnitAmount = numberValue(rawPayment.unitAmount);
    if (rawAmount !== amount || rawQuantity !== quantity || rawUnitAmount !== unitAmount) {
      const nextRaw = { ...raw, payment: { ...rawPayment, amount, unitAmount, quantity, updatedAt: new Date().toISOString() } };
      ctx.waitUntil(env.ASSETS_BUCKET.put(`registrations/native/${encodeURIComponent(registrationId)}.json`, JSON.stringify(nextRaw, null, 2), {
        httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
      }).catch((error) => console.error("registration repair write failed", error)));
    }
  }

  return { ...item, payment, registrationCount: quantity, unitAmount };
}

async function repairAdminListIndexes(env: Env, url: URL, correctedItems: Array<Record<string, any>>) {
  if (!env.ASSETS_BUCKET || !correctedItems.length) return;
  const keys = clean(url.searchParams.get("keys"))
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (!keys.length) return;

  const correctedById = new Map(
    correctedItems
      .map((item) => [clean(item.id || item.registrationId), item] as const)
      .filter(([id]) => Boolean(id))
  );

  for (const key of keys) {
    const objectKey = `registrations/by-key/${encodeURIComponent(key)}.json`;
    const object = await env.ASSETS_BUCKET.get(objectKey);
    if (!object) continue;
    const list = await object.json().catch(() => null);
    if (!Array.isArray(list)) continue;

    let changed = false;
    const next = list.map((row) => {
      if (!row || typeof row !== "object") return row;
      const id = clean((row as Record<string, any>).id || (row as Record<string, any>).registrationId);
      const corrected = correctedById.get(id);
      if (!corrected) return row;
      const oldAmount = numberValue((row as Record<string, any>).payment?.amount);
      const newAmount = numberValue(corrected.payment?.amount);
      const oldQuantity = Math.floor(numberValue((row as Record<string, any>).payment?.quantity));
      const newQuantity = Math.floor(numberValue(corrected.payment?.quantity));
      if (oldAmount === newAmount && oldQuantity === newQuantity) return row;
      changed = true;
      return { ...(row as Record<string, any>), payment: corrected.payment };
    });

    if (changed) {
      await env.ASSETS_BUCKET.put(objectKey, JSON.stringify(next, null, 2), {
        httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
      });
    }
  }
}

async function handleQuery(request: Request, env: Env, ctx: ExecutionContext) {
  const response = await app.fetch(request, env, ctx);
  if (!response.ok) return response;
  const payload = await response.clone().json().catch(() => null) as Record<string, any> | null;
  if (!payload?.success) return response;

  const url = new URL(request.url);
  if (url.pathname === "/api/native-registrations/query" && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    payload.data = await correctItem(env, payload.data, ctx);
  } else if ((url.pathname === "/api/native-registrations/me" || url.pathname === "/api/registrations/list") && Array.isArray(payload.data)) {
    payload.data = await Promise.all(payload.data.map((item: unknown) => item && typeof item === "object" ? correctItem(env, item as Record<string, any>, ctx) : item));
    if (url.pathname === "/api/registrations/list") {
      const corrected = payload.data.filter((item: unknown) => item && typeof item === "object") as Array<Record<string, any>>;
      ctx.waitUntil(repairAdminListIndexes(env, url, corrected).catch((error) => console.error("registration index repair failed", error)));
    }
  } else {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-tdea-registration-repair", "background");
  return new Response(JSON.stringify(payload), { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "GET" && (
      url.pathname === "/api/native-registrations/query" ||
      url.pathname === "/api/native-registrations/me" ||
      url.pathname === "/api/registrations/list"
    )) {
      return handleQuery(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  }
};
