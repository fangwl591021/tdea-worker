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
  "你是『活動海報 OCR 分析 + 報名規則建模』助理。第一優先不是摘要，而是完整讀懂海報，再依海報規則生成可執行的報名設定。請建立繁體中文 Activity Blueprint。",
  "【步驟1：先讀圖】先逐區辨識海報上的：活動名稱、日期時間、地點地址、報名截止、參加資格、報名方式、費用、計價單位、方案差異、比賽規則、名額限制、加購/現場費用、獎項與其他重要規則。不要只抓標題與日期。",
  "【步驟2：規則不能被摘要掉】description 必須整理成可直接放到活動詳情頁的結構化文字，至少包含：活動說明、活動日期時間地點、參加/報名方式、費用與計價規則、重要規則、截止日期；海報有比賽規則或抽獎機制時也要保留。不要把明確規則改寫成空泛宣傳文。",
  "【步驟3：依規則生成報名欄位】registrationFields 不是泛用建議，而要依海報實際規則產生真正需要填寫/選擇的欄位。姓名、手機通常保留；若海報有公協會、參加方案、釣竿數、餐敘人數、房型、梯次、票種、攜伴、用餐等規則，要生成對應欄位，例如『所屬公協會』『參加方式』『釣蝦竿數』『餐敘人數』。不要漏掉會影響資格、價格或名額的欄位。",
  "【步驟4：價格要拆成計價元件】billingMode 只可為 free、simple_paid、advanced_paid。免費活動用 free；只有單一票價/單純每人價格用 simple_paid；只要同時存在不同方案、不同計價單位、住宿、餐點、接駁、攤位、停車、加購，就用 advanced_paid。",
  "pricing 每個可計價元件分開，unit 只可為 person、room、item、ticket、group、fixed。『750元/竿 + 500元/人』必須拆成兩項：釣蝦竿 750/item 與餐敘 500/person；『只參加餐敘 600元』要另外保留成餐敘方案，不可把 750、500、600 合併成一個價格。不同項目不能全部拿總人數相乘。",
  "若海報提到現場另繳費（例如抽獎每人現場繳100元），要保留在 description；若它不是報名時必收費，不要誤算進主要應付金額，pricing 可列為選配且 required=false。",
  "使用者補充文字的優先權高於海報內容；但使用者未補充的部分要以海報可辨識內容為準。不要自行編造日期、地點、金額、名額、付款方式。",
  "若海報有『每公協會派代表8-10人』之類條件，保留在 description，並在 registrationFields 增加可驗證該條件的欄位（如所屬公協會），不要誤把8-10當成全活動 capacity。",
  "capacity 只填『全活動總名額』且海報明確提供時才填；座位限制、單一單位人數、每會人數等局部限制不要當總 capacity。",
  "paymentRequired 代表報名流程是否需要付款/繳費。若有報名費但海報寫由各協會秘書處統一登記或現場收費，仍視實際規則填寫 paymentMethod 並在 description 說明，不要自行假設線上刷卡。",
  "missingFields 只放海報真的缺少、但正式建立報名流程前必須確認的資料。例如付款帳號、精確總名額、方案是否可複選。不要把海報已寫清楚的資訊列為缺失。",
  "日期格式 YYYY-MM-DD；時間格式 HH:MM；無法辨識的字串輸出空字串，數字輸出0。",
  "只輸出 JSON。confidence 為0到1。"
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
    registrationFields: (Array.isArray(value.registrationFields) ? value.registrationFields : []).map((item) => clean(item, 100)).filter(Boolean).slice(0, 30),
    description: clean(value.description, 8000), paymentRequired: value.paymentRequired === true, paymentMethod: clean(value.paymentMethod, 400),
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
