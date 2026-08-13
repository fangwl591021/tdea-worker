import app from "./registration-query-payment-entry";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

const managerDataKey = "manager/state.json";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid,x-aiwe-token,x-line-signature"
    }
  });
}

async function authorize(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  url.pathname = "/api/admin-access";
  url.search = "";
  const probe = new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });
  const response = await app.fetch(probe, env, ctx);
  return response.ok;
}

async function fastManagerSave(request: Request, env: Env, ctx: ExecutionContext) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  if (!(await authorize(request, env, ctx))) return json({ success: false, message: "Unauthorized" }, 401);

  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ success: false, message: "Invalid manager data" }, 400);

  const object = await env.ASSETS_BUCKET.get(managerDataKey);
  const previous = object ? await object.json().catch(() => ({})) as Record<string, unknown> : {};
  const next = { ...previous, ...input, updatedAt: new Date().toISOString() } as Record<string, unknown>;
  delete next.activities;

  await env.ASSETS_BUCKET.put(managerDataKey, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });

  return json({ success: true, fastPath: true, updatedAt: next.updatedAt });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "PUT" && url.pathname === "/api/manager-data") {
      return fastManagerSave(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  }
};
