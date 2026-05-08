type Env = {
  DB?: D1Database;
  ADMIN_EMAILS: string;
  ASSETS: Fetcher;
  ASSETS_BUCKET?: R2Bucket;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  FORWARD_WEBHOOK_URL?: string;
  WETW_POINT_API_KEY?: string;
  WETW_SHOP_ID?: string;
  WETW_POINT_TYPE?: string;
};

type ActivityInput = {
  name?: string;
  type?: string;
  courseTime?: string;
  deadline?: string;
  capacity?: number;
  status?: string;
  formUrl?: string;
};

type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

type KeywordRule = {
  keyword: string;
  aliases: string[];
  altText: string;
  messages: Array<Record<string, unknown>>;
};

type PointQueryInput = {
  LINE_user_id?: string;
  member_no?: string;
  shop_id?: number;
  point_type?: string;
  date_start?: string;
  date_end?: string;
  page?: number;
  per_page?: number;
};

type PointInsertInput = {
  LINE_user_id?: string;
  shop_id?: number;
  event_name?: string;
  event_content?: string;
  point_type?: string;
  get_point?: number;
  shop_user_lineid?: string;
  child_shop_name?: string;
  child_shop_renew?: number;
  shop_remark?: string;
};

type RosterMember = {
  memberNo: string;
  role: string;
  name: string;
  gender: string;
  qualification: string;
  note: string;
  lineUserId?: string;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const workerBaseUrl = "https://tdeawork.fangwl591021.workers.dev";
const pagesBaseUrl = "https://fangwl591021.github.io/tdea-worker/";
const pointApiBase = "https://aiwe.cc/index.php/wp-json/wetw-point/v1";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders
    }
  });

const notFound = () => json({ success: false, message: "Not found" }, 404);
const getId = () => crypto.randomUUID();

async function requireAdmin(request: Request, env: Env) {
  const adminEmails = env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLowerCase());
  const email = request.headers.get("x-admin-email")?.trim().toLowerCase();
  if (!email || !adminEmails.includes(email)) return json({ success: false, message: "Unauthorized" }, 401);
  return null;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function constantTimeEqual(a: string, b: string) {
  let left: Uint8Array;
  let right: Uint8Array;
  try {
    left = base64ToBytes(a);
    right = base64ToBytes(b);
  } catch (_) {
    return false;
  }
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function verifyLineSignature(rawBody: string, signature: string | null, channelSecret?: string) {
  const cleanSignature = signature?.trim();
  const cleanSecret = channelSecret?.trim();
  if (!cleanSignature || !cleanSecret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(cleanSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return constantTimeEqual(expected, cleanSignature);
}

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function flexMessage(altText: string, contents: Record<string, unknown>) {
  return { type: "flex", altText, contents };
}

function tdeaMainFlex() {
  return flexMessage("TDEA 會員專區", {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      backgroundColor: "#06C755",
      contents: [
        { type: "text", text: "TDEA 會員專區", weight: "bold", size: "xl", color: "#FFFFFF" },
        { type: "text", text: "活動、會員與點數功能入口", size: "sm", color: "#E9FFF1", margin: "sm" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "請選擇要前往的服務。", wrap: true, color: "#344054", size: "sm" },
        { type: "button", style: "primary", color: "#06C755", action: { type: "uri", label: "查看活動", uri: pagesBaseUrl } },
        { type: "button", style: "secondary", action: { type: "message", label: "查詢點數", text: "TDEA點數" } },
        { type: "button", style: "secondary", action: { type: "message", label: "使用說明", text: "TDEA說明" } }
      ]
    }
  });
}

function tdeaActivityFlex() {
  return flexMessage("TDEA 活動資訊", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        { type: "text", text: "TDEA 活動資訊", weight: "bold", size: "xl", color: "#111827" },
        { type: "text", text: "活動查詢與報名頁會逐步搬到新版 Worker 系統。", wrap: true, color: "#667085", size: "sm" },
        { type: "button", style: "primary", color: "#06C755", action: { type: "uri", label: "開啟活動頁", uri: pagesBaseUrl } }
      ]
    }
  });
}

function tdeaHelpText() {
  return {
    type: "text",
    text: "TDEA 關鍵字：\nTDEA會員專區\nTDEA活動\nTDEA點數\nTDEA點數+會員編號\nTDEA說明\n\n沒有 TDEA 前綴的訊息會交給原本系統處理。"
  };
}

function builtInKeywordRules(): KeywordRule[] {
  return [
    { keyword: "TDEA會員專區", aliases: ["TDEA會員", "TDEA會員中心", "TDEA專區"], altText: "TDEA 會員專區", messages: [tdeaMainFlex()] },
    { keyword: "TDEA活動", aliases: ["TDEA活動查詢", "TDEA報名", "TDEA課程"], altText: "TDEA 活動資訊", messages: [tdeaActivityFlex()] },
    { keyword: "TDEA說明", aliases: ["TDEAHELP", "TDEA幫助"], altText: "TDEA 關鍵字說明", messages: [tdeaHelpText()] }
  ];
}

function extractLineEvents(payload: unknown): LineEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const events = (payload as { events?: unknown }).events;
  return Array.isArray(events) ? events as LineEvent[] : [];
}

function extractTriggerText(event: LineEvent) {
  if (event.message?.type === "text" && event.message.text) return event.message.text;
  if (event.postback?.data) return event.postback.data;
  return "";
}

function findKeywordRule(text: string) {
  const normalized = normalizeKeyword(text);
  return builtInKeywordRules().find((rule) => [rule.keyword, ...rule.aliases].map(normalizeKeyword).includes(normalized));
}

function parsePointQueryKeyword(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^TDEA\s*點數(?:\s*[+＋]\s*|\s+)?([A-Z]\d{7}|[A-Z]{1,2}\d{5,8})?$/i);
  if (!match) return null;
  return { memberNo: match[1]?.toUpperCase() || "" };
}

async function replyToLine(replyToken: string, messages: Array<Record<string, unknown>>, env: Env) {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return { ok: false, status: 503, message: "LINE token is not configured" };
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "authorization": `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ replyToken, messages })
  });
  return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") };
}

async function wetwRequest(path: string, payload: Record<string, unknown>, env: Env) {
  const apiKey = env.WETW_POINT_API_KEY?.trim();
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  const response = await fetch(`${pointApiBase}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, ...payload })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
  return { httpStatus: response.status, ...(body as Record<string, unknown>) };
}

async function queryMemberPoints(input: PointQueryInput, env: Env) {
  const payload: Record<string, unknown> = {
    page: Number(input.page || 1),
    per_page: Math.min(Number(input.per_page || 20), 100)
  };
  if (input.LINE_user_id) payload.LINE_user_id = input.LINE_user_id;
  else if (input.member_no) payload.LINE_user_id = input.member_no;
  if (input.shop_id || env.WETW_SHOP_ID) payload.shop_id = Number(input.shop_id || env.WETW_SHOP_ID);
  if (input.point_type) payload.point_type = input.point_type;
  if (input.date_start) payload.date_start = input.date_start;
  if (input.date_end) payload.date_end = input.date_end;
  return wetwRequest("query-user-point-list", payload, env);
}

async function insertMemberPoint(input: PointInsertInput, env: Env) {
  const payload = {
    LINE_user_id: input.LINE_user_id,
    shop_id: Number(input.shop_id || env.WETW_SHOP_ID || 35),
    event_name: input.event_name,
    event_content: input.event_content || input.event_name || "TDEA 點數異動",
    point_type: input.point_type || env.WETW_POINT_TYPE || "system_point",
    get_point: Number(input.get_point || 0),
    shop_user_lineid: input.shop_user_lineid || "",
    child_shop_name: input.child_shop_name || "",
    child_shop_renew: Number(input.child_shop_renew || 0),
    shop_remark: input.shop_remark || "TDEA Worker"
  };
  if (!payload.LINE_user_id || !payload.event_name || !payload.get_point) {
    return { success: false, code: "missing_required_fields", message: "LINE_user_id, event_name and get_point are required" };
  }
  return wetwRequest("insert-user-point", payload, env);
}

async function getRosterMember(memberNo: string): Promise<RosterMember | null> {
  try {
    const response = await fetch(`${workerBaseUrl}/roster.json`, { headers: { "cache-control": "no-cache" } });
    const roster = await response.json() as { a?: unknown[][] };
    const row = roster.a?.find((item) => String(item[0] || "").toUpperCase() === memberNo.toUpperCase());
    if (!row) return null;
    return {
      memberNo: String(row[0] || ""),
      role: String(row[1] || ""),
      name: String(row[2] || ""),
      gender: String(row[3] || ""),
      qualification: String(row[4] || ""),
      note: String(row[5] || ""),
      lineUserId: String(row[6] || "") || undefined
    };
  } catch (_) {
    return null;
  }
}

function formatPointReply(result: Record<string, unknown>, label = "你的") {
  if (result.success !== true) {
    return `${label}點數查詢失敗：${String(result.message || result.code || "未知錯誤")}`;
  }
  const data = result.data as { list?: Array<Record<string, unknown>>; pagination?: { total?: number } } | undefined;
  const list = Array.isArray(data?.list) ? data.list : [];
  if (!list.length) return `${label}目前查不到點數紀錄。`;
  const balance = list[0].point_balance ?? "未提供";
  const rows = list.slice(0, 3).map((item) => `${item.created_at || ""} ${item.event_name || "點數異動"} ${item.get_point || 0} 點`).join("\n");
  return `${label}目前點數餘額：${balance}\n\n最近紀錄：\n${rows}`;
}

async function handlePointKeyword(event: LineEvent, memberNo: string, env: Env) {
  if (!event.replyToken) return { ok: false, status: 400, message: "Missing replyToken" };
  if (memberNo) {
    const member = await getRosterMember(memberNo);
    const queryId = member?.lineUserId || memberNo;
    const result = await queryMemberPoints({ member_no: queryId, page: 1, per_page: 5 }, env) as Record<string, unknown>;
    const label = member ? `${member.name}（${member.memberNo}）` : `${memberNo} `;
    let text = formatPointReply(result, label);
    if (member && !member.lineUserId && result.success !== true) {
      text += "\n\n名冊有此會員，但目前名冊沒有 LINE userId 欄位；此查詢暫以會員編號送出。若舊系統不是用會員編號當登入 ID，就會查不到。";
    }
    return replyToLine(event.replyToken, [{ type: "text", text }], env);
  }

  const lineUserId = event.source?.userId;
  if (!lineUserId) {
    return replyToLine(event.replyToken, [{ type: "text", text: "無法取得 LINE userId，請從一對一聊天再試一次。" }], env);
  }
  const result = await queryMemberPoints({ LINE_user_id: lineUserId, page: 1, per_page: 5 }, env) as Record<string, unknown>;
  return replyToLine(event.replyToken, [{ type: "text", text: formatPointReply(result) }], env);
}

async function forwardToWebhook(rawBody: string, signature: string | null, env: Env) {
  if (!env.FORWARD_WEBHOOK_URL) return { skipped: true, message: "FORWARD_WEBHOOK_URL is not configured" };
  const response = await fetch(env.FORWARD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...(signature ? { "x-line-signature": signature } : {}) },
    body: rawBody
  });
  return { ok: response.ok, status: response.status };
}

async function handleLineWebhook(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) {
    return new Response("Invalid Signature", { status: 403, headers: corsHeaders });
  }

  let linePayload: unknown;
  try {
    linePayload = JSON.parse(rawBody);
  } catch (_) {
    return json({ success: false, message: "Invalid JSON" }, 400);
  }

  const events = extractLineEvents(linePayload);
  const pointEvents = events
    .map((event) => ({ event, query: parsePointQueryKeyword(extractTriggerText(event)) }))
    .filter((match): match is { event: LineEvent; query: { memberNo: string } } => Boolean(match.query));
  if (pointEvents.length > 0) {
    const lineReplies = await Promise.all(pointEvents.map((match) => handlePointKeyword(match.event, match.query.memberNo, env)));
    return json({ success: true, mode: "worker-point-keyword", matched: ["TDEA點數"], forwarded: false, lineReplies });
  }

  const matches = events
    .map((event) => ({ event, rule: findKeywordRule(extractTriggerText(event)) }))
    .filter((match): match is { event: LineEvent; rule: KeywordRule } => Boolean(match.rule));

  if (matches.length > 0) {
    const lineReplies = await Promise.all(matches.map((match) => {
      if (!match.event.replyToken) return Promise.resolve({ ok: false, status: 400, message: "Missing replyToken", keyword: match.rule.keyword });
      return replyToLine(match.event.replyToken, match.rule.messages, env).then((result) => ({ ...result, keyword: match.rule.keyword }));
    }));
    return json({ success: true, mode: "worker-keyword", matched: matches.map((match) => match.rule.keyword), forwarded: false, lineReplies });
  }

  ctx.waitUntil(forwardToWebhook(rawBody, signature, env).catch((error) => ({ ok: false, message: String(error) })));
  return json({ success: true, mode: "worker-only", matched: [], forwarded: Boolean(env.FORWARD_WEBHOOK_URL) });
}

async function hubTest(env: Env) {
  const checks: Record<string, unknown> = {
    mode: "worker-only-with-tdea-keywords-and-points",
    keywords: [...builtInKeywordRules().map((rule) => [rule.keyword, ...rule.aliases]), ["TDEA點數", "TDEA點數+會員編號", "TDEA查點", "TDEA點數查詢", "TDEA紅利"]],
    env: {
      LINE_CHANNEL_SECRET: Boolean(env.LINE_CHANNEL_SECRET?.trim()),
      LINE_CHANNEL_ACCESS_TOKEN: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
      FORWARD_WEBHOOK_URL: Boolean(env.FORWARD_WEBHOOK_URL),
      ASSETS_BUCKET: Boolean(env.ASSETS_BUCKET),
      WETW_POINT_API_KEY: Boolean(env.WETW_POINT_API_KEY?.trim()),
      WETW_SHOP_ID: Boolean(env.WETW_SHOP_ID)
    }
  };
  if (env.FORWARD_WEBHOOK_URL) {
    try {
      const response = await fetch(env.FORWARD_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: [], source: "hub-test" }) });
      checks.forwardWebhook = { ok: response.ok, status: response.status };
    } catch (error) {
      checks.forwardWebhook = { ok: false, message: String(error) };
    }
  }
  if (env.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
    try {
      const response = await fetch("https://api.line.me/v2/bot/info", { headers: { "authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN.trim()}` } });
      const body = await response.json().catch(() => ({}));
      checks.lineBot = { ok: response.ok, status: response.status, body };
    } catch (error) {
      checks.lineBot = { ok: false, message: String(error) };
    }
  }
  return json({ success: true, checks });
}

function extensionFromType(type: string) {
  const map: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };
  return map[type] ?? "bin";
}

async function uploadFile(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await request.formData();
  const file = form.get("file");
  const purpose = String(form.get("purpose") || "activity").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "activity";
  const activityId = String(form.get("activityId") || "draft").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "draft";
  if (!(file instanceof File)) return json({ success: false, message: "File is required" }, 400);
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowedTypes.includes(file.type)) return json({ success: false, message: "Unsupported file type" }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ success: false, message: "File is larger than 10MB" }, 400);
  const key = `${purpose}/${activityId}/${crypto.randomUUID()}.${extensionFromType(file.type)}`;
  await env.ASSETS_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000" }, customMetadata: { originalName: file.name } });
  return json({ success: true, key, url: `/api/uploads/${encodeURIComponent(key)}`, contentType: file.type, size: file.size }, 201);
}

async function getUploadedFile(env: Env, key: string) {
  if (!env.ASSETS_BUCKET) return notFound();
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000");
  return new Response(object.body, { headers });
}

async function listActivities(env: Env, activeOnly = false) {
  if (!env.DB) return json({ success: true, data: [] });
  const query = activeOnly ? "SELECT * FROM activities WHERE status = 'published' ORDER BY created_at DESC" : "SELECT * FROM activities ORDER BY created_at DESC";
  const { results } = await env.DB.prepare(query).all();
  return json({ success: true, data: results ?? [] });
}

async function createActivity(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.DB) return json({ success: false, message: "Database is not configured" }, 503);
  const input = (await request.json()) as ActivityInput;
  const name = input.name?.trim();
  const type = input.type?.trim() || "lecture";
  if (!name) return json({ success: false, message: "Activity name is required" }, 400);
  const id = getId();
  await env.DB.prepare(`INSERT INTO activities (id, name, type, course_time, deadline, capacity, status, form_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, name, type, input.courseTime ?? "", input.deadline ?? "", Number(input.capacity ?? 0), input.status ?? "draft", input.formUrl ?? "")
    .run();
  return json({ success: true, id }, 201);
}

async function listAssociationMembers(env: Env) {
  if (!env.DB) return json({ success: true, data: [] });
  const { results } = await env.DB.prepare("SELECT * FROM association_members ORDER BY created_at DESC").all();
  return json({ success: true, data: results ?? [] });
}

async function listVendorMembers(env: Env) {
  if (!env.DB) return json({ success: true, data: [] });
  const { results } = await env.DB.prepare("SELECT * FROM vendor_members ORDER BY created_at DESC").all();
  return json({ success: true, data: results ?? [] });
}

async function updateAssociationMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.DB) return json({ success: false, message: "Database is not configured" }, 503);
  const input = await request.json() as Record<string, string>;
  await env.DB.prepare(`UPDATE association_members SET identity = ?, name = ?, gender = ?, qualification = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.identity ?? "", input.name ?? "", input.gender ?? "", input.qualification ?? "Y", input.note ?? "", id)
    .run();
  return json({ success: true });
}

async function updateVendorMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.DB) return json({ success: false, message: "Database is not configured" }, 503);
  const input = await request.json() as Record<string, string>;
  await env.DB.prepare(`UPDATE vendor_members SET company_name = ?, tax_id = ?, owner = ?, contact = ?, qualification = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.companyName ?? "", input.taxId ?? "", input.owner ?? "", input.contact ?? "", input.qualification ?? "Y", input.note ?? "", id)
    .run();
  return json({ success: true });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (pathname === "/line-webhook") return handleLineWebhook(request, env, ctx);
    if (request.method === "GET" && pathname === "/hub-test") return hubTest(env);
    if (request.method === "GET" && pathname === "/line-keywords") return json({ success: true, keywords: [...builtInKeywordRules().map((rule) => ({ keyword: rule.keyword, aliases: rule.aliases, altText: rule.altText })), { keyword: "TDEA點數", aliases: ["TDEA點數+會員編號", "TDEA查點", "TDEA點數查詢", "TDEA紅利"], altText: "TDEA 點數查詢" }] });
    if (request.method === "POST" && pathname === "/api/points/query") {
      const guard = await requireAdmin(request, env);
      if (guard) return guard;
      return json(await queryMemberPoints(await request.json() as PointQueryInput, env));
    }
    if (request.method === "POST" && pathname === "/api/points/insert") {
      const guard = await requireAdmin(request, env);
      if (guard) return guard;
      return json(await insertMemberPoint(await request.json() as PointInsertInput, env));
    }
    if (request.method === "POST" && pathname === "/api/uploads") return uploadFile(request, env);
    const uploadMatch = pathname.match(/^\/api\/uploads\/(.+)$/);
    if (request.method === "GET" && uploadMatch) return getUploadedFile(env, decodeURIComponent(uploadMatch[1]));
    if (request.method === "GET" && pathname === "/api/activities") return listActivities(env);
    if (request.method === "GET" && pathname === "/api/activities/active") return listActivities(env, true);
    if (request.method === "POST" && pathname === "/api/activities") return createActivity(request, env);
    if (request.method === "GET" && pathname === "/api/members/association") return listAssociationMembers(env);
    if (request.method === "GET" && pathname === "/api/members/vendor") return listVendorMembers(env);
    const assocMatch = pathname.match(/^\/api\/members\/association\/([^/]+)$/);
    if (request.method === "PUT" && assocMatch) return updateAssociationMember(request, env, assocMatch[1]);
    const vendorMatch = pathname.match(/^\/api\/members\/vendor\/([^/]+)$/);
    if (request.method === "PUT" && vendorMatch) return updateVendorMember(request, env, vendorMatch[1]);
    if (pathname.startsWith("/api/")) return notFound();
    return env.ASSETS.fetch(request);
  }
};
