import app from "./monthly-entry";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

type NativeField = { key?: string; label?: string; type?: string; options?: unknown[] };
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

function pricedChoiceAmount(value: unknown) {
  const text = clean(value).replace(/，/g, ",");
  if (!text) return 0;
  const normalized = text.replace(/,/g, "");
  const patterns = [
    /(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:元|塊)(?:\s*[/／]?\s*(?:人|位))?/i,
    /(?:每人|每位|單價|費用|價格|價錢)\s*(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)?\s*([0-9]+(?:\.[0-9]+)?)/i
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount) && amount > 0) return amount;
    }
  }
  return 0;
}

function isPricedChoiceField(field: NativeField) {
  const type = normalizeName(field.type);
  if (type && !["radio", "dropdown", "select"].includes(type)) return false;
  const name = normalizeName(field.label || field.key);
  return ["房型", "住宿", "方案", "票種", "票價", "費用", "價格", "價錢", "餐別", "套餐"].some((keyword) => name.includes(keyword));
}

function answerForField(field: NativeField, answers: Record<string, unknown>) {
  return answers[clean(field.key)] ?? answers[clean(field.label)];
}

function selectedOptionUnitAmount(form: NativeForm, answers: Record<string, unknown>) {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  for (const field of fields) {
    if (!isPricedChoiceField(field)) continue;
    const raw = answerForField(field, answers);
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      const amount = pricedChoiceAmount(value);
      if (amount > 0) return amount;
    }
  }
  return 0;
}

function registrationUnitAmount(form: NativeForm, answers: Record<string, unknown>) {
  const selectedAmount = selectedOptionUnitAmount(form, answers);
  if (selectedAmount > 0) return selectedAmount;
  return activityUnitAmount(form.activity && typeof form.activity === "object" ? form.activity : {});
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
  const raw = answerForField(field, answers);
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
  const oldStatus = clean(payment.status);
  const oldMethod = clean(payment.method);

  const status =
    amount > 0 && (!oldStatus || oldStatus === "free")
      ? "unpaid"
      : oldStatus || (amount > 0 ? "unpaid" : "free");

  const method =
    amount > 0 && (!oldMethod || oldMethod === "free")
      ? "bank_transfer"
      : oldMethod || (amount > 0 ? "bank_transfer" : "free");

  return {
    ...payment,
    status,
    method,
    amount,
    unitAmount,
    quantity,
    updatedAt: now,
    transactions
  };
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
  const __paymentPerfStart = Date.now();
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) return app.fetch(request, env, ctx);

  const input = await request.clone().json().catch(() => ({})) as Record<string, unknown>;
  const answers = input.answers && typeof input.answers === "object" ? input.answers as Record<string, unknown> : {};
  const __formReadStart = Date.now();
  const formObject = await bucket.get(`forms/native/${encodeURIComponent(formId)}.json`);
  console.log("PAYMENT_PERF", "form_read", Date.now() - __formReadStart, "total", Date.now() - __paymentPerfStart);
  if (!formObject) return app.fetch(request, env, ctx);
  const form = await formObject.json().catch(() => ({})) as NativeForm;
  const activity = form.activity && typeof form.activity === "object" ? form.activity : {};
  const unitAmount = registrationUnitAmount(form, answers);
  const quantity = registrationHeadcount(form, answers);

  const __downstreamStart = Date.now();
  const response = await app.fetch(request, env, ctx);
  console.log("PAYMENT_PERF", "downstream", Date.now() - __downstreamStart, "total", Date.now() - __paymentPerfStart);
  if (!response.ok || unitAmount <= 0 || quantity <= 0) return response;

  const payload = await response.clone().json().catch(() => null) as Record<string, any> | null;
  if (!payload?.success || payload?.data?.duplicate) return response;
  const registrationId = clean(payload?.data?.registrationId);
  if (!registrationId) return response;

  const currentAmount = numberValue(payload?.data?.payment?.amount);
  const expectedAmount = unitAmount * quantity;
  const currentUnitAmount = numberValue(payload?.data?.payment?.unitAmount);
  const currentQuantity = Math.floor(numberValue(payload?.data?.payment?.quantity));
  if (currentAmount === expectedAmount && currentUnitAmount === unitAmount && currentQuantity === quantity) return response;

  const __patchStart = Date.now();
  await patchStoredRegistration(env, registrationId, formId, activity, unitAmount, quantity);
  console.log("PAYMENT_PERF", "patch_registration", Date.now() - __patchStart, "total", Date.now() - __paymentPerfStart);

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

async function correctQueriedRegistration(env: Env, item: Record<string, any>) {
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) return item;
  const formId = clean(item.formId);
  if (!formId) return item;

  const formObject = await bucket.get(`forms/native/${encodeURIComponent(formId)}.json`);
  if (!formObject) return item;
  const form = await formObject.json().catch(() => ({})) as NativeForm;
  const activity = form.activity && typeof form.activity === "object" ? form.activity : (item.activity || {});
  const answers = item.answers && typeof item.answers === "object" ? item.answers as Record<string, unknown> : {};
  const payment = item.payment && typeof item.payment === "object" ? item.payment as Record<string, unknown> : {};

  const selectedAmount = selectedOptionUnitAmount(form, answers);
  const savedUnitAmount = numberValue(payment.unitAmount);
  const savedQuantity = Math.floor(numberValue(payment.quantity));
  const unitAmount = selectedAmount > 0 ? selectedAmount : (savedUnitAmount > 0 ? savedUnitAmount : activityUnitAmount(activity));
  const quantity = savedQuantity > 0 ? savedQuantity : registrationHeadcount(form, answers);
  if (unitAmount <= 0 || quantity <= 0) return item;

  const expectedAmount = unitAmount * quantity;
  const correctedPayment = updatePayment(payment, unitAmount, quantity);
  const registrationId = clean(item.id || item.registrationId);

  if (registrationId && (numberValue(payment.amount) !== expectedAmount || savedUnitAmount !== unitAmount || savedQuantity !== quantity)) {
    await patchStoredRegistration(env, registrationId, formId, activity, unitAmount, quantity).catch(() => undefined);
  }

  return {
    ...item,
    payment: correctedPayment,
    registrationCount: quantity,
    unitAmount
  };
}

async function handleRegistrationQuery(request: Request, env: Env, ctx: ExecutionContext) {
  const response = await app.fetch(request, env, ctx);
  if (!response.ok) return response;

  const payload = await response.clone().json().catch(() => null) as Record<string, any> | null;
  if (!payload?.success) return response;

  const url = new URL(request.url);
  if (url.pathname === "/api/native-registrations/query" && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    payload.data = await correctQueriedRegistration(env, payload.data);
  } else if (url.pathname === "/api/native-registrations/me" && Array.isArray(payload.data)) {
    payload.data = await Promise.all(payload.data.map((item: unknown) => item && typeof item === "object" ? correctQueriedRegistration(env, item as Record<string, any>) : item));
  } else {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const match = request.method === "POST" ? url.pathname.match(/^\/api\/native-forms\/([^/]+)$/) : null;
    if (match) return handleNativeRegistrationAmount(request, env, ctx, decodeURIComponent(match[1]));
    if (request.method === "GET" && (url.pathname === "/api/native-registrations/query" || url.pathname === "/api/native-registrations/me")) {
      return handleRegistrationQuery(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  }
};
