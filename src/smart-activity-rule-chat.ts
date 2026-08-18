export type SmartRuleChatEnv = { GEMINI_API_KEY?: string; GEMINI_RULE_MODEL?: string; [key:string]: unknown };

const clean=(v:unknown,max=12000)=>String(v??"").trim().slice(0,max);
function geminiText(body:any){for(const c of Array.isArray(body?.candidates)?body.candidates:[])for(const p of Array.isArray(c?.content?.parts)?c.content.parts:[])if(typeof p?.text==="string")return p.text;return "";}

async function callGemini(env:SmartRuleChatEnv,prompt:string,timeout=10000){
  const key=clean(env.GEMINI_API_KEY,500); if(!key) throw new Error("GEMINI_API_KEY is not configured");
  const model=clean(env.GEMINI_RULE_MODEL,120)||"gemini-3.5-flash-lite";
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(timeout),
    body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{thinkingConfig:{thinkingLevel:"minimal"},maxOutputTokens:2500}})
  });
  const body:any=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(clean(body?.error?.message||body?.message||`Gemini HTTP ${response.status}`,500));
  const text=clean(geminiText(body),10000); if(!text) throw new Error("AI 沒有回傳規則解析");
  return {text,model};
}

export async function analyzeActivityRules(env:SmartRuleChatEnv,ocrText:string,userNote=""){
  const prompt=[
    "你是活動報名規則顧問。輸入已是 OCR 文字，不要再做 OCR，也不要直接產生表單欄位。",
    "請先把活動規則整理成讓人可以校正的『確認稿』。",
    "重點辨識：參加方案、每一種計價單位、數量來源、是否可一人多份/多桿/多房、名額限制、現場另收費、付款時機、必要資格。",
    "人、桿、房、餐、桌、份、張必須分開。不能假設一人一桿。",
    "例如：釣蝦750元/桿、比賽者餐敘500元/人、純餐敘600元/人，必須分成三個獨立數量。",
    "若海報沒有說明一人最多幾桿，就寫『桿數可由報名者自行填寫，未設定一人一桿限制』，不要自己補限制。",
    "請用繁體中文、條列清楚，最後增加『待確認』區塊列出不確定事項。",
    `【OCR文字】\n${clean(ocrText,12000)}`,
    userNote?`【使用者補充】\n${clean(userNote,4000)}`:""
  ].filter(Boolean).join("\n\n");
  return callGemini(env,prompt,10000);
}

export async function refineActivityRules(env:SmartRuleChatEnv,ocrText:string,currentRules:string,userMessage:string){
  const prompt=[
    "你正在和活動管理者一起敲定報名規則。不要重做 OCR，不要產生表單欄位。",
    "請依使用者最新說明修正『目前確認稿』，保留未被否定的內容。",
    "使用者說明優先於 OCR。若使用者指出『一人可能2桿或3桿』，就必須把人數與桿數完全分離，並明確寫出計價公式。",
    "輸出一份更新後的完整確認稿，仍需有『待確認』區塊。",
    `【OCR原文】\n${clean(ocrText,12000)}`,
    `【目前確認稿】\n${clean(currentRules,10000)}`,
    `【使用者最新說明】\n${clean(userMessage,4000)}`
  ].join("\n\n");
  return callGemini(env,prompt,10000);
}
