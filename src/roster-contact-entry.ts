import app from "./smart-activity-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type ContactRecord = { memberType:string; memberNumber:string; phone:string; updatedAt:string };
type ManagerRow = Record<string, unknown>;

const STORE_KEY = "tdea/roster-contact-overrides.json";
const MANAGER_KEY = "manager/state.json";
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
async function readManagerRoster(env:Env):Promise<{association:ManagerRow[];vendor:ManagerRow[]}> {
  if (!env.ASSETS_BUCKET) return {association:[],vendor:[]};
  const obj = await env.ASSETS_BUCKET.get(MANAGER_KEY);
  if (!obj) return {association:[],vendor:[]};
  const data = await obj.json().catch(()=>({})) as Record<string,unknown>;
  return {
    association:Array.isArray(data?.association) ? data.association.filter((row):row is ManagerRow=>Boolean(row)&&typeof row === "object"&&!Array.isArray(row)) : [],
    vendor:Array.isArray(data?.vendor) ? data.vendor.filter((row):row is ManagerRow=>Boolean(row)&&typeof row === "object"&&!Array.isArray(row)) : [],
  };
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

function managerAssociationRow(row:ManagerRow):unknown[] | null {
  const memberNo = clean(row.memberNo || row.rosterMemberNo,80).toUpperCase();
  if (!memberNo) return null;
  return [
    memberNo,
    clean(row.identity || row.role || row.jobTitle,120),
    clean(row.name || row.displayName,120),
    clean(row.gender,20),
    clean(row.qualification || "Y",20).toUpperCase(),
    clean(row.jobTitle || row.title || row.position,120),
    normalizePhone(row.phone || row.mobile || row.tel),
  ];
}
function managerVendorRow(row:ManagerRow):unknown[] | null {
  const memberNo = clean(row.memberNo || row.rosterMemberNo,80).toUpperCase();
  if (!memberNo) return null;
  return [
    memberNo,
    clean(row.companyName || row.company || row.name,180),
    clean(row.taxId,40),
    clean(row.owner,120),
    clean(row.contact || row.name,120),
    clean(row.qualification || "Y",20).toUpperCase(),
    clean(row.note,300),
    normalizePhone(row.phone || row.mobile || row.tel),
  ];
}
function mergeRows(baseRows:unknown[][]|undefined,liveRows:(unknown[]|null)[],type:"association"|"vendor",overrides:Record<string,ContactRecord>) {
  const map = new Map<string,unknown[]>();
  for (const raw of Array.isArray(baseRows)?baseRows:[]) {
    const copy = Array.isArray(raw) ? [...raw] : [];
    const number = clean(copy[0],80).toUpperCase();
    if (number) map.set(number,copy);
  }
  for (const raw of liveRows) {
    if (!raw) continue;
    const number = clean(raw[0],80).toUpperCase();
    if (!number) continue;
    const previous = map.get(number) || [];
    const merged = [...previous];
    raw.forEach((value,index)=>{ if (clean(value) || index === 4 || index === 5) merged[index]=value; });
    map.set(number,merged);
  }
  return [...map.values()].map((row)=>{
    const number = clean(row[0],80).toUpperCase();
    const record = overrides[recordKey(type,number)];
    if (record?.phone) {
      if (type === "association") row[6] = record.phone;
      else row[7] = record.phone;
    }
    return row;
  });
}

async function mergedRoster(request:Request,env:Env,ctx:ExecutionContext){
  const base = await app.fetch(request,env as never,ctx);
  if (!base.ok) return base;
  const roster = await base.clone().json().catch(()=>null) as {a?:unknown[][];v?:unknown[][];[key:string]:unknown} | null;
  if (!roster) return base;
  const [overrides,manager] = await Promise.all([readOverrides(env),readManagerRoster(env)]);
  const a = mergeRows(roster.a,manager.association.map(managerAssociationRow),"association",overrides);
  const v = mergeRows(roster.v,manager.vendor.map(managerVendorRow),"vendor",overrides);
  return json({...roster,a,v,liveManagerRosterMerged:true,liveManagerUpdatedAt:new Date().toISOString()});
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
      catch(error){ console.error("Roster live merge failed",error); return app.fetch(request,env as never,ctx); }
    }
    return app.fetch(request,env as never,ctx);
  }
};
