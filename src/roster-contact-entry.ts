import app from "./smart-activity-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; ADMIN_EMAILS?: string; [key:string]: unknown };
type ContactRecord = { memberType:string; memberNumber:string; phone:string; updatedAt:string };
type ManagerRow = Record<string, unknown>;

const STORE_KEY = "tdea/roster-contact-overrides.json";
const MANAGER_KEY = "manager/state.json";
const AIWE_CACHE_KEY = "aiwe/members.json";
const ADMIN_WHITELIST_KEY = "line/admin-whitelist.json";
const ADMIN_ACCESS_KEY = "line/admin-access.json";
const clean = (v:unknown, n=160) => String(v ?? "").trim().slice(0,n);
const normalizePhone = (v:unknown) => clean(v,30).replace(/[^0-9+]/g, "").replace(/^\+8860?/, "0");
const json = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

let compatRefreshAt = 0;
let compatRefreshPromise: Promise<void> | null = null;

function rowMemberNo(row:ManagerRow){ return clean(row.memberNo || row.rosterMemberNo || row.member_no,80).toUpperCase(); }
function rowLineUid(row:ManagerRow){ return clean(row.lineUserId || row.LINE_user_id || row.uid || row.lineUid || row.line_user_id,200); }
function rowEmail(row:ManagerRow){ return clean(row.email || row.mail,320).toLowerCase(); }
function rowLoginAllowed(row:ManagerRow){
  const values=[row.loginAccess,row.loginAllowed,row.allowLogin,row.canLogin,row.adminAccess,row["登入權限"]];
  return values.some((value)=> value === true || ["1","true","y","yes","allow","allowed","允許","啟用"].includes(clean(value,30).toLowerCase()));
}

async function readJsonObject(env:Env,key:string):Promise<Record<string,unknown>|null>{
  if(!env.ASSETS_BUCKET) return null;
  const obj=await env.ASSETS_BUCKET.get(key);
  if(!obj) return null;
  const data=await obj.json().catch(()=>null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string,unknown> : null;
}

async function readJsonRows(env:Env,key:string):Promise<ManagerRow[]>{
  if(!env.ASSETS_BUCKET) return [];
  const obj=await env.ASSETS_BUCKET.get(key);
  if(!obj) return [];
  const data=await obj.json().catch(()=>[]);
  const rows=Array.isArray(data) ? data : (data && typeof data === "object" && Array.isArray((data as Record<string,unknown>).records) ? (data as Record<string,unknown>).records as unknown[] : []);
  return rows.filter((row):row is ManagerRow=>Boolean(row)&&typeof row === "object"&&!Array.isArray(row));
}

async function readManagerState(env:Env):Promise<Record<string,unknown>>{
  return await readJsonObject(env,MANAGER_KEY) || {};
}

function managerRows(data:Record<string,unknown>,type:"association"|"vendor"){
  return Array.isArray(data[type]) ? (data[type] as unknown[]).filter((row):row is ManagerRow=>Boolean(row)&&typeof row === "object"&&!Array.isArray(row)) : [];
}

async function readManagerRoster(env:Env):Promise<{association:ManagerRow[];vendor:ManagerRow[]}> {
  const data=await readManagerState(env);
  return { association:managerRows(data,"association"), vendor:managerRows(data,"vendor") };
}

function compatibilityRows(data:Record<string,unknown>){
  const association=managerRows(data,"association").map((row)=>({
    ...row,
    rosterType:"association",
    memberNo:rowMemberNo(row),
    rosterMemberNo:rowMemberNo(row),
    rosterName:clean(row.name || row.rosterName || row.memberName || row.displayName,120),
    name:clean(row.name || row.rosterName || row.memberName || row.displayName,120)
  }));
  const vendor=managerRows(data,"vendor").map((row)=>({
    ...row,
    rosterType:"vendor",
    memberNo:rowMemberNo(row),
    rosterMemberNo:rowMemberNo(row),
    rosterName:clean(row.companyName || row.company || row.name || row.rosterName,180),
    companyName:clean(row.companyName || row.company || row.name || row.rosterName,180)
  }));
  return [...association,...vendor];
}

async function writeCompatibilityCache(env:Env,data:Record<string,unknown>){
  if(!env.ASSETS_BUCKET) return;
  const rows=compatibilityRows(data);
  await env.ASSETS_BUCKET.put(AIWE_CACHE_KEY,JSON.stringify(rows,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
  compatRefreshAt=Date.now();
}

async function ensureCompatibilityCache(env:Env,force=false){
  if(!env.ASSETS_BUCKET) return;
  if(!force && Date.now()-compatRefreshAt < 30000) return;
  if(compatRefreshPromise) return compatRefreshPromise;
  compatRefreshPromise=(async()=>{ await writeCompatibilityCache(env,await readManagerState(env)); })().finally(()=>{ compatRefreshPromise=null; });
  return compatRefreshPromise;
}

async function reconcileLegacyUidWrites(env:Env){
  if(!env.ASSETS_BUCKET) return;
  const [data,cacheRows]=await Promise.all([readManagerState(env),readJsonRows(env,AIWE_CACHE_KEY)]);
  const cacheByKey=new Map<string,ManagerRow>();
  for(const row of cacheRows){
    const type=clean(row.rosterType,20)==="vendor"?"vendor":"association";
    const no=rowMemberNo(row);
    if(no) cacheByKey.set(`${type}:${no}`,row);
  }
  let changed=false;
  for(const type of ["association","vendor"] as const){
    const rows=managerRows(data,type);
    rows.forEach((row,index)=>{
      const no=rowMemberNo(row);
      if(!no) return;
      const cache=cacheByKey.get(`${type}:${no}`);
      if(!cache) return;
      const current=rowLineUid(row);
      const legacy=rowLineUid(cache);
      if(!current && legacy){ rows[index]={...row,lineUserId:legacy,LINE_user_id:legacy,uid:legacy,updatedAt:new Date().toISOString(),syncSource:"legacy-compat-bind"}; changed=true; }
    });
    data[type]=rows;
  }
  if(changed){
    data.updatedAt=new Date().toISOString();
    await env.ASSETS_BUCKET.put(MANAGER_KEY,JSON.stringify(data,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
  }
  await writeCompatibilityCache(env,data);
}

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
function diagnosticAllowed(request:Request,env:Env){
  const email=clean(request.headers.get("x-admin-email"),320).toLowerCase();
  const allowed=clean(env.ADMIN_EMAILS,2000).split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email));
}

async function canonicalAdminAllowed(request:Request,env:Env){
  const email=clean(request.headers.get("x-admin-email"),320).toLowerCase();
  const memberNo=clean(request.headers.get("x-admin-member-no"),80).toUpperCase();
  const lineUserId=clean(request.headers.get("x-line-user-id") || request.headers.get("x-line-uid"),200);
  const staticEmails=clean(env.ADMIN_EMAILS,2000).split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean);
  if(email && staticEmails.includes(email)) return true;

  const data=await readManagerState(env);
  const roster=[...managerRows(data,"association"),...managerRows(data,"vendor")];
  if(roster.some((row)=>rowLoginAllowed(row) && ((memberNo&&rowMemberNo(row)===memberNo)||(lineUserId&&rowLineUid(row)===lineUserId)||(email&&rowEmail(row)===email)))) return true;

  const whitelist=await readJsonRows(env,ADMIN_WHITELIST_KEY);
  return whitelist.some((row)=>row.enabled!==false && ((memberNo&&clean(row.memberNo,80).toUpperCase()===memberNo)||(lineUserId&&clean(row.lineUserId,200)===lineUserId)||(email&&clean(row.email,320).toLowerCase()===email)));
}

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
  const memberNo = rowMemberNo(row);
  if (!memberNo) return null;
  const qualification = clean(row.qualification || "Y",20).toUpperCase();
  return [
    memberNo,
    clean(row.identity || row.role || row.jobTitle,120),
    clean(row.name || row.displayName,120),
    clean(row.gender,20),
    qualification,
    qualification,
    normalizePhone(row.phone || row.mobile || row.tel),
    clean(row.email || row.mail,320),
    clean(row.jobTitle || row.title || row.position,120),
    clean(row.company || row.companyName || row.unit,180),
  ];
}
function managerVendorRow(row:ManagerRow):unknown[] | null {
  const memberNo = rowMemberNo(row);
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

async function buildCanonicalRoster(env:Env){
  const manager=await readManagerRoster(env);
  const overrides=await readOverrides(env);
  const applyOverride=(row:unknown[]|null,type:"association"|"vendor")=>{
    if(!row) return null;
    const copy=[...row];
    const number=clean(copy[0],80).toUpperCase();
    const record=overrides[recordKey(type,number)];
    if(record?.phone){ if(type==="association") copy[6]=record.phone; else copy[7]=record.phone; }
    return copy;
  };
  const a=manager.association.map(managerAssociationRow).map((row)=>applyOverride(row,"association")).filter(Boolean) as unknown[][];
  const v=manager.vendor.map(managerVendorRow).map((row)=>applyOverride(row,"vendor")).filter(Boolean) as unknown[][];
  return {roster:{a,v,source:"manager/state.json",canonicalRoster:true,updatedAt:new Date().toISOString()},manager};
}

async function mergedRoster(env:Env){
  const {roster}=await buildCanonicalRoster(env);
  return json(roster);
}

async function diagnoseRosterMember(request:Request,env:Env){
  if(!diagnosticAllowed(request,env)) return json({success:false,error:"Unauthorized"},401);
  const url=new URL(request.url);
  const memberNo=clean(url.searchParams.get("memberNo"),80).toUpperCase();
  if(!memberNo) return json({success:false,error:"memberNo is required"},400);
  const {roster,manager}=await buildCanonicalRoster(env);
  const managerAssociation=manager.association.find((row)=>rowMemberNo(row)===memberNo) || null;
  const managerVendor=manager.vendor.find((row)=>rowMemberNo(row)===memberNo) || null;
  const associationRow=roster.a.find((row)=>clean(row?.[0],80).toUpperCase()===memberNo) || null;
  const vendorRow=roster.v.find((row)=>clean(row?.[0],80).toUpperCase()===memberNo) || null;
  return json({
    success:true,
    memberNo,
    source:"manager/state.json",
    managerStateFound:Boolean(managerAssociation || managerVendor),
    managerType:managerAssociation?"association":managerVendor?"vendor":"",
    managerName:clean((managerAssociation?.name || managerAssociation?.displayName || managerVendor?.companyName || managerVendor?.name),120),
    rosterFound:Boolean(associationRow || vendorRow),
    associationCount:roster.a.length,
    vendorCount:roster.v.length,
  });
}

async function getManagerDataApi(request:Request,env:Env){
  if(!await canonicalAdminAllowed(request,env)) return json({success:false,message:"Unauthorized"},401);
  const data=await readManagerState(env);
  await ensureCompatibilityCache(env,true);
  return json({success:true,data:{...data,activities:[]},source:MANAGER_KEY,canonicalRoster:true});
}

async function saveManagerDataApi(request:Request,env:Env){
  if(!await canonicalAdminAllowed(request,env)) return json({success:false,message:"Unauthorized"},401);
  if(!env.ASSETS_BUCKET) return json({success:false,message:"R2 bucket is not configured"},503);
  const input=await request.json().catch(()=>({})) as Record<string,unknown>;
  const previous=await readManagerState(env);
  const next={...previous,...input} as Record<string,unknown>;
  delete next.activities;
  for(const type of ["association","vendor"] as const){
    const previousRows=managerRows(previous,type);
    const hasInput=Object.prototype.hasOwnProperty.call(input,type);
    const incoming=hasInput && Array.isArray(input[type]) ? input[type] as unknown[] : null;
    if(!hasInput || (incoming && incoming.length===0 && previousRows.length>0)) next[type]=previousRows;
  }
  next.updatedAt=new Date().toISOString();
  await env.ASSETS_BUCKET.put(MANAGER_KEY,JSON.stringify(next,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
  await writeCompatibilityCache(env,next);
  return json({success:true,data:next,source:MANAGER_KEY,canonicalRoster:true});
}

async function listCanonicalMembersApi(request:Request,env:Env){
  if(!await canonicalAdminAllowed(request,env)) return json({success:false,message:"Unauthorized"},401);
  const data=await readManagerState(env);
  const rows=compatibilityRows(data);
  return json({success:true,data:rows,total:rows.length,source:MANAGER_KEY,canonicalRoster:true});
}

async function adminAccessApi(request:Request,env:Env){
  if(!await canonicalAdminAllowed(request,env)) return json({success:false,message:"Unauthorized"},401);
  if(request.method==="GET") return json({success:true,data:await readJsonObject(env,ADMIN_ACCESS_KEY) || {}});
  if(!env.ASSETS_BUCKET) return json({success:false,message:"R2 bucket is not configured"},503);
  const input=await request.json().catch(()=>({})) as Record<string,unknown>;
  const memberNo=clean(input.memberNo,80).toUpperCase();
  if(!memberNo) return json({success:false,message:"Missing memberNo"},400);
  const records=await readJsonObject(env,ADMIN_ACCESS_KEY) || {};
  records[memberNo]={memberNo,email:clean(input.email,320).toLowerCase()||undefined,lineUserId:clean(input.lineUserId || input.uid,200)||undefined,name:clean(input.name,120),loginAccess:Boolean(input.loginAccess),updatedAt:new Date().toISOString()};
  await env.ASSETS_BUCKET.put(ADMIN_ACCESS_KEY,JSON.stringify(records,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
  const data=await readManagerState(env);
  for(const type of ["association","vendor"] as const){
    const rows=managerRows(data,type);
    const index=rows.findIndex((row)=>rowMemberNo(row)===memberNo);
    if(index<0) continue;
    rows[index]={...rows[index],loginAccess:Boolean(input.loginAccess),...(clean(input.lineUserId||input.uid,200)?{lineUserId:clean(input.lineUserId||input.uid,200)}:{}),updatedAt:new Date().toISOString()};
    data[type]=rows;
    data.updatedAt=new Date().toISOString();
    await env.ASSETS_BUCKET.put(MANAGER_KEY,JSON.stringify(data,null,2),{httpMetadata:{contentType:"application/json; charset=utf-8",cacheControl:"no-store"}});
    await writeCompatibilityCache(env,data);
    break;
  }
  return json({success:true,data:records[memberNo]});
}

function disabledRosterSync(){
  return json({success:false,code:"canonical_roster_only",message:"協會／廠商會員已改為單筆維護；主名冊只使用 TDEA 管理中心，不再接受批次或母站名冊同步。"},410);
}

export default {
  async fetch(request:Request,env:Env,ctx:ExecutionContext){
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/roster/member-contact") {
      try { return await saveContact(request,env); }
      catch(error){ return json({success:false,error:error instanceof Error?error.message:String(error)},500); }
    }
    if (request.method === "GET" && url.pathname === "/api/roster/live") {
      try { return await mergedRoster(env); }
      catch(error){ return json({success:false,error:error instanceof Error?error.message:String(error)},500); }
    }
    if (request.method === "GET" && url.pathname === "/api/roster/diagnose") {
      try { return await diagnoseRosterMember(request,env); }
      catch(error){ return json({success:false,error:error instanceof Error?error.message:String(error)},500); }
    }
    if (request.method === "GET" && url.pathname === "/roster.json") {
      try { return await mergedRoster(env); }
      catch(error){ return json({success:false,error:error instanceof Error?error.message:String(error)},500); }
    }

    if(url.pathname==="/api/manager-data"){
      if(request.method==="GET") return getManagerDataApi(request,env);
      if(request.method==="PUT" || request.method==="POST") return saveManagerDataApi(request,env);
    }
    if(url.pathname==="/api/admin-access" && ["GET","POST","PUT"].includes(request.method)) return adminAccessApi(request,env);
    if(request.method==="GET" && url.pathname==="/api/aiwe-members-public") return listCanonicalMembersApi(request,env);
    if(url.pathname==="/api/aiwe-members/sync" || url.pathname==="/api/aiwe-members/import" || url.pathname==="/api/google-member-sheet") return disabledRosterSync();

    if(url.pathname.startsWith("/api/")) await ensureCompatibilityCache(env);
    const response=await app.fetch(request,env as never,ctx);
    if(url.pathname.startsWith("/api/") && ["POST","PUT","PATCH"].includes(request.method) && response.ok){
      await reconcileLegacyUidWrites(env).catch(()=>undefined);
    }
    return response;
  }
};
