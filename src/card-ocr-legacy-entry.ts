import app from "./card-ocr-provider-entry";
import { recognizeBusinessCard } from "./card-collection-ocr-dual";

type Env = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  [key: string]: unknown;
};

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-line-user-id"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function legacyRecognize(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const frontImage = String(input.imageDataUrl || input.frontImageDataUrl || "").trim();
  const backImage = String(input.backImageDataUrl || "").trim();
  if (!frontImage) return json({ success: false, message: "請提供名片圖片" }, 400);
  const ocr = await recognizeBusinessCard(env, frontImage, backImage);
  return json({
    success: true,
    data: ocr,
    providerUsed: ocr.providerUsed,
    modelUsed: ocr.modelUsed,
    fallbackUsed: ocr.fallbackUsed,
    ...(ocr.primaryProvider ? { primaryProvider: ocr.primaryProvider } : {}),
    ...(ocr.primaryError ? { primaryError: ocr.primaryError } : {})
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/card-collection/ocr") {
      try {
        return await legacyRecognize(request, env);
      } catch (error) {
        const message = error instanceof Error ? error.message : "名片 OCR 操作失敗";
        return json({ success: false, message, error: message }, 500);
      }
    }
    return app.fetch(request, env, ctx);
  }
};
