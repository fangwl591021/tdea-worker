import app from "./smart-activity-progressive-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const jsonHeaders = { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" };
const json = (data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:jsonHeaders});
const clean=(v:unknown,max=8000)=>String(v??"").trim().slice(0,max);
const uid=(prefix:string)=>`${prefix}_${crypto.randomUUID().replace(/-/g,"")}`;

async function ensureAdmin(request:Request,env:Env,ctx:ExecutionContext){
  const probeUrl=new URL("/api/admin-whitelist",request.url);
  const headers=new Headers();
  ["authorization","x-admin-email","x-admin-member-no","x-line-user-id"].forEach(name=>{const value=request.headers.get(name);if(value)headers.set(name,value);});
  if(![...headers.keys()].length)return false;
  const probe=await app.fetch(new Request(probeUrl,{method:"GET",headers}),env as never,ctx);
  return probe.ok;
}

async function readJson(env:Env,key:string,fallback:any){
  if(!env.ASSETS_BUCKET)return fallback;
  const obj=await env.ASSETS_BUCKET.get(key);
  if(!obj)return fallback;
  return obj.json().catch(()=>fallback);
}
async function putJson(env:Env,key:string,value:any){
  if(!env.ASSETS_BUCKET)throw new Error("R2 bucket is not configured");
  await env.ASSETS_BUCKET.put(key,JSON.stringify(value,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
}

function posterBlob(dataUrl:string){
  const match=clean(dataUrl,12*1024*1024).match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([\s\S]+)$/i);
  if(!match)return null;
  const mime=match[1].toLowerCase()==="image/jpg"?"image/jpeg":match[1].toLowerCase();
  const ext=mime.includes("png")?"png":mime.includes("webp")?"webp":mime.includes("gif")?"gif":"jpg";
  const bin=atob(match[2]);
  const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return {mime,ext,bytes};
}

function normalizedLabel(v:unknown){return clean(v,160).toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g,"");}
function systemKey(label:string){
  const n=normalizedLabel(label);
  if(["姓名","name","fullname","全名"].includes(n))return "name";
  if(["手機","電話","行動電話","phone","mobile","tel"].includes(n))return "phone";
  if(["email","電子郵件","信箱","mail"].includes(n))return "email";
  if(["公司","單位","公司單位","company","companyname","unit"].includes(n))return "company";
  if(["會員編號","memberno","membernumber"].includes(n))return "memberNo";
  if(["備註","note"].includes(n))return "note";
  return "";
}
function nativeType(type:unknown){
  const t=clean(type,30).toLowerCase();
  if(t==="email")return "email";
  if(t==="paragraph")return "paragraph";
  if(t==="radio")return "radio";
  if(t==="checkbox")return "checkbox";
  if(t==="dropdown")return "dropdown";
  if(t==="attachment")return "file";
  return "text";
}
function buildFields(a:Row){
  const specs=Array.isArray(a.registrationFieldSpecs)?a.registrationFieldSpecs:[];
  const labels=Array.isArray(a.registrationFields)?a.registrationFields:[];
  const out:Row[]=[];const used=new Set<string>();
  const add=(field:Row)=>{const key=clean(field.key,120);if(!key||used.has(key))return;used.add(key);out.push(field);};
  for(const base of [
    {key:"name",label:"姓名",type:"text",required:true},
    {key:"phone",label:"手機",type:"text",required:true},
    {key:"email",label:"Email",type:"email",required:false},
    {key:"company",label:"公司/單位",type:"text",required:false},
    {key:"memberNo",label:"會員編號",type:"text",required:false}
  ]) add(base);
  for(const spec of specs){
    if(!spec||typeof spec!=="object")continue;
    const label=clean(spec.label||spec.key,160);if(!label)continue;
    const sk=systemKey(label);if(sk){const hit=out.find(x=>x.key===sk);if(hit&&spec.required===true)hit.required=true;continue;}
    add({key:`fld_${crypto.randomUUID().replace(/-/g,"")}`,fieldId:`fld_${crypto.randomUUID().replace(/-/g,"")}`,legacyKey:clean(spec.key,100),label,type:nativeType(spec.type),required:spec.required===true,...(Array.isArray(spec.options)&&spec.options.length?{options:spec.options.map((x:any)=>clean(x,120)).filter(Boolean)}:{})});
  }
  if(!specs.length){
    for(const labelRaw of labels){const label=clean(labelRaw,160);if(!label)continue;const sk=systemKey(label);if(sk)continue;add({key:`fld_${crypto.randomUUID().replace(/-/g,"")}`,label,type:"text",required:false});}
  }
  add({key:"note",label:"備註",type:"paragraph",required:false});
  return out;
}

function buildSessions(a:Row){
  const agenda=Array.isArray(a.agenda)?a.agenda:[];
  if(agenda.length>1){return agenda.map((x:any,i:number)=>({id:`session_${i+1}`,name:clean(x.title,120)||`第 ${i+1} 梯`,startTime:[clean(x.date,20),clean(x.startTime,20)].filter(Boolean).join(" "),endTime:clean(x.endTime,20),capacity:Number(a.capacity)||0}));}
  return [{id:"default",name:"一般報名",startTime:[clean(a.date,20),clean(a.startTime,20)].filter(Boolean).join(" "),endTime:clean(a.endTime,20),capacity:Number(a.capacity)||0}];
}

async function savePoster(request:Request,env:Env,activityId:string,dataUrl:string){
  const blob=posterBlob(dataUrl);if(!blob||!env.ASSETS_BUCKET)return "";
  const key=`smart-activities/posters/${activityId}.${blob.ext}`;
  await env.ASSETS_BUCKET.put(key,blob.bytes,{httpMetadata:{contentType:blob.mime,cacheControl:"public, max-age=31536000"}});
  return new URL(`/api/smart-activities/posters/${encodeURIComponent(activityId)}`,request.url).toString();
}

async function rebuildActivitySnapshot(env:Env){
  const idsRaw=await readJson(env,"activities/index.json",[]);
  const ids=Array.isArray(idsRaw)?[...new Set(idsRaw.map((x:any)=>clean(x,160)).filter(Boolean))]:[];
  const records=(await Promise.all(ids.map(async id=>readJson(env,`activities/records/${encodeURIComponent(id)}.json`,null)))).filter(Boolean);
  await putJson(env,"activities/snapshot.json",{updatedAt:new Date().toISOString(),count:records.length,activities:records});
}

async function upsertMonthly(env:Env,activity:Row,published:boolean){
  const key="flex/monthly-activity-effective.json";
  const snapshot=await readJson(env,key,null);if(!snapshot||!Array.isArray(snapshot.pages))return;
  const pages=snapshot.pages.filter((x:any)=>x&&typeof x==="object");
  const id=clean(activity.id,160);
  const idx=pages.findIndex((x:any)=>clean(x.activityId||x.id,160)===id);
  if(!published){if(idx>=0){pages.splice(idx,1);await putJson(env,key,{...snapshot,pages,updatedAt:new Date().toISOString()});}return;}
  const page={...(idx>=0?pages[idx]:{}),id,activityId:id,activityNo:activity.activityNo,activityName:activity.name,imageUrl:activity.imageUrl||activity.posterUrl||"",formImageUrl:activity.imageUrl||activity.posterUrl||"",detailTitle:activity.name,detailText:activity.detailText||activity.description||"",formUrl:activity.nativeFormUrl,manual:false};
  if(idx>=0)pages[idx]=page;else pages.unshift(page);
  await putJson(env,key,{...snapshot,pages,updatedAt:new Date().toISOString()});
}

async function publish(request:Request,env:Env,ctx:ExecutionContext){
  if(!env.ASSETS_BUCKET)return json({success:false,message:"R2 bucket is not configured"},503);
  if(!await ensureAdmin(request,env,ctx))return json({success:false,message:"請先登入管理中心"},401);
  const input=await request.json().catch(()=>({})) as Row;
  const a=input.analysis&&typeof input.analysis==="object"?input.analysis as Row:{};
  if(!clean(a.title,240))return json({success:false,message:"AI 尚未產生活動名稱"},400);
  const mode=clean(input.mode,30)==="draft"?"draft":"published";
  const published=mode==="published";
  const activityId=clean(input.activityId,160)||uid("act");
  const formId=clean(input.formId,160)||uid("form");
  const now=new Date().toISOString();
  const posterUrl=await savePoster(request,env,activityId,clean(input.posterDataUrl,12*1024*1024));
  const nativeFormUrl=`https://liff.line.me/2005868456-cfANNVou?register=${encodeURIComponent(formId)}`;
  const activityNo=clean(input.activityNo,80)||`AI-${Date.now().toString().slice(-8)}`;
  const detailText=clean(a.description,7000)||clean(input.text,1500);
  const courseTime=[clean(a.date,20),[clean(a.startTime,20),clean(a.endTime,20)].filter(Boolean).join("-")].filter(Boolean).join(" ");
  const activity:Row={id:activityId,activityNo,name:clean(a.title,240),status:published?"上架":"草稿",category:clean(a.category,120),activityType:clean(a.activityType,80),courseTime,date:clean(a.date,20),dateEnd:clean(a.dateEnd,20),startTime:clean(a.startTime,20),endTime:clean(a.endTime,20),deadline:clean(a.deadline,30),venueName:clean(a.venueName,240),address:clean(a.address,500),capacity:Number(a.capacity)||0,description:detailText,detailText,imageUrl:posterUrl,posterUrl,nativeFormId:formId,formId,nativeFormUrl,formUrl:nativeFormUrl,registrationMode:"form",billingMode:clean(a.billingMode,30)||"free",pricing:Array.isArray(a.pricing)?a.pricing:[],quantityFields:Array.isArray(a.quantityFields)?a.quantityFields:[],paymentRequired:a.paymentRequired===true,paymentMethod:clean(a.paymentMethod,300),activityRules:Array.isArray(a.activityRules)?a.activityRules:[],optionalOnsiteItems:Array.isArray(a.optionalOnsiteItems)?a.optionalOnsiteItems:[],smartCreated:true,smartSourceText:clean(input.text,1500),createdAt:now,updatedAt:now};
  const fields=buildFields(a);const sessions=buildSessions(a);
  const settings:Row={registrationMode:"form",lineLoginEnabled:false,posterUrl,formUrl:nativeFormUrl,sessions,customFields:fields.filter(x=>!["name","phone","email","company","memberNo","note"].includes(x.key)),billingMode:activity.billingMode,pricing:activity.pricing,quantityFields:activity.quantityFields,paymentRequired:activity.paymentRequired,paymentMethod:activity.paymentMethod};
  const nativeForm={id:formId,activity,sessions,fields,settings,createdAt:now,updatedAt:now};
  await putJson(env,`activities/records/${encodeURIComponent(activityId)}.json`,activity);
  await putJson(env,`forms/native/${encodeURIComponent(formId)}.json`,nativeForm);
  const idsRaw=await readJson(env,"activities/index.json",[]);const ids=Array.isArray(idsRaw)?idsRaw.map((x:any)=>clean(x,160)).filter(Boolean):[];if(!ids.includes(activityId))ids.unshift(activityId);await putJson(env,"activities/index.json",ids);
  const manager=await readJson(env,"manager/state.json",{});const formSettings=manager.formSettings&&typeof manager.formSettings==="object"&&!Array.isArray(manager.formSettings)?manager.formSettings:{};formSettings[activityId]=settings;formSettings[activityNo]=settings;await putJson(env,"manager/state.json",{...manager,formSettings,updatedAt:now});
  await rebuildActivitySnapshot(env);
  await upsertMonthly(env,activity,published);
  return json({success:true,mode,activityId,activityNo,formId,status:activity.status,registrationUrl:nativeFormUrl,previewUrl:nativeFormUrl,activity});
}

async function poster(request:Request,env:Env,activityId:string){
  if(!env.ASSETS_BUCKET)return new Response("Not Found",{status:404});
  const prefix=`smart-activities/posters/${activityId}.`;
  const listed=await env.ASSETS_BUCKET.list({prefix,limit:1});const key=listed.objects[0]?.key;if(!key)return new Response("Not Found",{status:404});
  const obj=await env.ASSETS_BUCKET.get(key);if(!obj)return new Response("Not Found",{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set("etag",obj.httpEtag);return new Response(obj.body,{headers});
}

export default{
  async fetch(request:Request,env:Env,ctx:ExecutionContext){
    const url=new URL(request.url);
    if(request.method==="POST"&&url.pathname==="/api/smart-activities/publish")return publish(request,env,ctx);
    const m=request.method==="GET"?url.pathname.match(/^\/api\/smart-activities\/posters\/([^/]+)$/):null;
    if(m)return poster(request,env,decodeURIComponent(m[1]));
    return app.fetch(request,env as never,ctx);
  },
  scheduled(controller:ScheduledController,env:Env,ctx:ExecutionContext){return (app as any).scheduled?.(controller,env,ctx);}
};
