import app from "./activity-canonical-create-entry";

type Env = {
  TDEA_DESIGN?: Fetcher;
  ASSETS_BUCKET?: R2Bucket;
  [key: string]: unknown;
};

type Descriptor = {
  flow: string;
  stage: string;
  formId?: string;
  action: string;
  startLabel?: string;
  successLabel: string;
  errorLabel: string;
};

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

function mergedQuery(url: URL) {
  const params = new URLSearchParams(url.search);
  const state = params.get("liff.state");
  if (state) {
    let raw = state;
    for (let i = 0; i < 2; i += 1) {
      try {
        const decoded = decodeURIComponent(raw);
        if (decoded === raw) break;
        raw = decoded;
      } catch { break; }
    }
    const query = raw.startsWith("?") ? raw.slice(1) : raw.includes("?") ? raw.split("?").slice(1).join("?") : raw;
    new URLSearchParams(query).forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
  }
  return params;
}

function traceFrom(request: Request, url: URL) {
  const params = mergedQuery(url);
  const direct = clean(params.get("tdeaTrace"), 120);
  if (direct) return direct;
  const header = clean(request.headers.get("x-tdea-monitor-session"), 120);
  if (header) return header;
  const ray = clean(request.headers.get("cf-ray"), 100).split("-")[0];
  return ray ? `tdeawork_${ray}` : `tdeawork_${crypto.randomUUID().slice(0, 12)}`;
}

function describe(url: URL, method: string): Descriptor | null {
  const path = url.pathname;
  let match = path.match(/^\/api\/native-forms\/([^/]+)$/);
  if (match && method === "GET") {
    const formId = decodeURIComponent(match[1]);
    return { flow:"activity_registration", stage:"form_load", formId, action:`tdeawork.form.load.${formId}`, successLabel:"【報名流程】載入報名表成功", errorLabel:"【報名警示】載入報名表失敗" };
  }
  if (match && method === "POST") {
    const formId = decodeURIComponent(match[1]);
    return { flow:"activity_registration", stage:"registration_submit", formId, action:`tdeawork.registration.submit.${formId}`, startLabel:"【報名流程】送出活動報名", successLabel:"【報名流程】活動報名成功", errorLabel:"【報名警示】活動報名失敗" };
  }

  match = path.match(/^\/api\/native-forms\/([^/]+)\/login-member$/);
  if (match && method === "GET") {
    const formId = decodeURIComponent(match[1]);
    return { flow:"activity_registration", stage:"member_lookup", formId, action:`tdeawork.registration.member.${formId}`, successLabel:"【報名流程】會員辨識成功", errorLabel:"【報名警示】會員辨識失敗" };
  }

  match = path.match(/^\/api\/native-forms\/([^/]+)\/login-register$/);
  if (match && method === "POST") {
    const formId = decodeURIComponent(match[1]);
    return { flow:"activity_registration", stage:"member_register", formId, action:`tdeawork.registration.member-register.${formId}`, startLabel:"【報名流程】送出會員註冊／綁定", successLabel:"【報名流程】會員註冊／綁定成功", errorLabel:"【報名警示】會員註冊／綁定失敗" };
  }

  if (path === "/api/native-registrations/payment-report" && method === "POST") {
    return { flow:"activity_registration", stage:"payment_report", action:"tdeawork.registration.payment-report", startLabel:"【報名流程】送出匯款回報", successLabel:"【報名流程】匯款回報成功", errorLabel:"【報名警示】匯款回報失敗" };
  }
  if (path === "/api/native-registrations/update" && method === "POST") {
    return { flow:"activity_registration", stage:"registration_update", action:"tdeawork.registration.update", startLabel:"【報名流程】修改報名資料", successLabel:"【報名流程】報名資料修改成功", errorLabel:"【報名警示】報名資料修改失敗" };
  }
  if (path === "/api/native-registrations/cancel" && method === "POST") {
    return { flow:"activity_registration", stage:"registration_cancel", action:"tdeawork.registration.cancel", startLabel:"【報名流程】取消活動報名", successLabel:"【報名流程】取消報名成功", errorLabel:"【報名警示】取消報名失敗" };
  }
  if ((path === "/api/native-registrations/query" || path === "/api/native-registrations/me") && method === "GET") {
    return { flow:"activity_registration", stage:"registration_query", action:`tdeawork.registration.query.${path.endsWith("/me") ? "me" : "code"}`, successLabel:"【報名流程】查詢報名紀錄成功", errorLabel:"【報名警示】查詢報名紀錄失敗" };
  }
  return null;
}

async function formTitle(env: Env, formId = "", fallback = "") {
  if (!formId || !env.ASSETS_BUCKET) return clean(fallback, 180);
  try {
    const obj = await env.ASSETS_BUCKET.get(`forms/native/${encodeURIComponent(formId)}.json`);
    if (!obj) return clean(fallback, 180);
    const form = await obj.json<Record<string, any>>().catch(() => null);
    return clean(form?.activity?.name || form?.activity?.title || fallback, 180);
  } catch {
    return clean(fallback, 180);
  }
}

async function emit(env: Env, request: Request, url: URL, descriptor: Descriptor, eventType: string, label: string, status: number, durationMs: number, extra: Record<string, unknown> = {}) {
  if (!env.TDEA_DESIGN || typeof env.TDEA_DESIGN.fetch !== "function") return;
  const params = mergedQuery(url);
  const trace = traceFrom(request, url);
  const queryTitle = clean(params.get("tdeaActivityTitle"), 180);
  const title = await formTitle(env, descriptor.formId || "", queryTitle);
  const suffix = title ? `：${title}` : descriptor.formId ? `：${descriptor.formId}` : "";
  const payload = {
    eventType,
    sessionId: trace,
    action: descriptor.action,
    label: clean(`${label}${suffix}`, 240),
    path: clean(url.pathname, 500),
    target: "tdeawork",
    clientTime: new Date().toISOString(),
    metadata: {
      source: "tdeawork",
      app: "native_registration",
      flow: descriptor.flow,
      stage: descriptor.stage,
      formId: descriptor.formId || "",
      activityTitle: title,
      status,
      durationMs,
      method: request.method,
      route: url.pathname,
      tdeaSource: clean(params.get("tdeaSource"), 80),
      ...extra,
    },
  };
  await env.TDEA_DESIGN.fetch("https://tdea-design.internal/v1/telemetry/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

async function responseBusinessResult(response: Response) {
  try {
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) return { businessOk: response.ok, message:"", code:"" };
    const body = await response.clone().json<Record<string, any>>().catch(() => ({}));
    return {
      businessOk: response.ok && body?.success !== false,
      message: clean(body?.message || body?.error, 240),
      code: clean(body?.code, 120),
    };
  } catch {
    return { businessOk: response.ok, message:"", code:"" };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const descriptor = describe(url, request.method.toUpperCase());
    const started = Date.now();

    if (descriptor?.startLabel) {
      const task = emit(env, request, url, descriptor, "form_submit", descriptor.startLabel, 0, 0);
      ctx.waitUntil(task);
    }

    try {
      const response = await app.fetch(request, env as never, ctx);
      if (descriptor) {
        const durationMs = Date.now() - started;
        const business = await responseBusinessResult(response);
        const ok = business.businessOk;
        const label = ok ? descriptor.successLabel : `${descriptor.errorLabel}${business.message ? `｜${business.message}` : `｜HTTP ${response.status}`}`;
        const task = emit(env, request, url, descriptor, ok ? "api_result" : "api_error", label, response.status, durationMs, { code: business.code, message: business.message });
        ctx.waitUntil(task);
        if (durationMs >= 5000) {
          ctx.waitUntil(emit(env, request, url, descriptor, "performance_warning", `【報名警示】流程回應過慢｜${durationMs}ms`, response.status, durationMs));
        }
      }
      return response;
    } catch (error) {
      if (descriptor) {
        const durationMs = Date.now() - started;
        ctx.waitUntil(emit(env, request, url, descriptor, "api_error", `【報名警示】流程發生例外｜${clean(error instanceof Error ? error.message : error, 180)}`, 599, durationMs));
      }
      throw error;
    }
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  },
};
