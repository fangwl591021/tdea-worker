import { recognizeBusinessCard } from "./card-collection-ocr";
import { verifyLineIdToken } from "./line-login-verify";
import {
  CardCollectionError, archiveContactCard, confirmCardImport, createCardImport,
  failCardImport, getCardImportImages, getContactCard, getContactCardImage,
  listContactCards, saveCardImportOcr, updateContactCard, updateContactCardReward
} from "./card-collection";

type Env = { ASSETS_BUCKET?: R2Bucket; OPENAI_API_KEY?: string; OPENAI_MODEL?: string; LINE_LOGIN_CHANNEL_ID?: string };
type Dependencies = { verifyLineIdToken?: typeof verifyLineIdToken; recognizeBusinessCard?: typeof recognizeBusinessCard; pointFetch?: typeof fetch };
type PointEnv = { WETW_POINT_API_KEY?: string; WETW_POINT_TYPE?: string; WETW_SHOP_ID?: string | number };
const POINT_API_BASE = "https://aiwe.cc/index.php/wp-json/wetw-point/v1";
const CARD_COLLECTION_REWARD_POINTS = 10;
const cors = {
  "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type"
};
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
const clean = (value: unknown, max = 2048) => String(value ?? "").trim().slice(0, max);
const decorate = <T extends { frontKey?: string }>(card: T) => ({ ...card, hasImage: Boolean(card.frontKey) });
function dataUrl(bytes: ArrayBuffer, type: string) {
  let binary = ""; const source = new Uint8Array(bytes);
  for (let offset = 0; offset < source.length; offset += 0x8000) binary += String.fromCharCode(...source.subarray(offset, offset + 0x8000));
  return `data:${type || "image/webp"};base64,${btoa(binary)}`;
}
async function imagePart(value: FormDataEntryValue | null, required: boolean) {
  if (!(value instanceof File)) { if (required) throw new CardCollectionError("請提供名片正面圖片", 400, "front_required"); return undefined; }
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type)) throw new CardCollectionError("只接受 JPEG、PNG 或 WebP 名片圖片", 415, "invalid_image_type");
  if (!value.size || value.size > 8 * 1024 * 1024) throw new CardCollectionError("名片圖片大小不可超過 8 MB", 413, "image_too_large");
  return { bytes: await value.arrayBuffer(), contentType: value.type };
}
async function ownerFrom(request: Request, env: Env, deps: Dependencies) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new CardCollectionError("缺少 LINE 登入憑證", 401, "missing_bearer");
  try { return (await (deps.verifyLineIdToken || verifyLineIdToken)(env, match[1])).lineUserId; }
  catch (error) { throw new CardCollectionError(error instanceof Error ? error.message : "LINE Login 驗證失敗", 401, "invalid_bearer"); }
}
function cardInput(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    displayName: clean(source.displayName, 160), englishName: clean(source.englishName, 160), companyName: clean(source.companyName, 240),
    jobTitle: clean(source.jobTitle, 160), department: clean(source.department, 160), mobile: clean(source.mobile, 80),
    companyPhone: clean(source.companyPhone, 80), email: clean(source.email, 320), websiteUrl: clean(source.websiteUrl),
    lineUrl: clean(source.lineUrl), address: clean(source.address, 500), serviceDescription: clean(source.serviceDescription, 3000),
    note: clean(source.note, 3000), industry: source.industry && typeof source.industry === "object" ? source.industry as { primary?: string; secondary?: string[] } : undefined
  };
}
function cardPatch(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const fields = ["displayName","englishName","companyName","jobTitle","department","mobile","companyPhone","email","websiteUrl","lineUrl","address","serviceDescription","note"];
  const patch: Record<string, unknown> = {};
  for (const field of fields) if (Object.prototype.hasOwnProperty.call(source, field)) patch[field] = clean(source[field], ["serviceDescription","note"].includes(field) ? 3000 : field === "address" ? 500 : 2048);
  if (Object.prototype.hasOwnProperty.call(source, "industry") && source.industry && typeof source.industry === "object") patch.industry = source.industry;
  return patch;
}

async function motherPointRequest(env: PointEnv, dependencies: Dependencies, path: string, payload: Record<string, unknown>) {
  const apiKey = clean(env.WETW_POINT_API_KEY);
  if (!apiKey) throw new CardCollectionError("母站點數 API 尚未設定", 503, "point_api_unavailable");
  const response = await (dependencies.pointFetch || fetch)(POINT_API_BASE + "/" + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: apiKey, ...payload })
  });
  const body = await response.json().catch(() => ({ success: false, message: "母站點數回應格式錯誤" })) as Record<string, unknown>;
  if (!response.ok || body.success !== true) throw new CardCollectionError(clean(body.message) || "母站點數操作失敗", 502, "mother_point_failed", body);
  return body;
}
function pointList(body: Record<string, unknown>) {
  const data = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : {};
  return Array.isArray(data.list) ? data.list as Record<string, unknown>[] : [];
}
function pointRemark(owner: string, cardId: string, kind: "award" | "reversal") { return "TDEA-card-collection:" + kind + ":" + owner + ":" + cardId; }
async function queryMotherPoints(env: PointEnv, dependencies: Dependencies, owner: string) {
  return motherPointRequest(env, dependencies, "query-user-point-list", { LINE_user_id: owner, shop_id: Number(env.WETW_SHOP_ID || 35), point_type: env.WETW_POINT_TYPE || "system_point", page: 1, per_page: 100 });
}
async function insertMotherPoints(env: PointEnv, dependencies: Dependencies, owner: string, points: number, remark: string, eventName: string) {
  return motherPointRequest(env, dependencies, "insert-user-point", { LINE_user_id: owner, shop_id: Number(env.WETW_SHOP_ID || 35), event_name: eventName, event_content: eventName, point_type: env.WETW_POINT_TYPE || "system_point", get_point: points, shop_user_lineid: "", child_shop_name: "", child_shop_renew: 0, shop_remark: remark });
}
async function awardCardCollectionPoints(env: Env & PointEnv, dependencies: Dependencies, owner: string, cardId: string) {
  const remark = pointRemark(owner, cardId, "award"), before = await queryMotherPoints(env, dependencies, owner);
  if (!pointList(before).some((item) => clean(item.shop_remark) === remark)) await insertMotherPoints(env, dependencies, owner, CARD_COLLECTION_REWARD_POINTS, remark, "TDEA 名片收藏贈點");
  return updateContactCardReward(env, owner, cardId, "completed", CARD_COLLECTION_REWARD_POINTS);
}
async function reverseCardCollectionPoints(env: Env & PointEnv, dependencies: Dependencies, owner: string, cardId: string) {
  const card = await getContactCard(env, owner, cardId), points = Number(card.rewardPoints || 0);
  if (card.rewardStatus !== "completed" || points <= 0) return { reversedPoints: 0 };
  const remark = pointRemark(owner, cardId, "reversal"), before = await queryMotherPoints(env, dependencies, owner);
  if (!pointList(before).some((item) => clean(item.shop_remark) === remark)) await insertMotherPoints(env, dependencies, owner, -points, remark, "TDEA 刪除收藏名片扣回");
  await updateContactCardReward(env, owner, cardId, "reversed", points); return { reversedPoints: points };
}
export async function handleCardCollectionApi(request: Request, env: Env & PointEnv, dependencies: Dependencies = {}): Promise<Response | null> {
  const url = new URL(request.url), isV1 = url.pathname === "/v1/card-collection" || url.pathname.startsWith("/v1/card-collection/");
  if (!isV1) return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const owner = await ownerFrom(request, env, dependencies);
    if (request.method === "GET" && url.pathname === "/v1/card-collection") {
      const cards = await listContactCards(env, owner, url.searchParams.get("search") || "", url.searchParams.get("industry") || "");
      const industryOptions = Array.from(new Set(cards.flatMap((card) => [card.industry.primary, ...card.industry.secondary]).filter(Boolean))).sort();
      return json({ success: true, cards: cards.map(decorate), industryOptions, rankingStatus: null, recovery: null });
    }
    if (request.method === "POST" && url.pathname === "/v1/card-collection/imports") {
      const form = await request.formData(), front = await imagePart(form.get("front"), true), back = await imagePart(form.get("back"), false);
      const imported = await createCardImport(env, owner, front!, back);
      return json({ success: true, import: { id: imported.id, imageCount: imported.backKey ? 2 : 1 } }, 201);
    }
    const recognize = url.pathname.match(/^\/v1\/card-collection\/imports\/([^/]+)\/recognize$/);
    if (request.method === "POST" && recognize) {
      const eventId = decodeURIComponent(recognize[1]), images = await getCardImportImages(env, owner, eventId);
      try {
        const ocr = await (dependencies.recognizeBusinessCard || recognizeBusinessCard)(env, dataUrl(await images.front.arrayBuffer(), images.record.frontContentType), images.back ? dataUrl(await images.back.arrayBuffer(), images.back.httpMetadata?.contentType || "image/webp") : "");
        await saveCardImportOcr(env, owner, eventId, ocr);
        const { confidence, language, ...card } = ocr;
        return json({ success: true, eventId, card, confidence, language });
      } catch (error) { await failCardImport(env, owner, eventId); throw error; }
    }
    const confirm = url.pathname.match(/^\/v1\/card-collection\/imports\/([^/]+)\/confirm$/);
    if (request.method === "POST" && confirm) {
      const input = await request.json().catch(() => ({})) as Record<string, unknown>;
      const result = await confirmCardImport(env, owner, decodeURIComponent(confirm[1]), cardInput(input.card), clean(input.duplicateAction, 20));
      if (result.updated) return json({ success: true, updated: true, awardedPoints: 0, card: decorate(result.card) });
      try {
        const rewarded = await awardCardCollectionPoints(env, dependencies, owner, result.card.id);
        return json({ success: true, updated: false, awardedPoints: CARD_COLLECTION_REWARD_POINTS, card: decorate(rewarded) });
      } catch (error) {
        console.error("Card collection reward pending", result.card.id, error);
        return json({ success: true, updated: false, awardedPoints: 0, rewardPending: true, rewardMessage: error instanceof Error ? error.message : "名片已收藏，點數稍後補入", card: decorate(result.card) });
      }
    }
    const image = url.pathname.match(/^\/v1\/card-collection\/([^/]+)\/image$/);
    if (request.method === "GET" && image) {
      const object = await getContactCardImage(env, owner, decodeURIComponent(image[1]));
      if (!object) throw new CardCollectionError("找不到名片圖片", 404, "image_not_found");
      const responseHeaders = new Headers(cors); object.writeHttpMetadata(responseHeaders); responseHeaders.set("cache-control", "private, no-store");
      return new Response(object.body, { headers: responseHeaders });
    }
    const detail = url.pathname.match(/^\/v1\/card-collection\/([^/]+)$/);
    if (request.method === "GET" && detail) return json({ success: true, card: decorate(await getContactCard(env, owner, decodeURIComponent(detail[1]))) });
    if (request.method === "PATCH" && detail) {
      const input = await request.json().catch(() => ({}));
      return json({ success: true, card: decorate(await updateContactCard(env, owner, decodeURIComponent(detail[1]), cardPatch(input))) });
    }
    if (request.method === "DELETE" && detail) {
      const cardId = decodeURIComponent(detail[1]), reversal = await reverseCardCollectionPoints(env, dependencies, owner, cardId);
      await archiveContactCard(env, owner, cardId); return json({ success: true, reversedPoints: reversal.reversedPoints });
    }
    return json({ success: false, message: "Card collection API not found" }, 404);
  } catch (error) {
    if (error instanceof CardCollectionError) {
      const duplicate = error.code === "duplicate_contact" ? { duplicate: decorate(error.data as { frontKey?: string }) } : {};
      return json({ success: false, code: error.code, message: error.message, error: error.message, ...duplicate }, error.status);
    }
    return json({ success: false, message: error instanceof Error ? error.message : "名片收藏操作失敗", error: error instanceof Error ? error.message : "名片收藏操作失敗" }, 500);
  }
}
