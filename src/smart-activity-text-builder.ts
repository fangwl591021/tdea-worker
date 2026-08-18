export type SmartTextBuildEnv = { GEMINI_API_KEY?: string; GEMINI_BUILD_MODEL?: string; [key:string]: unknown };

type PriceUnit = "person"|"room"|"item"|"ticket"|"group"|"fixed"|"rod"|"table"|"meal"|"day";

const clean=(v:unknown,max=12000)=>String(v??"").trim().slice(0,max);
const arr=(v:any,max=100)=>(Array.isArray(v)?v:[]).slice(0,max);

const PROMPT=[
  "你是報名欄位轉換器。輸入已是活動海報 OCR 文字，不看圖片。",
  "任務只有一件：把文字轉成可執行的活動報名結構。不要重做 OCR，不要寫宣傳文。",
  "先抽取活動名稱、日期時間、截止日、地點地址、名額、規則。",
  "人、房、桿、桌、份、張、餐等數量必須分開；不可假設一人一桿。",
  "價格必須綁定自己的 quantityKey，例如750元/竿=>fishing_rod_count；500元/人餐敘=>competition_meal_count；只餐敘600元/人=>meal_only_count。",
  "現場另繳摸彩/最大獎放 optionalOnsiteItems，不計入主要報名費。",
  "registrationFieldSpecs 要產生真正表單欄位：數量 quantity；附件 attachment；末五碼 payment；選項 radio/dropdown；文字 text。",
  "若文字有『是否租竿/租借數量』，拆成是否租借 + rental_rod_count。",
  "只輸出 JSON。"
].join("\n");

function schema(){return {type:"object",additionalProperties:false,properties:{
 title:{type:"string"},category:{type:"string"},activityType:{type:"string"},date:{type:"string"},dateEnd:{type:"string"},startTime:{type:"string"},endTime:{type:"string"},deadline:{type:"string"},venueName:{type:"string"},address:{type:"string"},capacity:{type:"number"},
 billingMode:{type:"string",enum:["free","simple_paid","advanced_paid","points_only","points_or_cash"]},
 pricing:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},amount:{type:"number"},unit:{type:"string",enum:["person","room","item","ticket","group","fixed","rod","table","meal","day"]},required:{type:"boolean"},quantityKey:{type:"string"},paymentTiming:{type:"string",enum:["registration","onsite","later"]}},required:["name","amount","unit","required","quantityKey","paymentTiming"]}},
 quantityFields:{type:"array",items:{type:"object",additionalProperties:false,properties:{key:{type:"string"},label:{type:"string"},unit:{type:"string"},min:{type:"number"},max:{type:"number"},required:{type:"boolean"}},required:["key","label","unit","min","max","required"]}},
 registrationFields:{type:"array",items:{type:"string"}},
 registrationFieldSpecs:{type:"array",items:{type:"object",additionalProperties:false,properties:{key:{type:"string"},label:{type:"string"},type:{type:"string",enum:["text","email","number","radio","checkbox","dropdown","paragraph","attachment","payment","quantity"]},required:{type:"boolean"},options:{type:"array",items:{type:"string"}},purpose:{type:"string"},quantityKey:{type:"string"}},required:["key","label","type","required","options","purpose","quantityKey"]}},
 agenda:{type:"array",items:{type:"object",additionalProperties:false,properties:{date:{type:"string"},startTime:{type:"string"},endTime:{type:"string"},title:{type:"string"},venue:{type:"string"},note:{type:"string"}},required:["date","startTime","endTime","title","venue","note"]}},
 activityRules:{type:"array",items:{type:"string"}},optionalOnsiteItems:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},amount:{type:"number"},unit:{type:"string",enum:["person","room","item","ticket","group","fixed","rod","table","meal","day"]},paymentTiming:{type:"string",enum:["registration","onsite","later"]},required:{type:"boolean"}},required:["name","amount","unit","paymentTiming","required"]}},
 description:{type:"string"},paymentRequired:{type:"boolean"},paymentMethod:{type:"string"},missingFields:{type:"array",items:{type:"string"}},confidence:{type:"number"}
},required:["title","category","activityType","date","dateEnd","startTime","endTime","deadline","venueName","address","capacity","billingMode","pricing","quantityFields","registrationFields","registrationFieldSpecs","agenda","activityRules","optionalOnsiteItems","description","paymentRequired","paymentMethod","missingFields","confidence"]};}

function geminiText(body:any){for(const c of Array.isArray(body?.candidates)?body.candidates:[])for(const p of Array.isArray(c?.content?.parts)?c.content.parts:[])if(typeof p?.text==="string")return p.text;return "";}
function parseJson(text:string){try{return JSON.parse(text.trim())}catch{const m=text.match(/\{[\s\S]*\}/);if(!m)throw new Error("AI 未回傳可解析 JSON");return JSON.parse(m[0]);}}
function normalize(v:any){const mode=["free","simple_paid","advanced_paid","points_only","points_or_cash"].includes(clean(v.billingMode,30))?clean(v.billingMode,30):"free";return {title:clean(v.title,240),category:clean(v.category,120),activityType:clean(v.activityType,80),date:clean(v.date,20),dateEnd:clean(v.dateEnd,20),startTime:clean(v.startTime,20),endTime:clean(v.endTime,20),deadline:clean(v.deadline,30),venueName:clean(v.venueName,240),address:clean(v.address,500),capacity:Math.max(0,Math.round(Number(v.capacity)||0)),billingMode:mode,pricing:arr(v.pricing).map((x:any)=>({name:clean(x?.name,160),amount:Math.max(0,Number(x?.amount)||0),unit:clean(x?.unit,30)||"person",required:x?.required===true,quantityKey:clean(x?.quantityKey,100),paymentTiming:clean(x?.paymentTiming,20)||"registration"})).filter((x:any)=>x.name),quantityFields:arr(v.quantityFields).map((x:any)=>({key:clean(x?.key,100),label:clean(x?.label,160),unit:clean(x?.unit,40),min:Math.max(0,Number(x?.min)||0),max:Math.max(0,Number(x?.max)||0),required:x?.required===true})).filter((x:any)=>x.key&&x.label),registrationFields:arr(v.registrationFields,40).map((x:any)=>clean(x,120)).filter(Boolean),registrationFieldSpecs:arr(v.registrationFieldSpecs).map((x:any)=>({key:clean(x?.key,100),label:clean(x?.label,160),type:clean(x?.type,30),required:x?.required===true,options:arr(x?.options,30).map((o:any)=>clean(o,120)).filter(Boolean),purpose:clean(x?.purpose,160),quantityKey:clean(x?.quantityKey,100)})).filter((x:any)=>x.key&&x.label),agenda:arr(v.agenda).map((x:any)=>({date:clean(x?.date,20),startTime:clean(x?.startTime,20),endTime:clean(x?.endTime,20),title:clean(x?.title,240),venue:clean(x?.venue,240),note:clean(x?.note,500)})).filter((x:any)=>x.title),activityRules:arr(v.activityRules,60).map((x:any)=>clean(x,500)).filter(Boolean),optionalOnsiteItems:arr(v.optionalOnsiteItems,30).map((x:any)=>({name:clean(x?.name,160),amount:Math.max(0,Number(x?.amount)||0),unit:clean(x?.unit,30)||"fixed",paymentTiming:clean(x?.paymentTiming,20)||"onsite",required:x?.required===true})).filter((x:any)=>x.name),description:clean(v.description,7000),paymentRequired:v.paymentRequired===true,paymentMethod:clean(v.paymentMethod,300),missingFields:arr(v.missingFields,40).map((x:any)=>clean(x,200)).filter(Boolean),confidence:Math.max(0,Math.min(1,Number(v.confidence)||0))};}

export async function buildSmartActivityFromText(env:SmartTextBuildEnv,text:string){
 const key=clean(env.GEMINI_API_KEY,500);if(!key)throw new Error("GEMINI_API_KEY is not configured");
 const model=clean(env.GEMINI_BUILD_MODEL,120)||"gemini-3.5-flash-lite";
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(12000),body:JSON.stringify({contents:[{role:"user",parts:[{text:`${PROMPT}\n\n【OCR文字】\n${clean(text,12000)}`}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:schema(),thinkingConfig:{thinkingLevel:"minimal"},maxOutputTokens:5000}})});
 const body:any=await response.json().catch(()=>({}));if(!response.ok)throw new Error(clean(body?.error?.message||body?.message||`Gemini 建模 HTTP ${response.status}`,500));
 const out=geminiText(body);if(!out)throw new Error("Gemini 沒有回傳報名欄位分析");
 return {data:normalize(parseJson(out)),model};
}
