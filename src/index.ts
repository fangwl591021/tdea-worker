type Env = {
  DB?: D1Database;
  ADMIN_EMAILS: string;
  ASSETS: Fetcher;
  ASSETS_BUCKET?: R2Bucket;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  FORWARD_WEBHOOK_URL?: string;
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
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

type KeywordRule = {
  keyword: string;
  aliases: string[];
  altText: string;
  messages: Array<Record<string, unknown>>;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const publicBaseUrl = "https://tdeawork.fangwl591021.workers.dev";
const pagesBaseUrl = "https://fangwl591021.github.io/tdea-worker/";

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

  if (!email || !adminEmails.includes(email)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }

  return null;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
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
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function verifyLineSignature(rawBody: string, signature: string | null, channelSecret?: string) {
  const cleanSignature = signature?.trim();
  const cleanSecret = channelSecret?.trim();
  if (!cleanSignature || !cleanSecret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(cleanSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return constantTimeEqual(expected, cleanSignature);
}

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function flexMessage(altText: string, contents: Record<string, unknown>) {
  return {
    type: "flex",
    altText,
    contents
  };
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
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: { type: "uri", label: "查看活動", uri: pagesBaseUrl }
        },
        {
          type: "button",
          style: "secondary",
          action: { type: "message", label: "活動關鍵字", text: "TDEA活動" }
        },
        {
          type: "button",
          style: "secondary",
          action: { type: "message", label: "使用說明", text: "TDEA說明" }
        }
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
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: { type: "uri", label: "開啟活動頁", uri: pagesBaseUrl }
        }
      ]
    }
  });
}

function tdeaHelpText() {
  return {
    type: "text",
    text: "TDEA 關鍵字：\nTDEA會員專區\nTDEA活動\nTDEA說明\n\n沒有 TDEA 前綴的訊息會交給原本系統處理。"
  };
}

function builtInKeywordRules(): KeywordRule[] {
  return [
    {
      keyword: "TDEA會員專區",
      aliases: ["TDEA會員", "TDEA會員中心", "TDEA專區"],
      altText: "TDEA 會員專區",
      messages: [tdeaMainFlex()]
    },
    {
      keyword: "TDEA活動",
      aliases: ["TDEA活動查詢", "TDEA報名", "TDEA課程"],
      altText: "TDEA 活動資訊",
      messages: [tdeaActivityFlex()]
    },
    {
      keyword: "TDEA說明",
      aliases: ["TDEAHELP", "TDEA幫助"],
      altText: "TDEA 關鍵字說明",
      messages: [tdeaHelpText()]
    }
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
  return builtInKeywordRules().find((rule) => {
    const candidates = [rule.keyword, ...rule.aliases].map(normalizeKeyword);
    return candidates.includes(normalized);
  });
}

async function replyToLine(replyToken: string, messages: Array<Record<string, unknown>>, env: Env) {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) {
    return { ok: false, status: 503, message: "LINE token is not configured" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ replyToken, messages })
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text().catch(() => "")
  };
}

async function forwardToWebhook(rawBody: string, signature: string | null, env: Env) {
  if (!env.FORWARD_WEBHOOK_URL) {
    return { skipped: true, message: "FORWARD_WEBHOOK_URL is not configured" };
  }

  const response = await fetch(env.FORWARD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature ? { "x-line-signature": signature } : {})
    },
    body: rawBody
  });

  return { ok: response.ok, status: response.status };
}

async function handleLineWebhook(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  const isValid = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
  if (!isValid) {
    return new Response("Invalid Signature", { status: 403, headers: corsHeaders });
  }

  let linePayload: unknown;
  try {
    linePayload = JSON.parse(rawBody);
  } catch (_) {
    return json({ success: false, message: "Invalid JSON" }, 400);
  }

  const events = extractLineEvents(linePayload);
  const matches = events
    .map((event) => ({ event, rule: findKeywordRule(extractTriggerText(event)) }))
    .filter((match): match is { event: LineEvent; rule: KeywordRule } => Boolean(match.rule));

  if (matches.length > 0) {
    const lineReplies = await Promise.all(matches.map((match) => {
      if (!match.event.replyToken) {
        return Promise.resolve({ ok: false, status: 400, message: "Missing replyToken", keyword: match.rule.keyword });
      }
      return replyToLine(match.event.replyToken, match.rule.messages, env)
        .then((result) => ({ ...result, keyword: match.rule.keyword }));
    }));

    return json({
      success: true,
      mode: "worker-keyword",
      matched: matches.map((match) => match.rule.keyword),
      forwarded: false,
      lineReplies
    });
  }

  ctx.waitUntil(
    forwardToWebhook(rawBody, signature, env).catch((error) => ({ ok: false, message: String(error) }))
  );

  return json({
    success: true,
    mode: "worker-only",
    matched: [],
    forwarded: Boolean(env.FORWARD_WEBHOOK_URL)
  });
}

async function hubTest(env: Env) {
  const checks: Record<string, unknown> = {
    mode: "worker-only-with-tdea-keywords",
    keywords: builtInKeywordRules().map((rule) => [rule.keyword, ...rule.aliases]),
    env: {
      LINE_CHANNEL_SECRET: Boolean(env.LINE_CHANNEL_SECRET?.trim()),
      LINE_CHANNEL_ACCESS_TOKEN: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
      FORWARD_WEBHOOK_URL: Boolean(env.FORWARD_WEBHOOK_URL),
      ASSETS_BUCKET: Boolean(env.ASSETS_BUCKET)
    }
  };

  if (env.FORWARD_WEBHOOK_URL) {
    try {
      const response = await fetch(env.FORWARD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: [], source: "hub-test" })
      });
      checks.forwardWebhook = { ok: response.ok, status: response.status };
    } catch (error) {
      checks.forwardWebhook = { ok: false, message: String(error) };
    }
  }

  if (env.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
    try {
      const response = await fetch("https://api.line.me/v2/bot/info", {
        headers: { "authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN.trim()}` }
      });
      const body = await response.json().catch(() => ({}));
      checks.lineBot = { ok: response.ok, status: response.status, body };
    } catch (error) {
      checks.lineBot = { ok: false, message: String(error) };
    }
  }

  return json({ success: true, checks });
}

function extensionFromType(type: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf"
  };
  return map[type] ?? "bin";
}

async function uploadFile(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.ASSETS_BUCKET) {
    return json({ success: false, message: "R2 bucket is not configured" }, 503);
  }

  const form = await request.formData();
  const file = form.get("file");
  const purpose = String(form.get("purpose") || "activity").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "activity";
  const activityId = String(form.get("activityId") || "draft").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "draft";

  if (!(file instanceof File)) {
    return json({ success: false, message: "File is required" }, 400);
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return json({ success: false, message: "Unsupported file type" }, 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    return json({ success: false, message: "File is larger than 10MB" }, 400);
  }

  const key = `${purpose}/${activityId}/${crypto.randomUUID()}.${extensionFromType(file.type)}`;
  await env.ASSETS_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000"
    },
    customMetadata: {
      originalName: file.name
    }
  });

  return json({
    success: true,
    key,
    url: `/api/uploads/${encodeURIComponent(key)}`,
    contentType: file.type,
    size: file.size
  }, 201);
}

async function getUploadedFile(env: Env, key: string) {
  if (!env.ASSETS_BUCKET) {
    return notFound();
  }

  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) {
    return notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000");
  return new Response(object.body, { headers });
}

async function listActivities(env: Env, activeOnly = false) {
  if (!env.DB) {
    return json({ success: true, data: [] });
  }

  const query = activeOnly
    ? "SELECT * FROM activities WHERE status = 'published' ORDER BY created_at DESC"
    : "SELECT * FROM activities ORDER BY created_at DESC";

  const { results } = await env.DB.prepare(query).all();
  return json({ success: true, data: results ?? [] });
}

async function createActivity(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.DB) {
    return json({ success: false, message: "Database is not configured" }, 503);
  }

  const input = (await request.json()) as ActivityInput;
  const name = input.name?.trim();
  const type = input.type?.trim() || "lecture";

  if (!name) {
    return json({ success: false, message: "Activity name is required" }, 400);
  }

  const id = getId();
  await env.DB.prepare(
    `INSERT INTO activities
      (id, name, type, course_time, deadline, capacity, status, form_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      name,
      type,
      input.courseTime ?? "",
      input.deadline ?? "",
      Number(input.capacity ?? 0),
      input.status ?? "draft",
      input.formUrl ?? ""
    )
    .run();

  return json({ success: true, id }, 201);
}

async function listAssociationMembers(env: Env) {
  if (!env.DB) {
    return json({ success: true, data: [] });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM association_members ORDER BY created_at DESC"
  ).all();
  return json({ success: true, data: results ?? [] });
}

async function listVendorMembers(env: Env) {
  if (!env.DB) {
    return json({ success: true, data: [] });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM vendor_members ORDER BY created_at DESC"
  ).all();
  return json({ success: true, data: results ?? [] });
}

async function updateAssociationMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.DB) {
    return json({ success: false, message: "Database is not configured" }, 503);
  }

  const input = await request.json() as Record<string, string>;
  await env.DB.prepare(
    `UPDATE association_members
     SET identity = ?, name = ?, gender = ?, qualification = ?, note = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      input.identity ?? "",
      input.name ?? "",
      input.gender ?? "",
      input.qualification ?? "Y",
      input.note ?? "",
      id
    )
    .run();

  return json({ success: true });
}

async function updateVendorMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.DB) {
    return json({ success: false, message: "Database is not configured" }, 503);
  }

  const input = await request.json() as Record<string, string>;
  await env.DB.prepare(
    `UPDATE vendor_members
     SET company_name = ?, tax_id = ?, owner = ?, contact = ?, qualification = ?, note = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      input.companyName ?? "",
      input.taxId ?? "",
      input.owner ?? "",
      input.contact ?? "",
      input.qualification ?? "Y",
      input.note ?? "",
      id
    )
    .run();

  return json({ success: true });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (pathname === "/line-webhook") {
      return handleLineWebhook(request, env, ctx);
    }

    if (request.method === "GET" && pathname === "/hub-test") {
      return hubTest(env);
    }

    if (request.method === "GET" && pathname === "/line-keywords") {
      return json({ success: true, keywords: builtInKeywordRules().map((rule) => ({ keyword: rule.keyword, aliases: rule.aliases, altText: rule.altText })) });
    }

    if (request.method === "POST" && pathname === "/api/uploads") {
      return uploadFile(request, env);
    }

    const uploadMatch = pathname.match(/^\/api\/uploads\/(.+)$/);
    if (request.method === "GET" && uploadMatch) {
      return getUploadedFile(env, decodeURIComponent(uploadMatch[1]));
    }

    if (request.method === "GET" && pathname === "/api/activities") {
      return listActivities(env);
    }

    if (request.method === "GET" && pathname === "/api/activities/active") {
      return listActivities(env, true);
    }

    if (request.method === "POST" && pathname === "/api/activities") {
      return createActivity(request, env);
    }

    if (request.method === "GET" && pathname === "/api/members/association") {
      return listAssociationMembers(env);
    }

    if (request.method === "GET" && pathname === "/api/members/vendor") {
      return listVendorMembers(env);
    }

    const assocMatch = pathname.match(/^\/api\/members\/association\/([^/]+)$/);
    if (request.method === "PUT" && assocMatch) {
      return updateAssociationMember(request, env, assocMatch[1]);
    }

    const vendorMatch = pathname.match(/^\/api\/members\/vendor\/([^/]+)$/);
    if (request.method === "PUT" && vendorMatch) {
      return updateVendorMember(request, env, vendorMatch[1]);
    }

    if (pathname.startsWith("/api/")) {
      return notFound();
    }

    return env.ASSETS.fetch(request);
  }
};
