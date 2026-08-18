export type SmartActivityEnv = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type PriceUnit = "person" | "room" | "item" | "ticket" | "group" | "fixed" | "rod" | "table" | "meal" | "day";
export type SmartActivityPricingItem = { name:string; amount:number; unit:PriceUnit; required:boolean; quantityKey:string; paymentTiming:"registration"|"onsite"|"later" };
export type SmartQuantityField = { key:string; label:string; unit:string; min:number; max:number; required:boolean };
export type SmartRegistrationField = { key:string; label:string; type:"text"|"email"|"number"|"radio"|"checkbox"|"dropdown"|"paragraph"|"attachment"|"payment"|"quantity"; required:boolean; options:string[]; purpose:string; quantityKey:string };
export type SmartAgendaItem = { date:string; startTime:string; endTime:string; title:string; venue:string; note:string };
export type SmartOptionalItem = { name:string; amount:number; unit:PriceUnit; paymentTiming:"registration"|"onsite"|"later"; required:boolean };

export type SmartActivityBlueprint = {
  title:string; category:string; activityType:string;
  date:string; dateEnd:string; startTime:string; endTime:string; deadline:string;
  venueName:string; address:string; capacity:number;
  billingMode:"free"|"simple_paid"|"advanced_paid"|"points_only"|"points_or_cash";
  pricing:SmartActivityPricingItem[];
  quantityFields:SmartQuantityField[];
  registrationFields:string[];
  registrationFieldSpecs:SmartRegistrationField[];
  agenda:SmartAgendaItem[];
  activityRules:string[];
  optionalOnsiteItems:SmartOptionalItem[];
  description:string; paymentRequired:boolean; paymentMethod:string;
  missingFields:string[]; confidence:number;
};

export type SmartActivityAnalysis = SmartActivityBlueprint & {
  providerUsed:"gemini"|"openai"; modelUsed:string; fallbackUsed:boolean; primaryProvider?:"gemini"; primaryError?:string;
};

const clean=(v:unknown,max=5000)=>String(v??"").trim().slice(0,max);
const PROMPT=[
"你是『智能活動建立引擎』，不是摘要工具。請先完整看懂海報，再把活動拆成可直接建立報名系統的結構化規則。",
"第一步判斷 activityType，例如：free_course、paid_course、seminar、vendor_visit、competition、dining、trip、multi_day_trip、international_visit、training、points_activity、general。",
"第二步完整抽取日期、起訖時間、截止日、地點、地址、名額、多日 agenda、主辦資訊、注意事項與活動規則。海報未寫清楚時留空，不可杜撰。",
"第三步建立計價模型。任何『人、房、桿、桌、份、張、台、餐』都是獨立 quantity；絕對不可假設一人一桿、一人一房或所有價格都乘總人數。",
"pricing 每筆必須指定 quantityKey。例：750元/竿 => quantityKey=fishing_rod_count, unit=rod；500元/人餐敘 => quantityKey=competition_meal_count；600元/人純餐敘 => meal_only_count。",
"如果同一活動有『釣蝦＋餐敘』與『只餐敘』，必須拆成不同價格項目；若有租竿，再建立 rental_rod_count。",
"現場才繳的摸彩、最大獎、加購費用放 optionalOnsiteItems，不可算入必要報名費。獎金、獎品、比賽名次不是費用。",
"點數活動需辨識 points_only 或 points_or_cash，例如會員扣300點、非會員現金300元。",
"第四步生成 quantityFields 與 registrationFieldSpecs。數量題用 quantity/number，不要把『釣竿數、用餐人數、租借數量』做成普通文字。付款末五碼屬 payment，不是一般報名資料。附件屬 attachment。",
"條件題要拆開，例如『是否租竿？租幾支？』應拆成是否租借 + rental_rod_count；不要叫使用者輸入『無』。",
"課程/講座依主題可加入公司、職稱；旅遊/跨境參訪可加入出生日期、性別、護照/證件、緊急聯絡人、附件；競賽要加入隊伍/單位與比賽相關數量。",
"agenda 對多日活動要逐日逐時段拆出，不要只寫成 description。",
"registrationFields 保留純文字標籤供舊前端相容；registrationFieldSpecs 才是正式欄位規格。",
"日期格式 YYYY-MM-DD；時間 HH:MM。民國年要轉西元。只有年份不確定時才留空。",
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
 activityRules:{type:"array",items:{type:"string"}},optionalOnsiteItems:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},amount:{type:"number"},unit:{type:"string",enum:["person","room","item","ticket","group","fixed","rod","table","meal","day"]},paymentTiming:{type:"string",enum:["registration","onsite","later"]},required:{type:"boolean"}},required:["name","amount","unit","paymentTiming","required"]}},
 description:{type:"string"},paymentRequired:{type:"boolean"},paymentMethod:{type:"string"},missingFields:{type:"array",items:{type:"string"}},confidence:{type:"number"}
},required:["title","category","activityType","date","dateEnd","startTime","endTime","deadline","venueName","address","capacity","billingMode","pricing","quantityFields","registrationFields","registrationFieldSpecs","agenda","activityRules","optionalOnsiteItems","description","paymentRequired","paymentMethod","missingFields","confidence"]};}

function parseJson(text:string){try{return JSON.parse(text.trim())}catch{const m=text.match(/\{[\s\S]*\}/);if(!m)throw new Error("AI 未回傳可解析 JSON");return JSON.parse(m[0]);}}
function outputText(body:any){if(typeof body.output_text==="string")return body.output_text;for(const i of Array.isArray(body.output)?body.output:[])for(const p of Array.isArray(i?.content)?i.content:[])if(typeof p?.text==="string")return p.text;return "";}
function geminiText(body:any){for(const c of Array.isArray(body.candidates)?body.candidates:[])for(const p of Array.isArray(c?.content?.parts)?c.content.parts:[])if(typeof p?.text==="string")return p.text;return "";}
function validateImage(v:string){if(!v)return;if(!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(v))throw new Error("活動海報只接受 JPEG、PNG 或 WebP");if(v.length>12*1024*1024)throw new Error("活動海報圖片資料過大");}
function imageBlob(v:string){const m=v.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);if(!m)throw new Error("活動海報格式無法提供給 AI");return{mimeType:m[1].toLowerCase()==="image/jpg"?"image/jpeg":m[1].toLowerCase(),data:m[2]};}
function arr(v:any,max=100){return(Array.isArray(v)?v:[]).slice(0,max)}
function normalize(v:any):SmartActivityBlueprint{
 const mode=["free","simple_paid","advanced_paid","points_only","points_or_cash"].includes(clean(v.billingMode,30))?clean(v.billingMode,30):"free";
 const pricing=arr(v.pricing).map((x:any)=>({name:clean(x?.name,160),amount:Math.max(0,Number(x?.amount)||0),unit:(clean(x?.unit,30)||"person") as PriceUnit,required:x?.required===true,quantityKey:clean(x?.quantityKey,100),paymentTiming:["registration","onsite","later"].includes(clean(x?.paymentTiming,20))?clean(x.paymentTiming,20) as any:"registration"})).filter((x:any)=>x.name);
 const q=arr(v.quantityFields).map((x:any)=>({key:clean(x?.key,100),label:clean(x?.label,160),unit:clean(x?.unit,40),min:Math.max(0,Number(x?.min)||0),max:Math.max(0,Number(x?.max)||0),required:x?.required===true})).filter((x:any)=>x.key&&x.label);
 const specs=arr(v.registrationFieldSpecs).map((x:any)=>({key:clean(x?.key,100),label:clean(x?.label,160),type:clean(x?.type,30) as any,required:x?.required===true,options:arr(x?.options,30).map((o:any)=>clean(o,120)).filter(Boolean),purpose:clean(x?.purpose,160),quantityKey:clean(x?.quantityKey,100)})).filter((x:any)=>x.key&&x.label);
 return {title:clean(v.title,240),category:clean(v.category,120),activityType:clean(v.activityType,80),date:clean(v.date,20),dateEnd:clean(v.dateEnd,20),startTime:clean(v.startTime,20),endTime:clean(v.endTime,20),deadline:clean(v.deadline,30),venueName:clean(v.venueName,240),address:clean(v.address,500),capacity:Math.max(0,Math.round(Number(v.capacity)||0)),billingMode:mode as any,pricing,quantityFields:q,registrationFields:arr(v.registrationFields,40).map((x:any)=>clean(x,120)).filter(Boolean),registrationFieldSpecs:specs,agenda:arr(v.agenda,100).map((x:any)=>({date:clean(x?.date,20),startTime:clean(x?.startTime,20),endTime:clean(x?.endTime,20),title:clean(x?.title,240),venue:clean(x?.venue,240),note:clean(x?.note,500)})).filter((x:any)=>x.title),activityRules:arr(v.activityRules,60).map((x:any)=>clean(x,500)).filter(Boolean),optionalOnsiteItems:arr(v.optionalOnsiteItems,30).map((x:any)=>({name:clean(x?.name,160),amount:Math.max(0,Number(x?.amount)||0),unit:(clean(x?.unit,30)||"fixed") as PriceUnit,paymentTiming:["registration","onsite","later"].includes(clean(x?.paymentTiming,20))?clean(x.paymentTiming,20) as any:"onsite",required:x?.required===true})).filter((x:any)=>x.name),description:clean(v.description,7000),paymentRequired:v.paymentRequired===true,paymentMethod:clean(v.paymentMethod,300),missingFields:arr(v.missingFields,40).map((x:any)=>clean(x,200)).filter(Boolean),confidence:Math.max(0,Math.min(1,Number(v.confidence)||0))};
}

async function analyzeWithGemini(env:SmartActivityEnv,poster:string,userText:string){const key=clean(env.GEMINI_API_KEY,500);if(!key)throw new Error("GEMINI_API_KEY is not configured");const model=clean(env.GEMINI_MODEL,120)||"gemini-3.6-flash";const parts:any[]=[{text:`${PROMPT}\n\n使用者補充文字：\n${userText||"（無）"}`}];if(poster){const i=imageBlob(poster);parts.push({inline_data:{mime_type:i.mimeType,data:i.data}})}const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(25000),body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:schema(),temperature:0}})});const b:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(clean(b?.error?.message||b?.message||`Gemini HTTP ${r.status}`,500));const t=geminiText(b);if(!t)throw new Error("Gemini 沒有回傳活動分析內容");return{blueprint:normalize(parseJson(t)),model};}
async function analyzeWithOpenAI(env:SmartActivityEnv,poster:string,userText:string){const key=clean(env.OPENAI_API_KEY,500);if(!key)throw new Error("OPENAI_API_KEY is not configured");const model=clean(env.OPENAI_MODEL,120)||"gpt-5-mini";const content:any[]=[{type:"input_text",text:`${PROMPT}\n\n使用者補充文字：\n${userText||"（無）"}`}];if(poster)content.push({type:"input_image",image_url:poster});const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({model,input:[{role:"user",content}],text:{format:{type:"json_schema",name:"smart_activity_blueprint",strict:true,schema:schema()}}})});const b:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(clean(b?.error?.message||b?.message||`OpenAI HTTP ${r.status}`,500));const t=outputText(b);if(!t)throw new Error("OpenAI 沒有回傳活動分析內容");return{blueprint:normalize(parseJson(t)),model};}
const safe=(e:unknown)=>clean(e instanceof Error?e.message:String(e||"AI failed"),500);
export async function analyzeSmartActivity(env:SmartActivityEnv,posterDataUrl="",userText=""):Promise<SmartActivityAnalysis>{validateImage(posterDataUrl);const text=clean(userText,9000);if(!posterDataUrl&&!text)throw new Error("請先上傳活動海報或輸入文字敘述");let primaryError="";try{const g=await analyzeWithGemini(env,posterDataUrl,text);return{...g.blueprint,providerUsed:"gemini",modelUsed:g.model,fallbackUsed:false}}catch(e){primaryError=safe(e)}try{const o=await analyzeWithOpenAI(env,posterDataUrl,text);return{...o.blueprint,providerUsed:"openai",modelUsed:o.model,fallbackUsed:true,primaryProvider:"gemini",primaryError}}catch(e){throw new Error(`智能活動分析失敗：Gemini=${primaryError||"unknown"}; OpenAI=${safe(e)||"unknown"}`)}}
