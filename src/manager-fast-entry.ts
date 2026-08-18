import app from "./payment-speed-entry";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

const managerDataKey = "manager/state.json";

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid,x-aiwe-token,x-line-signature",
      ...extraHeaders
    }
  });
}

function elapsed(start: number) {
  return Math.max(0, Math.round(performance.now() - start));
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
  const totalStart = performance.now();
  const timing: Record<string, number> = {};
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);

  let stageStart = performance.now();
  const authorized = await authorize(request, env, ctx);
  timing.auth_ms = elapsed(stageStart);
  if (!authorized) {
    timing.total_ms = elapsed(totalStart);
    return json({ success: false, message: "Unauthorized", timing }, 401, {
      "server-timing": `auth;dur=${timing.auth_ms}, total;dur=${timing.total_ms}`,
      "x-tdea-save-timing": JSON.stringify(timing)
    });
  }

  stageStart = performance.now();
  const rawBody = await request.text();
  timing.body_read_ms = elapsed(stageStart);
  timing.request_bytes = new TextEncoder().encode(rawBody).byteLength;

  stageStart = performance.now();
  let input: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) input = parsed as Record<string, unknown>;
  } catch (_) {}
  timing.body_parse_ms = elapsed(stageStart);
  if (!input) {
    timing.total_ms = elapsed(totalStart);
    return json({ success: false, message: "Invalid manager data", timing }, 400, {
      "x-tdea-save-timing": JSON.stringify(timing)
    });
  }

  stageStart = performance.now();
  const object = await env.ASSETS_BUCKET.get(managerDataKey);
  timing.r2_get_ms = elapsed(stageStart);

  stageStart = performance.now();
  const previous = object ? await object.json().catch(() => ({})) as Record<string, unknown> : {};
  timing.r2_json_ms = elapsed(stageStart);

  stageStart = performance.now();
  const next = { ...previous, ...input, updatedAt: new Date().toISOString() } as Record<string, unknown>;
  delete next.activities;
  const serialized = JSON.stringify(next);
  timing.merge_serialize_ms = elapsed(stageStart);
  timing.stored_bytes = new TextEncoder().encode(serialized).byteLength;

  stageStart = performance.now();
  await env.ASSETS_BUCKET.put(managerDataKey, serialized, {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  timing.r2_put_ms = elapsed(stageStart);
  timing.total_ms = elapsed(totalStart);

  const serverTiming = [
    `auth;dur=${timing.auth_ms}`,
    `body;dur=${timing.body_read_ms + timing.body_parse_ms}`,
    `r2get;dur=${timing.r2_get_ms}`,
    `r2json;dur=${timing.r2_json_ms}`,
    `merge;dur=${timing.merge_serialize_ms}`,
    `r2put;dur=${timing.r2_put_ms}`,
    `total;dur=${timing.total_ms}`
  ].join(", ");

  return json({
    success: true,
    fastPath: true,
    updatedAt: next.updatedAt,
    timing
  }, 200, {
    "server-timing": serverTiming,
    "x-tdea-save-timing": JSON.stringify(timing)
  });
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
