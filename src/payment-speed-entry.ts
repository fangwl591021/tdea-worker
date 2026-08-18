import app from "./registration-query-payment-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key: string]: unknown };
type Row = Record<string, any>;
type NativeField = { key?: string; label?: string; type?: string; options?: unknown[] };
type NativeForm = { activity?: Record<string, unknown>; fields?: NativeField[] };

const clean = (value: unknown) => String(value ?? "").trim();
const json = (data: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
});
function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = clean(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
function normalizeName(value: unknown) {
  return clean(value).toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g, "");
}
function pricedChoiceAmount(value: unknown) {
  const text = clean(value).replace(/，/g, ",");
  if (!text) return 0;
  const normalized = text.replace(/,/g, "");
  const patterns = [
    /(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:元|塊)(?:\s*[/／]?\s*(?:人|位))?/i,
    /([0-9]+(?:\.[0-9]+)?)\s*[/／]\s*(?:人|位)/i,
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
function dynamicUnitAmount(form: NativeForm, answers: Record<string, unknown>) {
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
  const activity = form.activity && typeof form.activity === "object" ? form.activity : {};
  return Math.max(0, numberValue(activity.paymentAmount || activity.feeAmount || activity.registrationFee || activity.amount));
}
function isHeadcountField(field: NativeField) {
  const key = normalizeName(field.key), label = normalizeName(field.label);
  const names = [key, label].filter(Boolean);
  return names.some((name) => name === "報名人數含本人" || name === "報名人數" || name === "人數" || name.includes("參加人數") || name.includes("參與人數") || name.includes("同行人數") || name === "registrationheadcount" || name === "registrationcount" || name === "participantunit" || name.includes("attendeecount") || name.includes("participantcount") || name.includes("peoplecount") || name === "quantity" || name === "qty");
}
function headcount(form: NativeForm, answers: Record<string, unknown>) {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  for (const field of fields) {
    if (!isHeadcountField(field)) continue;
    const count = Math.floor(numberValue(answerForField(field, answers)));
    if (count > 0) return Math.min(count, 1000);
  }
  return 1;
}
async function readJson(env: Env, key: string) {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as Row : null;
}
async function fastPaymentReport(request: Request, env: Env, ctx: ExecutionContext) {
  const started = performance.now();
  if (!env.ASSETS_BUCKET) return app.fetch(request, env, ctx);
  const backgroundRequest = request.clone();
  const input = await request.json().catch(() => ({})) as Row;
  const registrationId = clean(input.registrationId);
  const queryCode = clean(input.queryCode);
  const remittanceLast5 = clean(input.remittanceLast5 || input.last5).replace(/\D/g, "");
  if (!registrationId || !queryCode) return json({ success: false, message: "缺少報名識別資料" }, 400);
  if (remittanceLast5.length !== 5) return json({ success: false, message: "請輸入匯款帳號末五碼" }, 400);

  const registrationKey = `registrations/native/${encodeURIComponent(registrationId)}.json`;
  const entry = await readJson(env, registrationKey);
  if (!entry || clean(entry.queryCode) !== queryCode) return json({ success: false, message: "查無可回報的報名資料" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: false, message: "此報名已取消，不能回報付款" }, 409);

  const payment = entry.payment && typeof entry.payment === "object" ? entry.payment as Row : {};
  let amount = numberValue(payment.amount);
  let unitAmount = numberValue(payment.unitAmount);
  let quantity = Math.floor(numberValue(payment.quantity));
  if (amount <= 0 || unitAmount <= 0 || quantity <= 0) {
    const formId = clean(entry.formId);
    const form = formId ? await readJson(env, `forms/native/${encodeURIComponent(formId)}.json`) as NativeForm | null : null;
    const answers = entry.answers && typeof entry.answers === "object" ? entry.answers as Record<string, unknown> : {};
    if (form) {
      unitAmount = dynamicUnitAmount(form, answers);
      quantity = headcount(form, answers);
      amount = unitAmount * quantity;
    }
  }
  if (amount <= 0) return json({ success: false, message: "此活動不需要付款" }, 400);
  if (clean(payment.status) === "paid") return json({ success: true, data: entry, fastPath: true });

  const now = new Date().toISOString();
  entry.payment = {
    ...payment,
    status: "reported",
    method: clean(payment.method) === "free" ? "bank_transfer" : (clean(payment.method) || "bank_transfer"),
    amount,
    unitAmount,
    quantity,
    currency: clean(payment.currency) || "TWD",
    remittanceLast5,
    reportedAt: now,
    note: clean(input.note || payment.note),
    updatedAt: now,
    transactions: [{ type: "reported", remittanceLast5, at: now, note: clean(input.note) }, ...(Array.isArray(payment.transactions) ? payment.transactions : [])].slice(0, 50)
  };
  entry.updatedAt = now;

  // Foreground only commits the canonical registration record. This is the durability boundary.
  await env.ASSETS_BUCKET.put(registrationKey, JSON.stringify(entry, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });

  // Keep all legacy index/list synchronization intact, but move it off the user-facing critical path.
  ctx.waitUntil(app.fetch(backgroundRequest, env, ctx).then(() => undefined).catch((error) => console.error("payment background sync failed", error)));

  const ms = Math.max(0, Math.round(performance.now() - started));
  return json({ success: true, data: entry, fastPath: true, backgroundSync: true }, 200, {
    "server-timing": `payment_fast;dur=${ms}`,
    "x-tdea-payment-fast-ms": String(ms)
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/native-registrations/payment-report") {
      return fastPaymentReport(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  }
};
