import baseEntry from "./roster-sync-entry4";

type Env = { ADMIN_EMAILS?: string; ASSETS_BUCKET?: R2Bucket; LINE_CHANNEL_SECRET?: string; LINE_CHANNEL_ACCESS_TOKEN?: string; GOOGLE_FORMS_SCRIPT_URL?: string; GOOGLE_FORMS_SHARED_SECRET?: string; OPNFORM_API_BASE?: string; OPNFORM_PUBLIC_BASE?: string; OPNFORM_API_TOKEN?: string; OPNFORM_WORKSPACE_ID?: string; OPNFORM_WEBHOOK_SECRET?: string };
type LineEvent = { type?: string; replyToken?: string; message?: { type?: string; text?: string }; postback?: { data?: string } };
type MonthlyPage = { id?: string; activityNo?: string; imageUrl?: string; detailTitle?: string; detailText?: string; detailUrl?: string; formUrl?: string; shareUrl?: string; order?: number };
type MonthlyConfig = { enabled?: boolean; keyword?: string; month?: string; altText?: string; detailBaseUrl?: string; pages?: MonthlyPage[]; updatedAt?: string };
type RegistrationRecord = { activityId?: string; activityNo?: string; activityName?: string; formId?: string; count: number; lastSubmittedAt?: string };
type RegistrationSummary = { updatedAt?: string; activities: Record<string, RegistrationRecord> };
type RegistrationEntry = { id: string; sourceId?: string; formId?: string; submittedAt?: string; activity?: Record<string, unknown>; answers?: Record<string, unknown> };
type ManagedSubmission = { formId?: string; sourceId?: string; submittedAt?: string; activity: Record<string, unknown>; answers: Record<string, unknown>; raw?: unknown };

const monthlyKey = "flex/monthly-activity.json";
const registrationSummaryKey = "registrations/summary.json";
const workerBaseUrl = "https://tdeawork.fangwl591021.workers.dev";
const fixedKeyword = "TDEA每月活動";
const defaultLiffBase = "https://liff.line.me/2005868456-2jmxqyFU?monthlyDetail={id}";
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

async function appendRegistrationList(env: Env, keys: string[], entry: RegistrationEntry) {
  if (!env.ASSETS_BUCKET) return;
  let maxCount = 0;
  for (const key of keys) {
    const list = await readRegistrationList(env, key);
    const sourceId = entry.sourceId || entry.id;
    const exists = list.some((item) => (item.sourceId || item.id) === sourceId);
    const nextList = exists ? list : [entry, ...list];
    maxCount = Math.max(maxCount, nextList.length);
    await env.ASSETS_BUCKET.put(registrationListKey(key), JSON.stringify(nextList.slice(0, 1000), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
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
    const list = await readRegistrationList(env, key);
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
    answers: submission.answers || {}
  };
  const count = await appendRegistrationList(env, keys, entry);
  record.count = Math.max(Number(existing?.count || 0), Number(count || 0));

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
    answers,
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
  if (key === "paragraph" || key === "textarea" || key === "long_text") return "long_text";
  if (key === "email") return "email";
  if (key === "phone" || key === "tel") return "phone_number";
  if (key === "number") return "number";
  if (key === "date") return "date";
  if (key === "file" || key === "files") return "files";
  if (key === "checkbox" || key === "checkboxes" || key === "multi_select") return "multi_select";
  if (key === "radio" || key === "choice" || key === "dropdown" || key === "select") return "select";
  return "short_text";
}

function normalizeOptions(options: unknown) {
  return (Array.isArray(options) ? options : clean(options).split(/\n|,/))
    .map((item) => clean(item))
    .filter(Boolean)
    .map((name) => ({ name }));
}

function opnFormProperties(fields: unknown) {
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
    if (type === "select" || type === "multi_select") property.options = normalizeOptions(field.options);
    return property;
  });
  return [
    ...normal,
    { id: "tdea_activity_id", type: "short_text", name: "TDEA Activity ID", hidden: true, required: false, width: "full" },
    { id: "tdea_activity_no", type: "short_text", name: "TDEA Activity No", hidden: true, required: false, width: "full" },
    { id: "tdea_activity_name", type: "short_text", name: "TDEA Activity Name", hidden: true, required: false, width: "full" }
  ];
}

function opnFormUrl(env: Env, form: Record<string, unknown>) {
  const direct = clean(form.share_url || form.public_url || form.url || form.shareUrl || form.publicUrl);
  if (/^https?:\/\//i.test(direct)) return direct;
  const slug = clean(form.slug);
  const formId = clean(form.id || form.uuid);
  return slug || formId ? `${opnFormPublicBase(env)}/${encodeURIComponent(slug || formId)}` : "";
}

async function createOpnForm(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN) || !clean(env.OPNFORM_WORKSPACE_ID)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN / OPNFORM_WORKSPACE_ID is not configured" }, 503);

  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activity = asRecord(input.activity);
  const settings = asRecord(input.settings);
  const payload = {
    workspace_id: Number(clean(env.OPNFORM_WORKSPACE_ID)),
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
    no_branding: false,
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
    database_fields_update: [],
    max_submissions_count: Number(activity.capacity || 0) > 0 ? Number(activity.capacity) : undefined,
    properties: opnFormProperties(settings.fields)
  };
  const create = await opnFormJson(env, "/open/forms", { method: "POST", body: JSON.stringify(payload) });
  if (!create.response.ok) {
    let workspaces: unknown = undefined;
    if (create.response.status === 401 || create.response.status === 403) {
      const list = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
      workspaces = list.response.ok ? list.data : list.data;
    }
    return json({ success: false, code: "opnform_create_failed", message: clean(create.data.message) || "OpnForm create failed", workspaceId: Number(clean(env.OPNFORM_WORKSPACE_ID)), workspaces, data: create.data }, create.response.status);
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
  const data = asRecord(payload.data || asRecord(payload.submission).data || payload.answers || payload.fields);
  const form = asRecord(payload.form);
  const formId = clean(payload.form_id || payload.formId || form.id || fallbackActivity.formId || fallbackActivity.opnformFormId);
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
    sourceId: clean(payload.submission_id || payload.submissionId || payload.id || data.id),
    submittedAt: clean(payload.submitted_at || payload.created_at || data.created_at) || new Date().toISOString(),
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
  return page.detailUrl || generated || `${workerBaseUrl}/monthly-detail/${encodeURIComponent(String(page.id || ""))}`;
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

async function handleMonthlyWebhook(request: Request, env: Env, rawBody: string) {
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch (_) { return null; }
  const events = extractLineEvents(payload).filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(fixedKeyword));
  if (!events.length) return null;
  const signature = request.headers.get("x-line-signature");
  if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) return new Response("Invalid Signature", { status: 403, headers });
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
