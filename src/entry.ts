import app from "./index";

type Env = {
  ADMIN_EMAILS?: string;
  ASSETS_BUCKET?: R2Bucket;
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

type AiweMember = {
  lineUserId?: string;
  email?: string;
  memberNo?: string;
  name?: string;
  companyName?: string;
  role?: string;
  registeredAt?: string;
  expiresAt?: string;
  sourceUrl?: string;
  importedAt?: string;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const pointApiBase = "https://aiwe.cc/index.php/wp-json/wetw-point/v1";
const aiweMembersKey = "aiwe/members.json";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders }
  });
}

function requireAdmin(request: Request, env: Env) {
  const allowed = (env.ADMIN_EMAILS || "admin@example.com").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const email = request.headers.get("x-admin-email")?.trim().toLowerCase();
  if (!email || !allowed.includes(email)) return json({ success: false, message: "Unauthorized" }, 401);
  return null;
}

function normalizeMember(input: AiweMember): AiweMember {
  const lineUserId = String(input.lineUserId || "").trim();
  const email = String(input.email || "").trim();
  const memberNo = String(input.memberNo || "").trim().toUpperCase();
  return {
    lineUserId,
    email,
    memberNo,
    name: String(input.name || "").trim(),
    companyName: String(input.companyName || "").trim(),
    role: String(input.role || "").trim(),
    registeredAt: String(input.registeredAt || "").trim(),
    expiresAt: String(input.expiresAt || "").trim(),
    sourceUrl: String(input.sourceUrl || "").trim(),
    importedAt: new Date().toISOString()
  };
}

function memberKey(member: AiweMember) {
  return (member.lineUserId || member.memberNo || member.email || member.name || crypto.randomUUID()).toLowerCase();
}

async function readAiweMembers(env: Env): Promise<AiweMember[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(aiweMembersKey);
  if (!object) return [];
  const data = await object.json().catch(() => []);
  return Array.isArray(data) ? data as AiweMember[] : [];
}

async function writeAiweMembers(env: Env, members: AiweMember[]) {
  if (!env.ASSETS_BUCKET) return false;
  await env.ASSETS_BUCKET.put(aiweMembersKey, JSON.stringify(members, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

async function importAiweMembers(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const body = await request.json().catch(() => ({})) as { members?: AiweMember[]; source?: string };
  const incoming = Array.isArray(body.members) ? body.members.map((item) => normalizeMember({ ...item, sourceUrl: item.sourceUrl || body.source || "" })) : [];
  if (!incoming.length) return json({ success: false, message: "No members to import" }, 400);
  const existing = await readAiweMembers(env);
  const map = new Map(existing.map((item) => [memberKey(item), item]));
  for (const member of incoming) map.set(memberKey(member), { ...(map.get(memberKey(member)) || {}), ...member });
  const merged = Array.from(map.values()).sort((a, b) => String(a.memberNo || a.name).localeCompare(String(b.memberNo || b.name), "zh-Hant"));
  await writeAiweMembers(env, merged);
  return json({ success: true, imported: incoming.length, total: merged.length, data: merged.slice(0, 20) });
}

async function listAiweMembers(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const members = await readAiweMembers(env);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const filtered = q ? members.filter((item) => [item.lineUserId, item.email, item.memberNo, item.name, item.companyName].some((value) => String(value || "").toLowerCase().includes(q))) : members;
  return json({ success: true, total: members.length, data: filtered.slice(0, 500) });
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

function hasPointRows(result: Record<string, unknown>) {
  const data = result.data as { list?: unknown[] } | undefined;
  return result.success === true && Array.isArray(data?.list) && data.list.length > 0;
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

async function wetwPointQuery(payload: Record<string, unknown>, env: Env) {
  const apiKey = env.WETW_POINT_API_KEY?.trim();
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  const response = await fetch(`${pointApiBase}/query-user-point-list`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, ...payload, page: 1, per_page: 5 })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
  return { httpStatus: response.status, ...(body as Record<string, unknown>) };
}

async function queryPointsByUid(lineUserId: string, env: Env) {
  const withShop = await wetwPointQuery({ LINE_user_id: lineUserId, shop_id: Number(env.WETW_SHOP_ID || 35) }, env);
  if (hasPointRows(withShop) || withShop.success !== true) return withShop;

  const uidOnly = await wetwPointQuery({ LINE_user_id: lineUserId }, env);
  return { ...uidOnly, fallbackTried: true, firstQuery: { shop_id: Number(env.WETW_SHOP_ID || 35), message: withShop.message } };
}

function formatPointReply(result: Record<string, unknown>, uid: string) {
  if (result.success !== true) return `${uid} 點數查詢失敗：${String(result.message || result.code || "未知錯誤")}`;
  const data = result.data as { list?: Array<Record<string, unknown>> } | undefined;
  const list = Array.isArray(data?.list) ? data.list : [];
  if (!list.length) return `${uid} 會員存在，但目前查不到點數異動紀錄。\n\n已改用 UID 查詢，並已排除 point_type / shop_id 篩選；若仍為空，代表舊點數 API 沒有這位會員的點數流水紀錄。`;
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
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method === "GET" && url.pathname === "/api/aiwe-members") return listAiweMembers(request, env);
    if (request.method === "POST" && url.pathname === "/api/aiwe-members/import") return importAiweMembers(request, env);
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
