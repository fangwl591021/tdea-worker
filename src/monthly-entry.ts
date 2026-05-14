import baseEntry from "./roster-sync-entry4";

type Env = { ADMIN_EMAILS?: string; ASSETS_BUCKET?: R2Bucket; LINE_CHANNEL_SECRET?: string; LINE_CHANNEL_ACCESS_TOKEN?: string; GOOGLE_FORMS_SCRIPT_URL?: string; GOOGLE_FORMS_SHARED_SECRET?: string; OPNFORM_API_BASE?: string; OPNFORM_PUBLIC_BASE?: string; OPNFORM_API_TOKEN?: string; OPNFORM_WORKSPACE_ID?: string; OPNFORM_WEBHOOK_SECRET?: string; WETW_POINT_API_KEY?: string; WETW_SHOP_ID?: string; WETW_POINT_TYPE?: string; TDEA_POINT_EXTERNAL_SYNC?: string };
type LineEvent = { type?: string; replyToken?: string; message?: { type?: string; text?: string }; postback?: { data?: string } };
type MonthlyPage = { id?: string; activityNo?: string; imageUrl?: string; formImageUrl?: string; detailTitle?: string; detailText?: string; detailUrl?: string; formUrl?: string; shareUrl?: string; order?: number };
type MonthlyConfig = { enabled?: boolean; keyword?: string; month?: string; altText?: string; detailBaseUrl?: string; pages?: MonthlyPage[]; updatedAt?: string };
type RegistrationRecord = { activityId?: string; activityNo?: string; activityName?: string; formId?: string; count: number; lastSubmittedAt?: string };
type RegistrationSummary = { updatedAt?: string; activities: Record<string, RegistrationRecord> };
type RegistrationEntry = { id: string; sourceId?: string; formId?: string; submittedAt?: string; activity?: Record<string, unknown>; answers?: Record<string, unknown>; status?: string; checkedInAt?: string; sessionId?: string; queryCode?: string; checkinToken?: string; cancelledAt?: string; lineUserId?: string; pointsSyncedAt?: string; pointResults?: unknown[] };
type ManagedSubmission = { formId?: string; sourceId?: string; submittedAt?: string; activity: Record<string, unknown>; answers: Record<string, unknown>; raw?: unknown };
type NativeField = { key: string; label: string; type: string; required?: boolean; options?: string[] };
type NativeSession = { id: string; name: string; startTime?: string; endTime?: string; capacity?: number; status?: string };
type NativeForm = { id: string; provider: "native_form"; activity: Record<string, unknown>; settings: Record<string, unknown>; fields: NativeField[]; sessions: NativeSession[]; formUrl: string; createdAt: string; updatedAt: string };
type PointLog = { logId: string; lineUserId: string; type: "EARN" | "SPEND"; amount: number; points: number; reason: string; balanceAfter: number; createdAt: string; createdTs: number; source?: string; referenceId?: string; externalSync?: unknown };
type PointAccount = { balance: number; logs: PointLog[]; updatedAt?: string };
type RedeemMode = "fixed" | "manual" | "rate";
type RedeemTransaction = { id: string; lineUserId: string; amount?: number; points: number; balanceBefore?: number; balanceAfter?: number; createdAt: string; note?: string; pointResult?: unknown };
type RedeemRequest = { id: string; token: string; vendorId?: string; vendorName: string; amount?: number; points: number; maxPoints?: number; pointRate?: number; mode?: RedeemMode; note?: string; status: "active" | "pending" | "used" | "expired" | "closed"; createdAt: string; startsAt?: string; expiresAt: string; usedAt?: string; lineUserId?: string; pointBalance?: number; pointResult?: unknown; transactions?: RedeemTransaction[] };
type PushTarget = { kind?: string; memberNoPrefix?: string; rosterType?: string; qualification?: string; manualUids?: string };
type PushLog = { id: string; createdAt: string; mode: string; target: PushTarget; count: number; messageType: string; title?: string; dryRun?: boolean; responses?: unknown[]; error?: string };

const monthlyKey = "flex/monthly-activity.json";
const registrationSummaryKey = "registrations/summary.json";
const redeemListKey = "redeem/records.json";
const pointLedgerKey = "points/ledger.json";
const pushLogKey = "push/logs.json";
const aiweMembersKey = "aiwe/members.json";
const defaultCalendarId = "7d66f2a96f192dda6cca2b04e60a6e549c7adf74f57721845d5b7e03f8b7ca89@group.calendar.google.com";
const workerBaseUrl = "https://tdeawork.fangwl591021.workers.dev";
const fixedKeyword = "TDEA每月活動";
const queryKeyword = "TDEA活動查詢";
const memberQrKeyword = "TDEA會員QR";
const calendarKeyword = "TDEA行事曆";
const defaultLiffBase = "https://liff.line.me/2005868456-2jmxqyFU?monthlyDetail={id}";
const defaultLiffCloseUrl = "https://liff.line.me/2005868456-2jmxqyFU?close=1";
const publicAppUrl = "https://fangwl591021.github.io/tdea-worker/";
const publicLiffUrl = "https://liff.line.me/2005868456-2jmxqyFU";
const pointApiBase = "https://aiwe.cc/index.php/wp-json/wetw-point/v1";
const headers = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,OPTIONS", "access-control-allow-headers": "content-type,x-admin-email,x-aiwe-token,x-line-signature" };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const esc = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" }[ch] || ch));
const normalizeKeyword = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();

function requireAdmin(request: Request, env: Env) {
  const allowed = (env.ADMIN_EMAILS || "admin@example.com").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const email = request.headers.get("x-admin-email")?.trim().toLowerCase();
  return email && allowed.includes(email) ? null : json({ success: false, message: "Unauthorized" }, 401);
}

async function readMonthly(env: Env): Promise<MonthlyConfig> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(monthlyKey) : null;
  if (!object) return { enabled: false, keyword: fixedKeyword, month: "", altText: "TDEA 每月活動", detailBaseUrl: defaultLiffBase, pages: [] };
  const data = await object.json().catch(() => ({}));
  return normalizeConfig(data as MonthlyConfig);
}

async function writeMonthly(env: Env, config: MonthlyConfig) {
  if (!env.ASSETS_BUCKET) return false;
  const normalized = normalizeConfig(config);
  normalized.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(monthlyKey, JSON.stringify(normalized, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

async function readRegistrationSummary(env: Env): Promise<RegistrationSummary> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(registrationSummaryKey) : null;
  if (!object) return { activities: {} };
  const data = await object.json().catch(() => ({}));
  const activities = data && typeof data === "object" && typeof (data as RegistrationSummary).activities === "object" ? (data as RegistrationSummary).activities : {};
  for (const [key, record] of Object.entries(activities || {})) {
    const list = await readRegistrationList(env, key);
    if (list.length) record.count = activeRegistrations(list).length;
  }
  return { updatedAt: (data as RegistrationSummary).updatedAt, activities: activities || {} };
}

async function writeRegistrationSummary(env: Env, summary: RegistrationSummary) {
  if (!env.ASSETS_BUCKET) return false;
  summary.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(registrationSummaryKey, JSON.stringify(summary, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

function registrationKeys(activity: Record<string, unknown>, formId: string) {
  return [activity.id, activity.activityNo, activity.name, formId].map((value) => String(value || "").trim()).filter(Boolean);
}

function registrationListKey(key: string) {
  return `registrations/by-key/${encodeURIComponent(key)}.json`;
}

async function readRegistrationList(env: Env, key: string): Promise<RegistrationEntry[]> {
  if (!env.ASSETS_BUCKET || !key) return [];
  const object = await env.ASSETS_BUCKET.get(registrationListKey(key));
  if (!object) return [];
  const data = await object.json().catch(() => []);
  return Array.isArray(data) ? data as RegistrationEntry[] : [];
}

async function writeRegistrationList(env: Env, key: string, list: RegistrationEntry[]) {
  if (!env.ASSETS_BUCKET || !key) return;
  await env.ASSETS_BUCKET.put(registrationListKey(key), JSON.stringify(list.slice(0, 1000), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function activeRegistrations(list: RegistrationEntry[]) {
  return dedupeRegistrations(list).filter((item) => clean(item.status || "active") !== "cancelled");
}

function registrationFingerprint(entry: RegistrationEntry) {
  const answerText = JSON.stringify(normalizeAnswersRecord(entry.answers || {}));
  return [
    clean(entry.formId),
    clean(entry.submittedAt),
    answerText
  ].join("|");
}

function dedupeRegistrations(list: RegistrationEntry[]) {
  const seen = new Set<string>();
  const output: RegistrationEntry[] = [];
  for (const item of list) {
    const sourceId = clean(item.sourceId);
    const fingerprint = registrationFingerprint(item);
    if ((sourceId && seen.has(`source:${sourceId}`)) || seen.has(`fingerprint:${fingerprint}`)) continue;
    if (sourceId) seen.add(`source:${sourceId}`);
    seen.add(`fingerprint:${fingerprint}`);
    output.push({ ...item, answers: normalizeAnswersRecord(item.answers || {}) });
  }
  return output;
}

async function appendRegistrationList(env: Env, keys: string[], entry: RegistrationEntry) {
  if (!env.ASSETS_BUCKET) return;
  let maxCount = 0;
  for (const key of keys) {
    const list = dedupeRegistrations(await readRegistrationList(env, key));
    const sourceId = entry.sourceId || entry.id;
    const fingerprint = registrationFingerprint(entry);
    const exists = list.some((item) => (item.sourceId || item.id) === sourceId || registrationFingerprint(item) === fingerprint);
    const nextList = exists ? list : [entry, ...list];
    maxCount = Math.max(maxCount, activeRegistrations(nextList).length);
    await writeRegistrationList(env, key, nextList);
  }
  return maxCount;
}

async function listRegistrations(request: Request, env: Env) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const url = new URL(request.url);
  const keys = (url.searchParams.get("keys") || url.searchParams.get("key") || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  for (const key of keys) {
    const list = dedupeRegistrations(await readRegistrationList(env, key));
    if (list.length) return json({ success: true, key, data: list });
  }
  return json({ success: true, key: keys[0] || "", data: [] });
}

async function storeManagedSubmission(env: Env, submission: ManagedSubmission) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const activity = submission.activity || {};
  const formId = String(submission.formId || "").trim();
  const keys = registrationKeys(activity, formId);
  if (!keys.length) return json({ success: false, message: "Missing activity or form id" }, 400);

  const summary = await readRegistrationSummary(env);
  const existing = keys.map((key) => summary.activities[key]).find(Boolean);
  const record: RegistrationRecord = {
    activityId: String(activity.id || existing?.activityId || "").trim(),
    activityNo: String(activity.activityNo || existing?.activityNo || "").trim(),
    activityName: String(activity.name || existing?.activityName || "").trim(),
    formId: formId || existing?.formId || "",
    count: Number(existing?.count || 0),
    lastSubmittedAt: String(submission.submittedAt || new Date().toISOString())
  };

  const entry: RegistrationEntry = {
    id: crypto.randomUUID(),
    sourceId: String(submission.sourceId || `${formId}:${record.lastSubmittedAt}`).trim(),
    formId,
    submittedAt: record.lastSubmittedAt,
    activity,
    answers: normalizeAnswersRecord(submission.answers || {}),
    status: "active"
  };
  const count = await appendRegistrationList(env, keys, entry);
  record.count = Number(count || 0);

  for (const key of keys) summary.activities[key] = record;
  await writeRegistrationSummary(env, summary);

  const eventKey = `registrations/events/${Date.now()}-${crypto.randomUUID()}.json`;
  await env.ASSETS_BUCKET.put(eventKey, JSON.stringify(submission.raw || submission, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return json({ success: true, data: record });
}

async function handleFormSubmission(request: Request, env: Env) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (body.action && body.action !== "FORM_SUBMISSION") return json({ success: false, message: "Unknown action" }, 400);
  if (env.GOOGLE_FORMS_SHARED_SECRET && body.sharedSecret !== env.GOOGLE_FORMS_SHARED_SECRET) return json({ success: false, message: "Invalid shared secret" }, 403);
  const activity = (body.activity && typeof body.activity === "object" ? body.activity : {}) as Record<string, unknown>;
  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  return storeManagedSubmission(env, {
    activity,
    answers: normalizeAnswersRecord(answers),
    formId: String(body.formId || "").trim(),
    sourceId: String(body.responseId || body.submissionId || body.editResponseUrl || "").trim(),
    submittedAt: String(body.submittedAt || new Date().toISOString()),
    raw: body
  });
}

async function syncGoogleFormResponses(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const scriptUrl = env.GOOGLE_FORMS_SCRIPT_URL?.trim();
  if (!scriptUrl) return json({ success: false, message: "GOOGLE_FORMS_SCRIPT_URL is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activities = Array.isArray(input.activities) ? input.activities as Array<Record<string, unknown>> : [];
  const results = [];
  let imported = 0;

  for (const activity of activities) {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "SYNC_FORM_RESPONSES",
        sharedSecret: env.GOOGLE_FORMS_SHARED_SECRET || "",
        formId: activity.formId || activity.googleFormId || "",
        activity
      })
    });
    const result = await response.json().catch(() => ({ success: false, message: "Invalid Apps Script JSON" })) as Record<string, unknown>;
    if (!response.ok || result.success === false) {
      results.push({ activity: activity.name || activity.id, success: false, message: result.message || "Sync failed" });
      continue;
    }
    const submissions = Array.isArray(result.submissions) ? result.submissions as Array<Record<string, unknown>> : [];
    for (const submission of submissions) {
      const submissionRequest = new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "FORM_SUBMISSION", ...submission, activity: submission.activity || activity }) });
      await handleFormSubmission(submissionRequest, env);
      imported += 1;
    }
    results.push({ activity: activity.name || activity.id, success: true, formId: result.formId, count: submissions.length });
  }

  return json({ success: true, imported, results, data: await readRegistrationSummary(env) });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function answerValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => answerValue(item)).filter((item) => clean(item)).join(", ");
  }
  if (value && typeof value === "object") {
    const record = asRecord(value);
    for (const key of ["value", "answer", "label", "name", "text", "display", "display_value", "formatted", "url", "file_name"]) {
      const next = answerValue(record[key]);
      if (clean(next)) return next;
    }
    const scalarValues = Object.values(record)
      .map((item) => answerValue(item))
      .filter((item) => clean(item));
    if (scalarValues.length) return scalarValues.join(", ");
    return "";
  }
  return value ?? "";
}

function normalizeAnswersRecord(record: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record || {})) output[key] = answerValue(value);
  return output;
}

function stableSubmissionSourceId(payload: Record<string, unknown>, data: Record<string, unknown>, formId: string, submittedAt: string) {
  return firstClean(
    payload.submission_id,
    payload.submissionId,
    payload.id,
    data.id,
    `${formId}:${submittedAt}:${data.email || ""}:${data.phone || ""}:${data.name || ""}`
  );
}

function formMetaKey(formId: string) {
  return `forms/opnform/${encodeURIComponent(formId)}.json`;
}

async function writeOpnFormMeta(env: Env, formId: string, activity: Record<string, unknown>, form: Record<string, unknown>) {
  if (!env.ASSETS_BUCKET || !formId) return;
  const meta = { provider: "opnform", formId, activity, form, updatedAt: new Date().toISOString() };
  await env.ASSETS_BUCKET.put(formMetaKey(formId), JSON.stringify(meta, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function readOpnFormMeta(env: Env, formId: string) {
  if (!env.ASSETS_BUCKET || !formId) return {};
  const object = await env.ASSETS_BUCKET.get(formMetaKey(formId));
  return object ? asRecord(await object.json().catch(() => ({}))) : {};
}

function opnFormApiBase(env: Env) {
  return clean(env.OPNFORM_API_BASE || "https://api.opnform.com").replace(/\/+$/, "");
}

function opnFormPublicBase(env: Env) {
  return clean(env.OPNFORM_PUBLIC_BASE || "https://opnform.com/forms").replace(/\/+$/, "");
}

function opnFormHeaders(env: Env) {
  return { authorization: `Bearer ${clean(env.OPNFORM_API_TOKEN)}`, "content-type": "application/json", accept: "application/json" };
}

async function opnFormJson(env: Env, path: string, init: RequestInit = {}) {
  const response = await fetch(`${opnFormApiBase(env)}${path}`, { ...init, headers: { ...opnFormHeaders(env), ...(init.headers || {}) } });
  const text = await response.text().catch(() => "");
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  return { response, data: asRecord(data) };
}

async function opnFormRawJson(env: Env, path: string, init: RequestInit = {}) {
  const response = await fetch(`${opnFormApiBase(env)}${path}`, { ...init, headers: { ...opnFormHeaders(env), ...(init.headers || {}) } });
  const text = await response.text().catch(() => "");
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  return { response, data };
}

function opnFormType(type: unknown) {
  const key = clean(type).toLowerCase();
  if (key === "paragraph" || key === "textarea" || key === "long_text") return "text";
  if (key === "email") return "email";
  if (key === "phone" || key === "tel") return "phone_number";
  if (key === "number") return "number";
  if (key === "date") return "date";
  if (key === "file" || key === "files") return "files";
  if (key === "checkbox" || key === "checkboxes" || key === "multi_select") return "multi_select";
  if (key === "radio" || key === "choice" || key === "dropdown" || key === "select") return "select";
  return "text";
}

function opnFormIsLongText(type: unknown) {
  const key = clean(type).toLowerCase();
  return key === "paragraph" || key === "textarea" || key === "long_text";
}

function opnFormUsesFlatChoices(type: unknown) {
  const key = clean(type).toLowerCase();
  return key === "radio" || key === "choice" || key === "checkbox" || key === "checkboxes";
}

function normalizeOptions(options: unknown) {
  return (Array.isArray(options) ? options : clean(options).split(/\n|,/))
    .map((item) => clean(item))
    .filter(Boolean)
    .map((name) => ({ id: name, name }));
}

function firstClean(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function nativeFormKey(formId: string) {
  return `forms/native/${encodeURIComponent(formId)}.json`;
}

function nativeRegistrationKey(registrationId: string) {
  return `registrations/native/${encodeURIComponent(registrationId)}.json`;
}

function nativeQueryKey(queryCode: string) {
  return `registrations/native-query/${encodeURIComponent(queryCode)}.json`;
}

function nativeTokenKey(token: string) {
  return `registrations/native-token/${encodeURIComponent(token)}.json`;
}

function nativeLineUserKey(lineUserId: string) {
  return `registrations/native-line/${encodeURIComponent(lineUserId)}.json`;
}

function pointAccountKey(lineUserId: string) {
  return `points/accounts/${encodeURIComponent(lineUserId)}.json`;
}

function pointLegacySyncKey(lineUserId: string) {
  return `points/legacy-sync/${encodeURIComponent(lineUserId)}.json`;
}

function redeemKey(token: string) {
  return `redeem/requests/${encodeURIComponent(token)}.json`;
}

function nativeFormUrl(formId: string) {
  return `${publicLiffUrl}?register=${encodeURIComponent(formId)}`;
}

function redeemUrl(token: string) {
  return `${workerBaseUrl}/?redeemSession=${encodeURIComponent(token)}`;
}

function nativeCheckinUrl(token: string) {
  return `${publicAppUrl}?checkin=${encodeURIComponent(token)}`;
}

function codeToken(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeNativeFields(settings: Record<string, unknown>): NativeField[] {
  const rows = Array.isArray(settings.fields) ? settings.fields as Array<Record<string, unknown>> : [];
  return rows.map((field, index) => {
    const type = clean(field.type || "text").toLowerCase();
    const choice = ["select", "dropdown"].includes(type) ? "dropdown" : ["radio", "choice"].includes(type) ? "radio" : ["checkbox", "checkboxes", "multi_select"].includes(type) ? "checkbox" : type === "paragraph" ? "paragraph" : type === "email" ? "email" : "text";
    return {
      key: clean(field.key) || `field_${index + 1}`,
      label: clean(field.label) || `欄位 ${index + 1}`,
      type: choice,
      required: Boolean(field.required),
      options: normalizeOptions(field.options).map((option) => clean(option.name)).filter(Boolean)
    };
  }).filter((field) => field.label);
}

function normalizeNativeSessions(settings: Record<string, unknown>, activity: Record<string, unknown>): NativeSession[] {
  const rows = Array.isArray(settings.sessions) ? settings.sessions as Array<Record<string, unknown>> : [];
  const sessions = rows.map((row, index) => ({
    id: clean(row.id) || `session_${index + 1}`,
    name: clean(row.name) || `梯次 ${index + 1}`,
    startTime: clean(row.startTime || row.time),
    endTime: clean(row.endTime),
    capacity: Number(row.capacity || 0) || 0,
    status: clean(row.status || "open")
  })).filter((row) => row.name);
  if (sessions.length) return sessions;
  return [{
    id: "default",
    name: clean(activity.courseTime) || "一般報名",
    startTime: clean(activity.courseTime),
    endTime: "",
    capacity: Number(activity.capacity || 0) || 0,
    status: "open"
  }];
}

async function readNativeForm(env: Env, formId: string): Promise<NativeForm | null> {
  if (!env.ASSETS_BUCKET || !formId) return null;
  const object = await env.ASSETS_BUCKET.get(nativeFormKey(formId));
  if (!object) return null;
  const data = await object.json().catch(() => null) as NativeForm | null;
  return data && data.id ? data : null;
}

async function writeNativeForm(env: Env, form: NativeForm) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(nativeFormKey(form.id), JSON.stringify(form, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function readNativeRegistration(env: Env, registrationId: string): Promise<RegistrationEntry | null> {
  if (!env.ASSETS_BUCKET || !registrationId) return null;
  const object = await env.ASSETS_BUCKET.get(nativeRegistrationKey(registrationId));
  if (!object) return null;
  return await object.json().catch(() => null) as RegistrationEntry | null;
}

async function writeNativeRegistration(env: Env, entry: RegistrationEntry) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(nativeRegistrationKey(entry.id), JSON.stringify(entry, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  if (entry.queryCode) await env.ASSETS_BUCKET.put(nativeQueryKey(entry.queryCode), entry.id, { httpMetadata: { contentType: "text/plain; charset=utf-8", cacheControl: "no-store" } });
  if (entry.checkinToken) await env.ASSETS_BUCKET.put(nativeTokenKey(entry.checkinToken), entry.id, { httpMetadata: { contentType: "text/plain; charset=utf-8", cacheControl: "no-store" } });
  if (entry.lineUserId) {
    const key = nativeLineUserKey(entry.lineUserId);
    const object = await env.ASSETS_BUCKET.get(key);
    const ids = object ? await object.json().catch(() => []) as unknown : [];
    const list = Array.isArray(ids) ? ids.map(clean).filter(Boolean) : [];
    if (!list.includes(entry.id)) list.unshift(entry.id);
    await env.ASSETS_BUCKET.put(key, JSON.stringify(list.slice(0, 300), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  }
}

async function insertMemberPoint(env: Env, input: { lineUserId: string; eventName: string; eventContent: string; points: number; remark?: string }) {
  const apiKey = clean(env.WETW_POINT_API_KEY);
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  if (!input.lineUserId || !input.eventName || !input.points) return { success: false, code: "missing_required_fields", message: "LINE_user_id, event_name and get_point are required" };
  const response = await fetch(`${pointApiBase}/insert-user-point`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      LINE_user_id: input.lineUserId,
      shop_id: Number(env.WETW_SHOP_ID || 35),
      event_name: input.eventName,
      event_content: input.eventContent || input.eventName,
      point_type: env.WETW_POINT_TYPE || "system_point",
      get_point: input.points,
      shop_user_lineid: "",
      child_shop_name: "",
      child_shop_renew: 0,
      shop_remark: input.remark || "TDEA Worker check-in"
    })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
  return { httpStatus: response.status, ...(body as Record<string, unknown>) };
}

async function queryPointBalance(env: Env, lineUserId: string) {
  const apiKey = clean(env.WETW_POINT_API_KEY);
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  if (!lineUserId) return { success: false, code: "missing_line_user_id", message: "LINE user id is required" };
  const response = await fetch(`${pointApiBase}/query-user-point-list`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      LINE_user_id: lineUserId,
      shop_id: Number(env.WETW_SHOP_ID || 35),
      point_type: env.WETW_POINT_TYPE || "system_point",
      page: 1,
      per_page: 100
    })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" })) as Record<string, unknown>;
  const data = asRecord(body.data);
  const list = Array.isArray(data.list) ? data.list.map(asRecord) : [];
  const firstBalance = list.map((item) => Number(item.point_balance)).find((value) => Number.isFinite(value));
  const balance = Number.isFinite(firstBalance) ? Number(firstBalance) : list.reduce((sum, item) => sum + numberValue(item.get_point), 0);
  return { httpStatus: response.status, ...body, balance, list };
}

async function readPointAccount(env: Env, lineUserId: string): Promise<PointAccount> {
  if (!env.ASSETS_BUCKET || !lineUserId) return { balance: 0, logs: [] };
  const object = await env.ASSETS_BUCKET.get(pointAccountKey(lineUserId));
  if (!object) return { balance: 0, logs: [] };
  const data = await object.json().catch(() => ({})) as Partial<PointAccount>;
  return { balance: numberValue(data.balance), logs: Array.isArray(data.logs) ? data.logs as PointLog[] : [], updatedAt: clean(data.updatedAt) };
}

async function writePointAccount(env: Env, lineUserId: string, account: PointAccount) {
  if (!env.ASSETS_BUCKET || !lineUserId) return;
  account.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(pointAccountKey(lineUserId), JSON.stringify(account, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function appendPointLedger(env: Env, entry: PointLog) {
  if (!env.ASSETS_BUCKET) return;
  const object = await env.ASSETS_BUCKET.get(pointLedgerKey);
  const current = object ? await object.json().catch(() => []) : [];
  const list = Array.isArray(current) ? current as PointLog[] : [];
  await env.ASSETS_BUCKET.put(pointLedgerKey, JSON.stringify([entry, ...list].slice(0, 5000), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function updateLocalPoints(env: Env, lineUserId: string, amount: number, reason: string, options: { source?: string; referenceId?: string; skipExternalSync?: boolean } = {}) {
  if (!env.ASSETS_BUCKET) return { success: false, message: "R2 bucket is not configured" };
  const numericAmount = Number(amount || 0);
  if (!lineUserId || !numericAmount) return { success: false, message: "缺少會員 UID 或點數異動數量" };
  const account = await readPointAccount(env, lineUserId);
  const nextBalance = numberValue(account.balance) + numericAmount;
  const createdTs = Date.now();
  const log: PointLog = {
    logId: crypto.randomUUID ? crypto.randomUUID() : String(createdTs),
    lineUserId,
    type: numericAmount >= 0 ? "EARN" : "SPEND",
    amount: numericAmount,
    points: Math.abs(numericAmount),
    reason,
    balanceAfter: nextBalance,
    createdAt: new Date(createdTs).toISOString(),
    createdTs,
    source: options.source || "tdea",
    referenceId: options.referenceId || ""
  };
  if (!options.skipExternalSync && clean(env.TDEA_POINT_EXTERNAL_SYNC).toLowerCase() !== "false" && env.WETW_POINT_API_KEY) {
    log.externalSync = await insertMemberPoint(env, { lineUserId, eventName: numericAmount >= 0 ? "TDEA 贈點" : "TDEA 扣點", eventContent: reason, points: numericAmount, remark: options.referenceId || "" });
  }
  const next: PointAccount = { balance: nextBalance, logs: [log, ...(account.logs || [])].slice(0, 100) };
  await writePointAccount(env, lineUserId, next);
  await appendPointLedger(env, log);
  return { success: true, balance: nextBalance, log, account: next };
}

async function getLegacySyncRecord(env: Env, lineUserId: string) {
  if (!env.ASSETS_BUCKET || !lineUserId) return null;
  const object = await env.ASSETS_BUCKET.get(pointLegacySyncKey(lineUserId));
  return object ? await object.json().catch(() => null) as Record<string, unknown> | null : null;
}

async function importLegacyPointsOnce(env: Env, lineUserId: string, force = false) {
  if (!env.ASSETS_BUCKET) return { success: false, reason: "missing_r2", imported: 0, message: "R2 bucket is not configured" };
  if (!lineUserId) return { success: false, reason: "missing_uid", imported: 0, message: "缺少會員 UID" };
  const synced = await getLegacySyncRecord(env, lineUserId);
  if (synced?.importedAt && !force) return { success: false, reason: "already_synced", imported: 0, ...synced };
  const legacy = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  if (legacy.success === false) return { success: false, reason: clean(legacy.code) || "legacy_query_failed", imported: 0, message: clean(legacy.message) || "母站點數查詢失敗", raw: legacy };
  const balance = Math.max(0, Number(legacy.balance || 0));
  if (balance <= 0) {
    const importedAt = new Date().toISOString();
    const record = { imported: 0, importedAt, source: "wetw-point/query-user-point-list", raw: legacy };
    await env.ASSETS_BUCKET.put(pointLegacySyncKey(lineUserId), JSON.stringify(record, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
    return { success: false, reason: "no_legacy_points", imported: 0, balance: 0, importedAt };
  }
  const update = await updateLocalPoints(env, lineUserId, balance, "母站點數補登", { source: "legacy_import", skipExternalSync: true });
  const importedAt = new Date().toISOString();
  const record = { imported: balance, importedAt, source: "wetw-point/query-user-point-list", raw: legacy };
  await env.ASSETS_BUCKET.put(pointLegacySyncKey(lineUserId), JSON.stringify(record, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return { success: true, imported: balance, importedAt, balance: (update as Record<string, unknown>).balance, raw: legacy };
}

async function getUnifiedPointAccount(env: Env, lineUserId: string, options: { autoImport?: boolean } = {}) {
  const before = await readPointAccount(env, lineUserId);
  let importResult: unknown = null;
  const synced = await getLegacySyncRecord(env, lineUserId);
  if (options.autoImport && !synced?.importedAt && numberValue(before.balance) <= 0) {
    importResult = await importLegacyPointsOnce(env, lineUserId);
  }
  const account = await readPointAccount(env, lineUserId);
  return { success: true, balance: numberValue(account.balance), logs: account.logs || [], imported: importResult, legacySynced: await getLegacySyncRecord(env, lineUserId) };
}

async function syncCheckinPoints(env: Env, entry: RegistrationEntry) {
  const activity = asRecord(entry.activity);
  const answers = asRecord(entry.answers);
  const lineUserId = firstClean(entry.lineUserId, answers.LINE_user_id, answers.lineUserId, answers.line_user_id, answers.uid, answers.UID);
  if (!lineUserId) return [{ success: false, code: "missing_line_user_id", message: "registration has no LINE user id" }];

  const eventName = firstClean(activity.name, activity.activityNo, "TDEA 活動簽到");
  const eventContent = firstClean(activity.courseTime, activity.activityNo, entry.id);
  const checkinPoints = numberValue(activity.checkinPoints || activity.checkinPointAmount);
  const feePoints = numberValue(activity.feePoints || activity.feePointAmount);
  const jobs: Array<{ label: string; points: number }> = [];
  if (checkinPoints > 0) jobs.push({ label: "簽到贈點", points: checkinPoints });
  if (feePoints > 0) jobs.push({ label: "費用扣抵", points: -Math.abs(feePoints) });
  if (!jobs.length) return [];

  const results = [];
  for (const job of jobs) {
    results.push(await insertMemberPoint(env, {
      lineUserId,
      eventName: `${eventName} ${job.label}`,
      eventContent,
      points: job.points,
      remark: entry.id
    }));
  }
  return results;
}

async function readRedeem(env: Env, token: string): Promise<RedeemRequest | null> {
  if (!env.ASSETS_BUCKET || !token) return null;
  const object = await env.ASSETS_BUCKET.get(redeemKey(token));
  if (!object) return null;
  const data = await object.json().catch(() => null) as RedeemRequest | null;
  return data && data.token ? data : null;
}

async function readRedeemList(env: Env): Promise<RedeemRequest[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(redeemListKey);
  if (!object) return [];
  const data = await object.json().catch(() => []);
  return Array.isArray(data) ? data as RedeemRequest[] : [];
}

async function writeRedeem(env: Env, redeem: RedeemRequest) {
  if (!env.ASSETS_BUCKET) return;
  const now = Date.now();
  const expired = ["active", "pending"].includes(redeem.status) && now > new Date(redeem.expiresAt).getTime();
  const next = expired ? { ...redeem, status: "expired" as const } : redeem;
  await env.ASSETS_BUCKET.put(redeemKey(next.token), JSON.stringify(next, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  const list = (await readRedeemList(env)).filter((item) => item.token !== next.token);
  list.unshift(next);
  await env.ASSETS_BUCKET.put(redeemListKey, JSON.stringify(list.slice(0, 500), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function publicRedeem(redeem: RedeemRequest, extra: Record<string, unknown> = {}) {
  const status = ["active", "pending"].includes(redeem.status) && Date.now() > new Date(redeem.expiresAt).getTime() ? "expired" : redeem.status;
  const transactions = Array.isArray(redeem.transactions) ? redeem.transactions : [];
  return {
    id: redeem.id,
    token: redeem.token,
    vendorName: redeem.vendorName,
    amount: redeem.amount || 0,
    points: redeem.points,
    maxPoints: redeem.maxPoints || 0,
    pointRate: redeem.pointRate || 0,
    mode: redeem.mode || "fixed",
    note: redeem.note || "",
    status,
    createdAt: redeem.createdAt,
    startsAt: redeem.startsAt || redeem.createdAt,
    expiresAt: redeem.expiresAt,
    usedAt: redeem.usedAt || "",
    redeemUrl: redeemUrl(redeem.token),
    sessionUrl: redeemUrl(redeem.token),
    transactions,
    usageCount: transactions.length,
    ...extra
  };
}

async function createRedeemRequest(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const vendorName = firstClean(input.vendorName, input.vendor, "合作店家");
  const now = new Date();
  const mode = (["fixed", "manual", "rate"].includes(clean(input.mode)) ? clean(input.mode) : "fixed") as RedeemMode;
  const points = Math.abs(numberValue(input.points));
  const maxPoints = Math.abs(numberValue(input.maxPoints));
  const pointRate = Math.abs(numberValue(input.pointRate));
  if (mode === "fixed" && !points) return json({ success: false, message: "固定點數模式請輸入每次扣抵點數" }, 400);
  if (mode === "rate" && !pointRate) return json({ success: false, message: "金額換算模式請輸入換算比例" }, 400);
  const startsAtInput = clean(input.startsAt);
  const expiresAtInput = clean(input.expiresAt);
  const ttl = Math.min(Math.max(numberValue(input.ttlMinutes) || 60, 1), 1440);
  const startsAt = startsAtInput ? new Date(startsAtInput) : now;
  const expiresAt = expiresAtInput ? new Date(expiresAtInput) : new Date(startsAt.getTime() + ttl * 60 * 1000);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime())) return json({ success: false, message: "授權起訖日期格式錯誤" }, 400);
  if (expiresAt.getTime() <= startsAt.getTime()) return json({ success: false, message: "授權結束時間必須晚於開始時間" }, 400);
  const token = `${codeToken(6)}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const redeem: RedeemRequest = {
    id: `REDEEM-${Date.now()}-${codeToken(4)}`,
    token,
    vendorId: clean(input.vendorId),
    vendorName,
    amount: numberValue(input.amount),
    points,
    maxPoints,
    pointRate,
    mode,
    note: clean(input.note),
    status: "active",
    createdAt: now.toISOString(),
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    transactions: []
  };
  await writeRedeem(env, redeem);
  return json({ success: true, data: publicRedeem(redeem), redeemUrl: redeemUrl(token) }, 201);
}

async function listRedeemRequests(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const list = await readRedeemList(env);
  return json({ success: true, data: list.map((item) => publicRedeem(item)) });
}

async function getRedeemRequest(request: Request, env: Env, token: string) {
  const redeem = await readRedeem(env, token);
  if (!redeem) return json({ success: false, message: "折抵碼不存在" }, 404);
  const url = new URL(request.url);
  const lineUserId = clean(url.searchParams.get("lineUserId"));
  let balanceInfo: Record<string, unknown> = {};
  if (lineUserId && ["active", "pending"].includes(redeem.status)) {
    const account = await getUnifiedPointAccount(env, lineUserId, { autoImport: true }) as Record<string, unknown>;
    balanceInfo = { balance: account.balance, pointAccount: account };
  }
  await writeRedeem(env, redeem);
  return json({ success: true, data: publicRedeem(redeem, balanceInfo) });
}

async function confirmRedeemRequest(request: Request, env: Env, token: string) {
  const redeem = await readRedeem(env, token);
  if (!redeem) return json({ success: false, message: "折抵碼不存在" }, 404);
  if (!["active", "pending"].includes(redeem.status)) return json({ success: false, message: redeem.status === "closed" ? "此店家授權已關閉" : "此店家授權已失效" }, 409);
  const nowMs = Date.now();
  if (redeem.startsAt && nowMs < new Date(redeem.startsAt).getTime()) return json({ success: false, message: "此店家授權尚未開始" }, 409);
  if (nowMs > new Date(redeem.expiresAt).getTime()) {
    redeem.status = "expired";
    await writeRedeem(env, redeem);
    return json({ success: false, message: "此店家授權已過期" }, 409);
  }
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = clean(input.lineUserId);
  if (!lineUserId) return json({ success: false, message: "請先掃描會員 QR Code" }, 400);
  const mode = redeem.mode || "fixed";
  const amount = Math.abs(numberValue(input.amount));
  let points = Math.abs(numberValue(input.points));
  if (mode === "fixed") points = Math.abs(numberValue(redeem.points));
  if (mode === "rate") {
    if (!amount) return json({ success: false, message: "請輸入消費金額" }, 400);
    points = Math.floor(amount * Math.abs(numberValue(redeem.pointRate)));
  }
  if (!points) return json({ success: false, message: "請輸入扣抵點數" }, 400);
  if (redeem.maxPoints && points > redeem.maxPoints) return json({ success: false, message: `超過本授權單次可扣上限 ${redeem.maxPoints} 點` }, 409);
  const account = await getUnifiedPointAccount(env, lineUserId, { autoImport: true }) as Record<string, unknown>;
  const pointBalance = Number(account.balance || 0);
  if (pointBalance < points) return json({ success: false, message: `點數不足，目前可用 ${pointBalance} 點`, data: { balance: pointBalance, required: points } }, 409);
  const reason = firstClean(clean(input.note), redeem.note, amount ? `${redeem.vendorName} 消費金額 ${amount}` : `${redeem.vendorName} 扣抵 ${points} 點`);
  const result = await updateLocalPoints(env, lineUserId, -Math.abs(points), reason, { source: "vendor_redeem", referenceId: redeem.id }) as Record<string, unknown>;
  if (result.success !== true) return json({ success: false, message: clean(result.message) || "扣點失敗", data: result }, 400);
  const createdAt = new Date().toISOString();
  const transaction: RedeemTransaction = {
    id: `TX-${Date.now()}-${codeToken(4)}`,
    lineUserId,
    amount,
    points: -Math.abs(points),
    balanceBefore: pointBalance,
    balanceAfter: pointBalance - points,
    createdAt,
    note: clean(input.note),
    pointResult: result
  };
  redeem.status = "active";
  redeem.usedAt = createdAt;
  redeem.lineUserId = lineUserId;
  redeem.pointBalance = pointBalance - points;
  redeem.pointResult = result;
  redeem.transactions = [transaction, ...(Array.isArray(redeem.transactions) ? redeem.transactions : [])].slice(0, 200);
  await writeRedeem(env, redeem);
  return json({ success: true, data: publicRedeem(redeem, { balance: redeem.pointBalance, pointResult: result, transaction }) });
}

async function getPointAccountApi(request: Request, env: Env, lineUserId: string) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!lineUserId) return json({ success: false, message: "缺少會員 UID" }, 400);
  return json({ success: true, data: await getUnifiedPointAccount(env, lineUserId, { autoImport: true }) });
}

async function syncLegacyPointApi(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = firstClean(input.lineUserId, input.uid, input.LINE_user_id);
  if (!lineUserId) return json({ success: false, message: "缺少會員 UID" }, 400);
  const force = Boolean(input.force);
  return json({ success: true, data: await importLegacyPointsOnce(env, lineUserId, force) });
}

async function listPointLedgerApi(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: true, data: [] });
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(numberValue(url.searchParams.get("limit")) || 500, 5000));
  const object = await env.ASSETS_BUCKET.get(pointLedgerKey);
  const data = object ? await object.json().catch(() => []) : [];
  return json({ success: true, data: Array.isArray(data) ? data.slice(0, limit) : [] });
}

function publicNativeForm(form: NativeForm) {
  return {
    id: form.id,
    provider: form.provider,
    activity: form.activity,
    settings: { sessionsEnabled: form.sessions.length > 1 },
    fields: form.fields,
    sessions: form.sessions.filter((session) => clean(session.status || "open") !== "closed"),
    formUrl: form.formUrl
  };
}

async function createNativeForm(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activity = asRecord(input.activity);
  const settings = asRecord(input.settings);
  const formId = firstClean(activity.id, activity.activityNo, `native-${crypto.randomUUID()}`);
  const now = new Date().toISOString();
  const existing = await readNativeForm(env, formId);
  const form: NativeForm = {
    id: formId,
    provider: "native_form",
    activity: {
      id: formId,
      activityNo: clean(activity.activityNo),
      name: firstClean(activity.name, "未命名活動"),
      type: clean(activity.type),
      courseTime: clean(activity.courseTime),
      deadline: clean(activity.deadline),
      capacity: Number(activity.capacity || 0) || 0,
      checkinPoints: numberValue(activity.checkinPoints || activity.checkinPointAmount),
      feePoints: numberValue(activity.feePoints || activity.feePointAmount),
      detailText: clean(activity.detailText),
      posterUrl: firstClean(activity.posterUrl, activity.imageUrl),
      imageUrl: firstClean(activity.imageUrl, activity.posterUrl),
      youtubeUrl: clean(activity.youtubeUrl)
    },
    settings,
    fields: normalizeNativeFields(settings),
    sessions: normalizeNativeSessions(settings, activity),
    formUrl: nativeFormUrl(formId),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await writeNativeForm(env, form);
  return json({ success: true, provider: "native_form", formId, nativeFormId: formId, formUrl: form.formUrl, nativeFormUrl: form.formUrl, data: { form: publicNativeForm(form) } }, 201);
}

async function getNativeForm(request: Request, env: Env, formId: string) {
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const list = activeRegistrations(await readRegistrationList(env, form.id));
  const counts: Record<string, number> = {};
  for (const item of list) counts[clean(item.sessionId || "default")] = (counts[clean(item.sessionId || "default")] || 0) + 1;
  return json({ success: true, data: { ...publicNativeForm(form), counts, total: list.length } });
}

function validateNativeAnswers(form: NativeForm, answers: Record<string, unknown>, sessionId: string) {
  const errors: string[] = [];
  const session = form.sessions.find((item) => item.id === sessionId);
  if (!session) errors.push("請選擇有效梯次");
  for (const field of form.fields) {
    const value = answers[field.key];
    const hasValue = Array.isArray(value) ? value.length > 0 : clean(value) !== "";
    if (field.required && !hasValue) errors.push(`${field.label} 為必填`);
    if ((field.type === "radio" || field.type === "dropdown") && hasValue && field.options?.length && !field.options.includes(clean(value))) errors.push(`${field.label} 選項不正確`);
    if (field.type === "checkbox" && hasValue && field.options?.length) {
      const values = Array.isArray(value) ? value.map(clean) : [clean(value)];
      if (values.some((item) => !field.options?.includes(item))) errors.push(`${field.label} 選項不正確`);
    }
  }
  return errors;
}

async function submitNativeForm(request: Request, env: Env, formId: string) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const rawAnswers = asRecord(input.answers);
  const answers = normalizeAnswersRecord(rawAnswers);
  const lineUserId = firstClean(input.lineUserId, rawAnswers.LINE_user_id, rawAnswers.lineUserId, rawAnswers.line_user_id, rawAnswers.uid, rawAnswers.UID);
  if (lineUserId) answers.LINE_user_id = lineUserId;
  const sessionId = clean(input.sessionId || "default");
  const errors = validateNativeAnswers(form, rawAnswers, sessionId);
  if (errors.length) return json({ success: false, message: errors[0], errors }, 400);
  const active = activeRegistrations(await readRegistrationList(env, form.id));
  const session = form.sessions.find((item) => item.id === sessionId);
  const sessionCount = active.filter((item) => clean(item.sessionId || "default") === sessionId).length;
  const sessionCapacity = Number(session?.capacity || 0);
  const totalCapacity = Number(form.activity.capacity || 0);
  if (sessionCapacity > 0 && sessionCount >= sessionCapacity) return json({ success: false, message: "此梯次已額滿" }, 409);
  if (totalCapacity > 0 && active.length >= totalCapacity) return json({ success: false, message: "此活動已額滿" }, 409);

  const registrationId = `REG-${Date.now()}-${codeToken(4)}`;
  const queryCode = codeToken(8);
  const checkinToken = crypto.randomUUID().replace(/-/g, "");
  const submittedAt = new Date().toISOString();
  const entry: RegistrationEntry = {
    id: registrationId,
    sourceId: registrationId,
    formId: form.id,
    submittedAt,
    activity: form.activity,
    answers,
    status: "active",
    sessionId,
    queryCode,
    checkinToken,
    lineUserId
  };
  const keys = registrationKeys(form.activity, form.id);
  const count = await appendRegistrationList(env, keys, entry);
  const summary = await readRegistrationSummary(env);
  const record: RegistrationRecord = {
    activityId: clean(form.activity.id),
    activityNo: clean(form.activity.activityNo),
    activityName: clean(form.activity.name),
    formId: form.id,
    count: Number(count || 0),
    lastSubmittedAt: submittedAt
  };
  for (const key of keys) summary.activities[key] = record;
  await writeRegistrationSummary(env, summary);
  await writeNativeRegistration(env, entry);
  return json({ success: true, data: { registrationId, queryCode, checkinUrl: nativeCheckinUrl(checkinToken), submittedAt, activity: form.activity, session } }, 201);
}

async function queryNativeRegistration(request: Request, env: Env) {
  const url = new URL(request.url);
  const queryCode = clean(url.searchParams.get("code"));
  const registrationId = clean(url.searchParams.get("registrationId"));
  let targetId = registrationId;
  if (!targetId && queryCode && env.ASSETS_BUCKET) {
    const object = await env.ASSETS_BUCKET.get(nativeQueryKey(queryCode));
    targetId = object ? await object.text() : "";
  }
  const entry = await readNativeRegistration(env, targetId);
  if (!entry || (queryCode && entry.queryCode !== queryCode)) return json({ success: false, message: "查無報名資料" }, 404);
  return json({ success: true, data: { ...entry, checkinUrl: entry.checkinToken ? nativeCheckinUrl(entry.checkinToken) : "" } });
}

async function queryNativeRegistrationsByLine(request: Request, env: Env) {
  const url = new URL(request.url);
  const lineUserId = clean(url.searchParams.get("lineUserId"));
  if (!lineUserId || !env.ASSETS_BUCKET) return json({ success: false, message: "Missing LINE user id" }, 400);
  const object = await env.ASSETS_BUCKET.get(nativeLineUserKey(lineUserId));
  const ids = object ? await object.json().catch(() => []) as unknown : [];
  const entries: RegistrationEntry[] = [];
  for (const id of Array.isArray(ids) ? ids.map(clean).filter(Boolean) : []) {
    const entry = await readNativeRegistration(env, id);
    if (entry && clean(entry.lineUserId) === lineUserId) entries.push(entry);
  }
  return json({ success: true, data: entries.map((entry) => ({ ...entry, checkinUrl: entry.checkinToken ? nativeCheckinUrl(entry.checkinToken) : "" })) });
}

async function updateRegistrationEverywhere(env: Env, entry: RegistrationEntry) {
  await writeNativeRegistration(env, entry);
  const keys = registrationKeys(entry.activity || {}, clean(entry.formId));
  for (const key of keys) {
    const list = await readRegistrationList(env, key);
    const next = list.map((item) => item.id === entry.id ? { ...item, ...entry } : item);
    await writeRegistrationList(env, key, next);
  }
  const summary = await readRegistrationSummary(env);
  const count = activeRegistrations(await readRegistrationList(env, clean(entry.formId))).length;
  for (const key of keys) {
    const existing = summary.activities[key];
    if (existing) summary.activities[key] = { ...existing, count, lastSubmittedAt: existing.lastSubmittedAt };
  }
  await writeRegistrationSummary(env, summary);
}

async function cancelNativeRegistration(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const registrationId = clean(input.registrationId);
  const queryCode = clean(input.queryCode);
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.queryCode !== queryCode) return json({ success: false, message: "查無可取消的報名資料" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: true, data: entry });
  entry.status = "cancelled";
  entry.cancelledAt = new Date().toISOString();
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: entry });
}

async function verifyNativeCheckin(request: Request, env: Env) {
  const url = new URL(request.url);
  const token = clean(url.searchParams.get("token"));
  if (!token || !env.ASSETS_BUCKET) return json({ success: false, message: "缺少核銷碼" }, 400);
  const object = await env.ASSETS_BUCKET.get(nativeTokenKey(token));
  const registrationId = object ? await object.text() : "";
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.checkinToken !== token) return json({ success: false, message: "核銷碼無效" }, 404);
  return json({ success: true, data: entry });
}

async function confirmNativeCheckin(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const token = clean(input.token);
  if (!token || !env.ASSETS_BUCKET) return json({ success: false, message: "缺少核銷碼" }, 400);
  const object = await env.ASSETS_BUCKET.get(nativeTokenKey(token));
  const registrationId = object ? await object.text() : "";
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.checkinToken !== token) return json({ success: false, message: "核銷碼無效" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: false, message: "此報名已取消，不能核銷" }, 409);
  const firstCheckin = !entry.checkedInAt;
  if (firstCheckin) {
    entry.checkedInAt = new Date().toISOString();
    entry.pointResults = await syncCheckinPoints(env, entry);
    entry.pointsSyncedAt = new Date().toISOString();
  }
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: entry });
}

function opnFormIntroProperties(activity: Record<string, unknown>, settings: Record<string, unknown>) {
  const posterUrl = firstClean(activity.posterUrl, activity.imageUrl, activity.coverUrl, settings.posterUrl, settings.imageUrl, settings.coverUrl);
  const detailText = firstClean(activity.detailText, settings.detailText, settings.description);
  const blocks: Record<string, unknown>[] = [];
  if (posterUrl) blocks.push({ id: "tdea_activity_poster", type: "nf-image", name: "活動海報", image_block: posterUrl, align: "center", width: "full" });
  if (detailText) blocks.push({ id: "tdea_activity_description", type: "nf-text", name: "活動說明", content: `<p>${esc(detailText).replace(/\r?\n/g, "<br>")}</p>` });
  blocks.push({ id: "tdea_activity_divider", type: "nf-divider", name: "報名資料" });
  return blocks;
}

function opnFormProperties(activity: Record<string, unknown>, settings: Record<string, unknown>) {
  const fields = settings.fields;
  const rows = Array.isArray(fields) ? fields as Array<Record<string, unknown>> : [];
  const normal = rows.map((field, index) => {
    const type = opnFormType(field.type);
    const property: Record<string, unknown> = {
      id: clean(field.key) || `field_${index + 1}`,
      type,
      name: clean(field.label) || `欄位 ${index + 1}`,
      required: Boolean(field.required),
      width: "full"
    };
    if (type === "text" && opnFormIsLongText(field.type)) property.multi_lines = true;
    if (type === "select" || type === "multi_select") {
      const options = normalizeOptions(field.options);
      property[type] = { options };
      if (opnFormUsesFlatChoices(field.type)) property.without_dropdown = true;
    }
    return property;
  });
  return [
    ...opnFormIntroProperties(activity, settings),
    ...normal,
    { id: "tdea_activity_id", type: "text", name: "TDEA Activity ID", hidden: true, required: false, width: "full" },
    { id: "tdea_activity_no", type: "text", name: "TDEA Activity No", hidden: true, required: false, width: "full" },
    { id: "tdea_activity_name", type: "text", name: "TDEA Activity Name", hidden: true, required: false, width: "full" }
  ];
}

function opnFormUrl(env: Env, form: Record<string, unknown>) {
  const direct = clean(form.share_url || form.public_url || form.url || form.shareUrl || form.publicUrl);
  if (/^https?:\/\//i.test(direct)) return direct;
  const slug = clean(form.slug);
  const formId = clean(form.id || form.uuid);
  return slug || formId ? `${opnFormPublicBase(env)}/${encodeURIComponent(slug || formId)}` : "";
}

async function resolveOpnFormWorkspaceId(env: Env) {
  const configured = Number(clean(env.OPNFORM_WORKSPACE_ID));
  const list = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
  const rows = Array.isArray(list.data) ? list.data.map((item) => asRecord(item)) : [];
  const ids = rows.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
  if (Number.isFinite(configured) && ids.includes(configured)) return { workspaceId: configured, configuredWorkspaceId: configured, workspaces: rows, autoSelected: false };
  if (ids.length === 1) return { workspaceId: ids[0], configuredWorkspaceId: Number.isFinite(configured) ? configured : 0, workspaces: rows, autoSelected: true };
  return { workspaceId: configured, configuredWorkspaceId: Number.isFinite(configured) ? configured : 0, workspaces: rows, autoSelected: false };
}

async function createOpnForm(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN) || !clean(env.OPNFORM_WORKSPACE_ID)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN / OPNFORM_WORKSPACE_ID is not configured" }, 503);

  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activity = asRecord(input.activity);
  const settings = asRecord(input.settings);
  const workspace = await resolveOpnFormWorkspaceId(env);
  const payload = {
    workspace_id: workspace.workspaceId,
    title: clean(activity.name) || "TDEA 活動報名",
    visibility: "public",
    language: "zh",
    tags: ["TDEA"],
    theme: "default",
    presentation_style: "classic",
    color: "#06C755",
    dark_mode: "light",
    width: "centered",
    size: "md",
    border_radius: "small",
    layout_rtl: false,
    uppercase_labels: false,
    no_branding: true,
    redirect_url: firstClean(settings.redirectUrl, activity.redirectUrl, defaultLiffCloseUrl),
    transparent_background: false,
    submit_button_text: "送出報名",
    submitted_text: "報名已送出，謝謝您。",
    re_fillable: false,
    re_fill_button_text: "再次填寫",
    confetti_on_submission: false,
    show_progress_bar: true,
    auto_save: true,
    auto_focus: false,
    enable_partial_submissions: false,
    editable_submissions: false,
    editable_submissions_button_text: "修改回覆",
    use_captcha: false,
    captcha_provider: "recaptcha",
    can_be_indexed: false,
    seo_meta: {},
    max_submissions_count: Number(activity.capacity || 0) > 0 ? Number(activity.capacity) : undefined,
    properties: opnFormProperties(activity, settings)
  };
  const create = await opnFormJson(env, "/open/forms", { method: "POST", body: JSON.stringify(payload) });
  if (!create.response.ok) {
    let workspaces: unknown = undefined;
    if (create.response.status === 401 || create.response.status === 403) {
      const list = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
      workspaces = list.response.ok ? list.data : list.data;
    }
    return json({ success: false, code: "opnform_create_failed", message: clean(create.data.message) || "OpnForm create failed", workspaceId: workspace.workspaceId, configuredWorkspaceId: workspace.configuredWorkspaceId, workspaces: workspaces || workspace.workspaces, data: create.data }, create.response.status);
  }

  const form = asRecord(create.data.data || create.data.form || create.data);
  const formId = clean(form.id || form.uuid);
  const formUrl = opnFormUrl(env, form);
  if (formId) await writeOpnFormMeta(env, formId, activity, form);

  let webhookInstalled = false;
  let webhookMessage = "";
  if (formId) {
    const webhookSecret = clean(env.OPNFORM_WEBHOOK_SECRET);
    const webhookUrl = `${new URL(request.url).origin}/api/opnform/webhook`;
    const webhookPayload = {
      integration_id: "webhook",
      status: "active",
      data: {
        webhook_url: webhookUrl,
        ...(webhookSecret ? { webhook_secret: webhookSecret } : {})
      }
    };
    const integration = await opnFormJson(env, `/open/forms/${encodeURIComponent(formId)}/integrations`, { method: "POST", body: JSON.stringify(webhookPayload) });
    webhookInstalled = integration.response.ok;
    webhookMessage = webhookInstalled ? "" : clean(integration.data.message || integration.data.error || "Webhook integration was not installed");
  }

  return json({
    success: true,
    provider: "opnform",
    formId,
    opnformFormId: formId,
    formUrl,
    opnformFormUrl: formUrl,
    slug: clean(form.slug),
    editUrl: clean(form.edit_url || form.admin_url),
    webhookInstalled,
    webhookMessage,
    workspaceId: workspace.workspaceId,
    configuredWorkspaceId: workspace.configuredWorkspaceId,
    workspaceAutoSelected: workspace.autoSelected,
    data: { form, webhookInstalled, webhookMessage }
  }, 201);
}

async function listOpnFormWorkspaces(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN is not configured" }, 503);
  const result = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
  return json({ success: result.response.ok, configuredWorkspaceId: clean(env.OPNFORM_WORKSPACE_ID), data: result.data }, result.response.ok ? 200 : result.response.status);
}

function normalizeOpnFormSubmission(payload: Record<string, unknown>, fallbackActivity: Record<string, unknown> = {}) {
  const data = normalizeAnswersRecord(asRecord(payload.data || asRecord(payload.submission).data || payload.answers || payload.fields));
  const form = asRecord(payload.form);
  const formId = clean(payload.form_id || payload.formId || form.id || fallbackActivity.formId || fallbackActivity.opnformFormId);
  const submittedAt = clean(payload.submitted_at || payload.created_at || data.created_at) || new Date().toISOString();
  const activity = {
    id: clean(data.tdea_activity_id || fallbackActivity.id),
    activityNo: clean(data.tdea_activity_no || fallbackActivity.activityNo),
    name: clean(data.tdea_activity_name || fallbackActivity.name)
  };
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("tdea_") && key !== "status" && key !== "created_at" && key !== "id") answers[key] = value;
  }
  return {
    formId,
    sourceId: stableSubmissionSourceId(payload, data, formId, submittedAt),
    submittedAt,
    activity,
    answers
  };
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTextEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function verifyOpnFormSignature(rawBody: string, signature: string | null, secret?: string) {
  const cleanSecret = clean(secret);
  if (!cleanSecret) return true;
  const cleanSignature = clean(signature).replace(/^sha256=/i, "");
  if (!cleanSignature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(cleanSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expectedHex = hex(digest);
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return constantTextEqual(cleanSignature, expectedHex) || constantTextEqual(cleanSignature, expectedBase64);
}

async function handleOpnFormWebhook(request: Request, env: Env) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-opnform-signature") || request.headers.get("x-webhook-signature") || request.headers.get("x-signature");
  if (!await verifyOpnFormSignature(rawBody, signature, env.OPNFORM_WEBHOOK_SECRET)) return json({ success: false, message: "Invalid signature" }, 403);
  const payload = await JSON.parse(rawBody || "{}") as Record<string, unknown>;
  const normalized = normalizeOpnFormSubmission(payload);
  const meta = asRecord(await readOpnFormMeta(env, normalized.formId || ""));
  const metaActivity = asRecord(meta.activity);
  const activity = normalized.activity.id || normalized.activity.activityNo || normalized.activity.name ? normalized.activity : metaActivity;
  return storeManagedSubmission(env, { ...normalized, activity, raw: payload });
}

async function syncOpnFormResponses(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activities = Array.isArray(input.activities) ? input.activities as Array<Record<string, unknown>> : [];
  const results = [];
  let imported = 0;

  for (const activity of activities) {
    const formId = clean(activity.opnformFormId || activity.formId);
    if (!formId) continue;
    const response = await opnFormJson(env, `/open/forms/${encodeURIComponent(formId)}/submissions?per_page=100&status=completed`, { method: "GET" });
    if (!response.response.ok) {
      results.push({ activity: activity.name || activity.id, formId, success: false, message: clean(response.data.message) || "OpnForm sync failed" });
      continue;
    }
    const submissions = Array.isArray(response.data.data) ? response.data.data as Array<Record<string, unknown>> : [];
    for (const submission of submissions) {
      const normalized = normalizeOpnFormSubmission({ ...submission, form_id: formId }, activity);
      await storeManagedSubmission(env, { ...normalized, activity: normalized.activity.id || normalized.activity.activityNo || normalized.activity.name ? normalized.activity : activity, raw: submission });
      imported += 1;
    }
    results.push({ activity: activity.name || activity.id, formId, success: true, count: submissions.length });
  }

  return json({ success: true, provider: "opnform", imported, results, data: await readRegistrationSummary(env) });
}

function normalizeConfig(config: MonthlyConfig): MonthlyConfig {
  const pages = Array.isArray(config.pages) ? config.pages : [];
  return {
    enabled: Boolean(config.enabled),
    keyword: fixedKeyword,
    month: String(config.month || "").trim(),
    altText: String(config.altText || "TDEA 每月活動").trim() || "TDEA 每月活動",
    detailBaseUrl: String(config.detailBaseUrl || defaultLiffBase).trim(),
    updatedAt: config.updatedAt,
    pages: pages.slice(0, 12).map((page, index) => ({
      id: String(page.id || crypto.randomUUID()),
      activityNo: String(page.activityNo || "").trim(),
      imageUrl: String(page.imageUrl || "").trim(),
      formImageUrl: String(page.formImageUrl || "").trim(),
      detailTitle: String(page.detailTitle || "詳細說明").trim() || "詳細說明",
      detailText: String(page.detailText || "").trim(),
      detailUrl: String(page.detailUrl || "").trim(),
      formUrl: String(page.formUrl || "").trim(),
      shareUrl: String(page.shareUrl || "").trim(),
      order: Number(page.order ?? index)
    })).filter((page) => page.activityNo || page.imageUrl || page.formUrl || page.detailText || page.detailUrl)
  };
}

function appendIdToUrl(baseUrl: string | undefined, activityNo: string | undefined, pageId: string | undefined) {
  const raw = String(baseUrl || defaultLiffBase).trim();
  const target = String(activityNo || pageId || "").trim();
  const encoded = encodeURIComponent(target);
  if (raw.includes("{id}")) return raw.replaceAll("{id}", encoded);
  if (raw.includes("{activityNo}")) return raw.replaceAll("{activityNo}", encoded);
  return raw + (raw.includes("?") ? "&" : "?") + "monthlyDetail=" + encoded;
}

function detailUrlForPage(page: MonthlyPage, config: MonthlyConfig) {
  const generated = appendIdToUrl(config.detailBaseUrl, page.activityNo, page.id);
  return generated || page.detailUrl || `${workerBaseUrl}/monthly-detail/${encodeURIComponent(String(page.id || ""))}`;
}

function buildMonthlyFlex(config: MonthlyConfig) {
  const normalized = normalizeConfig(config);
  return { type: "flex", altText: normalized.altText || "TDEA 每月活動", contents: { type: "carousel", contents: (normalized.pages || []).map((page) => buildMonthlyBubble(page, normalized)) } };
}

function buildMonthlyBubble(page: MonthlyPage, config: MonthlyConfig) {
  const detailUri = detailUrlForPage(page, config);
  const formUri = page.formUrl || workerBaseUrl;
  const shareUri = page.shareUrl || detailUri;
  return {
    type: "bubble",
    size: "kilo",
    body: { type: "box", layout: "vertical", paddingAll: "0px", contents: [
      { type: "image", url: page.imageUrl || "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png", size: "full", aspectMode: "cover", aspectRatio: "2:3", gravity: "top", action: { type: "uri", label: "報名", uri: formUri } },
      { type: "box", layout: "vertical", position: "absolute", cornerRadius: "20px", offsetTop: "18px", offsetStart: "18px", backgroundColor: "#ff334b", height: "25px", width: "53px", action: { type: "uri", label: "分享", uri: shareUri }, contents: [{ type: "text", text: "分享", color: "#ffffff", align: "center", size: "xs", offsetTop: "3px", action: { type: "uri", label: "分享", uri: shareUri } }] }
    ] },
    footer: { type: "box", layout: "horizontal", contents: [
      { type: "button", height: "sm", style: "primary", action: { type: "uri", label: "詳細說明", uri: detailUri } },
      { type: "button", height: "sm", style: "primary", margin: "md", action: { type: "uri", label: "點我報名", uri: formUri } }
    ] }
  };
}

function base64ToBytes(value: string) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
function constantTimeEqual(a: string, b: string) { let left: Uint8Array; let right: Uint8Array; try { left = base64ToBytes(a); right = base64ToBytes(b); } catch (_) { return false; } if (left.length !== right.length) return false; let diff = 0; for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index]; return diff === 0; }
async function verifyLineSignature(rawBody: string, signature: string | null, channelSecret?: string) { const cleanSignature = signature?.trim(); const cleanSecret = channelSecret?.trim(); if (!cleanSignature || !cleanSecret) return false; const encoder = new TextEncoder(); const key = await crypto.subtle.importKey("raw", encoder.encode(cleanSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)); const expected = btoa(String.fromCharCode(...new Uint8Array(digest))); return constantTimeEqual(expected, cleanSignature); }
function extractLineEvents(payload: unknown): LineEvent[] { if (!payload || typeof payload !== "object") return []; const events = (payload as { events?: unknown }).events; return Array.isArray(events) ? events as LineEvent[] : []; }
function extractTriggerText(event: LineEvent) { if (event.message?.type === "text" && event.message.text) return event.message.text; if (event.postback?.data) return event.postback.data; return ""; }
async function replyToLine(replyToken: string, messages: Array<Record<string, unknown>>, env: Env) { const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim(); if (!token) return { ok: false, status: 503, message: "LINE token is not configured" }; const response = await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ replyToken, messages }) }); return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") }; }
function rebuildRequest(request: Request, rawBody: string) { return new Request(request.url, { method: request.method, headers: request.headers, body: rawBody }); }

async function readAiweMembers(env: Env): Promise<Array<Record<string, unknown>>> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(aiweMembersKey);
  const rows = object ? await object.json().catch(() => []) : [];
  return Array.isArray(rows) ? rows.map(asRecord) : [];
}

function lineUidFromText(value: unknown) {
  const match = String(value || "").match(/U[0-9a-f]{32}/i);
  return match ? match[0] : "";
}

function memberLineUid(row: Record<string, unknown>) {
  return firstClean(row.lineUserId, row.LINE_user_id, row.uid, row.user_login, row.email, lineUidFromText(JSON.stringify(row)));
}

function manualLineUids(value: unknown) {
  return Array.from(new Set(String(value || "").match(/U[0-9a-f]{32}/gi) || []));
}

function pushTargetMatches(row: Record<string, unknown>, target: PushTarget) {
  const kind = clean(target.kind || "known");
  const rosterType = clean(row.rosterType);
  const qualification = firstClean(row.qualification, row.memberQualification, row.status);
  const memberNo = firstClean(row.rosterMemberNo, row.memberNo).toUpperCase();
  if (kind === "association") return rosterType === "association";
  if (kind === "vendor") return rosterType === "vendor";
  if (kind === "qualified") return qualification.toUpperCase() === "Y";
  if (kind === "memberPrefix") return Boolean(target.memberNoPrefix && memberNo.startsWith(clean(target.memberNoPrefix).toUpperCase()));
  return true;
}

async function resolvePushRecipients(env: Env, target: PushTarget) {
  const kind = clean(target.kind || "known");
  if (kind === "broadcast") return { mode: "broadcast", recipients: [] as string[], totalKnown: 0 };
  const members = await readAiweMembers(env);
  const manual = manualLineUids(target.manualUids);
  if (kind === "manual") return { mode: "multicast", recipients: manual, totalKnown: members.length };
  const fromMembers = members.filter((row) => pushTargetMatches(row, target)).map(memberLineUid).filter(Boolean);
  const recipients = Array.from(new Set([...fromMembers, ...manual]));
  return { mode: "multicast", recipients, totalKnown: members.length };
}

function buildPushMessages(input: Record<string, unknown>) {
  const messageType = clean(input.messageType || "text");
  if (messageType === "flex") {
    const altText = firstClean(input.altText, input.title, "TDEA 推播訊息");
    const raw = firstClean(input.flexJson, input.contents);
    const parsed = raw ? JSON.parse(raw) : asRecord(input.flexContents || input.contents);
    const contents = parsed.type === "flex" ? parsed.contents : parsed;
    if (!contents || typeof contents !== "object" || !clean((contents as Record<string, unknown>).type)) throw new Error("Flex JSON 缺少 contents/type");
    return [{ type: "flex", altText, contents } as Record<string, unknown>];
  }
  const title = clean(input.title);
  const text = clean(input.text || input.body);
  if (!text) throw new Error("請輸入推播文字");
  return [{ type: "text", text: title ? `${title}\n\n${text}` : text }];
}

async function sendLineApi(env: Env, path: string, payload: Record<string, unknown>) {
  const token = clean(env.LINE_CHANNEL_ACCESS_TOKEN);
  if (!token) return { ok: false, status: 503, body: "LINE_CHANNEL_ACCESS_TOKEN is not configured" };
  const response = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-line-retry-key": crypto.randomUUID()
    },
    body: JSON.stringify(payload)
  });
  return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") };
}

async function readPushLogs(env: Env): Promise<PushLog[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(pushLogKey);
  const rows = object ? await object.json().catch(() => []) : [];
  return Array.isArray(rows) ? rows as PushLog[] : [];
}

async function appendPushLog(env: Env, log: PushLog) {
  if (!env.ASSETS_BUCKET) return;
  const rows = await readPushLogs(env);
  await env.ASSETS_BUCKET.put(pushLogKey, JSON.stringify([log, ...rows].slice(0, 300), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function getPushSegments(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const members = await readAiweMembers(env);
  const counts = {
    known: members.map(memberLineUid).filter(Boolean).length,
    association: members.filter((row) => pushTargetMatches(row, { kind: "association" })).map(memberLineUid).filter(Boolean).length,
    vendor: members.filter((row) => pushTargetMatches(row, { kind: "vendor" })).map(memberLineUid).filter(Boolean).length,
    qualified: members.filter((row) => pushTargetMatches(row, { kind: "qualified" })).map(memberLineUid).filter(Boolean).length
  };
  return json({ success: true, data: { total: members.length, counts, logs: (await readPushLogs(env)).slice(0, 100) } });
}

async function resolvePushTargetsApi(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const target = asRecord(input.target) as PushTarget;
  const resolved = await resolvePushRecipients(env, target);
  return json({ success: true, data: { mode: resolved.mode, count: resolved.mode === "broadcast" ? null : resolved.recipients.length, sample: resolved.recipients.slice(0, 10), totalKnown: resolved.totalKnown } });
}

async function sendPushApi(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const target = asRecord(input.target) as PushTarget;
  const dryRun = Boolean(input.dryRun);
  let messages: Array<Record<string, unknown>>;
  try { messages = buildPushMessages(input); }
  catch (error) { return json({ success: false, message: String((error as Error).message || error) }, 400); }
  const resolved = await resolvePushRecipients(env, target);
  const responses: unknown[] = [];
  if (!dryRun) {
    if (resolved.mode === "broadcast") {
      responses.push(await sendLineApi(env, "broadcast", { messages, notificationDisabled: Boolean(input.notificationDisabled) }));
    } else {
      if (!resolved.recipients.length) return json({ success: false, message: "此分眾沒有可推播的 LINE UID" }, 400);
      for (let index = 0; index < resolved.recipients.length; index += 500) {
        responses.push(await sendLineApi(env, "multicast", { to: resolved.recipients.slice(index, index + 500), messages, notificationDisabled: Boolean(input.notificationDisabled) }));
      }
    }
  }
  const failed = responses.filter((item) => !(item as Record<string, unknown>).ok);
  const log: PushLog = {
    id: `PUSH-${Date.now()}`,
    createdAt: new Date().toISOString(),
    mode: resolved.mode,
    target,
    count: resolved.mode === "broadcast" ? 0 : resolved.recipients.length,
    messageType: clean(input.messageType || "text"),
    title: clean(input.title || input.altText),
    dryRun,
    responses
  };
  await appendPushLog(env, log);
  return json({ success: !failed.length, data: log, message: dryRun ? "已完成試算，尚未送出" : failed.length ? "部分或全部推播失敗" : "推播已送出" }, failed.length ? 502 : 200);
}

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function icsClean(value: string) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcsDate(value: string) {
  const cleanValue = clean(value);
  const dateOnly = cleanValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  const match = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return cleanValue;
  const [, year, month, day, hour, minute, second, zulu] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${zulu ? "Z" : "+08:00"}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString();
}

function calendarDisplayTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\//g, "/");
}

function parseIcsEvents(ics: string) {
  const source = unfoldIcs(ics);
  const blocks = source.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.map((block) => {
    const event: Record<string, string> = {};
    for (const rawLine of block.split(/\r?\n/)) {
      const index = rawLine.indexOf(":");
      if (index < 0) continue;
      const left = rawLine.slice(0, index);
      const value = rawLine.slice(index + 1);
      const key = left.split(";")[0].toUpperCase();
      event[key] = icsClean(value);
    }
    const start = parseIcsDate(event.DTSTART || "");
    const end = parseIcsDate(event.DTEND || "");
    const summary = event.SUMMARY || "未命名活動";
    return {
      id: event.UID || `${summary}-${start}`,
      uid: event.UID || "",
      name: summary,
      summary,
      description: event.DESCRIPTION || "",
      location: event.LOCATION || "",
      start,
      end,
      courseTime: calendarDisplayTime(start),
      deadline: "",
      status: event.STATUS || "",
      url: event.URL || "",
      updatedAt: parseIcsDate(event["LAST-MODIFIED"] || event.DTSTAMP || "")
    };
  }).filter((event) => clean(event.name) || clean(event.start));
}

async function fetchCalendarEvents(request: Request) {
  const url = new URL(request.url);
  const calendarId = clean(url.searchParams.get("calendarId")) || defaultCalendarId;
  const from = url.searchParams.get("from") ? new Date(String(url.searchParams.get("from"))) : null;
  const to = url.searchParams.get("to") ? new Date(String(url.searchParams.get("to"))) : null;
  const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
  const response = await fetch(icsUrl, { headers: { accept: "text/calendar,text/plain,*/*" } });
  const textBody = await response.text().catch(() => "");
  if (!response.ok) return json({ success: false, message: `Google Calendar 讀取失敗：HTTP ${response.status}。請確認日曆已設為公開。`, calendarId }, 502);
  let events = parseIcsEvents(textBody).sort((a, b) => String(a.start).localeCompare(String(b.start)));
  if (from && !Number.isNaN(from.getTime())) events = events.filter((event) => new Date(event.start).getTime() >= from.getTime());
  if (to && !Number.isNaN(to.getTime())) events = events.filter((event) => new Date(event.start).getTime() <= to.getTime());
  return json({ success: true, calendarId, total: events.length, data: events, icsUrl });
}

async function handleMonthlyWebhook(request: Request, env: Env, rawBody: string) {
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch (_) { return null; }
  const allEvents = extractLineEvents(payload);
  const queryEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(queryKeyword));
  const memberQrEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(memberQrKeyword));
  const calendarEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(calendarKeyword));
  const events = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(fixedKeyword));
  if (!queryEvents.length && !memberQrEvents.length && !calendarEvents.length && !events.length) return null;
  const signature = request.headers.get("x-line-signature");
  if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) return new Response("Invalid Signature", { status: 403, headers });
  if (queryEvents.length) {
    const queryUrl = `${publicLiffUrl}?query=1`;
    const queryMessage = {
      type: "template",
      altText: "TDEA 活動查詢",
      template: {
        type: "buttons",
        text: "請點下方按鈕開啟活動報名查詢與取消頁。",
        actions: [{ type: "uri", label: "開啟活動查詢", uri: queryUrl }]
      }
    };
    const lineReplies = await Promise.all(queryEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [queryMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "registration-query", matched: [queryKeyword], forwarded: false, lineReplies });
  }
  if (memberQrEvents.length) {
    const memberQrUrl = `${publicLiffUrl}?memberQr=1`;
    const memberQrMessage = {
      type: "template",
      altText: "TDEA 會員 QR",
      template: {
        type: "buttons",
        text: "請點下方按鈕開啟個人會員 QR，給合作店家掃描扣點。",
        actions: [{ type: "uri", label: "開啟會員 QR", uri: memberQrUrl }]
      }
    };
    const lineReplies = await Promise.all(memberQrEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [memberQrMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "member-qr", matched: [memberQrKeyword], forwarded: false, lineReplies });
  }
  if (calendarEvents.length) {
    const calendarUrl = `${publicLiffUrl}?calendar=1`;
    const calendarMessage = {
      type: "template",
      altText: "TDEA 行事曆",
      template: {
        type: "buttons",
        title: "TDEA 行事曆",
        text: "查看協會 Google 行事曆與年度活動安排。",
        actions: [{ type: "uri", label: "開啟行事曆", uri: calendarUrl }]
      }
    };
    const lineReplies = await Promise.all(calendarEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [calendarMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "calendar", matched: [calendarKeyword], forwarded: false, lineReplies });
  }
  const config = await readMonthly(env);
  const pages = config.pages || [];
  const message = config.enabled && pages.length ? buildMonthlyFlex(config) as Record<string, unknown> : { type: "text", text: "TDEA每月活動尚未發布，請稍後再試。" };
  const lineReplies = await Promise.all(events.map((event) => event.replyToken ? replyToLine(event.replyToken, [message], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
  return json({ success: true, mode: "monthly-activity", matched: [fixedKeyword], forwarded: false, lineReplies });
}

async function monthlyDetail(env: Env, id: string) {
  const config = await readMonthly(env);
  const page = (config.pages || []).find((item) => String(item.id) === id || String(item.activityNo) === id);
  if (!page) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.detailTitle || "詳細說明")}</title><style>body{margin:0;background:#f4f6f8;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}.wrap{max-width:720px;margin:0 auto;padding:22px}.card{background:#fff;border-radius:14px;padding:22px;box-shadow:0 14px 36px rgba(15,23,42,.08)}img{width:100%;border-radius:10px;margin-bottom:16px}.meta{display:inline-flex;margin:0 0 12px;padding:5px 10px;border-radius:999px;background:#eafff1;color:#027a48;font-size:13px;font-weight:800}h1{font-size:24px;margin:0 0 12px}.text{white-space:pre-wrap;line-height:1.7;color:#344054}.btn{display:block;margin-top:18px;padding:13px 16px;border-radius:10px;background:#06c755;color:#fff;text-align:center;text-decoration:none;font-weight:800}</style></head><body><main class="wrap"><section class="card">${page.imageUrl ? `<img src="${esc(page.imageUrl)}" alt="">` : ""}${page.activityNo ? `<div class="meta">${esc(page.activityNo)}</div>` : ""}<h1>${esc(page.detailTitle || "詳細說明")}</h1><div class="text">${esc(page.detailText || "尚未填寫詳細說明。")}</div>${page.formUrl ? `<a class="btn" href="${esc(page.formUrl)}">點我報名</a>` : ""}</section></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
	    if (request.method === "GET" && url.pathname === "/api/monthly-activity") return json({ success: true, data: await readMonthly(env) });
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/monthly-activity") { const guard = requireAdmin(request, env); if (guard) return guard; if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503); const config = await request.json().catch(() => ({})) as MonthlyConfig; await writeMonthly(env, config); return json({ success: true, data: await readMonthly(env), flex: buildMonthlyFlex(config) }); }
	    if (request.method === "GET" && url.pathname === "/api/monthly-activity/flex") { const config = await readMonthly(env); return json({ success: true, flex: buildMonthlyFlex(config), data: config }); }
	    if (request.method === "POST" && url.pathname === "/api/native-forms/create") return createNativeForm(request, env);
	    const nativeFormMatch = url.pathname.match(/^\/api\/native-forms\/([^/]+)$/);
	    if (nativeFormMatch && request.method === "GET") return getNativeForm(request, env, decodeURIComponent(nativeFormMatch[1]));
	    if (nativeFormMatch && request.method === "POST") return submitNativeForm(request, env, decodeURIComponent(nativeFormMatch[1]));
	    if (request.method === "GET" && url.pathname === "/api/native-registrations/query") return queryNativeRegistration(request, env);
	    if (request.method === "GET" && url.pathname === "/api/native-registrations/me") return queryNativeRegistrationsByLine(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-registrations/cancel") return cancelNativeRegistration(request, env);
	    if (request.method === "GET" && url.pathname === "/api/native-checkin/verify") return verifyNativeCheckin(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-checkin/confirm") return confirmNativeCheckin(request, env);
	    if (request.method === "POST" && url.pathname === "/api/redeem/create") return createRedeemRequest(request, env);
	    if (request.method === "GET" && url.pathname === "/api/redeem/list") return listRedeemRequests(request, env);
	    const redeemMatch = url.pathname.match(/^\/api\/redeem\/([^/]+)$/);
	    if (redeemMatch && request.method === "GET") return getRedeemRequest(request, env, decodeURIComponent(redeemMatch[1]));
	    if (redeemMatch && request.method === "POST") return confirmRedeemRequest(request, env, decodeURIComponent(redeemMatch[1]));
	    if (request.method === "POST" && url.pathname === "/api/points/sync-legacy") return syncLegacyPointApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/points/ledger") return listPointLedgerApi(request, env);
	    const pointMatch = url.pathname.match(/^\/api\/points\/([^/]+)$/);
	    if (pointMatch && request.method === "GET") return getPointAccountApi(request, env, decodeURIComponent(pointMatch[1]));
	    if (request.method === "GET" && url.pathname === "/api/push/segments") return getPushSegments(request, env);
	    if (request.method === "POST" && url.pathname === "/api/push/resolve") return resolvePushTargetsApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/push/send") return sendPushApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/calendar/events") return fetchCalendarEvents(request);
	    if (request.method === "GET" && url.pathname === "/api/opnform/workspaces") return listOpnFormWorkspaces(request, env);
    if (request.method === "POST" && url.pathname === "/api/opnform/create") return createOpnForm(request, env);
    if (request.method === "POST" && url.pathname === "/api/opnform/webhook") return handleOpnFormWebhook(request, env);
    if (request.method === "POST" && url.pathname === "/api/opnform/sync") return syncOpnFormResponses(request, env);
    if (request.method === "POST" && url.pathname === "/api/google-forms/submission") return handleFormSubmission(request, env);
    if (request.method === "POST" && url.pathname === "/api/google-forms/sync") return syncGoogleFormResponses(request, env);
    if (request.method === "GET" && url.pathname === "/api/registrations/summary") return json({ success: true, data: await readRegistrationSummary(env) });
    if (request.method === "GET" && url.pathname === "/api/registrations/list") return listRegistrations(request, env);
    const detailMatch = url.pathname.match(/^\/monthly-detail\/([^/]+)$/);
    if (request.method === "GET" && detailMatch) return monthlyDetail(env, decodeURIComponent(detailMatch[1]));
    if (request.method === "POST" && url.pathname === "/line-webhook") { const rawBody = await request.text(); const monthly = await handleMonthlyWebhook(request, env, rawBody); if (monthly) return monthly; return baseEntry.fetch(rebuildRequest(request, rawBody), env, ctx); }
    return baseEntry.fetch(request, env, ctx);
  }
};
