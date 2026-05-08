import app from "./index";

type Env = {
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  WETW_POINT_API_KEY?: string;
  WETW_SHOP_ID?: string;
  WETW_POINT_TYPE?: string;
};

type LineEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const pointApiBase = "https://aiwe.cc/index.php/wp-json/wetw-point/v1";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders }
  });
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

function parseUidPointKeyword(text: string) {
  const match = text.trim().match(/^TDEA\s*點數(?:\s*[+＋]\s*|\s+)(U[0-9a-f]{32})$/i);
  return match?.[1] || "";
}

async function replyToLine(replyToken: string, text: string, env: Env) {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return { ok: false, status: 503, message: "LINE token is not configured" };
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] })
  });
  return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") };
}

async function queryPointsByUid(lineUserId: string, env: Env) {
  const apiKey = env.WETW_POINT_API_KEY?.trim();
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  const response = await fetch(`${pointApiBase}/query-user-point-list`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      LINE_user_id: lineUserId,
      shop_id: Number(env.WETW_SHOP_ID || 35),
      point_type: env.WETW_POINT_TYPE || "system_point",
      page: 1,
      per_page: 5
    })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
  return { httpStatus: response.status, ...(body as Record<string, unknown>) };
}

function formatPointReply(result: Record<string, unknown>, uid: string) {
  if (result.success !== true) return `${uid} 點數查詢失敗：${String(result.message || result.code || "未知錯誤")}`;
  const data = result.data as { list?: Array<Record<string, unknown>> } | undefined;
  const list = Array.isArray(data?.list) ? data.list : [];
  if (!list.length) return `${uid} 目前查不到點數紀錄。`;
  const balance = list[0].point_balance ?? "未提供";
  const rows = list.slice(0, 3).map((item) => `${item.created_at || ""} ${item.event_name || "點數異動"} ${item.get_point || 0} 點`).join("\n");
  return `${uid} 目前點數餘額：${balance}\n\n最近紀錄：\n${rows}`;
}

function rebuildRequest(request: Request, rawBody: string) {
  return new Request(request.url, { method: request.method, headers: request.headers, body: rawBody });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/line-webhook") return app.fetch(request, env, ctx);

    const rawBody = await request.text();
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch (_) {
      return app.fetch(rebuildRequest(request, rawBody), env, ctx);
    }

    const uidEvents = extractLineEvents(payload)
      .map((event) => ({ event, uid: parseUidPointKeyword(extractTriggerText(event)) }))
      .filter((match): match is { event: LineEvent; uid: string } => Boolean(match.uid));

    if (!uidEvents.length) return app.fetch(rebuildRequest(request, rawBody), env, ctx);

    const signature = request.headers.get("x-line-signature");
    if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) {
      return new Response("Invalid Signature", { status: 403, headers: corsHeaders });
    }

    const lineReplies = await Promise.all(uidEvents.map(async ({ event, uid }) => {
      if (!event.replyToken) return { ok: false, status: 400, message: "Missing replyToken", uid };
      const result = await queryPointsByUid(uid, env) as Record<string, unknown>;
      return replyToLine(event.replyToken, formatPointReply(result, uid), env).then((reply) => ({ ...reply, uid }));
    }));

    return json({ success: true, mode: "worker-point-uid-keyword", matched: ["TDEA點數+UID"], forwarded: false, lineReplies });
  }
};
