import app from "./roster-unified-admin-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key: string]: unknown };
type Row = Record<string, any>;
type NativeField = { key?: string; label?: string; type?: string };
type NativeForm = { activity?: Row; fields?: NativeField[] };

const clean = (value: unknown) => String(value ?? "").trim();
const json = (data: unknown, status = 200, headers?: Headers) => new Response(JSON.stringify(data), {
  status,
  headers: headers || { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = clean(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
function normalize(value: unknown) {
  return clean(value).toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g, "");
}
function pricedChoiceAmount(value: unknown) {
  const text = clean(value).replace(/，/g, ",").replace(/,/g, "");
  if (!text) return 0;
  const patterns = [
    /(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*[/／]\s*(?:人|位)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:元|塊)(?:\s*[/／]?\s*(?:人|位))?/i,
    /(?:每人|每位|單價|費用|價格|價錢)\s*(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)?\s*([0-9]+(?:\.[0-9]+)?)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount) && amount > 0) return amount;
    }
  }
  return 0;
}
function isPricedField(field: NativeField) {
  const type = normalize(field.type);
  if (type && !["radio", "dropdown", "select"].includes(type)) return false;
  const name = normalize(field.label || field.key);
  return ["房型", "住宿", "方案", "票種", "票價", "費用", "價格", "價錢", "餐別", "套餐"].some((k) => name.includes(k));
}
function isHeadcount(value: unknown) {
  const name = normalize(value);
  return name === "報名人數含本人" || name === "報名人數" || name === "人數" || name.includes("參加人數") || name.includes("參與人數") || name.includes("同行人數") || name.includes("attendeecount") || name.includes("participantcount") || name.includes("peoplecount") || ["registrationcount","participantunit","quantity","qty"].includes(name);
}
function answerFor(field: NativeField, answers: Row) {
  return answers[clean(field.key)] ?? answers[clean(field.label)];
}
function dynamicUnitAmount(form: NativeForm, answers: Row) {
  for (const field of Array.isArray(form.fields) ? form.fields : []) {
    if (!isPricedField(field)) continue;
    const raw = answerFor(field, answers);
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      const amount = pricedChoiceAmount(value);
      if (amount > 0) return amount;
    }
  }
  return 0;
}
function headcount(form: NativeForm, answers: Row) {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  for (const field of fields) {
    if (!isHeadcount(field.label) && !isHeadcount(field.key)) continue;
    const count = Math.floor(numberValue(answerFor(field, answers)));
    if (count > 0) return Math.min(count, 1000);
  }
  for (const [key, value] of Object.entries(answers)) {
    if (!isHeadcount(key)) continue;
    const count = Math.floor(numberValue(value));
    if (count > 0) return Math.min(count, 1000);
  }
  return 1;
}
async function readRecord(env: Env, registrationId: string) {
  if (!env.ASSETS_BUCKET || !registrationId) return null;
  const object = await env.ASSETS_BUCKET.get(`registrations/native/${encodeURIComponent(registrationId)}.json`);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as Row : null;
}
async function readForm(env: Env, formId: string) {
  if (!env.ASSETS_BUCKET || !formId) return null;
  const object = await env.ASSETS_BUCKET.get(`forms/native/${encodeURIComponent(formId)}.json`);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as NativeForm : null;
}
async function repairStored(env: Env, registrationId: string) {
  const row = await readRecord(env, registrationId);
  if (!row || !env.ASSETS_BUCKET) return row;
  const formId = clean(row.formId);
  const form = await readForm(env, formId);
  if (!form) return row;
  const answers = row.answers && typeof row.answers === "object" ? row.answers as Row : {};
  const unitAmount = dynamicUnitAmount(form, answers);
  const quantity = headcount(form, answers);
  if (unitAmount <= 0 || quantity <= 0) return row;
  const amount = unitAmount * quantity;
  const previous = row.payment && typeof row.payment === "object" ? row.payment as Row : {};
  const payment = {
    ...previous,
    status: clean(previous.status) === "free" || !clean(previous.status) ? "unpaid" : previous.status,
    method: clean(previous.method) === "free" || !clean(previous.method) ? "bank_transfer" : previous.method,
    amount,
    unitAmount,
    quantity,
    currency: clean(previous.currency) || "TWD",
    updatedAt: new Date().toISOString()
  };
  row.payment = payment;
  row.registrationCount = quantity;
  row.unitAmount = unitAmount;
  await env.ASSETS_BUCKET.put(`registrations/native/${encodeURIComponent(registrationId)}.json`, JSON.stringify(row, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return row;
}
async function repairPayload(env: Env, payload: Row) {
  if (!payload?.success) return payload;
  if (Array.isArray(payload.data)) {
    payload.data = await Promise.all(payload.data.map(async (item: unknown) => {
      if (!item || typeof item !== "object") return item;
      const current = item as Row;
      const fixed = await repairStored(env, clean(current.id || current.registrationId));
      return fixed ? { ...current, payment: fixed.payment, registrationCount: fixed.registrationCount, unitAmount: fixed.unitAmount } : current;
    }));
  } else if (payload.data && typeof payload.data === "object") {
    const current = payload.data as Row;
    const fixed = await repairStored(env, clean(current.id || current.registrationId));
    if (fixed) payload.data = { ...current, payment: fixed.payment, registrationCount: fixed.registrationCount, unitAmount: fixed.unitAmount };
  }
  return payload;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/native-registrations/payment-report") {
      const input = await request.clone().json().catch(() => ({})) as Row;
      const registrationId = clean(input.registrationId);
      if (registrationId) await repairStored(env, registrationId);
      return app.fetch(request, env as never, ctx);
    }

    const response = await app.fetch(request, env as never, ctx);
    if (!response.ok || request.method !== "GET" || !["/api/native-registrations/query","/api/native-registrations/me","/api/registrations/list"].includes(url.pathname)) return response;
    const payload = await response.clone().json().catch(() => null) as Row | null;
    if (!payload?.success) return response;
    const fixed = await repairPayload(env, payload);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("x-tdea-dynamic-payment-hotfix", "1");
    return json(fixed, response.status, headers);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
