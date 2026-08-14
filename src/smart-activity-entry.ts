import app from "./card-ocr-legacy-entry";
import { analyzeSmartActivity, type SmartActivityEnv } from "./smart-activity-analyzer";

type Env = SmartActivityEnv & { [key: string]: unknown };

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-admin-email,x-admin-member-no,x-line-user-id"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function ensureAdmin(request: Request, env: Env, ctx: ExecutionContext) {
  const probeUrl = new URL("/api/admin-whitelist", request.url);
  const headers = new Headers();
  ["authorization", "x-admin-email", "x-admin-member-no", "x-line-user-id"].forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });
  if (![...headers.keys()].length) return false;
  const probe = await app.fetch(new Request(probeUrl, { method: "GET", headers }), env, ctx);
  return probe.ok;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && url.pathname === "/api/smart-activities/analyze") return new Response(null, { status: 204, headers: cors });
    if (!(request.method === "POST" && url.pathname === "/api/smart-activities/analyze")) return app.fetch(request, env, ctx);

    try {
      if (!await ensureAdmin(request, env, ctx)) return json({ success: false, message: "請先登入管理中心" }, 401);
      const input = await request.json().catch(() => ({})) as Record<string, unknown>;
      const posterDataUrl = String(input.posterDataUrl || "").trim();
      const text = String(input.text || "").trim();
      const analysis = await analyzeSmartActivity(env, posterDataUrl, text);
      return json({ success: true, data: analysis, providerUsed: analysis.providerUsed, modelUsed: analysis.modelUsed, fallbackUsed: analysis.fallbackUsed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "智能活動分析失敗";
      return json({ success: false, message, error: message }, 500);
    }
  }
};
