export type SmartActivityEnv = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export type SmartActivityPricingItem = {
  name: string;
  amount: number;
  unit: "person" | "room" | "item" | "ticket" | "group" | "fixed";
  required: boolean;
};

export type SmartActivityBlueprint = {
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  address: string;
  capacity: number;
  billingMode: "free" | "simple_paid" | "advanced_paid";
  pricing: SmartActivityPricingItem[];
  registrationFields: string[];
  description: string;
  paymentRequired: boolean;
  paymentMethod: string;
  missingFields: string[];
  confidence: number;
};

export type SmartActivityAnalysis = SmartActivityBlueprint & {
  providerUsed: "gemini" | "openai";
  modelUsed: string;
  fallbackUsed: boolean;
  primaryProvider?: "gemini";
  primaryError?: string;
};

const clean = (value: unknown, max = 4000) => String(value ?? "").trim().slice(0, max);

const PROMPT = [
  "你是活動海報分析與報名頁規劃助理。請從活動海報與使用者補充文字，建立繁體中文 Activity Blueprint。",
  "使用者補充文字的優先權高於海報內容；海報有明確資訊時才採用，不要自行編造日期、地點、金額、名額、付款方式。",
  "billingMode 只可為 free、simple_paid、advanced_paid。免費活動用 free；只有票種或單純每人價格用 simple_paid；含住宿、餐點、接駁、攤位、停車或不同計價單位時用 advanced_paid。",
  "pricing 每個項目要分開，unit 只可為 person、room、item、ticket、group、fixed。不同項目不能全部拿總人數相乘。",
  "registrationFields 請依活動性質提出精簡建議，通常包含姓名與手機，其餘只在合理時加入。",
  "缺少但發布前應確認的重要資料放入 missingFields。不要把 AI 推測寫成已確認事實。",
  "日期格式 YYYY-MM-DD；時間格式 HH:MM；無法辨識的字串輸出空字串，數字輸出 0。",
  "只輸出 JSON。confidence 為 0 到 1。"
].join("\n");

function validateImage(value: string) {
  if (!value) return;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) throw new Error("活動海報只接受 JPEG、PNG 或 WebP 圖片");
  if (value.length > 12 * 1024 * 1024) throw new Error("活動海報圖片資料過大，請先縮小圖片");
}

function imageBlob(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error("活動海報格式無法提供給 Gemini");
  return { mimeType: match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase(), data: match[2] };
}

function schema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      category: { type: "string" },
      date: { type: "string" },
      startTime: { type: "string" },
      endTime: { type: "string" },
      venueName: { type: "string" },
      address: { type: "string" },
      capacity: { type: "number" },
      billingMode: { type: "string", enum: ["free", "simple_paid", "advanced_paid"] },
      pricing: { type: "array", items: { type: "object", additionalProperties: false, properties: {
        name: { type: "string" }, amount: { type: "number" },
        unit: { type: "string", enum: ["person", "room", "item", "ticket", "group", "fixed"] },
        required: { type: "boolean" }
      }, required: ["name", "amount", "unit", "required"] } },
      registrationFields: { type: "array", items: { type: "string" } },
      description: { type: "string" },
      paymentRequired: { type: "boolean" },
      paymentMethod: { type: "string" },
      missingFields: { type: "array", items: { type: "string" } },
      confidence: { type: "number" }
    },
    required: ["title", "category", "date", "startTime", "endTime", "venueName", "address", "capacity", "billingMode", "pricing", "registrationFields", "description", "paymentRequired", "paymentMethod", "missingFields", "confidence"]
  };
}

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
    if (!match) throw new Error("AI 未回傳可解析的活動 JSON");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizePricing(value: unknown): SmartActivityPricingItem[] {
  return (Array.isArray(value) ? value : []).map((row) => {
    const item = row && typeof row === "object" ? row as Record<string, unknown> : {};
    const unitValue = clean(item.unit, 30);
    const unit = (["person", "room", "item", "ticket", "group", "fixed"].includes(unitValue) ? unitValue : "person") as SmartActivityPricingItem["unit"];
    return { name: clean(item.name, 120), amount: Math.max(0, Number(item.amount) || 0), unit, required: item.required === true };
  }).filter((item) => item.name);
}

function normalize(value: Record<string, unknown>): SmartActivityBlueprint {
  const mode = clean(value.billingMode, 30);
  const billingMode = (["free", "simple_paid", "advanced_paid"].includes(mode) ? mode : "free") as SmartActivityBlueprint["billingMode"];
  return {
    title: clean(value.title, 240), category: clean(value.category, 120), date: clean(value.date, 20), startTime: clean(value.startTime, 20), endTime: clean(value.endTime, 20), venueName: clean(value.venueName, 240), address: clean(value.address, 500), capacity: Math.max(0, Math.round(Number(value.capacity) || 0)), billingMode,
    pricing: normalizePricing(value.pricing),
    registrationFields: (Array.isArray(value.registrationFields) ? value.registrationFields : []).map((item) => clean(item, 100)).filter(Boolean).slice(0, 20),
    description: clean(value.description, 5000), paymentRequired: value.paymentRequired === true, paymentMethod: clean(value.paymentMethod, 200),
    missingFields: (Array.isArray(value.missingFields) ? value.missingFields : []).map((item) => clean(item, 160)).filter(Boolean).slice(0, 20),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0))
  };
}

async function analyzeWithGemini(env: SmartActivityEnv, posterDataUrl: string, userText: string) {
  const apiKey = clean(env.GEMINI_API_KEY, 500); if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model = clean(env.GEMINI_MODEL, 120) || "gemini-3.6-flash";
  const parts: Array<Record<string, unknown>> = [{ text: `${PROMPT}\n\n使用者補充文字：\n${userText || "（無）"}` }];
  if (posterDataUrl) { const image = imageBlob(posterDataUrl); parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } }); }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": apiKey, "content-type": "application/json" }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema(), temperature: 0 } })
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) { const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {}; throw new Error(clean(error.message || body.message || `Gemini HTTP ${response.status}`, 500)); }
  const text = geminiText(body); if (!text) throw new Error("Gemini 沒有回傳活動分析內容");
  return { blueprint: normalize(parseJson(text)), model };
}

async function analyzeWithOpenAI(env: SmartActivityEnv, posterDataUrl: string, userText: string) {
  const apiKey = clean(env.OPENAI_API_KEY, 500); if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = clean(env.OPENAI_MODEL, 120) || "gpt-5-mini";
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: `${PROMPT}\n\n使用者補充文字：\n${userText || "（無）"}` }];
  if (posterDataUrl) content.push({ type: "input_image", image_url: posterDataUrl });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, signal: AbortSignal.timeout(25000),
    body: JSON.stringify({ model, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "smart_activity_blueprint", strict: true, schema: schema() } } })
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) { const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {}; throw new Error(clean(error.message || body.message || `OpenAI HTTP ${response.status}`, 500)); }
  const text = outputText(body); if (!text) throw new Error("OpenAI 沒有回傳活動分析內容");
  return { blueprint: normalize(parseJson(text)), model };
}

const safeError = (error: unknown) => clean(error instanceof Error ? error.message : String(error || "AI failed"), 500);

export async function analyzeSmartActivity(env: SmartActivityEnv, posterDataUrl = "", userText = ""): Promise<SmartActivityAnalysis> {
  validateImage(posterDataUrl);
  const text = clean(userText, 6000);
  if (!posterDataUrl && !text) throw new Error("請先上傳活動海報或輸入文字敘述");
  let primaryError = "";
  try {
    const gemini = await analyzeWithGemini(env, posterDataUrl, text);
    return { ...gemini.blueprint, providerUsed: "gemini", modelUsed: gemini.model, fallbackUsed: false };
  } catch (error) { primaryError = safeError(error); }
  try {
    const openai = await analyzeWithOpenAI(env, posterDataUrl, text);
    return { ...openai.blueprint, providerUsed: "openai", modelUsed: openai.model, fallbackUsed: true, primaryProvider: "gemini", primaryError };
  } catch (error) {
    throw new Error(`智能活動分析失敗：Gemini=${primaryError || "unknown"}; OpenAI=${safeError(error) || "unknown"}`);
  }
}
