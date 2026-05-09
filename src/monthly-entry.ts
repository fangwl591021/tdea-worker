import baseEntry from "./roster-sync-entry4";

type Env = { ADMIN_EMAILS?: string; ASSETS_BUCKET?: R2Bucket; LINE_CHANNEL_SECRET?: string; LINE_CHANNEL_ACCESS_TOKEN?: string };
type LineEvent = { type?: string; replyToken?: string; message?: { type?: string; text?: string }; postback?: { data?: string } };
type MonthlyPage = { id?: string; activityNo?: string; imageUrl?: string; detailTitle?: string; detailText?: string; detailUrl?: string; formUrl?: string; shareUrl?: string; order?: number };
type MonthlyConfig = { enabled?: boolean; keyword?: string; month?: string; altText?: string; detailBaseUrl?: string; pages?: MonthlyPage[]; updatedAt?: string };

const monthlyKey = "flex/monthly-activity.json";
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
    const detailMatch = url.pathname.match(/^\/monthly-detail\/([^/]+)$/);
    if (request.method === "GET" && detailMatch) return monthlyDetail(env, decodeURIComponent(detailMatch[1]));
    if (request.method === "POST" && url.pathname === "/line-webhook") { const rawBody = await request.text(); const monthly = await handleMonthlyWebhook(request, env, rawBody); if (monthly) return monthly; return baseEntry.fetch(rebuildRequest(request, rawBody), env, ctx); }
    return baseEntry.fetch(request, env, ctx);
  }
};
