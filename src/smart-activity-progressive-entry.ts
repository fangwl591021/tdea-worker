import app from "./custom-field-id-entry";

type Env = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  [key: string]: unknown;
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (v: unknown, max = 12000) => String(v ?? "").trim().slice(0, max);

function imageBlob(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error("活動海報格式錯誤");
  return {
    mimeType: match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase(),
    data: match[2]
  };
}

function geminiText(body: any) {
  for (const c of Array.isArray(body?.candidates) ? body.candidates : []) {
    for (const p of Array.isArray(c?.content?.parts) ? c.content.parts : []) {
      if (typeof p?.text === "string") return p.text;
    }
  }
  return "";
}

async function ocrPoster(env: Env, posterDataUrl: string) {
  const key = clean(env.GEMINI_API_KEY, 500);
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model = clean(env.GEMINI_MODEL, 120) || "gemini-3.6-flash";
  const image = imageBlob(posterDataUrl);
  const prompt = [
    "你只做活動海報 OCR，不做摘要、不做分類、不建立報名欄位。",
    "請依圖片閱讀順序完整抄錄所有可辨識文字。",
    "日期、時間、地址、費用、計價單位、人數、房型、桿數、餐費、點數、截止日、規則、備註、主辦協辦與聯絡資訊全部保留。",
    "看不清楚處寫 [辨識不清]，不要猜。",
    "只輸出純文字。"
  ].join("\n");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: image.mimeType, data: image.data } }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 5000 }
    })
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(clean(body?.error?.message || body?.message || `Gemini OCR HTTP ${response.status}`, 500));
  const text = clean(geminiText(body), 12000);
  if (!text) throw new Error("海報文字辨識沒有回傳內容");
  return { text, model };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/smart-activities/ocr") {
      try {
        const input = await request.json().catch(() => ({})) as Record<string, unknown>;
        const posterDataUrl = clean(input.posterDataUrl, 12 * 1024 * 1024);
        if (!posterDataUrl) return json({ success: false, message: "請先上傳活動海報" }, 400);
        const result = await ocrPoster(env, posterDataUrl);
        return json({ success: true, ocrText: result.text, modelUsed: result.model });
      } catch (error) {
        const message = error instanceof Error ? error.message : "圖片文字辨識失敗";
        return json({ success: false, message }, 500);
      }
    }
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
