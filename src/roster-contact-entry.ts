import app from "./smart-activity-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type ContactRecord = { memberType:string; memberNumber:string; phone:string; updatedAt:string };

const STORE_KEY = "tdea/roster-contact-overrides.json";
const clean = (v:unknown, n=160) => String(v ?? "").trim().slice(0,n);
const normalizePhone = (v:unknown) => clean(v,30).replace(/[^0-9+]/g, "").replace(/^\+8860?/, "0");
const json = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

async function readOverrides(env:Env):Promise<Record<string,ContactRecord>> {
  if (!env.ASSETS_BUCKET) return {};
  const obj = await env.ASSETS_BUCKET.get(STORE_KEY);
  if (!obj) return {};
  const data = await obj.json().catch(()=>({}));
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string,ContactRecord> : {};
}
async function writeOverrides(env:Env,data:Record<string,ContactRecord>) {
  if (!env.ASSETS_BUCKET) throw new Error("ASSETS_BUCKET is not configured");
  await env.ASSETS_BUCKET.put(STORE_KEY,JSON.stringify(data,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
}
function recordKey(type:string,number:string){return `${type}:${number}`.toLowerCase();}
function validInternalHost(request:Request){return new URL(request.url).hostname === "tdea-roster.internal";}

async function saveContact(request:Request,env:Env){
  if (!validInternalHost(request)) return json({success:false,error:"Not Found"},404);
  const body = await request.json().catch(()=>({})) as Record<string,unknown>;
  const memberType = clean(body.memberType,20).toLowerCase();
  const memberNumber = clean(body.memberNumber,80).toUpperCase();
  const phone = normalizePhone(body.phone);
  if (!["association","vendor"].includes(memberType)) return json({success:false,error:"Unsupported member type"},400);
  if (!memberNumber) return json({success:false,error:"memberNumber is required"},400);
  if (!/^09\d{8}$/.test(phone)) return json({success:false,error:"Invalid Taiwan mobile phone"},400);
  const data = await readOverrides(env);
  const record = {memberType,memberNumber,phone,updatedAt:new Date().toISOString()};
  data[recordKey(memberType,memberNumber)] = record;
  await writeOverrides(env,data);
  return json({success:true,record});
}

async function mergedRoster(request:Request,env:Env,ctx:ExecutionContext){
  const base = await app.fetch(request,env as never,ctx);
  if (!base.ok) return base;
  const roster = await base.clone().json().catch(()=>null) as {a?:unknown[][];v?:unknown[][];[key:string]:unknown} | null;
  if (!roster) return base;
  const overrides = await readOverrides(env);
  const append = (rows:unknown[][]|undefined,type:"association"|"vendor") => (Array.isArray(rows)?rows:[]).map((row)=>{
    const copy = Array.isArray(row) ? [...row] : [];
    const number = clean(copy[0],80).toUpperCase();
    const record = overrides[recordKey(type,number)];
    if (record?.phone) copy[6] = record.phone;
    return copy;
  });
  return json({...roster,a:append(roster.a,"association"),v:append(roster.v,"vendor"),contactOverridesUpdated:true});
}

export default {
  async fetch(request:Request,env:Env,ctx:ExecutionContext){
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/roster/member-contact") {
      try { return await saveContact(request,env); }
      catch(error){ return json({success:false,error:error instanceof Error?error.message:String(error)},500); }
    }
    if (request.method === "GET" && url.pathname === "/roster.json" && validInternalHost(request)) {
      try { return await mergedRoster(request,env,ctx); }
      catch(error){ console.error("Roster contact merge failed",error); return app.fetch(request,env as never,ctx); }
    }
    return app.fetch(request,env as never,ctx);
  }
};
