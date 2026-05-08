import entry from "./entry";

type Env = {
  ADMIN_EMAILS?: string;
  ASSETS_BUCKET?: R2Bucket;
  AIWE_WP_USER?: string;
  AIWE_WP_APP_PASSWORD?: string;
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

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const aiweMembersKey = "aiwe/members.json";
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

function normalizeText(value: unknown) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function firstString(...values: unknown[]) {
  return values.map(normalizeText).find(Boolean) || "";
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

  const url = new URL("https://aiwe.cc/wp-json/wp/v2/users");
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/aiwe-sync") return syncAiweMembers(request, env);
    return entry.fetch(request, env, ctx);
  }
};
