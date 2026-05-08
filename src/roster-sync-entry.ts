import syncEntry from "./sync-entry";

type Env = {
  ADMIN_EMAILS?: string;
  ASSETS_BUCKET?: R2Bucket;
  AIWE_WP_USER?: string;
  AIWE_WP_APP_PASSWORD?: string;
};

type AiweMember = {
  source: string;
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
  rosterType?: string;
  rosterMemberNo?: string;
  rosterName?: string;
  matchMethod?: string;
};

type RosterTarget = {
  rosterType: "association" | "vendor";
  memberNo: string;
  name: string;
  role: string;
  searchTerms: string[];
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-email,x-line-signature"
};

const aiweMembersKey = "aiwe/members.json";
const rosterUrl = "https://fangwl591021.github.io/tdea-worker/roster.json";
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

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function memberKey(member: AiweMember) {
  return (member.lineUserId || member.memberNo || member.email || String(member.wpUserId || crypto.randomUUID())).toLowerCase();
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

function extractFromUser(user: Record<string, unknown>, sourceUrl: string, target: RosterTarget, matchMethod: string): AiweMember {
  const raw = JSON.stringify(user);
  const email = firstString(user.email, user.user_email, raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]);
  const lineUserId = firstString(raw.match(uidRe)?.[0], email.match(uidRe)?.[0], user.slug, user.username, user.user_login);
  const rawName = firstString(user.name, user.display_name, user.nickname, user.slug, user.username);
  const memberNo = firstString(raw.match(memberNoRe)?.[0], rawName.match(memberNoRe)?.[0], target.memberNo).toUpperCase();
  const name = normalizeText(rawName.replace(memberNoRe, "")) || rawName || target.name;
  const roles = Array.isArray(user.roles) ? user.roles.join(",") : firstString(user.roles);
  return {
    source: "wp-rest-roster-match",
    wpUserId: Number(user.id || 0) || undefined,
    lineUserId,
    email,
    memberNo,
    name,
    rawName,
    role: roles,
    registeredAt: firstString(user.registered_date, user.registeredAt),
    sourceUrl,
    importedAt: new Date().toISOString(),
    rosterType: target.rosterType,
    rosterMemberNo: target.memberNo,
    rosterName: target.name,
    matchMethod
  };
}

async function fetchWpUsers(env: Env, search: string) {
  const user = env.AIWE_WP_USER?.trim();
  const password = env.AIWE_WP_APP_PASSWORD?.trim();
  if (!user || !password) throw new Error("AIWE_WP_USER or AIWE_WP_APP_PASSWORD is not configured");

  const url = new URL("https://aiwe.cc/index.php/wp-json/wp/v2/users");
  url.searchParams.set("context", "edit");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", "1");
  url.searchParams.set("search", search);

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
  return { rows: Array.isArray(body) ? body as Record<string, unknown>[] : [], url: url.href };
}

async function loadRosterTargets(kind: string): Promise<RosterTarget[]> {
  const response = await fetch(rosterUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load roster: ${response.status}`);
  const roster = await response.json() as { a?: unknown[][]; v?: unknown[][] };
  const targets: RosterTarget[] = [];

  if (kind === "all" || kind === "association") {
    for (const row of roster.a || []) {
      const memberNo = normalizeText(row[0]).toUpperCase();
      const role = normalizeText(row[1]);
      const name = normalizeText(row[2]);
      targets.push({ rosterType: "association", memberNo, name, role, searchTerms: unique([`${name}${memberNo}`, memberNo, name]) });
    }
  }

  if (kind === "all" || kind === "vendor") {
    for (const row of roster.v || []) {
      const memberNo = normalizeText(row[0]).toUpperCase();
      const companyName = normalizeText(row[1]);
      const owner = normalizeText(row[3]);
      const contact = normalizeText(row[4]);
      targets.push({ rosterType: "vendor", memberNo, name: companyName, role: "vendor", searchTerms: unique([memberNo, companyName, owner, contact]) });
    }
  }

  return targets.filter((target) => target.memberNo || target.name);
}

function looksLikeMatch(user: Record<string, unknown>, target: RosterTarget) {
  const raw = JSON.stringify(user).toLowerCase();
  const memberNo = target.memberNo.toLowerCase();
  const name = target.name.toLowerCase();
  if (memberNo && raw.includes(memberNo)) return true;
  if (name && raw.includes(name)) return true;
  return false;
}

async function syncRosterMembers(request: Request, env: Env) {
  const guard = requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);

  const url = new URL(request.url);
  const kind = url.searchParams.get("type") || "association";
  const start = Math.max(0, Number(url.searchParams.get("start") || 0));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const targets = await loadRosterTargets(kind);
  const slice = targets.slice(start, start + limit);
  const matched: AiweMember[] = [];
  const misses: RosterTarget[] = [];
  const errors: string[] = [];

  for (const target of slice) {
    let found = false;
    for (const term of target.searchTerms) {
      try {
        const result = await fetchWpUsers(env, term);
        const users = result.rows.filter((user) => looksLikeMatch(user, target));
        if (users.length) {
          matched.push(...users.map((user) => extractFromUser(user, result.url, target, term)));
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

  const existing = await readAiweMembers(env);
  const map = new Map(existing.map((item) => [memberKey(item), item]));
  for (const member of matched) map.set(memberKey(member), { ...(map.get(memberKey(member)) || {}), ...member });
  const merged = Array.from(map.values()).sort((a, b) => String(a.rosterMemberNo || a.memberNo || a.name).localeCompare(String(b.rosterMemberNo || b.memberNo || b.name), "zh-Hant"));
  await writeAiweMembers(env, merged);

  return json({
    success: true,
    type: kind,
    start,
    limit,
    checked: slice.length,
    matched: matched.length,
    missed: misses.length,
    totalRoster: targets.length,
    totalStored: merged.length,
    nextStart: start + slice.length,
    done: start + slice.length >= targets.length,
    sample: matched.slice(0, 10),
    misses: misses.slice(0, 20),
    errors
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/aiwe-sync-roster") return syncRosterMembers(request, env);
    return syncEntry.fetch(request, env, ctx);
  }
};
