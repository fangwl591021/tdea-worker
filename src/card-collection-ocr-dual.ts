import { recognizeBusinessCard as recognizeWithOpenAI, type CardOcrEnv as OpenAiOcrEnv } from "./card-collection-ocr";
import type { CardOcrFields } from "./card-collection";

export type CardOcrProviderMeta = {
  providerUsed: "gemini" | "openai";
  modelUsed: string;
  fallbackUsed: boolean;
  primaryProvider?: "gemini";
  primaryError?: string;
};

export type DualCardOcrFields = CardOcrFields & CardOcrProviderMeta;
export type DualCardOcrEnv = OpenAiOcrEnv & { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };

const clean = (value: unknown, max = 4000) => String(value ?? "").trim().slice(0, max);
const PROMPT = [
  "你是繁體中文名片 OCR 助理。正面是主要來源，背面只作補充。",
  "不要推測圖片沒有的內容，不要把正背面重複文字拼錯，不要進行產業推論或網路搜尋。",
  "只輸出 JSON。無法辨識的字串欄位輸出空字串。confidence 為 0 到 1，language 為主要語言。"
].join("\n");
const FIELDS = ["displayName","englishName","companyName","jobTitle","department","mobile","companyPhone","email","websiteUrl","lineUrl","address","serviceDescription","note","language"] as const;
const CRITICAL = ["displayName","companyName","jobTitle","mobile","companyPhone","email","websiteUrl","address"] as const;

function validateImage(value: string, label: string) {
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) throw new Error(`${label}只接受 JPEG、PNG 或 WebP 圖片`);
  if (value.length > 12 * 1024 * 1024) throw new Error(`${label}圖片資料過大`);
}

function imageBlob(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error("名片圖片格式無法提供給 Gemini");
  return { mimeType: match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase(), data: match[2] };
}

function schema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ...Object.fromEntries(FIELDS.map((field) => [field, { type: "string" }])),
      confidence: { type: "number", minimum: 0, maximum: 1 }
    },
    required: [...FIELDS, "confidence"]
  };
}

function geminiText(body: Record<string, unknown>) {
  for (const candidate of Array.isArray(body.candidates) ? body.candidates : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== "object") continue;
    for (const part of Array.isArray((content as Record<string, unknown>).parts) ? (content as Record<string, unknown>).parts as unknown[] : []) {
      if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") return String((part as Record<string, unknown>).text);
    }
  }
  return "";
}

function parseJson(text: string) {
  try { return JSON.parse(text.trim()) as Record<string, unknown>; }
  catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini OCR 未回傳可解析的 JSON");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalize(value: Record<string, unknown>): CardOcrFields {
  const fields: CardOcrFields = {
    displayName: clean(value.displayName, 160), englishName: clean(value.englishName, 160), companyName: clean(value.companyName, 240),
    jobTitle: clean(value.jobTitle, 160), department: clean(value.department, 160), mobile: clean(value.mobile, 80), companyPhone: clean(value.companyPhone, 80),
    email: clean(value.email, 320), websiteUrl: clean(value.websiteUrl, 2048), lineUrl: clean(value.lineUrl, 2048), address: clean(value.address, 500),
    serviceDescription: clean(value.serviceDescription, 3000), note: clean(value.note, 3000), confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
    language: clean(value.language, 80)
  };
  if (!CRITICAL.some((field) => clean(fields[field], 320))) throw new Error("Gemini OCR 未辨識到可用的名片欄位");
  return fields;
}

async function recognizeWithGemini(env: DualCardOcrEnv, frontImage: string, backImage = "") {
  const apiKey = clean(env.GEMINI_API_KEY, 500);
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model = clean(env.GEMINI_MODEL, 120) || "gemini-3.6-flash";
  const front = imageBlob(frontImage);
  const parts: Array<Record<string, unknown>> = [{ text: PROMPT }, { inline_data: { mime_type: front.mimeType, data: front.data } }];
  if (backImage) {
    const back = imageBlob(backImage);
    parts.push({ inline_data: { mime_type: back.mimeType, data: back.data } });
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema(), temperature: 0 } })
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {};
    throw new Error(clean(error.message || body.message || `Gemini OCR HTTP ${response.status}`, 500));
  }
  const text = geminiText(body);
  if (!text) throw new Error("Gemini OCR 沒有回傳辨識內容");
  return { fields: normalize(parseJson(text)), model };
}

const safeError = (error: unknown) => clean(error instanceof Error ? error.message : String(error || "Gemini OCR failed"), 500);

export async function recognizeBusinessCard(env: DualCardOcrEnv, frontImage: string, backImage = ""): Promise<DualCardOcrFields> {
  validateImage(frontImage, "名片正面");
  if (backImage) validateImage(backImage, "名片背面");
  let primaryError = "";
  try {
    const gemini = await recognizeWithGemini(env, frontImage, backImage);
    return { ...gemini.fields, providerUsed: "gemini", modelUsed: gemini.model, fallbackUsed: false };
  } catch (error) {
    primaryError = safeError(error);
  }
  try {
    const openai = await recognizeWithOpenAI(env, frontImage, backImage);
    return {
      ...openai,
      providerUsed: "openai",
      modelUsed: clean(env.OPENAI_MODEL, 120) || "gpt-5-mini",
      fallbackUsed: true,
      primaryProvider: "gemini",
      primaryError
    };
  } catch (error) {
    throw new Error(`名片 OCR 失敗：Gemini=${primaryError || "unknown"}; OpenAI=${safeError(error) || "unknown"}`);
  }
}
