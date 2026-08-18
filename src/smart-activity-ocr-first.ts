export type SmartActivityEnv = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type PriceUnit = "person" | "room" | "item" | "ticket" | "group" | "fixed" | "rod" | "table" | "meal" | "day";
type PricingItem = { name:string; amount:number; unit:PriceUnit; required:boolean; quantityKey:string; paymentTiming:"registration"|"onsite"|"later" };
type QuantityField = { key:string; label:string; unit:string; min:number; max:number; required:boolean };
type RegistrationField = { key:string; label:string; type:"text"|"email"|"number"|"radio"|"checkbox"|"dropdown"|"paragraph"|"attachment"|"payment"|"quantity"; required:boolean; options:string[]; purpose:string; quantityKey:string };
type AgendaItem = { date:string; startTime:string; endTime:string; title:string; venue:string; note:string };
type OptionalItem = { name:string; amount:number; unit:PriceUnit; paymentTiming:"registration"|"onsite"|"later"; required:boolean };

export type SmartActivityAnalysis = {
  title:string; category:string; activityType:string;
  date:string; dateEnd:string; startTime:string; endTime:string; deadline:string;
  venueName:string; address:string; capacity:number;
  billingMode:"free"|"simple_paid"|"advanced_paid"|"points_only"|"points_or_cash";
  pricing:PricingItem[];
  quantityFields:QuantityField[];
  registrationFields:string[];
  registrationFieldSpecs:RegistrationField[];
  agenda:AgendaItem[];
  activityRules:string[];
  optionalOnsiteItems:OptionalItem[];
  description:string; paymentRequired:boolean; paymentMethod:string;
  missingFields:string[]; confidence:number;
  providerUsed:"gemini"|"openai"; modelUsed:string; fallbackUsed:boolean; primaryProvider?:"gemini"; primaryError?:string;
  ocrText:string;
};

const clean=(v:unknown,max=12000)=>String(v??"").trim().slice(0,max);
const arr=(v:any,max=100)=>(Array.isArray(v)?v:[]).slice(0,max);

const OCR_PROMPT = [
  "你只負責活動海報 OCR。",
  "請完整讀出圖片上所有可辨識文字，依閱讀順序輸出純文字。",
  "不要摘要、不要分類、不要生成活動、不要生成報名欄位。",
  "日期、時間、地址、費用、單位、人數、房型、竿數、餐費、點數、截止日、規則、備註、主辦協辦、聯絡資訊都要保留。",
  "看不清楚請寫[辨識不清]，不要自行補字。"
].join("\n");

const BUILD_PROMPT = [
  "你是智能報名欄位建立器。輸入內容已經是海報 OCR 文字，不再看圖片。",
  "請依 OCR 文字建立真正可執行的報名資料與欄位，而不是活動摘要。",
  "先抽取活動名稱、日期時間、截止日、地點地址、名額、多日行程、重要規則。沒寫的留空。",
  "再判斷 activityType，例如 free_course、paid_course、seminar、vendor_visit、competition、dining、trip、multi_day_trip、international_visit、training、points_activity、general。",
  "任何人、房、桿、桌、份、張、台、餐，都必須是獨立 quantity，禁止假設一人一桿或所有價格都乘總人數。",
  "例如750元/竿要建立 fishing_rod_count；500元/人餐敘要建立 competition_meal_count；只餐敘600元/人另建 meal_only_count。",
  "若有租竿，拆成是否租借與 rental_rod_count。不要叫使用者填『無』。",
  "現場另繳的抽獎、摸彩、最大獎、加購費放 optionalOnsiteItems，不得混入必要報名費；獎金獎品不是費用。",
  "點數活動要辨識 points_only 或 points_or_cash。",
  "registrationFieldSpecs 才是正式報名欄位：數量用 quantity/number；附件用 attachment；匯款末五碼用 payment；文字用 text；選項用 radio/dropdown/checkbox。",
  "課程/講座可依內容加入公司、職稱；參訪可加入公司/是否用餐；旅遊/跨境可加入證件/護照/出生日期/緊急聯絡人/附件；競賽要加入單位與比賽相關數量。",
  "registrationFields 同步輸出欄位名稱陣列供舊前端使用。",
  "日期 YYYY-MM-DD，時間 HH:MM；民國年轉西元。",
  "只輸出符合 JSON schema 的 JSON。"
].join("\n");

function schema(){return {type:"object",additionalProperties:false,properties:{
  title:{type:"string"},category:{type:"string"},activityType:{type:"string"},date:{type:"string"},dateEnd:{type:"string"},startTime:{type:"string"},endTime:{type:"string"},deadline:{type:"string"},venueName:{type:"string"},address:{type:"string"},capacity:{type:"number"},
  billingMode:{type:"string",enum:["free","simple_paid","advanced_paid","points_only","points_or_cash"]},
  pricing:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},amount:{type:"number"},unit:{type:"string",enum:["person","room","item","ticket","group","fixed","rod","table","meal","day"]},required:{type:"boolean"},quantityKey:{type:"string"},paymentTiming:{type:"string",enum:["registration","onsite","later"]}},required:["name","amount","unit","required","quantityKey","paymentTiming"]}},
  quantityFields:{type:"array",items:{type:"object",additionalProperties:false,properties:{key:{type:"string"},label:{type:"string"},unit:{type:"string"},min:{type:"number"},max:{type:"number"},required:{type:"boolean"}},required:["key","label","unit","min","max","required"]}},
  registrationFields:{type:"array",items:{type:"string"}},
  registrationFieldSpecs:{type:"array",items:{type:"object",additionalProperties:false,properties:{key:{type:"string"},label:{type:"string"},type:{type:"string",enum:["text","email","number","radio","checkbox","dropdown","paragraph","attachment","payment","quantity"]},required:{type:"boolean"},options:{type:"array",items:{type:"string"}},purpose:{type:"string"},quantityKey:{type:"string"}},required:["key","label","type","required","options","purpose","quantityKey"]}},
  agenda:{type:"array",items:{type:"object",additionalProperties:false,properties:{date:{type:"string"},startTime:{type:"string"},endTime:{type:"string"},title:{type:"string"},venue:{type:"string"},note:{type:"string"}},required:["date","startTime","endTime","title","venue","note"]}},
  activityRules:{type:"array",items:{type:"string"}},
  optionalOnsiteItems:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},amount:{type:"number"},unit:{type:"string",enum:["person","room","item","ticket","group","fixed","rod","table","meal","day"]},paymentTiming:{type:"string",enum:["registration","onsite","later"]},required:{type:"boolean"}},required:["name","amount","unit","paymentTiming","required"]}},
  description:{type:"string"},paymentRequired:{type:"boolean"},paymentMethod:{type:"string"},missingFields:{type:"array",items:{type:"string"}},confidence:{type:"number"}
},required:["title","category","activityType","date","dateEnd","startTime","endTime","deadline","venueName","address","capacity","billingMode","pricing","quantityFields","registrationFields","registrationFieldSpecs","agenda","activityRules","optionalOnsiteItems","description","paymentRequired","paymentMethod","missingFields","confidence"]};}

function validateImage(v:string){if(!v)return;if(!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(v))throw new Error("活動海報只接受 JPEG、PNG 或 WebP");if(v.length>12*1024*1024)throw new Error("活動海報圖片資料過大");}
function imageBlob(v:string){const m=v.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);if(!m)throw new Error("活動海報格式錯誤");return{mimeType:m[1].toLowerCase()==="image/jpg"?"image/jpeg":m[1].toLowerCase(),data:m[2]};}
function geminiText(body:any){for(const c of Array.isArray(body.candidates)?body.candidates:[])for(const p of Array.isArray(c?.content?.parts)?c.content.parts:[])if(typeof p?.text==="string")return p.text;return "";}
function outputText(body:any){if(typeof body.output_text==="string")return body.output_text;for(const i of Array.isArray(body.output)?body.output:[])for(const p of Array.isArray(i?.content)?i.content:[])if(typeof p?.text==="string")return p.text;return "";}
function parseJson(text:string){try{return JSON.parse(text.trim())}catch{const m=text.match(/\{[\s\S]*\}/);if(!m)throw new Error("AI 未回傳可解析 JSON");return JSON.parse(m[0]);}}

function normalize(v:any){
  const mode=["free","simple_paid","advanced_paid","points_only","points_or_cash"].includes(clean(v.billingMode,30))?clean(v.billingMode,30):"free";
  return {
    title:clean(v.title,240),category:clean(v.category,120),activityType:clean(v.activityType,80),date:clean(v.date,20),dateEnd:clean(v.dateEnd,20),startTime:clean(v.startTime,20),endTime:clean(v.endTime,20),deadline:clean(v.deadline,30),venueName:clean(v.venueName,240),address:clean(v.address,500),capacity:Math.max(0,Math.round(Number(v.capacity)||0)),billingMode:mode,
    pricing:arr(v.pricing).map((x:any)=>({name:clean(x?.name,160),amount:Math.max(0,Number(x?.amount)||0),unit:clean(x?.unit,30)||"person",required:x?.required===true,quantityKey:clean(x?.quantityKey,100),paymentTiming:["registration","onsite","later"].includes(clean(x?.paymentTiming,20))?clean(x.paymentTiming,20):"registration"})).filter((x:any)=>x.name),
    quantityFields:arr(v.quantityFields).map((x:any)=>({key:clean(x?.key,100),label:clean(x?.label,160),unit:clean(x?.unit,40),min:Math.max(0,Number(x?.min)||0),max:Math.max(0,Number(x?.max)||0),required:x?.required===true})).filter((x:any)=>x.key&&x.label),
    registrationFields:arr(v.registrationFields,40).map((x:any)=>clean(x,120)).filter(Boolean),
    registrationFieldSpecs:arr(v.registrationFieldSpecs).map((x:any)=>({key:clean(x?.key,100),label:clean(x?.label,160),type:clean(x?.type,30),required:x?.required===true,options:arr(x?.options,30).map((o:any)=>clean(o,120)).filter(Boolean),purpose:clean(x?.purpose,160),quantityKey:clean(x?.quantityKey,100)})).filter((x:any)=>x.key&&x.label),
    agenda:arr(v.agenda).map((x:any)=>({date:clean(x?.date,20),startTime:clean(x?.startTime,20),endTime:clean(x?.endTime,20),title:clean(x?.title,240),venue:clean(x?.venue,240),note:clean(x?.note,500)})).filter((x:any)=>x.title),
    activityRules:arr(v.activityRules,60).map((x:any)=>clean(x,500)).filter(Boolean),
    optionalOnsiteItems:arr(v.optionalOnsiteItems,30).map((x:any)=>({name:clean(x?.name,160),amount:Math.max(0,Number(x?.amount)||0),unit:clean(x?.unit,30)||"fixed",paymentTiming:["registration","onsite","later"].includes(clean(x?.paymentTiming,20))?clean(x.paymentTiming,20):"onsite",required:x?.required===true})).filter((x:any)=>x.name),
    description:clean(v.description,7000),paymentRequired:v.paymentRequired===true,paymentMethod:clean(v.paymentMethod,300),missingFields:arr(v.missingFields,40).map((x:any)=>clean(x,200)).filter(Boolean),confidence:Math.max(0,Math.min(1,Number(v.confidence)||0))
  };
}

async function ocrPoster(env:SmartActivityEnv,poster:string){
  const key=clean(env.GEMINI_API_KEY,500);if(!key)throw new Error("GEMINI_API_KEY is not configured");
  const model=clean(env.GEMINI_MODEL,120)||"gemini-3.6-flash";
  const image=imageBlob(poster);
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(15000),body:JSON.stringify({contents:[{role:"user",parts:[{text:OCR_PROMPT},{inline_data:{mime_type:image.mimeType,data:image.data}}]}],generationConfig:{temperature:0,maxOutputTokens:5000}})});
  const b:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(clean(b?.error?.message||b?.message||`Gemini OCR HTTP ${r.status}`,500));
  const text=clean(geminiText(b),12000);if(!text)throw new Error("海報文字辨識沒有回傳內容");
  return {text,model};
}

async function buildGemini(env:SmartActivityEnv,ocrText:string,userText:string){
  const key=clean(env.GEMINI_API_KEY,500);if(!key)throw new Error("GEMINI_API_KEY is not configured");
  const model=clean(env.GEMINI_MODEL,120)||"gemini-3.6-flash";
  const prompt=`${BUILD_PROMPT}\n\n【海報 OCR 文字】\n${ocrText}\n\n【使用者補充】\n${userText||"（無）"}`;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(18000),body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:schema(),temperature:0}})});
  const b:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(clean(b?.error?.message||b?.message||`Gemini 建模 HTTP ${r.status}`,500));
  const text=geminiText(b);if(!text)throw new Error("Gemini 沒有回傳報名欄位分析");return{data:normalize(parseJson(text)),model};
}

async function buildOpenAI(env:SmartActivityEnv,ocrText:string,userText:string){
  const key=clean(env.OPENAI_API_KEY,500);if(!key)throw new Error("OPENAI_API_KEY is not configured");
  const model=clean(env.OPENAI_MODEL,120)||"gpt-5-mini";
  const prompt=`${BUILD_PROMPT}\n\n【海報 OCR 文字】\n${ocrText}\n\n【使用者補充】\n${userText||"（無）"}`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},signal:AbortSignal.timeout(20000),body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],text:{format:{type:"json_schema",name:"smart_activity_blueprint",strict:true,schema:schema()}}})});
  const b:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(clean(b?.error?.message||b?.message||`OpenAI HTTP ${r.status}`,500));const text=outputText(b);if(!text)throw new Error("OpenAI 沒有回傳報名欄位分析");return{data:normalize(parseJson(text)),model};
}

const safe=(e:unknown)=>clean(e instanceof Error?e.message:String(e||"AI failed"),500);

export async function analyzeSmartActivity(env:SmartActivityEnv,posterDataUrl="",userText=""):Promise<SmartActivityAnalysis>{
  validateImage(posterDataUrl);
  const extra=clean(userText,6000);
  if(!posterDataUrl&&!extra)throw new Error("請先上傳活動海報或輸入文字敘述");

  let ocrText=extra;
  let ocrModel="";
  if(posterDataUrl){const ocr=await ocrPoster(env,posterDataUrl);ocrText=ocr.text;ocrModel=ocr.model;}

  let primaryError="";
  try{const g=await buildGemini(env,ocrText,posterDataUrl?extra:"");return{...g.data,providerUsed:"gemini",modelUsed:g.model||ocrModel,fallbackUsed:false,ocrText} as SmartActivityAnalysis;}
  catch(e){primaryError=safe(e);}
  try{const o=await buildOpenAI(env,ocrText,posterDataUrl?extra:"");return{...o.data,providerUsed:"openai",modelUsed:o.model,fallbackUsed:true,primaryProvider:"gemini",primaryError,ocrText} as SmartActivityAnalysis;}
  catch(e){throw new Error(`智能報名建立失敗：Gemini=${primaryError||"unknown"}; OpenAI=${safe(e)||"unknown"}`);}
}
