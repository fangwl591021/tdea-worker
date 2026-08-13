import app from "./activity-fast-entry";
import { recognizeBusinessCard } from "./card-collection-ocr-dual";
import { CardCollectionError, failCardImport, getCardImportImages, saveCardImportOcr } from "./card-collection";
import { verifyLineIdToken } from "./line-login-verify";

type Env = {
  ASSETS_BUCKET?: R2Bucket;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  LINE_LOGIN_CHANNEL_ID?: string;
  [key: string]: unknown;
};

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type"
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function dataUrl(bytes: ArrayBuffer, type: string) {
  let binary = "";
  const source = new Uint8Array(bytes);
  for (let offset = 0; offset < source.length; offset += 0x8000) binary += String.fromCharCode(...source.subarray(offset, offset + 0x8000));
  return `data:${type || "image/webp"};base64,${btoa(binary)}`;
}

async function ownerFrom(request: Request, env: Env) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new CardCollectionError("缺少 LINE 登入憑證", 401, "missing_bearer");
  try {
    return (await verifyLineIdToken(env, match[1])).lineUserId;
  } catch (error) {
    throw new CardCollectionError(error instanceof Error ? error.message : "LINE Login 驗證失敗", 401, "invalid_bearer");
  }
}

async function recognizeRoute(request: Request, env: Env, eventId: string) {
  const owner = await ownerFrom(request, env);
  const images = await getCardImportImages(env, owner, eventId);
  try {
    const ocr = await recognizeBusinessCard(
      env,
      dataUrl(await images.front.arrayBuffer(), images.record.frontContentType),
      images.back ? dataUrl(await images.back.arrayBuffer(), images.back.httpMetadata?.contentType || "image/webp") : ""
    );
    await saveCardImportOcr(env, owner, eventId, ocr);
    const { confidence, language, providerUsed, modelUsed, fallbackUsed, primaryProvider, primaryError, ...card } = ocr;
    return json({
      success: true,
      eventId,
      card,
      confidence,
      language,
      providerUsed,
      modelUsed,
      fallbackUsed,
      ...(primaryProvider ? { primaryProvider } : {}),
      ...(primaryError ? { primaryError } : {})
    });
  } catch (error) {
    await failCardImport(env, owner, eventId).catch(() => undefined);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const match = request.method === "POST" ? url.pathname.match(/^\/v1\/card-collection\/imports\/([^/]+)\/recognize$/) : null;
    if (!match) return app.fetch(request, env, ctx);
    try {
      return await recognizeRoute(request, env, decodeURIComponent(match[1]));
    } catch (error) {
      if (error instanceof CardCollectionError) return json({ success: false, code: error.code, message: error.message, error: error.message }, error.status);
      const message = error instanceof Error ? error.message : "名片 OCR 操作失敗";
      return json({ success: false, message, error: message }, 500);
    }
  }
};
