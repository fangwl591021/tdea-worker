import type { CardOcrFields } from "./card-collection";

export type CardOcrEnv = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
const clean = (value: unknown, max = 4000) => String(value ?? "").trim().slice(0, max);

function outputText(body: Record<string, unknown>) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of Array.isArray(body.output) ? body.output : []) {
    if (!item || typeof item !== "object") continue;
    for (const part of Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : []) {
      if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") return String((part as Record<string, unknown>).text);
    }
  }
  return "";
}
function parseJsonText(text: string) {
  try { return JSON.parse(text.trim()) as Record<string, unknown>; }
  catch { const match = text.match(/\{[\s\S]*\}/); if (!match) throw new Error("AI OCR 未回傳可解析的 JSON"); return JSON.parse(match[0]) as Record<string, unknown>; }
}
function validateImage(value: string, label: string) {
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) throw new Error(`${label}只接受 JPEG、PNG 或 WebP 圖片`);
  if (value.length > 12 * 1024 * 1024) throw new Error(`${label}圖片資料過大`);
}
function normalize(value: Record<string, unknown>): CardOcrFields {
  return {
    displayName: clean(value.displayName, 160), englishName: clean(value.englishName, 160),
    companyName: clean(value.companyName, 240), jobTitle: clean(value.jobTitle, 160),
    department: clean(value.department, 160), mobile: clean(value.mobile, 80),
    companyPhone: clean(value.companyPhone, 80), email: clean(value.email, 320),
    websiteUrl: clean(value.websiteUrl, 2048), lineUrl: clean(value.lineUrl, 2048),
    address: clean(value.address, 500), serviceDescription: clean(value.serviceDescription, 3000),
    note: clean(value.note, 3000), confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
    language: clean(value.language, 80)
  };
}

export async function recognizeBusinessCard(env: CardOcrEnv, frontImage: string, backImage = ""): Promise<CardOcrFields> {
  const apiKey = clean(env.OPENAI_API_KEY, 500); if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  validateImage(frontImage, "名片正面"); if (backImage) validateImage(backImage, "名片背面");
  const content: Array<Record<string, unknown>> = [{
    type: "input_text",
    text: [
      "你是繁體中文名片 OCR 助理。正面是主要來源，背面只作補充。",
      "不要推測圖片沒有的內容，不要把正背面重複文字拼錯，不要進行產業推論或網路搜尋。",
      "只輸出 JSON。無法辨識的字串欄位輸出空字串。confidence 為 0 到 1，language 為主要語言。"
    ].join("\n")
  }, { type: "input_image", image_url: frontImage }];
  if (backImage) content.push({ type: "input_image", image_url: backImage });
  const fields = ["displayName","englishName","companyName","jobTitle","department","mobile","companyPhone","email","websiteUrl","lineUrl","address","serviceDescription","note","language"];
  const properties = Object.fromEntries(fields.map((field) => [field, { type: "string" }]));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: clean(env.OPENAI_MODEL, 120) || "gpt-5-mini",
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "business_card_ocr", strict: true, schema: { type: "object", additionalProperties: false, properties: { ...properties, confidence: { type: "number" } }, required: [...fields, "confidence"] } } }
    })
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {};
    throw new Error(clean(error.message || body.message || "名片 OCR 服務失敗", 500));
  }
  const text = outputText(body); if (!text) throw new Error("AI OCR 沒有回傳辨識內容");
  return normalize(parseJsonText(text));
}
