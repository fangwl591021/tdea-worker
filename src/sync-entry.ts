import entry from "./entry";

type Env = {
  ADMIN_EMAILS?: string;
  ASSETS_BUCKET?: R2Bucket;
  AIWE_WP_USER?: string;
  AIWE_WP_APP_PASSWORD?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
};

type AiweMember = {
  source: "wp-rest";
  wpUserId?: number;
  lineUserId?: string;
  email?: string;
  memberNo?: string;
  name?: string;
  rawName?: string;
  role?: string;
  registeredAt?: string;
  sourceUrl?: string;
  importedAt?: string;
};

type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
  message?: { id?: string; type?: string; text?: string };
  postback?: { data?: string };
  timestamp?: number;
};

type MonitorThread = {
  id: string;
  lineUserId?: string;
  name?: string;
  pictureUrl?: string;
  status?: string;
  risk?: string;
  tags?: string[];
  note?: string;
  lastMessage?: string;
  lastAt?: string;
  updatedAt?: string;
  unread?: number;
  messageCount?: number;
};

type MonitorMessage = {
  id: string;
  threadId: string;
  lineUserId?: string;
  direction: "user" | "system";
  type: string;
  text: string;
  createdAt: string;
  raw?: unknown;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const aiweMembersKey = "aiwe/members.json";
const monitorThreadsKey = "line-monitor/threads.json";
const uidRe = /U[0-9a-f]{32}/i;
const memberNoRe = /[A-Z]\d{7}/i;

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

function normalizeText(value: unknown) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function firstString(...values: unknown[]) {
  return values.map(normalizeText).find(Boolean) || "";
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

function memberKey(member: AiweMember) {
  return (member.lineUserId || member.memberNo || member.email || String(member.wpUserId || crypto.randomUUID())).toLowerCase();
}

function extractFromUser(user: Record<string, unknown>, sourceUrl: string): AiweMember {
  const raw = JSON.stringify(user);
  const email = firstString(user.email, user.user_email, raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]);
  const lineUserId = firstString(raw.match(uidRe)?.[0], email.match(uidRe)?.[0], user.slug, user.username, user.user_login);
  const rawName = firstString(user.name, user.display_name, user.nickname, user.slug, user.username);
  const memberNo = firstString(raw.match(memberNoRe)?.[0], rawName.match(memberNoRe)?.[0]).toUpperCase();
  const name = normalizeText(rawName.replace(memberNoRe, "")) || rawName;
  const roles = Array.isArray(user.roles) ? user.roles.join(",") : firstString(user.roles);
  return {
    source: "wp-rest",
    wpUserId: Number(user.id || 0) || undefined,
    lineUserId,
    email,
    memberNo,
    name,
    rawName,
    role: roles,
    registeredAt: firstString(user.registered_date, user.registeredAt),
    sourceUrl,
    importedAt: new Date().toISOString()
  };
}

async function fetchWpUsers(env: Env, page: number, perPage: number, search: string) {
  const user = env.AIWE_WP_USER?.trim();
  const password = env.AIWE_WP_APP_PASSWORD?.trim();
  if (!user || !password) throw new Error("AIWE_WP_USER or AIWE_WP_APP_PASSWORD is not configured");

  const url = new URL("https://aiwe.cc/index.php/wp-json/wp/v2/users");
  url.searchParams.set("context", "edit");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  if (search) url.searchParams.set("search", search);

  const response = await fetch(url.href, {
    headers: {
      "authorization": `Basic ${btoa(`${user}:${password}`)}`,
      "accept": "application/json"
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" ? JSON.stringify(body) : `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!Array.isArray(body)) throw new Error("WordPress users API did not return an array");
  return {
    rows: body as Record<string, unknown>[],
    total: Number(response.headers.get("x-wp-total") || 0),
    totalPages: Number(response.headers.get("x-wp-totalpages") || 0),
    url: url.href
  };
}

async function syncAiweMembers(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);

  const url = new URL(request.url);
  const startPage = Math.max(1, Number(url.searchParams.get("start") || 1));
  const pages = Math.min(20, Math.max(1, Number(url.searchParams.get("pages") || 1)));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") || 100)));
  const search = url.searchParams.get("search")?.trim() || "";

  const fetched: AiweMember[] = [];
  let wpTotal = 0;
  let wpTotalPages = 0;
  const errors: string[] = [];

  for (let page = startPage; page < startPage + pages; page += 1) {
    try {
      const result = await fetchWpUsers(env, page, perPage, search);
      wpTotal = result.total || wpTotal;
      wpTotalPages = result.totalPages || wpTotalPages;
      fetched.push(...result.rows.map((user) => extractFromUser(user, result.url)));
      if (!result.rows.length || (wpTotalPages && page >= wpTotalPages)) break;
    } catch (error) {
      errors.push(`page ${page}: ${String((error as Error).message || error)}`);
      break;
    }
  }

  if (errors.length && !fetched.length) return json({ success: false, message: errors[0], errors }, 502);

  const existing = await readAiweMembers(env);
  const map = new Map(existing.map((item) => [memberKey(item), item]));
  for (const member of fetched) map.set(memberKey(member), { ...(map.get(memberKey(member)) || {}), ...member });
  const merged = Array.from(map.values()).sort((a, b) => String(a.memberNo || a.name).localeCompare(String(b.memberNo || b.name), "zh-Hant"));
  await writeAiweMembers(env, merged);

  return json({
    success: true,
    imported: fetched.length,
    totalStored: merged.length,
    wpTotal,
    wpTotalPages,
    nextStart: startPage + pages,
    errors,
    sample: fetched.slice(0, 10)
  });
}

function rebuildRequest(request: Request, body: string) {
  return new Request(request.url, { method: request.method, headers: request.headers, body });
}

async function verifyLineSignature(rawBody: string, signature: string | null, secret?: string) {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));
  return expected === signature;
}

function monitorThreadId(event: LineEvent) {
  return event.source?.userId || event.source?.groupId || event.source?.roomId || "unknown";
}

function monitorMessageText(event: LineEvent) {
  if (event.message?.type === "text") return normalizeText(event.message.text);
  if (event.postback?.data) return `postback: ${event.postback.data}`;
  if (event.message?.type) return `[${event.message.type}]`;
  return `[${event.type || "event"}]`;
}

function monitorMessageKey(threadId: string) {
  return `line-monitor/messages/${encodeURIComponent(threadId)}.json`;
}

async function readMonitorThreads(env: Env): Promise<MonitorThread[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(monitorThreadsKey);
  const data = object ? await object.json().catch(() => []) : [];
  return Array.isArray(data) ? data as MonitorThread[] : [];
}

async function writeMonitorThreads(env: Env, rows: MonitorThread[]) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(monitorThreadsKey, JSON.stringify(rows.slice(0, 2000), null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

async function readMonitorMessages(env: Env, threadId: string): Promise<MonitorMessage[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(monitorMessageKey(threadId));
  const data = object ? await object.json().catch(() => []) : [];
  return Array.isArray(data) ? data as MonitorMessage[] : [];
}

async function writeMonitorMessages(env: Env, threadId: string, rows: MonitorMessage[]) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(monitorMessageKey(threadId), JSON.stringify(rows.slice(0, 500), null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

function classifyRisk(text: string) {
  const high = ["客訴", "投訴", "退費", "退款", "生氣", "不滿", "失望", "立即", "馬上", "緊急"];
  return high.some((word) => text.includes(word)) ? "high" : "low";
}

async function fetchLineProfile(env: Env, userId: string) {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token || !userId) return {} as Record<string, unknown>;
  const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return {} as Record<string, unknown>;
  return await response.json().catch(() => ({})) as Record<string, unknown>;
}

async function recordLineMonitorWebhook(request: Request, env: Env, rawBody: string) {
  if (!env.ASSETS_BUCKET) return;
  const signature = request.headers.get("x-line-signature");
  if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) return;
  const payload = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = Array.isArray(payload.events) ? payload.events : [];
  if (!events.length) return;
  const threads = await readMonitorThreads(env);
  const map = new Map(threads.map((thread) => [thread.id, thread]));
  for (const event of events) {
    const threadId = monitorThreadId(event);
    if (!threadId || threadId === "unknown") continue;
    const now = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();
    const textValue = monitorMessageText(event);
    const profile = event.source?.userId ? await fetchLineProfile(env, event.source.userId) : {};
    const message: MonitorMessage = {
      id: event.message?.id || `${Date.now()}-${crypto.randomUUID()}`,
      threadId,
      lineUserId: event.source?.userId,
      direction: "user",
      type: event.message?.type || event.type || "event",
      text: textValue,
      createdAt: now,
      raw: event
    };
    const messages = await readMonitorMessages(env, threadId);
    if (!messages.some((item) => item.id === message.id)) await writeMonitorMessages(env, threadId, [message, ...messages]);
    const previous = map.get(threadId) || { id: threadId, status: "open", tags: [], unread: 0, messageCount: 0 };
    const risk = previous.risk === "high" || classifyRisk(textValue) === "high" ? "high" : "low";
    map.set(threadId, {
      ...previous,
      lineUserId: event.source?.userId || previous.lineUserId,
      name: normalizeText(profile.displayName) || previous.name || event.source?.userId || threadId,
      pictureUrl: normalizeText(profile.pictureUrl) || previous.pictureUrl,
      status: previous.status || "open",
      risk,
      lastMessage: textValue,
      lastAt: now,
      updatedAt: new Date().toISOString(),
      unread: Number(previous.unread || 0) + 1,
      messageCount: Number(previous.messageCount || 0) + 1
    });
  }
  await writeMonitorThreads(env, Array.from(map.values()).sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || ""))));
}

async function listMonitorThreads(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const q = normalizeText(url.searchParams.get("q")).toLowerCase();
  const filter = normalizeText(url.searchParams.get("filter") || "all");
  let rows = await readMonitorThreads(env);
  if (q) rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  if (filter === "open") rows = rows.filter((row) => row.status !== "closed");
  if (filter === "risk") rows = rows.filter((row) => row.risk === "high");
  return json({ success: true, data: rows });
}

async function getMonitorThread(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const id = normalizeText(url.searchParams.get("id"));
  if (!id) return json({ success: false, message: "Missing id" }, 400);
  const threads = await readMonitorThreads(env);
  const thread = threads.find((row) => row.id === id) || null;
  return json({ success: true, data: { thread, messages: await readMonitorMessages(env, id) } });
}

async function updateMonitorThread(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = normalizeText(input.id);
  if (!id) return json({ success: false, message: "Missing id" }, 400);
  const threads = await readMonitorThreads(env);
  const index = threads.findIndex((row) => row.id === id);
  const current = index >= 0 ? threads[index] : { id, tags: [] as string[] };
  const nextTags = Array.from(new Set([...(current.tags || []), ...String(input.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean)]));
  const next = {
    ...current,
    status: normalizeText(input.status) || current.status || "open",
    note: input.note === undefined ? current.note : normalizeText(input.note),
    tags: nextTags,
    unread: 0,
    updatedAt: new Date().toISOString()
  } as MonitorThread;
  if (index >= 0) threads[index] = next;
  else threads.unshift(next);
  await writeMonitorThreads(env, threads);
  return json({ success: true, data: next });
}

async function monitorAudience(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  const rows = await readMonitorThreads(env);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const tags: Record<string, number> = {};
  for (const row of rows) for (const tag of row.tags || []) tags[tag] = (tags[tag] || 0) + 1;
  return json({
    success: true,
    data: {
      total: rows.length,
      active30: rows.filter((row) => row.lastAt && now - new Date(row.lastAt).getTime() <= 30 * day).length,
      highRisk: rows.filter((row) => row.risk === "high").length,
      messages7: rows.reduce((sum, row) => sum + (row.lastAt && now - new Date(row.lastAt).getTime() <= 7 * day ? Number(row.messageCount || 0) : 0), 0),
      open: rows.filter((row) => row.status !== "closed").length,
      tags
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/aiwe-sync") return syncAiweMembers(request, env);
    if (request.method === "GET" && url.pathname === "/api/line-monitor/threads") return listMonitorThreads(request, env);
    if (request.method === "GET" && url.pathname === "/api/line-monitor/thread") return getMonitorThread(request, env);
    if (request.method === "POST" && url.pathname === "/api/line-monitor/thread") return updateMonitorThread(request, env);
    if (request.method === "GET" && url.pathname === "/api/line-monitor/audience") return monitorAudience(request, env);
    if (request.method === "POST" && url.pathname === "/line-webhook") {
      const rawBody = await request.text();
      await recordLineMonitorWebhook(request, env, rawBody).catch(() => undefined);
      return entry.fetch(rebuildRequest(request, rawBody), env, ctx);
    }
    return entry.fetch(request, env, ctx);
  }
};
