import syncEntry from "./sync-entry";

type Env = { ADMIN_EMAILS?: string; ASSETS_BUCKET?: R2Bucket; AIWE_WP_USER?: string; AIWE_WP_APP_PASSWORD?: string; AIWE_READ_TOKEN?: string };
type Member = Record<string, unknown>;
type Target = { rosterType: "association" | "vendor"; memberNo: string; name: string; role: string; searchTerms: string[] };

const headers = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,OPTIONS", "access-control-allow-headers": "content-type,x-admin-email,x-aiwe-token,x-line-signature" };
const storeKey = "aiwe/members.json";
const rosterUrl = "https://raw.githubusercontent.com/fangwl591021/tdea-worker/main/public/roster.json";
const uidRe = /U[0-9a-f]{32}/i;
const memberNoRe = /[A-Z]\d{7}/i;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const text = (v: unknown) => String(v || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const first = (...values: unknown[]) => values.map(text).find(Boolean) || "";
const uniq = (values: string[]) => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));

function requireAdmin(request: Request, env: Env) {
  const allowed = (env.ADMIN_EMAILS || "admin@example.com").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const email = request.headers.get("x-admin-email")?.trim().toLowerCase();
  return email && allowed.includes(email) ? null : json({ success: false, message: "Unauthorized" }, 401);
}

function requireReadToken(request: Request, env: Env) {
  const expected = env.AIWE_READ_TOKEN?.trim();
  const provided = request.headers.get("x-aiwe-token")?.trim();
  return expected && provided && expected === provided ? null : json({ success: false, message: "Unauthorized" }, 401);
}

async function readStore(env: Env): Promise<Member[]> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(storeKey) : null;
  if (!object) return [];
  const data = await object.json().catch(() => []);
  return Array.isArray(data) ? data as Member[] : [];
}

async function writeStore(env: Env, rows: Member[]) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(storeKey, JSON.stringify(rows, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function key(row: Member) {
  return String(row.lineUserId || row.memberNo || row.email || row.wpUserId || crypto.randomUUID()).toLowerCase();
}

function mapUser(user: Record<string, unknown>, sourceUrl: string, target: Target, matchMethod: string) {
  const raw = JSON.stringify(user);
  const email = first(user.email, user.user_email, raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]);
  const lineUserId = first(raw.match(uidRe)?.[0], email.match(uidRe)?.[0], user.slug, user.username, user.user_login);
  const rawName = first(user.name, user.display_name, user.nickname, user.slug, user.username);
  const memberNo = first(raw.match(memberNoRe)?.[0], rawName.match(memberNoRe)?.[0], target.memberNo).toUpperCase();
  const roles = Array.isArray(user.roles) ? user.roles.join(",") : first(user.roles);
  return {
    source: "wp-rest-roster-match",
    wpUserId: Number(user.id || 0) || undefined,
    lineUserId,
    email,
    memberNo,
    name: text(rawName.replace(memberNoRe, "")) || rawName || target.name,
    rawName,
    role: roles,
    registeredAt: first(user.registered_date, user.registeredAt),
    sourceUrl,
    importedAt: new Date().toISOString(),
    rosterType: target.rosterType,
    rosterMemberNo: target.memberNo,
    rosterName: target.name,
    matchMethod
  };
}

async function wpSearch(env: Env, search: string) {
  const user = env.AIWE_WP_USER?.trim();
  const password = env.AIWE_WP_APP_PASSWORD?.trim();
  if (!user || !password) throw new Error("AIWE_WP_USER or AIWE_WP_APP_PASSWORD is not configured");
  const url = new URL("https://aiwe.cc/index.php/wp-json/wp/v2/users");
  url.searchParams.set("context", "edit");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", "1");
  url.searchParams.set("search", search);
  const response = await fetch(url.href, { headers: { authorization: `Basic ${btoa(`${user}:${password}`)}`, accept: "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === "object" ? JSON.stringify(body) : `HTTP ${response.status}`);
  return { rows: Array.isArray(body) ? body as Record<string, unknown>[] : [], url: url.href };
}

async function targets(kind: string): Promise<Target[]> {
  const response = await fetch(rosterUrl, { headers: { "cache-control": "no-cache" } });
  if (!response.ok) throw new Error(`Cannot load roster: ${response.status}`);
  const roster = await response.json() as { a?: unknown[][]; v?: unknown[][] };
  const out: Target[] = [];
  if (kind === "all" || kind === "association") {
    for (const row of roster.a || []) {
      const memberNo = text(row[0]).toUpperCase(), role = text(row[1]), name = text(row[2]);
      out.push({ rosterType: "association", memberNo, name, role, searchTerms: uniq([`${name}${memberNo}`, memberNo, name]) });
    }
  }
  if (kind === "all" || kind === "vendor") {
    for (const row of roster.v || []) {
      const memberNo = text(row[0]).toUpperCase(), company = text(row[1]), owner = text(row[3]), contact = text(row[4]);
      out.push({ rosterType: "vendor", memberNo, name: company, role: "vendor", searchTerms: uniq([memberNo, company, owner, contact]) });
    }
  }
  return out.filter((item) => item.memberNo || item.name);
}

function isMatch(user: Record<string, unknown>, target: Target) {
  const raw = JSON.stringify(user).toLowerCase();
  return Boolean((target.memberNo && raw.includes(target.memberNo.toLowerCase())) || (target.name && raw.includes(target.name.toLowerCase())));
}

async function syncRoster(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const url = new URL(request.url);
  const kind = url.searchParams.get("type") || "association";
  const start = Math.max(0, Number(url.searchParams.get("start") || 0));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const allTargets = await targets(kind);
  const batch = allTargets.slice(start, start + limit);
  const matched: Member[] = [], misses: Target[] = [], errors: string[] = [];
  for (const target of batch) {
    let found = false;
    for (const term of target.searchTerms) {
      try {
        const result = await wpSearch(env, term);
        const rows = result.rows.filter((user) => isMatch(user, target));
        if (rows.length) {
          matched.push(...rows.map((user) => mapUser(user, result.url, target, term)));
          found = true;
          break;
        }
      } catch (error) {
        errors.push(`${target.memberNo || target.name}: ${String((error as Error).message || error)}`);
        break;
      }
    }
    if (!found) misses.push(target);
  }
  const existing = await readStore(env);
  const map = new Map(existing.map((row) => [key(row), row]));
  for (const row of matched) map.set(key(row), { ...(map.get(key(row)) || {}), ...row });
  const merged = Array.from(map.values()).sort((a, b) => String(a.rosterMemberNo || a.memberNo || a.name).localeCompare(String(b.rosterMemberNo || b.memberNo || b.name), "zh-Hant"));
  await writeStore(env, merged);
  return json({ success: true, type: kind, start, limit, checked: batch.length, matched: matched.length, missed: misses.length, totalRoster: allTargets.length, totalStored: merged.length, nextStart: start + batch.length, done: start + batch.length >= allTargets.length, sample: matched.slice(0, 10), misses: misses.slice(0, 20), errors });
}

async function readMembersByToken(request: Request, env: Env) {
  const guard = requireReadToken(request, env);
  if (guard) return guard;
  const members = await readStore(env);
  return json({ success: true, total: members.length, data: members });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method === "GET" && url.pathname === "/api/aiwe-members-public") return readMembersByToken(request, env);
    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/aiwe-sync-roster") {
      try { return await syncRoster(request, env); }
      catch (error) { return json({ success: false, message: String((error as Error).message || error), stack: String((error as Error).stack || "").slice(0, 800) }, 500); }
    }
    return syncEntry.fetch(request, env, ctx);
  }
};
