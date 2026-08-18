import app from "./custom-field-id-entry";

type Env = { [key:string]: unknown };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!(request.method === "POST" && url.pathname === "/api/smart-activities/analyze")) {
      return app.fetch(request, env as never, ctx);
    }

    const started = Date.now();
    try {
      const response = await Promise.race([
        app.fetch(request, env as never, ctx),
        new Promise<Response>((resolve) => setTimeout(() => resolve(json({
          success: false,
          message: "AI 分析超過 26 秒，已停止等待。請重試；系統已避免畫面無限卡住。",
          timeout: true,
          elapsedMs: Date.now() - started
        }, 504)), 26000))
      ]);
      const headers = new Headers(response.headers);
      headers.set("x-tdea-smart-elapsed-ms", String(Date.now() - started));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      return json({ success: false, message: error instanceof Error ? error.message : "AI 分析失敗" }, 500);
    }
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};