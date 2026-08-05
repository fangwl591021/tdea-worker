export type CardOcrEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export type CardOcrResult = {
  displayName: string;
  companyName: string;
  jobTitle: string;
  mobile: string;
  email: string;
  lineUrl: string;
  websiteUrl: string;
  address: string;
  note: string;
  rawText: string;
  confidence: number;
};

const clean = (value: unknown, max = 4000) =>
  String(value ?? "").trim().slice(0, max);

function outputText(body: Record<string, unknown>) {
  if (typeof body.output_text === "string") return body.output_text;

  const output = Array.isArray(body.output) ? body.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const content = Array.isArray(
      (item as Record<string, unknown>).content
    )
      ? (item as Record<string, unknown>).content as unknown[]
      : [];

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }

  return "";
}

function parseJsonText(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch (_) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI OCR 未回傳可解析的 JSON");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeResult(value: Record<string, unknown>): CardOcrResult {
  return {
    displayName: clean(value.displayName, 120),
    companyName: clean(value.companyName, 180),
    jobTitle: clean(value.jobTitle, 120),
    mobile: clean(value.mobile, 60),
    email: clean(value.email, 320),
    lineUrl: clean(value.lineUrl, 2048),
    websiteUrl: clean(value.websiteUrl, 2048),
    address: clean(value.address, 300),
    note: clean(value.note, 1000),
    rawText: clean(value.rawText, 4000),
    confidence: Math.max(
      0,
      Math.min(1, Number(value.confidence) || 0)
    )
  };
}

export async function recognizeBusinessCard(
  env: CardOcrEnv,
  imageDataUrl: string
): Promise<CardOcrResult> {
  const apiKey = clean(env.OPENAI_API_KEY, 500);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(imageDataUrl)) {
    throw new Error("只接受 JPEG、PNG 或 WebP 名片圖片");
  }

  if (imageDataUrl.length > 8 * 1024 * 1024) {
    throw new Error("圖片資料過大，請裁切或壓縮後再試");
  }

  const model = clean(env.OPENAI_MODEL, 120) || "gpt-5-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "你是繁體中文名片 OCR 助理。",
                "請辨識這張名片，不要推測圖片中沒有的內容。",
                "姓名與公司名稱不要互換。",
                "電話保留原格式。",
                "Email 與網址請逐字確認。",
                "只輸出 JSON，不要加入 Markdown。",
                "JSON 欄位必須是：",
                "displayName, companyName, jobTitle, mobile, email,",
                "lineUrl, websiteUrl, address, note, rawText, confidence。",
                "confidence 為 0 到 1 的數字。",
                "無法辨識的欄位請輸出空字串。"
              ].join("\n")
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "business_card_ocr",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              displayName: { type: "string" },
              companyName: { type: "string" },
              jobTitle: { type: "string" },
              mobile: { type: "string" },
              email: { type: "string" },
              lineUrl: { type: "string" },
              websiteUrl: { type: "string" },
              address: { type: "string" },
              note: { type: "string" },
              rawText: { type: "string" },
              confidence: { type: "number" }
            },
            required: [
              "displayName",
              "companyName",
              "jobTitle",
              "mobile",
              "email",
              "lineUrl",
              "websiteUrl",
              "address",
              "note",
              "rawText",
              "confidence"
            ]
          }
        }
      }
    })
  });

  const body = await response.json().catch(() => ({})) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const error = body.error && typeof body.error === "object"
      ? body.error as Record<string, unknown>
      : {};

    throw new Error(
      clean(error.message || body.message || "名片 OCR 服務失敗", 500)
    );
  }

  const text = outputText(body);
  if (!text) throw new Error("AI OCR 沒有回傳辨識內容");

  return normalizeResult(parseJsonText(text));
}
