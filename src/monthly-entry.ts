import baseEntry from "./roster-sync-entry4";

type Env = { ADMIN_EMAILS?: string; ADMIN_LOGIN_USER?: string; ADMIN_LOGIN_PASSWORD?: string; ASSETS_BUCKET?: R2Bucket; LINE_CHANNEL_SECRET?: string; LINE_CHANNEL_ACCESS_TOKEN?: string; FORWARD_WEBHOOK_URL?: string; GOOGLE_FORMS_SCRIPT_URL?: string; GOOGLE_FORMS_SHARED_SECRET?: string; OPNFORM_API_BASE?: string; OPNFORM_PUBLIC_BASE?: string; OPNFORM_API_TOKEN?: string; OPNFORM_WORKSPACE_ID?: string; OPNFORM_WEBHOOK_SECRET?: string; WETW_POINT_API_KEY?: string; WETW_SHOP_ID?: string; WETW_POINT_TYPE?: string; TDEA_POINT_EXTERNAL_SYNC?: string; TDEA_ADMIN_LINE_USER_IDS?: string; AIWE_WP_USER?: string; AIWE_WP_APP_PASSWORD?: string; OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
type LineEvent = { type?: string; replyToken?: string; message?: { type?: string; id?: string; text?: string }; postback?: { data?: string }; source?: { type?: string; userId?: string; groupId?: string; roomId?: string } };
type MonthlyPage = { id?: string; manual?: boolean; activityNo?: string; activityId?: string; activityName?: string; imageUrl?: string; galleryUrls?: string[]; formImageUrl?: string; detailTitle?: string; detailText?: string; detailUrl?: string; formUrl?: string; shareUrl?: string; order?: number };
type MonthlyConfig = { enabled?: boolean; keyword?: string; month?: string; altText?: string; detailBaseUrl?: string; pages?: MonthlyPage[]; updatedAt?: string };
type VendorCardItem = { id?: string; enabled?: boolean; name?: string; label?: string; actionText?: string; imageUrl?: string; order?: number };
type VendorCardConfig = { enabled?: boolean; keyword?: string; altText?: string; title?: string; items?: VendorCardItem[]; updatedAt?: string };
type MarqueeButtonConfig = { label?: string; eventName?: string; eventContent?: string; points?: number; enabled?: boolean };
type MarqueeImageItem = { id?: string; imageUrl?: string; linkUrl?: string; title?: string; points?: number; enabled?: boolean; order?: number };
type MarqueeConfig = { enabled?: boolean; keyword?: string; altText?: string; title?: string; imageUrl?: string; imageUrls?: string[]; imageItems?: MarqueeImageItem[]; left?: MarqueeButtonConfig; right?: MarqueeButtonConfig; updatedAt?: string };
type RegistrationRecord = { activityId?: string; activityNo?: string; activityName?: string; formId?: string; count: number; lastSubmittedAt?: string };
type RegistrationSummary = { updatedAt?: string; activities: Record<string, RegistrationRecord> };
type PaymentStatus = "free" | "unpaid" | "reported" | "paid" | "cancelled" | "refunded";
type RegistrationPayment = { status: PaymentStatus; method?: "free" | "bank_transfer" | "cash" | "manual"; amount: number; currency?: string; remittanceLast5?: string; reportedAt?: string; paidAt?: string; verifiedBy?: string; verifiedAt?: string; note?: string; updatedAt?: string; transactions?: Array<Record<string, unknown>> };
type RegistrationEntry = { id: string; sourceId?: string; formId?: string; submittedAt?: string; updatedAt?: string; activity?: Record<string, unknown>; answers?: Record<string, unknown>; status?: string; checkedInAt?: string; sessionId?: string; queryCode?: string; checkinToken?: string; cancelledAt?: string; lineUserId?: string; pointsSyncedAt?: string; pointResults?: unknown[]; payment?: RegistrationPayment };
type ManagedSubmission = { formId?: string; sourceId?: string; submittedAt?: string; activity: Record<string, unknown>; answers: Record<string, unknown>; raw?: unknown };
type NativeField = { key: string; label: string; type: string; required?: boolean; options?: string[] };
type NativeSession = { id: string; name: string; startTime?: string; endTime?: string; capacity?: number; status?: string };
type NativeForm = { id: string; provider: "native_form"; activity: Record<string, unknown>; settings: Record<string, unknown>; fields: NativeField[]; sessions: NativeSession[]; formUrl: string; createdAt: string; updatedAt: string };
type LineLoginMember = { rosterType: "association" | "vendor"; memberNo: string; name: string; role: string; lineUserId: string; company?: string; phone?: string; email?: string; gender?: string; raw: Record<string, unknown> };
type PointLog = { logId: string; lineUserId: string; type: "EARN" | "SPEND"; amount: number; points: number; reason: string; balanceAfter: number; createdAt: string; createdTs: number; source?: string; referenceId?: string; externalSync?: unknown; externalBalanceSync?: unknown };
type PointAccount = { balance: number; logs: PointLog[]; updatedAt?: string; source?: string; syncedAt?: string; externalRaw?: unknown };
type RedeemMode = "fixed" | "manual" | "rate";
type RedeemTransaction = { id: string; lineUserId: string; memberName?: string; memberNo?: string; phone?: string; rosterType?: string; amount?: number; points: number; balanceBefore?: number; balanceAfter?: number; createdAt: string; note?: string; pointResult?: unknown };
type RedeemRequest = { id: string; token: string; vendorId?: string; vendorName: string; amount?: number; points: number; maxPoints?: number; pointRate?: number; mode?: RedeemMode; note?: string; status: "active" | "pending" | "used" | "expired" | "closed"; createdAt: string; startsAt?: string; expiresAt: string; usedAt?: string; lineUserId?: string; pointBalance?: number; pointResult?: unknown; transactions?: RedeemTransaction[] };
type PushTarget = { kind?: string; memberNoPrefix?: string; rosterType?: string; qualification?: string; manualUids?: string };
type PushLog = { id: string; createdAt: string; mode: string; target: PushTarget; count: number; messageType: string; title?: string; dryRun?: boolean; responses?: unknown[]; error?: string };
type PersonalMessageAttachment = { name: string; url: string; type?: string; size?: number };
type PersonalMessageRecord = { id: string; createdAt: string; updatedAt?: string; recipientMemberNo?: string; recipientLineUserId?: string; recipientName?: string; sender?: string; subject: string; body: string; attachments?: PersonalMessageAttachment[]; status: "active" | "deleted"; readAt?: string };
type RichMenuBounds = { x: number; y: number; width: number; height: number };
type RichMenuArea = { id?: string; label?: string; bounds: RichMenuBounds; action: Record<string, unknown> };
type RichMenuDeployment = { id: string; richMenuId: string; createdAt: string; name: string; chatBarText: string; areaCount: number; imageUrl?: string; setDefault: boolean; aliasId?: string; lineDefaultRichMenuId?: string; verified?: boolean };
type RichMenuSnapshot = { id: string; savedAt: string; name: string; chatBarText: string; areaCount: number; imageUrl?: string; config: Omit<RichMenuConfig, "snapshots" | "deployments"> };
type RichMenuConfig = { name?: string; chatBarText?: string; selected?: boolean; size?: { width: number; height: number }; imageUrl?: string; areas?: RichMenuArea[]; lastRichMenuId?: string; updatedAt?: string; deployments?: RichMenuDeployment[]; snapshots?: RichMenuSnapshot[] };
type LineActivityDraft = { id: string; lineUserId: string; step: string; answers: Record<string, unknown>; status: "active" | "completed" | "cancelled"; activity?: Record<string, unknown>; createdAt: string; updatedAt: string; completedAt?: string };
type AdminAccessRecord = { memberNo: string; email?: string; lineUserId?: string; name?: string; loginAccess: boolean; updatedAt?: string; updatedBy?: string };
type AdminWhitelistRecord = { id?: string; enabled?: boolean; label?: string; memberNo?: string; email?: string; lineUserId?: string; role?: string; note?: string; createdAt?: string; updatedAt?: string; updatedBy?: string };
type LineActivityAiResult = { intent?: string; confidence?: number; question?: string; fields?: Record<string, unknown> };
type MemberOnboardingSession = { lineUserId: string; step: "askMember" | "memberNo" | "name" | "joinInterest" | "applicantInfo"; answers: Record<string, unknown>; triggerText?: string; createdAt: string; updatedAt: string };
type MemberApplication = { id: string; lineUserId: string; status: "pending" | "handled"; source: "line"; name?: string; phone?: string; triggerText?: string; createdAt: string; updatedAt?: string };

const monthlyKey = "flex/monthly-activity.json";
const monthlySnapshotKey = "flex/monthly-activity-effective.json";
const managerDataKey = "manager/state.json";
const activityIndexKey = "activities/index.json";
const activitySnapshotKey = "activities/snapshot.json";
const activityMigrationKey = "activities/migration-v1.json";
const activityRecordPrefix = "activities/records/";
const vendorCardKey = "flex/vendor-card-menu.json";
const marqueeKey = "line/marquee.json";
const registrationSummaryKey = "registrations/summary.json";
const redeemListKey = "redeem/records.json";
const pushLogKey = "push/logs.json";
const personalMessagesKey = "personal-messages/messages.json";
const richMenuKey = "line/rich-menu.json";
const adminAccessKey = "line/admin-access.json";
const adminWhitelistKey = "line/admin-whitelist.json";
const aiweMembersKey = "aiwe/members.json";
const lineActivityDraftListKey = "line-activity/drafts.json";
const lineActivityLatestDraftKey = "line-activity/latest-active.json";
const lineActivityDebugKey = "line-activity/debug.json";
const lineWebhookLogKey = "line/webhook-log.json";
const memberApplicationListKey = "member-applications/list.json";
const defaultCalendarId = "7d66f2a96f192dda6cca2b04e60a6e549c7adf74f57721845d5b7e03f8b7ca89@group.calendar.google.com";
const googleMemberSheetCsvUrl = "https://docs.google.com/spreadsheets/d/1KzXzRsAesrF0vlKh2TLUKW-ltpWrxASWt7acWV7ic8w/export?format=csv&gid=858404675";
const workerBaseUrl = "https://tdeawork.fangwl591021.workers.dev";
const fixedKeyword = "TDEA每月活動";
const monthlyActivityAliases = ["活動報名", "TDEA活動", "TDEA報名", "TDEA課程"];
const vendorCardKeyword = "TDEA廠商列表";
const marqueeKeyword = "TDEA廣告贈點";
const queryKeyword = "TDEA活動查詢";
const marqueeLegacyKeywords = ["TDEA跑馬燈"];
const memberQrKeyword = "TDEA會員QR";
const calendarKeyword = "TDEA行事曆";
const personalMessageKeyword = "TDEA個人訊息";
const uidBindKeyword = "UID";
const memberCheckinKeyword = "會員報到";
const memberCheckinAliases = [memberCheckinKeyword, "會員打卡", "會員簽到"];
const lineActivityCreateKeyword = "TDEA建立活動";
const lineActivityCreateAliases = ["TDEA新增活動", "TDEA活動上稿", "TDEA製作活動"];
const defaultLiffBase = "https://liff.line.me/2005868456-2jmxqyFU?monthlyDetail={id}";
const defaultLiffCloseUrl = "https://liff.line.me/2005868456-2jmxqyFU?close=1";
const monthlyDefaultImageUrl = "https://fangwl591021.github.io/tdea-worker/public/assets/kooler-free-course.png";
let monthlyReplyCache: { config: MonthlyConfig; expiresAt: number } | null = null;
const publicAppUrl = "https://fangwl591021.github.io/tdea-worker/";
const publicLiffUrl = "https://liff.line.me/2005868456-2jmxqyFU";
const nativeLiffUrl = "https://liff.line.me/2005868456-cfANNVou";
const pointApiBase = "https://aiwe.cc/index.php/wp-json/wetw-point/v1";
function motherPointSyncRequired(env: Env) {
  return clean(env.TDEA_POINT_EXTERNAL_SYNC).toLowerCase() !== "false";
}
function motherPointApiReady(env: Env) {
  return motherPointSyncRequired(env) && Boolean(clean(env.WETW_POINT_API_KEY));
}
const headers = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "content-type,x-admin-email,x-admin-member-no,x-line-user-id,x-line-uid,x-aiwe-token,x-line-signature" };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const esc = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" }[ch] || ch));
const normalizeKeyword = (value: string) => value.trim().replace(/[\s\u200B-\u200D\uFEFF]+/g, "").toUpperCase();
const isMonthlyActivityKeyword = (value: string) => {
  const normalized = normalizeKeyword(value);
  return normalized === normalizeKeyword(fixedKeyword)
    || monthlyActivityAliases.some((keyword) => normalized === normalizeKeyword(keyword))
    || (normalized.includes("TDEA") && normalized.includes("每月活動"));
};

function staticAdminEmails(env: Env) {
  return (env.ADMIN_EMAILS || "admin@example.com").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function adminEmailFromRequest(request: Request) {
  return request.headers.get("x-admin-email")?.trim().toLowerCase() || "";
}

function adminMemberNoFromRequest(request: Request) {
  return request.headers.get("x-admin-member-no")?.trim().toUpperCase() || "";
}

function adminLineUserIdFromRequest(request: Request) {
  return clean(request.headers.get("x-line-user-id") || request.headers.get("x-line-uid"));
}

async function readAdminAccess(env: Env): Promise<Record<string, AdminAccessRecord>> {
  if (!env.ASSETS_BUCKET) return {};
  const object = await env.ASSETS_BUCKET.get(adminAccessKey);
  const data = object ? await object.json().catch(() => ({})) : {};
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, AdminAccessRecord> : {};
}

async function writeAdminAccess(env: Env, records: Record<string, AdminAccessRecord>) {
  if (!env.ASSETS_BUCKET) return false;
  await env.ASSETS_BUCKET.put(adminAccessKey, JSON.stringify(records, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

async function readAdminWhitelist(env: Env): Promise<AdminWhitelistRecord[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(adminWhitelistKey);
  if (!object) return [];
  const data = await object.json().catch(() => []);
  const rows = Array.isArray(data) ? data : Array.isArray((data as { records?: unknown[] }).records) ? (data as { records: unknown[] }).records : [];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      id: clean(row.id) || crypto.randomUUID(),
      enabled: row.enabled !== false,
      label: clean(row.label || row.name),
      memberNo: clean(row.memberNo).toUpperCase(),
      email: clean(row.email).toLowerCase(),
      lineUserId: firstClean(row.lineUserId, row.lineUid, row.uid, row.LINE_user_id, row.line_user_id),
      role: clean(row.role) || "admin",
      note: clean(row.note),
      createdAt: clean(row.createdAt),
      updatedAt: clean(row.updatedAt),
      updatedBy: clean(row.updatedBy)
    }));
}

async function writeAdminWhitelist(env: Env, records: AdminWhitelistRecord[]) {
  if (!env.ASSETS_BUCKET) return false;
  const now = new Date().toISOString();
  const rows = records.map((row) => ({
    id: clean(row.id) || crypto.randomUUID(),
    enabled: row.enabled !== false,
    label: clean(row.label),
    memberNo: clean(row.memberNo).toUpperCase(),
    email: clean(row.email).toLowerCase(),
    lineUserId: clean(row.lineUserId),
    role: clean(row.role) || "admin",
    note: clean(row.note),
    createdAt: clean(row.createdAt) || now,
    updatedAt: now,
    updatedBy: clean(row.updatedBy)
  }));
  await env.ASSETS_BUCKET.put(adminWhitelistKey, JSON.stringify({ records: rows, updatedAt: now }, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

function adminWhitelistConfigured(records: AdminWhitelistRecord[]) {
  return records.some((record) => record.enabled !== false && (clean(record.email) || clean(record.memberNo) || clean(record.lineUserId)));
}

function adminWhitelistMatches(records: AdminWhitelistRecord[], identity: { email?: string; memberNo?: string; lineUserId?: string }) {
  const email = clean(identity.email).toLowerCase();
  const memberNo = clean(identity.memberNo).toUpperCase();
  const lineUserId = clean(identity.lineUserId);
  if (!email && !memberNo && !lineUserId) return false;
  return records.some((record) => {
    if (record.enabled === false) return false;
    if (memberNo && clean(record.memberNo).toUpperCase() === memberNo) return true;
    if (lineUserId && clean(record.lineUserId) === lineUserId) return true;
    if (email && clean(record.email).toLowerCase() === email) return true;
    return false;
  });
}

async function adminWhitelistFromAssociationRoster(env: Env): Promise<AdminWhitelistRecord[]> {
  const data = await readManagerData(env);
  const rows = Array.isArray(data?.association) ? data.association : [];
  const fromRoster = rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .filter((row) => memberRowLoginAccess(row))
    .map((row) => {
      const memberNo = clean(row.memberNo || row.rosterMemberNo).toUpperCase();
      const lineUserId = memberLineUid(row);
      const email = clean(row.email).toLowerCase();
      return {
        id: memberNo || lineUserId || email || crypto.randomUUID(),
        enabled: true,
        label: clean(row.name || row.rosterName || row.memberName || memberNo || lineUserId),
        memberNo,
        email,
        lineUserId,
        role: "admin",
        note: "from association roster"
      };
    })
    .filter((row) => row.label || row.memberNo || row.email || row.lineUserId);
  const accessRecords = Object.values(await readAdminAccess(env))
    .filter((record) => record.loginAccess === true)
    .map((record) => ({
      id: clean(record.memberNo || record.lineUserId || record.email || crypto.randomUUID()),
      enabled: true,
      label: clean(record.name || record.memberNo || record.lineUserId || record.email),
      memberNo: clean(record.memberNo).toUpperCase(),
      email: clean(record.email).toLowerCase(),
      lineUserId: clean(record.lineUserId),
      role: "admin",
      note: "from association access"
    }))
    .filter((row) => row.label || row.memberNo || row.email || row.lineUserId);
  const deduped = new Map<string, AdminWhitelistRecord>();
  [...fromRoster, ...accessRecords].forEach((row) => {
    const key = [row.memberNo, row.lineUserId, row.email].filter(Boolean).join("|").toLowerCase() || row.id;
    if (!deduped.has(key)) deduped.set(key, row);
  });
  return [...deduped.values()];
}

async function isDynamicAdmin(identity: { email?: string; memberNo?: string; lineUserId?: string }, env: Env) {
  const email = clean(identity.email).toLowerCase();
  const memberNo = clean(identity.memberNo).toUpperCase();
  const lineUserId = clean(identity.lineUserId);
  if (!email && !memberNo && !lineUserId) return false;
  const whitelist = await readAdminWhitelist(env);
  const rosterWhitelist = await adminWhitelistFromAssociationRoster(env);
  const combinedWhitelist = [...whitelist, ...rosterWhitelist];
  if (adminWhitelistConfigured(combinedWhitelist)) return adminWhitelistMatches(combinedWhitelist, { email, memberNo, lineUserId });
  const records = await readAdminAccess(env);
  return Object.values(records).some((record) => {
    if (record.loginAccess !== true) return false;
    if (memberNo && clean(record.memberNo).toUpperCase() === memberNo) return true;
    if (lineUserId && clean(record.lineUserId) === lineUserId) return true;
    if (email && clean(record.email).toLowerCase() === email) return true;
    return false;
  });
}

function loginAccessEnabled(value: unknown) {
  if (value === true) return true;
  const text = clean(value).toLowerCase();
  return ["1", "true", "y", "yes", "allow", "allowed", "允許", "啟用"].includes(text);
}

function memberRowLoginAccess(row: Record<string, unknown>) {
  return [
    row.loginAccess,
    row.loginAllowed,
    row.allowLogin,
    row.canLogin,
    row.adminAccess,
    row["登入權限"]
  ].some(loginAccessEnabled);
}

async function isCheckinOperator(lineUserId: string, env: Env) {
  const uid = clean(lineUserId);
  if (!uid) return false;
  if (await isDynamicAdmin({ lineUserId: uid }, env)) return true;
  const whitelist = await readAdminWhitelist(env);
  if (adminWhitelistConfigured(whitelist)) return false;
  const lowerUid = uid.toLowerCase();
  const adminRecords = Object.values(await readAdminAccess(env)).filter((record) => record.loginAccess === true);
  const rows = await readAiweMembers(env);
  return rows.some((row) => {
    if (memberLineUid(row).toLowerCase() !== lowerUid) return false;
    if (memberRowLoginAccess(row)) return true;
    return adminRecords.some((record) => rowMatchesMemberNo(row, record.memberNo));
  });
}

async function requireAdmin(request: Request, env: Env) {
  const email = adminEmailFromRequest(request);
  if (email && staticAdminEmails(env).includes(email)) return null;
  if (await isDynamicAdmin({ email, memberNo: adminMemberNoFromRequest(request), lineUserId: adminLineUserIdFromRequest(request) }, env)) return null;
  return json({ success: false, message: "Unauthorized" }, 401);
}

function adminSessionPayload(identity: { email?: string; memberNo?: string; lineUserId?: string; displayName?: string }) {
  return {
    email: clean(identity.email).toLowerCase(),
    memberNo: clean(identity.memberNo).toUpperCase(),
    lineUserId: clean(identity.lineUserId),
    displayName: clean(identity.displayName),
    expiresAt: Date.now() + 12 * 60 * 60 * 1000
  };
}

async function adminPasswordLoginApi(request: Request, env: Env) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const username = clean(body.username);
  const password = clean(body.password);
  const expectedUser = clean(env.ADMIN_LOGIN_USER || "admin");
  const expectedPassword = clean(env.ADMIN_LOGIN_PASSWORD);
  if (!expectedPassword) return json({ success: false, message: "尚未設定 ADMIN_LOGIN_PASSWORD" }, 503);
  if (username !== expectedUser || password !== expectedPassword) return json({ success: false, message: "帳號或密碼錯誤" }, 401);
  const email = staticAdminEmails(env)[0] || "admin@example.com";
  return json({ success: true, data: adminSessionPayload({ email, displayName: username }) });
}

async function adminLineLoginApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = firstClean(body.lineUserId, body.lineUid, body.uid, body.userId, url.searchParams.get("lineUserId"), url.searchParams.get("lineUid"), url.searchParams.get("uid"));
  const displayName = clean(body.displayName || body.name);
  if (!lineUserId) return json({ success: false, message: "無法取得 LINE UID" }, 400);
  const allowed = await isDynamicAdmin({ lineUserId }, env);
  if (!allowed) return json({ success: false, message: "此 LINE 帳號未在管理白名單或登入權限名冊內" }, 401);
  return json({ success: true, data: adminSessionPayload({ lineUserId, displayName }) });
}

async function listAdminAccessApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  return json({ success: true, data: await readAdminAccess(env), staticAdmins: staticAdminEmails(env) });
}

async function listAdminWhitelistApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const whitelist = await readAdminWhitelist(env);
  const rosterWhitelist = await adminWhitelistFromAssociationRoster(env);
  return json({
    success: true,
    data: whitelist,
    rosterWhitelist,
    staticAdmins: staticAdminEmails(env),
    legacyAccess: await readAdminAccess(env),
    whitelistActive: adminWhitelistConfigured([...whitelist, ...rosterWhitelist])
  });
}

async function updateAdminWhitelistApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const rawRows = Array.isArray(input.records) ? input.records : Array.isArray(input.data) ? input.data : [];
  const updatedBy = adminEmailFromRequest(request) || adminMemberNoFromRequest(request) || adminLineUserIdFromRequest(request);
  const records = rawRows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      id: clean(row.id) || crypto.randomUUID(),
      enabled: row.enabled !== false,
      label: clean(row.label || row.name),
      memberNo: clean(row.memberNo).toUpperCase(),
      email: clean(row.email).toLowerCase(),
      lineUserId: firstClean(row.lineUserId, row.lineUid, row.uid, row.LINE_user_id, row.line_user_id),
      role: clean(row.role) || "admin",
      note: clean(row.note),
      createdAt: clean(row.createdAt),
      updatedBy
    }))
    .filter((row) => row.label || row.memberNo || row.email || row.lineUserId);
  await writeAdminWhitelist(env, records);
  return json({ success: true, data: await readAdminWhitelist(env), whitelistActive: adminWhitelistConfigured(records) });
}

async function updateAdminAccessApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const memberNo = clean(input.memberNo).toUpperCase();
  const email = clean(input.email).toLowerCase();
  const lineUserId = firstClean(input.lineUserId, input.lineUid, input.uid, input.LINE_user_id, input.line_user_id);
  if (!memberNo) return json({ success: false, message: "Missing memberNo" }, 400);
  const records = await readAdminAccess(env);
  records[memberNo] = {
    memberNo,
    email: email || undefined,
    lineUserId: lineUserId || undefined,
    name: clean(input.name),
    loginAccess: Boolean(input.loginAccess),
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmailFromRequest(request)
  };
  await writeAdminAccess(env, records);
  const rows = await readAiweMembers(env);
  const matchedRows = rows.filter((row) => rowMatchesMemberNo(row, memberNo));
  if (matchedRows.length) {
    for (const row of matchedRows) {
      row.loginAccess = Boolean(input.loginAccess);
      if (lineUserId) setAiweRowLineUid(row, lineUserId);
      if (email && !clean(row.email)) row.email = email;
    }
    await writeAiweMembers(env, rows);
  }
  return json({ success: true, data: records[memberNo] });
}

async function readMonthly(env: Env): Promise<MonthlyConfig> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(monthlyKey) : null;
  if (!object) return { enabled: false, keyword: fixedKeyword, month: "", altText: "TDEA 每月活動", detailBaseUrl: defaultLiffBase, pages: [] };
  const data = await object.json().catch(() => ({}));
  return normalizeConfig(data as MonthlyConfig);
}

async function writeMonthly(env: Env, config: MonthlyConfig) {
  if (!env.ASSETS_BUCKET) return false;
  const normalized = normalizeConfig(config);
  normalized.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(monthlyKey, JSON.stringify(normalized, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}


async function writeMonthlySnapshot(env: Env, config: MonthlyConfig) {
  if (!env.ASSETS_BUCKET) return false;
  const normalized = normalizeConfig(config);
  normalized.updatedAt = new Date().toISOString();
  monthlyReplyCache = { config: normalized, expiresAt: Date.now() + 60_000 };
  await env.ASSETS_BUCKET.put(monthlySnapshotKey, JSON.stringify(normalized, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

async function readMonthlySnapshot(env: Env): Promise<MonthlyConfig | null> {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(monthlySnapshotKey);
  if (!object) return null;
  const data = await object.json().catch(() => null) as MonthlyConfig | null;
  if (!data || typeof data !== "object") return null;
  const normalized = normalizeConfig(data);
  return normalized.pages?.length ? normalized : null;
}

async function refreshMonthlySnapshot(env: Env) {
  const effective = await readEffectiveMonthly(env);
  await writeMonthlySnapshot(env, effective);
  return effective;
}

async function readMonthlyReplyConfig(env: Env): Promise<MonthlyConfig> {
  if (monthlyReplyCache && monthlyReplyCache.expiresAt > Date.now()) return monthlyReplyCache.config;
  const snapshot = await readMonthlySnapshot(env);
  if (snapshot) {
    monthlyReplyCache = { config: snapshot, expiresAt: Date.now() + 60_000 };
    return snapshot;
  }
  return refreshMonthlySnapshot(env);
}
async function readManagerDataRaw(env: Env) {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(managerDataKey) : null;
  if (!object) return null;
  const data = await object.json().catch(() => null) as Record<string, unknown> | null;
  return data && typeof data === "object" ? data : null;
}

function activityActorFromRequest(request: Request) {
  return adminEmailFromRequest(request) || adminMemberNoFromRequest(request) || adminLineUserIdFromRequest(request) || "admin";
}

function cleanActivityId(value: unknown) {
  return clean(value).replace(/[^\w.-]/g, "_").slice(0, 120);
}

function activityRecordKey(id: string) {
  return `${activityRecordPrefix}${encodeURIComponent(id)}.json`;
}

function normalizeActivityRecord(input: Record<string, unknown>, existing: Record<string, unknown> | null, actor: string) {
  const now = new Date().toISOString();
  const id = cleanActivityId(input.id || existing?.id) || `id-${crypto.randomUUID()}`;
  return {
    ...(existing || {}),
    ...input,
    id,
    createdAt: clean(existing?.createdAt) || clean(input.createdAt) || now,
    createdBy: clean(existing?.createdBy) || clean(input.createdBy) || actor,
    updatedAt: now,
    updatedBy: actor,
    revision: Number(existing?.revision || 0) + 1
  };
}

async function readActivityIndex(env: Env): Promise<string[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(activityIndexKey);
  const data = object ? await object.json().catch(() => []) : [];
  return Array.isArray(data) ? data.map(cleanActivityId).filter(Boolean) : [];
}

async function writeActivityIndex(env: Env, ids: string[]) {
  if (!env.ASSETS_BUCKET) return false;
  const unique = [...new Set(ids.map(cleanActivityId).filter(Boolean))];
  await env.ASSETS_BUCKET.put(activityIndexKey, JSON.stringify(unique, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

async function readActivityRecord(env: Env, id: string) {
  if (!env.ASSETS_BUCKET) return null;
  const cleanId = cleanActivityId(id);
  if (!cleanId) return null;
  const object = await env.ASSETS_BUCKET.get(activityRecordKey(cleanId));
  const data = object ? await object.json().catch(() => null) as Record<string, unknown> | null : null;
  return data && typeof data === "object" ? data : null;
}

async function upsertActivityRecord(env: Env, input: Record<string, unknown>, actor: string) {
  if (!env.ASSETS_BUCKET) return null;
  const existingId = cleanActivityId(input.id);
  const existing = existingId ? await readActivityRecord(env, existingId) : null;
  const record = normalizeActivityRecord(input, existing, actor);
  const id = cleanActivityId(record.id);
  await env.ASSETS_BUCKET.put(activityRecordKey(id), JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  const index = await readActivityIndex(env);
  if (!index.includes(id)) await writeActivityIndex(env, [id, ...index]);
  return record;
}

async function migrateLegacyActivities(env: Env, rawData?: Record<string, unknown> | null) {
  if (!env.ASSETS_BUCKET) return [];
  const marker = await env.ASSETS_BUCKET.get(activityMigrationKey);
  if (marker) return [];
  const raw = rawData ?? await readManagerDataRaw(env);
  const legacy = Array.isArray(raw?.activities) ? raw.activities : [];
  if (!legacy.length) {
    await env.ASSETS_BUCKET.put(activityMigrationKey, JSON.stringify({ migratedAt: new Date().toISOString(), count: 0 }, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
    });
    return [];
  }
  const index = await readActivityIndex(env);
  if (index.length) {
    await env.ASSETS_BUCKET.put(activityMigrationKey, JSON.stringify({ migratedAt: new Date().toISOString(), skipped: true, reason: "activity-index-not-empty" }, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
    });
    return [];
  }
  const ids: string[] = [];
  for (const item of legacy) {
    if (!item || typeof item !== "object") continue;
    const record = await upsertActivityRecord(env, item as Record<string, unknown>, "legacy-migration");
    const id = cleanActivityId(record?.id);
    if (id) ids.push(id);
  }
  await env.ASSETS_BUCKET.put(activityMigrationKey, JSON.stringify({ migratedAt: new Date().toISOString(), count: ids.length }, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  await rebuildActivitySnapshot(env).catch(() => null);
  return ids;
}

function isArchivedActivityRecord(record: Record<string, unknown>) {
  return record.archived === true || record.deleted === true || clean(record.deletedAt) !== "" || clean(record.status) === "已封存";
}

async function readActivitySnapshot(env: Env) {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(activitySnapshotKey);
  if (!object) return null;
  const data = await object.json().catch(() => null) as Record<string, unknown> | null;
  return Array.isArray(data?.activities) ? data.activities as Record<string, unknown>[] : null;
}

async function writeActivitySnapshot(env: Env, records: Record<string, unknown>[]) {
  if (!env.ASSETS_BUCKET) return false;
  await env.ASSETS_BUCKET.put(activitySnapshotKey, JSON.stringify({ updatedAt: new Date().toISOString(), count: records.length, activities: records }, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

async function rebuildActivitySnapshot(env: Env) {
  if (!env.ASSETS_BUCKET) return [];
  const ids = await readActivityIndex(env);
  const records: Record<string, unknown>[] = [];
  for (const id of ids) {
    const record = await readActivityRecord(env, id);
    if (record) records.push(record);
  }
  await writeActivitySnapshot(env, records);
  return records;
}

async function listActivityRecords(env: Env, rawData?: Record<string, unknown> | null, options: { includeArchived?: boolean; forceRebuild?: boolean } = {}) {
  if (!env.ASSETS_BUCKET) {
    const raw = rawData ?? await readManagerDataRaw(env);
    const rows = Array.isArray(raw?.activities) ? raw.activities as Record<string, unknown>[] : [];
    return options.includeArchived ? rows : rows.filter((record) => !isArchivedActivityRecord(record));
  }
  const rows = options.forceRebuild ? await rebuildActivitySnapshot(env) : (await readActivitySnapshot(env) || await rebuildActivitySnapshot(env));
  return options.includeArchived ? rows : rows.filter((record) => !isArchivedActivityRecord(record));
}

async function deleteActivityRecord(env: Env, id: string, actor: string) {
  if (!env.ASSETS_BUCKET) return false;
  const cleanId = cleanActivityId(id);
  if (!cleanId) return false;
  const record = await readActivityRecord(env, cleanId);
  if (record) {
    const archivedAt = new Date().toISOString();
    const archived = { ...record, archived: true, deleted: true, deletedAt: archivedAt, deletedBy: actor, status: "已封存" };
    await env.ASSETS_BUCKET.put(`activities/deleted/${encodeURIComponent(cleanId)}-${Date.now()}.json`, JSON.stringify(archived, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
    });
    await env.ASSETS_BUCKET.put(activityRecordKey(cleanId), JSON.stringify(archived, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
    });
    return true;
  }
  return false;
}

async function restoreActivityRecord(env: Env, id: string, actor: string) {
  if (!env.ASSETS_BUCKET) return null;
  const cleanId = cleanActivityId(id);
  if (!cleanId) return null;
  const record = await readActivityRecord(env, cleanId);
  if (!record) return null;
  const restored = {
    ...record,
    archived: false,
    deleted: false,
    deletedAt: "",
    deletedBy: "",
    restoredAt: new Date().toISOString(),
    restoredBy: actor,
    status: "下架"
  };
  await env.ASSETS_BUCKET.put(activityRecordKey(cleanId), JSON.stringify(restored, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  const index = await readActivityIndex(env);
  if (!index.includes(cleanId)) await writeActivityIndex(env, [cleanId, ...index]);
  return restored;
}

async function activityRecordsApi(request: Request, env: Env, url: URL) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const itemMatch = url.pathname.match(/^\/api\/activities\/([^/]+)$/);
  const restoreMatch = url.pathname.match(/^\/api\/activities\/([^/]+)\/restore$/);
  if (request.method === "GET" && url.pathname === "/api/activities/archived") {
    const rows = await listActivityRecords(env, null, { includeArchived: true });
    return json({ success: true, data: { activities: rows.filter(isArchivedActivityRecord) } });
  }
  if (request.method === "GET" && url.pathname === "/api/activities") {
    const includeArchived = ["1", "true", "Y", "yes"].includes(clean(url.searchParams.get("includeArchived")).toLowerCase());
    return json({ success: true, data: { activities: await listActivityRecords(env, null, { includeArchived }) } });
  }
  if (request.method === "POST" && url.pathname === "/api/activities") {
    const guard = await requireAdmin(request, env);
    if (guard) return guard;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (!body || typeof body !== "object") return json({ success: false, message: "Invalid activity payload" }, 400);
    const record = await upsertActivityRecord(env, body, activityActorFromRequest(request));
    const rows = await listActivityRecords(env, null, { forceRebuild: true });
    await refreshMonthlySnapshot(env).catch(() => null);
    return json({ success: true, data: record, activities: rows });
  }
  if (itemMatch && request.method === "PUT") {
    const guard = await requireAdmin(request, env);
    if (guard) return guard;
    const id = decodeURIComponent(itemMatch[1]);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (!body || typeof body !== "object") return json({ success: false, message: "Invalid activity payload" }, 400);
    const record = await upsertActivityRecord(env, { ...body, id }, activityActorFromRequest(request));
    const rows = await listActivityRecords(env, null, { forceRebuild: true });
    await refreshMonthlySnapshot(env).catch(() => null);
    return json({ success: true, data: record, activities: rows });
  }
  if (itemMatch && request.method === "DELETE") {
    const guard = await requireAdmin(request, env);
    if (guard) return guard;
    const ok = await deleteActivityRecord(env, decodeURIComponent(itemMatch[1]), activityActorFromRequest(request));
    const rows = await listActivityRecords(env, null, { forceRebuild: true });
    if (ok) await refreshMonthlySnapshot(env).catch(() => null);
    return json({ success: ok, activities: rows }, ok ? 200 : 404);
  }
  if (restoreMatch && request.method === "POST") {
    const guard = await requireAdmin(request, env);
    if (guard) return guard;
    const record = await restoreActivityRecord(env, decodeURIComponent(restoreMatch[1]), activityActorFromRequest(request));
    const rows = await listActivityRecords(env, null, { forceRebuild: true });
    if (record) await refreshMonthlySnapshot(env).catch(() => null);
    return json({ success: Boolean(record), data: record, activities: rows }, record ? 200 : 404);
  }
  return json({ success: false, message: "Not found" }, 404);
}


function managerRosterMemberKeys(row: Record<string, unknown>) {
  return [row.memberNo, row.rosterMemberNo, row.member_no, row.aiweMemberNo, row.motherMemberNo, row.motherAccount, row.legacyAccount, row.user_login]
    .map((value) => clean(value).toUpperCase())
    .filter(Boolean);
}

function mergeMotherUidIntoManagerRoster(data: Record<string, unknown>, motherRows: Array<Record<string, unknown>>) {
  const remoteByTypeAndMember = new Map<string, { uid: string; row: Record<string, unknown>; conflict: boolean }>();
  for (const row of motherRows) {
    const uid = memberLineUid(row);
    if (!uid) continue;
    const type = clean(row.rosterType) === "vendor" ? "vendor" : "association";
    for (const key of managerRosterMemberKeys(row)) {
      const mapKey = `${type}:${key}`;
      const current = remoteByTypeAndMember.get(mapKey);
      if (current && current.uid.toLowerCase() !== uid.toLowerCase()) remoteByTypeAndMember.set(mapKey, { ...current, conflict: true });
      else if (!current) remoteByTypeAndMember.set(mapKey, { uid, row, conflict: false });
    }
  }

  const report = { association: { written: 0, skipped: 0, conflicts: 0, missing: 0 }, vendor: { written: 0, skipped: 0, conflicts: 0, missing: 0 } };
  let changed = false;
  for (const type of ["association", "vendor"] as const) {
    const rows = Array.isArray(data[type]) ? data[type] as Array<Record<string, unknown>> : [];
    for (const row of rows) {
      const keys = managerRosterMemberKeys(row);
      const currentUid = memberLineUid(row);
      const remote = keys.map((key) => remoteByTypeAndMember.get(`${type}:${key}`)).find(Boolean);
      if (!remote) { report[type].missing += 1; continue; }
      if (remote.conflict) { report[type].conflicts += 1; continue; }
      if (currentUid && currentUid.toLowerCase() !== remote.uid.toLowerCase()) { report[type].conflicts += 1; continue; }
      if (currentUid === remote.uid) { report[type].skipped += 1; continue; }
      setAiweRowLineUid(row, remote.uid);
      if (!clean(row.aiweMemberNo)) row.aiweMemberNo = firstClean(remote.row.aiweMemberNo, remote.row.rosterMemberNo, remote.row.memberNo, remote.row.user_login);
      if (!clean(row.phone)) row.phone = firstClean(remote.row.phone, remote.row.mobile, remote.row.tel, remote.row.telephone);
      if (!clean(row.email) || isSyntheticLineEmail(row.email)) row.email = isSyntheticLineEmail(firstClean(remote.row.email, remote.row.user_email)) ? "" : firstClean(remote.row.email, remote.row.user_email);
      report[type].written += 1;
      changed = true;
    }
  }
  if (changed) {
    data.aiweUidMergedAt = new Date().toISOString();
    data.aiweUidMergeReport = report;
  }
  return { changed, report };
}
async function readManagerData(env: Env) {
  const raw = await readManagerDataRaw(env);
  if (!raw) return raw;
  const data = { ...raw };
  const motherRows = await readAiweMembers(env).catch(() => [] as Array<Record<string, unknown>>);
  const merge = motherRows.length ? mergeMotherUidIntoManagerRoster(data, motherRows) : { changed: false, report: null };
  if (merge.changed && env.ASSETS_BUCKET) {
    const persisted = { ...data };
    delete persisted.activities;
    await env.ASSETS_BUCKET.put(managerDataKey, JSON.stringify(persisted, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
    });
  }
  return { ...data, activities: await listActivityRecords(env, raw) };
}

function managerDataHasUsefulContent(input: Record<string, unknown> | null) {
  if (!input || typeof input !== "object") return false;
  const hasRows = ["activities", "association", "vendor", "keywordRules", "flexRules"].some((key) => Array.isArray(input[key]) && (input[key] as unknown[]).length > 0);
  const formSettings = input.formSettings;
  const hasFormSettings = formSettings && typeof formSettings === "object" && !Array.isArray(formSettings) && Object.keys(formSettings).length > 0;
  return hasRows || hasFormSettings || Boolean(input.monthlyActivity);
}

async function writeManagerData(env: Env, input: Record<string, unknown>, actor = "admin") {
  if (!env.ASSETS_BUCKET) return false;
  if (!managerDataHasUsefulContent(input)) return false;
  const incomingActivities = Array.isArray(input.activities) ? input.activities : [];
  for (const item of incomingActivities) {
    if (item && typeof item === "object") await upsertActivityRecord(env, item as Record<string, unknown>, actor);
  }
  if (incomingActivities.length) await rebuildActivitySnapshot(env).catch(() => null);
  const managerInput = { ...input };
  delete managerInput.activities;
  const previous = await readManagerDataRaw(env);
  if (managerDataHasUsefulContent(previous) && !managerDataHasUsefulContent(input)) return false;
  const preserveRosterIfOmittedOrEmpty = (key: string) => {
    const previousValue = previous && Object.prototype.hasOwnProperty.call(previous, key) ? previous[key] : undefined;
    const inputHasKey = Object.prototype.hasOwnProperty.call(managerInput, key);
    const inputValue = inputHasKey ? managerInput[key] : undefined;
    if (Array.isArray(previousValue) && previousValue.length > 0 && (!inputHasKey || (Array.isArray(inputValue) && inputValue.length === 0))) {
      return previousValue;
    }
    return inputHasKey ? inputValue : previousValue;
  };
  const data = {
    ...(previous || {}),
    ...managerInput,
    association: preserveRosterIfOmittedOrEmpty("association"),
    vendor: preserveRosterIfOmittedOrEmpty("vendor"),
    updatedAt: new Date().toISOString()
  };
  delete data.activities;
  if (data.association === undefined) delete data.association;
  if (data.vendor === undefined) delete data.vendor;
  const motherRows = await readAiweMembers(env).catch(() => [] as Array<Record<string, unknown>>);
  if (motherRows.length) mergeMotherUidIntoManagerRoster(data, motherRows);
  await env.ASSETS_BUCKET.put(managerDataKey, JSON.stringify(data, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

function normalizeVendorCardConfig(config: VendorCardConfig): VendorCardConfig {
  const items = Array.isArray(config.items) ? config.items : [];
  return {
    enabled: Boolean(config.enabled),
    keyword: vendorCardKeyword,
    altText: clean(config.altText || "TDEA 撱??”") || "TDEA 撱??”",
    title: clean(config.title || "TDEA 撱??”") || "TDEA 撱??”",
    updatedAt: config.updatedAt,
    items: items.slice(0, 40).map((item, index) => {
      const name = clean(item.name || item.label || item.actionText);
      return {
        id: clean(item.id) || crypto.randomUUID(),
        enabled: item.enabled !== false,
        name,
        label: clean(item.label || name),
        actionText: clean(item.actionText || name),
        imageUrl: clean(item.imageUrl),
        order: Number(item.order ?? index)
      };
    }).filter((item) => item.name || item.label || item.actionText || item.imageUrl)
  };
}

async function readVendorCardConfig(env: Env): Promise<VendorCardConfig> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(vendorCardKey) : null;
  if (!object) return { enabled: false, keyword: vendorCardKeyword, altText: "TDEA 撱??”", title: "TDEA 撱??”", items: [] };
  const data = await object.json().catch(() => ({}));
  return normalizeVendorCardConfig(data as VendorCardConfig);
}

async function writeVendorCardConfig(env: Env, config: VendorCardConfig) {
  if (!env.ASSETS_BUCKET) return false;
  const normalized = normalizeVendorCardConfig(config);
  normalized.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(vendorCardKey, JSON.stringify(normalized, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

function normalizeMarqueeButton(input: MarqueeButtonConfig | undefined, fallbackLabel: string, fallbackEventName: string): MarqueeButtonConfig {
  const points = Number(input?.points ?? 1);
  return {
    enabled: input?.enabled !== false,
    label: clean(input?.label || fallbackLabel) || fallbackLabel,
    eventName: clean(input?.eventName || fallbackEventName) || fallbackEventName,
    eventContent: clean(input?.eventContent || "廣告贈點按鈕點擊簽到贈點") || "廣告贈點按鈕點擊簽到贈點",
    points: Number.isFinite(points) && points > 0 ? Math.min(Math.round(points), 9999) : 1
  };
}

function marqueeImageId(value: string, index: number) {
  const source = clean(value) || `image-${index + 1}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  return `img-${index + 1}-${Math.abs(hash).toString(36)}`;
}

function normalizeMarqueeImageItems(config: MarqueeConfig | undefined): MarqueeImageItem[] {
  const rawItems = Array.isArray(config?.imageItems) ? config?.imageItems || [] : [];
  const legacyUrls = [...new Set([...(Array.isArray(config?.imageUrls) ? config?.imageUrls || [] : []), config?.imageUrl].map((url) => clean(url)).filter(Boolean))];
  const items = rawItems.length
    ? rawItems.map((item, index) => ({ ...item, order: Number.isFinite(Number(item?.order)) ? Number(item?.order) : index }))
    : legacyUrls.map((url, index) => ({ id: marqueeImageId(url, index), imageUrl: url, linkUrl: "", points: 1, enabled: true, order: index }));
  const seen = new Set<string>();
  return items
    .map((item, index) => {
      const imageUrl = clean(item.imageUrl);
      const id = clean(item.id) || marqueeImageId(imageUrl, index);
      const points = Number(item.points ?? 1);
      return {
        id,
        imageUrl,
        linkUrl: clean(item.linkUrl),
        title: clean(item.title),
        points: Number.isFinite(points) && points > 0 ? Math.min(Math.round(points), 9999) : 1,
        enabled: item.enabled !== false,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
      };
    })
    .filter((item) => {
      const key = item.id || item.imageUrl || "";
      if (!item.imageUrl || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .slice(0, 20);
}

function normalizeMarqueeConfig(config: MarqueeConfig | undefined): MarqueeConfig {
  const title = clean(config?.title || "TDEA 廣告贈點");
  const right = normalizeMarqueeButton(config?.right, "查詢點數", `${title} 查詢點數`);
  right.eventContent = clean(config?.right?.eventContent || "查詢母站點數") || "查詢母站點數";
  const imageItems = normalizeMarqueeImageItems(config);
  const imageUrls = imageItems.map((item) => item.imageUrl || "").filter(Boolean);
  return {
    enabled: config?.enabled !== false,
    keyword: marqueeKeyword,
    altText: clean(config?.altText || "TDEA 廣告贈點") || "TDEA 廣告贈點",
    title,
    imageUrl: imageUrls[0] || "",
    imageUrls,
    imageItems,
    left: normalizeMarqueeButton(config?.left, "系統簽到", `${title} 系統簽到`),
    right,
    updatedAt: config?.updatedAt
  };
}

async function readMarqueeConfig(env: Env): Promise<MarqueeConfig> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(marqueeKey) : null;
  if (!object) return normalizeMarqueeConfig(undefined);
  const data = await object.json().catch(() => ({}));
  return normalizeMarqueeConfig(data as MarqueeConfig);
}

async function writeMarqueeConfig(env: Env, config: MarqueeConfig) {
  if (!env.ASSETS_BUCKET) return false;
  const normalized = normalizeMarqueeConfig(config);
  normalized.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(marqueeKey, JSON.stringify(normalized, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.min(Math.max(next, min), max);
}

function normalizeRichMenuAction(action: Record<string, unknown>) {
  const type = clean(action.type || "message").toLowerCase();
  if (type === "uri") return { type: "uri", uri: clean(action.uri) };
  if (type === "postback") {
    const out: Record<string, unknown> = { type: "postback", data: clean(action.data) };
    const displayText = clean(action.displayText);
    if (displayText) out.displayText = displayText;
    return out;
  }
  if (type === "richmenuswitch") {
    const richMenuAliasId = clean(action.richMenuAliasId);
    return { type: "richmenuswitch", richMenuAliasId, data: clean(action.data) || (richMenuAliasId ? `switch:${richMenuAliasId}` : "") };
  }
  return { type: "message", text: clean(action.text) };
}

function normalizeRichMenuConfig(input: RichMenuConfig): RichMenuConfig {
  const height = clampInt(input.size?.height, 843, 1686, 1686) > 1260 ? 1686 : 843;
  const width = 2500;
  const areas = Array.isArray(input.areas) ? input.areas : [];
  return {
    name: clean(input.name || "TDEA Rich Menu").slice(0, 300) || "TDEA Rich Menu",
    chatBarText: clean(input.chatBarText || "?詨").slice(0, 14) || "?詨",
    selected: input.selected !== false,
    size: { width, height },
    imageUrl: clean(input.imageUrl),
    lastRichMenuId: clean(input.lastRichMenuId),
    updatedAt: input.updatedAt,
    deployments: Array.isArray(input.deployments) ? input.deployments.slice(0, 30) : [],
    snapshots: Array.isArray(input.snapshots) ? input.snapshots.slice(0, 50) : [],
    areas: areas.slice(0, 20).map((area, index) => {
      const rawBounds = area.bounds || { x: 0, y: 0, width, height };
      const x = clampInt(rawBounds.x, 0, width - 1, 0);
      const y = clampInt(rawBounds.y, 0, height - 1, 0);
      const maxWidth = width - x;
      const maxHeight = height - y;
      return {
        id: clean(area.id) || crypto.randomUUID(),
        label: clean(area.label || `???${index + 1}`),
        bounds: {
          x,
          y,
          width: clampInt(rawBounds.width, 1, maxWidth, maxWidth),
          height: clampInt(rawBounds.height, 1, maxHeight, maxHeight)
        },
        action: normalizeRichMenuAction(asRecord(area.action))
      };
    })
  };
}

async function readRichMenuConfig(env: Env): Promise<RichMenuConfig> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(richMenuKey) : null;
  if (!object) return normalizeRichMenuConfig({ name: "TDEA ???詨", chatBarText: "?詨", selected: true, size: { width: 2500, height: 1686 }, areas: [], deployments: [] });
  const data = await object.json().catch(() => ({}));
  return normalizeRichMenuConfig(data as RichMenuConfig);
}

async function writeRichMenuConfig(env: Env, config: RichMenuConfig) {
  if (!env.ASSETS_BUCKET) return false;
  const normalized = normalizeRichMenuConfig(config);
  normalized.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(richMenuKey, JSON.stringify(normalized, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

function assertRichMenuConfig(config: RichMenuConfig) {
  const normalized = normalizeRichMenuConfig(config);
  if (!normalized.name) throw new Error("請輸入圖文選單名稱");
  if (!normalized.chatBarText) throw new Error("請輸入選單列文字");
  if (!normalized.imageUrl) throw new Error("請先上傳或填入圖文選單底圖");
  if (!normalized.areas?.length) throw new Error("請至少建立一個點擊區域");
  for (const [index, area] of normalized.areas.entries()) {
    const action = asRecord(area.action);
    const type = clean(action.type);
    if (type === "uri" && !clean(action.uri)) throw new Error(`???${index + 1} 蝻箏?蝬脣?`);
    if (type === "message" && !clean(action.text)) throw new Error(`???${index + 1} 蝻箏????`);
    if (type === "postback" && !clean(action.data)) throw new Error(`???${index + 1} 蝻箏? Postback data`);
    if (type === "richmenuswitch" && (!clean(action.richMenuAliasId) || !clean(action.data))) throw new Error(`???${index + 1} 蝻箏? rich menu switch ?`);
  }
  return normalized;
}

function buildLineRichMenuObject(config: RichMenuConfig) {
  const normalized = assertRichMenuConfig(config);
  return {
    size: normalized.size,
    selected: normalized.selected !== false,
    name: normalized.name,
    chatBarText: normalized.chatBarText,
    areas: (normalized.areas || []).map((area) => ({ bounds: area.bounds, action: area.action }))
  };
}

async function fetchRichMenuImage(urlValue: string, env: Env) {
  const url = urlValue.startsWith("/") ? `${workerBaseUrl}${urlValue}` : urlValue;
  const parsed = new URL(url, workerBaseUrl);
  const workerOrigin = new URL(workerBaseUrl).origin;
  if (parsed.origin === workerOrigin && parsed.pathname.startsWith("/api/uploads/")) {
    if (!env.ASSETS_BUCKET) throw new Error("R2 bucket is not configured");
    const key = decodeURIComponent(parsed.pathname.replace(/^\/api\/uploads\//, ""));
    const object = await env.ASSETS_BUCKET.get(key);
    if (!object) throw new Error(`摨?霈?仃??404 (${key})`);
    const contentType = (object.httpMetadata?.contentType || "image/jpeg").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png"].includes(contentType)) throw new Error("LINE ???詨摨??芣??JPG ??PNG");
    return { contentType, body: await object.arrayBuffer() };
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`摨?霈?仃??${response.status}`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!["image/jpeg", "image/png"].includes(contentType)) throw new Error("LINE ???詨摨??芣??JPG ??PNG");
  return { contentType, body: await response.arrayBuffer() };
}

async function lineRichMenuRequest(env: Env, url: string, init: RequestInit = {}) {
  const token = clean(env.LINE_CHANNEL_ACCESS_TOKEN);
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  const headers = new Headers(init.headers || {});
  headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  const body = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`LINE Rich Menu API failed ${response.status}: ${body}`);
  return body ? JSON.parse(body) : {};
}

async function upsertRichMenuAlias(env: Env, aliasId: string, richMenuId: string) {
  const cleanAliasId = clean(aliasId);
  if (!cleanAliasId || !richMenuId) return null;
  const payload = { richMenuAliasId: cleanAliasId, richMenuId };
  try {
    await lineRichMenuRequest(env, "https://api.line.me/v2/bot/richmenu/alias", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    return { aliasId: cleanAliasId, mode: "created" };
  } catch (error) {
    await lineRichMenuRequest(env, `https://api.line.me/v2/bot/richmenu/alias/${encodeURIComponent(cleanAliasId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ richMenuId })
    });
    return { aliasId: cleanAliasId, mode: "updated", createError: String((error as Error).message || error) };
  }
}

async function getLineDefaultRichMenuId(env: Env) {
  const result = await lineRichMenuRequest(env, "https://api.line.me/v2/bot/user/all/richmenu", { method: "GET" }) as Record<string, unknown>;
  return clean(result.richMenuId);
}

async function getRichMenuApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  return json({ success: true, data: await readRichMenuConfig(env) });
}

async function saveRichMenuApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as RichMenuConfig;
  const existing = await readRichMenuConfig(env);
  const base = normalizeRichMenuConfig({ ...input, deployments: input.deployments || existing.deployments || [], snapshots: input.snapshots || existing.snapshots || [], lastRichMenuId: input.lastRichMenuId || existing.lastRichMenuId });
  const snapshot = richMenuSnapshot(base);
  const normalized = normalizeRichMenuConfig({ ...base, snapshots: [snapshot, ...(existing.snapshots || [])] });
  await writeRichMenuConfig(env, normalized);
  return json({ success: true, data: await readRichMenuConfig(env), snapshot });
}

async function validateRichMenuApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  try {
    const input = await request.json().catch(() => ({})) as RichMenuConfig;
    const existing = await readRichMenuConfig(env);
    const config = assertRichMenuConfig({ ...existing, ...input, areas: input.areas || existing.areas, imageUrl: input.imageUrl || existing.imageUrl });
    const image = await fetchRichMenuImage(clean(config.imageUrl), env);
    return json({
      success: true,
      message: "圖文選單檢查通過，可以發布到 LINE。",
      data: {
        name: config.name,
        chatBarText: config.chatBarText,
        size: config.size,
        areaCount: config.areas?.length || 0,
        imageContentType: image.contentType,
        imageBytes: image.body.byteLength
      }
    });
  } catch (error) {
    return json({ success: false, message: String((error as Error).message || error) }, 400);
  }
}

async function deployRichMenuApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  try {
    const input = await request.json().catch(() => ({})) as RichMenuConfig & { setDefault?: boolean };
    const existing = await readRichMenuConfig(env);
    const config = assertRichMenuConfig({ ...existing, ...input, areas: input.areas || existing.areas, imageUrl: input.imageUrl || existing.imageUrl });
    const menuObject = buildLineRichMenuObject(config);
    const image = await fetchRichMenuImage(clean(config.imageUrl), env);
    const created = await lineRichMenuRequest(env, "https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(menuObject)
    }) as Record<string, unknown>;
    const richMenuId = clean(created.richMenuId);
    if (!richMenuId) throw new Error("LINE 瘝?? richMenuId");
    await lineRichMenuRequest(env, `https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, {
      method: "POST",
      headers: { "content-type": image.contentType },
      body: image.body
    });
    const setDefault = input.setDefault !== false;
    if (setDefault) {
      await lineRichMenuRequest(env, `https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, { method: "POST" });
    }
    const aliasResult = await upsertRichMenuAlias(env, clean(config.name), richMenuId);
    const lineDefaultRichMenuId = setDefault ? await getLineDefaultRichMenuId(env) : "";
    const verified = !setDefault || lineDefaultRichMenuId === richMenuId;
    const deployment: RichMenuDeployment = {
      id: `RM-${Date.now()}`,
      richMenuId,
      createdAt: new Date().toISOString(),
      name: clean(config.name),
      chatBarText: clean(config.chatBarText),
      areaCount: config.areas?.length || 0,
      imageUrl: clean(config.imageUrl),
      setDefault,
      aliasId: clean(aliasResult?.aliasId),
      lineDefaultRichMenuId,
      verified
    };
    const next = normalizeRichMenuConfig({ ...config, lastRichMenuId: richMenuId, deployments: [deployment, ...(existing.deployments || [])] });
    await writeRichMenuConfig(env, next);
    return json({
      success: verified,
      data: next,
      deployment,
      alias: aliasResult,
      lineDefaultRichMenuId,
      message: verified ? "LINE 圖文選單已發布並設為預設。" : "圖文選單已建立，但尚未確認為 LINE 預設選單。"
    }, verified ? 200 : 409);
  } catch (error) {
    return json({ success: false, message: String((error as Error).message || error) }, 400);
  }
}

async function readRegistrationSummary(env: Env): Promise<RegistrationSummary> {
  const object = env.ASSETS_BUCKET ? await env.ASSETS_BUCKET.get(registrationSummaryKey) : null;
  if (!object) return { activities: {} };
  const data = await object.json().catch(() => ({}));
  const activities = data && typeof data === "object" && typeof (data as RegistrationSummary).activities === "object" ? (data as RegistrationSummary).activities : {};
  for (const [key, record] of Object.entries(activities || {})) {
    const list = await readRegistrationList(env, key);
    if (list.length) record.count = activeRegistrations(list).length;
  }
  return { updatedAt: (data as RegistrationSummary).updatedAt, activities: activities || {} };
}

async function writeRegistrationSummary(env: Env, summary: RegistrationSummary) {
  if (!env.ASSETS_BUCKET) return false;
  summary.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(registrationSummaryKey, JSON.stringify(summary, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

function registrationKeys(activity: Record<string, unknown>, formId: string) {
  return [activity.id, activity.activityNo, activity.name, formId].map((value) => String(value || "").trim()).filter(Boolean);
}

function registrationListKey(key: string) {
  return `registrations/by-key/${encodeURIComponent(key)}.json`;
}

async function readRegistrationList(env: Env, key: string): Promise<RegistrationEntry[]> {
  if (!env.ASSETS_BUCKET || !key) return [];
  const object = await env.ASSETS_BUCKET.get(registrationListKey(key));
  if (!object) return [];
  const data = await object.json().catch(() => []);
  return Array.isArray(data) ? data as RegistrationEntry[] : [];
}

async function writeRegistrationList(env: Env, key: string, list: RegistrationEntry[]) {
  if (!env.ASSETS_BUCKET || !key) return;
  await env.ASSETS_BUCKET.put(registrationListKey(key), JSON.stringify(list.slice(0, 1000), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function activeRegistrations(list: RegistrationEntry[]) {
  return dedupeRegistrations(list).filter((item) => clean(item.status || "active") !== "cancelled");
}

function registrationFingerprint(entry: RegistrationEntry) {
  const answerText = JSON.stringify(normalizeAnswersRecord(entry.answers || {}));
  return [
    clean(entry.formId),
    clean(entry.submittedAt),
    answerText
  ].join("|");
}

function dedupeRegistrations(list: RegistrationEntry[]) {
  const seen = new Set<string>();
  const output: RegistrationEntry[] = [];
  for (const item of list) {
    const sourceId = clean(item.sourceId);
    const fingerprint = registrationFingerprint(item);
    if ((sourceId && seen.has(`source:${sourceId}`)) || seen.has(`fingerprint:${fingerprint}`)) continue;
    if (sourceId) seen.add(`source:${sourceId}`);
    seen.add(`fingerprint:${fingerprint}`);
    output.push({ ...item, answers: normalizeAnswersRecord(item.answers || {}) });
  }
  return output;
}

async function appendRegistrationList(env: Env, keys: string[], entry: RegistrationEntry) {
  if (!env.ASSETS_BUCKET) return;
  let maxCount = 0;
  for (const key of keys) {
    const list = dedupeRegistrations(await readRegistrationList(env, key));
    const sourceId = entry.sourceId || entry.id;
    const fingerprint = registrationFingerprint(entry);
    const exists = list.some((item) => (item.sourceId || item.id) === sourceId || registrationFingerprint(item) === fingerprint);
    const nextList = exists ? list : [entry, ...list];
    maxCount = Math.max(maxCount, activeRegistrations(nextList).length);
    await writeRegistrationList(env, key, nextList);
  }
  return maxCount;
}

function publicRegistrationEntry(entry: RegistrationEntry): RegistrationEntry & { checkinStatus: string; checkinStatusText: string } {
  const answers = normalizeAnswersRecord(entry.answers || {});
  if (isSyntheticLineEmail(answers.email)) answers.email = "";
  if (isSyntheticLineEmail(answers.Email)) answers.Email = "";
  if (isSyntheticLineEmail(answers["電子郵件"])) answers["電子郵件"] = "";
  const checkedInAt = clean(entry.checkedInAt);
  const cancelled = clean(entry.status || "active") === "cancelled";
  const payment = normalizeRegistrationPayment(entry);
  return {
    ...entry,
    answers,
    payment,
    checkinStatus: cancelled ? "cancelled" : checkedInAt ? "checked_in" : "pending",
    checkinStatusText: cancelled ? "已取消" : checkedInAt ? "已完成簽到" : "尚未簽到"
  };
}

function activityPaymentAmount(activity: Record<string, unknown>) {
  return Math.max(0, numberValue(activity.paymentAmount || activity.feeAmount || activity.registrationFee || activity.amount));
}

function initialRegistrationPayment(activity: Record<string, unknown>): RegistrationPayment {
  const amount = activityPaymentAmount(activity);
  const now = new Date().toISOString();
  return {
    status: amount > 0 ? "unpaid" : "free",
    method: amount > 0 ? "bank_transfer" : "free",
    amount,
    currency: "TWD",
    updatedAt: now,
    transactions: [{ type: "created", status: amount > 0 ? "unpaid" : "free", amount, at: now }]
  };
}

function normalizeRegistrationPayment(entry: RegistrationEntry): RegistrationPayment {
  const base = entry.payment || initialRegistrationPayment(asRecord(entry.activity));
  const amount = Math.max(0, numberValue(base.amount || activityPaymentAmount(asRecord(entry.activity))));
  const status = clean(base.status) as PaymentStatus;
  const safeStatus: PaymentStatus = ["free", "unpaid", "reported", "paid", "cancelled", "refunded"].includes(status) ? status : amount > 0 ? "unpaid" : "free";
  return {
    status: amount <= 0 && safeStatus === "unpaid" ? "free" : safeStatus,
    method: base.method || (amount > 0 ? "bank_transfer" : "free"),
    amount,
    currency: clean(base.currency) || "TWD",
    remittanceLast5: clean(base.remittanceLast5),
    reportedAt: clean(base.reportedAt),
    paidAt: clean(base.paidAt),
    verifiedBy: clean(base.verifiedBy),
    verifiedAt: clean(base.verifiedAt),
    note: clean(base.note),
    updatedAt: clean(base.updatedAt),
    transactions: Array.isArray(base.transactions) ? base.transactions : []
  };
}

function paymentIsSettled(entry: RegistrationEntry) {
  const payment = normalizeRegistrationPayment(entry);
  return payment.amount <= 0 || payment.status === "free" || payment.status === "paid";
}

async function listRegistrations(request: Request, env: Env) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const url = new URL(request.url);
  const keys = (url.searchParams.get("keys") || url.searchParams.get("key") || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  for (const key of keys) {
    const list = dedupeRegistrations(await readRegistrationList(env, key));
    if (list.length) return json({ success: true, key, data: list.map(publicRegistrationEntry) });
  }
  return json({ success: true, key: keys[0] || "", data: [] });
}

function registrationExportValue(value: unknown) {
  return clean(answerValue(value));
}

function registrationExportStatus(entry: RegistrationEntry) {
  const status = clean(entry.status || "active");
  if (status === "cancelled") return "已取消";
  return "有效";
}

function registrationExportPaymentStatus(entry: RegistrationEntry) {
  const payment = normalizeRegistrationPayment(entry);
  if (payment.amount <= 0 || payment.status === "free") return "免費";
  if (payment.status === "paid") return "已確認";
  if (payment.status === "reported") return "已回報待核對";
  if (payment.status === "cancelled") return "已取消";
  if (payment.status === "refunded") return "已退款";
  return "未付款";
}

function registrationExportSource(value: unknown) {
  const source = clean(value);
  if (source === "line_login" || source === "line_member_claim") return "LINE 快速報名";
  if (source === "form") return "完整表單";
  return source;
}

function registrationExportFileName(value: string) {
  const safe = clean(value).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 90);
  return safe || "TDEA-報名名單.xls";
}

function registrationExcelCell(value: unknown) {
  return `<td style="mso-number-format:'\\@';white-space:pre-wrap">${esc(value).replace(/\r?\n/g, "<br>")}</td>`;
}

function registrationExcelHeader(value: unknown) {
  return `<th style="background:#eef2f7;mso-number-format:'\\@'">${esc(value)}</th>`;
}

async function exportRegistrationsExcel(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const url = new URL(request.url);
  const activityId = clean(url.searchParams.get("activityId") || url.searchParams.get("id"));
  const queryKeys = (url.searchParams.get("keys") || url.searchParams.get("key") || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const activity = activityId ? await readActivityRecord(env, activityId) : null;
  const activityFormId = activity ? firstClean(activity.nativeFormId, activity.formId, activity.googleFormId, activity.opnformFormId) : "";
  const activityKeys = activity ? registrationKeys(activity, activityFormId) : [];
  const keys = [...new Set([...queryKeys, activityId, ...activityKeys].map(clean).filter(Boolean))];
  let chosenKey = "";
  let rows: RegistrationEntry[] = [];
  for (const key of keys) {
    const list = dedupeRegistrations(await readRegistrationList(env, key));
    if (list.length) {
      chosenKey = key;
      rows = list;
      break;
    }
  }
  const fallbackActivity = rows.find((row) => row.activity)?.activity || {};
  const sourceActivity = activity || fallbackActivity;
  const formId = firstClean(activityFormId, rows[0]?.formId, chosenKey);
  const form = formId ? await readNativeForm(env, formId).catch(() => null) : null;
  const fieldLabels = new Map<string, string>();
  for (const field of form?.fields || []) fieldLabels.set(field.key, firstClean(field.label, field.key));
  const baseHeaders = [
    "報名狀態",
    "報名時間",
    "更新時間",
    "取消時間",
    "查詢碼",
    "LINE UID",
    "報名來源",
    "會員編號",
    "會員姓名",
    "場次",
    "付款狀態",
    "付款金額",
    "匯款末五碼",
    "付款回報時間",
    "付款確認時間",
    "核銷狀態",
    "核銷時間"
  ];
  const answerKeys = [...new Set(rows.flatMap((row) => Object.keys(row.answers || {})))]
    .filter((key) => !["registrationSource", "memberNo", "memberName", "LINE_user_id", "lineUserId", "line_user_id", "uid", "UID"].includes(key));
  const headersForAnswers = answerKeys.map((key) => fieldLabels.get(key) || key);
  const title = firstClean(sourceActivity.name, sourceActivity.activityName, sourceActivity.title, form?.activity?.name, activityId, chosenKey, "TDEA 活動");
  const created = new Date().toISOString().slice(0, 10);
  const fileName = registrationExportFileName(`${title}-報名名單-${created}.xls`);
  const bodyRows = rows.map((entry) => {
    const answers = normalizeAnswersRecord(entry.answers || {});
    const payment = normalizeRegistrationPayment(entry);
    const baseValues = [
      registrationExportStatus(entry),
      entry.submittedAt || "",
      entry.updatedAt || "",
      entry.cancelledAt || "",
      entry.queryCode || "",
      firstClean(entry.lineUserId, answers.LINE_user_id, answers.lineUserId, answers.line_user_id, answers.uid, answers.UID),
      registrationExportSource(answers.registrationSource),
      firstClean(answers.memberNo, answers["會員編號"]),
      firstClean(answers.memberName, answers.name, answers["姓名"]),
      entry.sessionId || "",
      registrationExportPaymentStatus(entry),
      payment.amount ? String(payment.amount) : "",
      payment.remittanceLast5 || "",
      payment.reportedAt || "",
      payment.verifiedAt || payment.paidAt || "",
      entry.checkedInAt ? "已核銷" : "未核銷",
      entry.checkedInAt || ""
    ];
    return `<tr>${[...baseValues, ...answerKeys.map((key) => registrationExportValue(answers[key]))].map(registrationExcelCell).join("")}</tr>`;
  }).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} 報名名單</title></head><body><table border="1"><caption>${esc(title)} 報名名單</caption><thead><tr>${[...baseHeaders, ...headersForAnswers].map(registrationExcelHeader).join("")}</tr></thead><tbody>${bodyRows || `<tr><td colspan="${baseHeaders.length + headersForAnswers.length}">目前沒有報名資料</td></tr>`}</tbody></table></body></html>`;
  return new Response(html, {
    headers: {
      ...headers,
      "content-type": "application/vnd.ms-excel; charset=utf-8",
      "content-disposition": `attachment; filename="registration-export.xls"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "cache-control": "no-store"
    }
  });
}
async function storeManagedSubmission(env: Env, submission: ManagedSubmission) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const activity = submission.activity || {};
  const formId = String(submission.formId || "").trim();
  const keys = registrationKeys(activity, formId);
  if (!keys.length) return json({ success: false, message: "Missing activity or form id" }, 400);

  const summary = await readRegistrationSummary(env);
  const existing = keys.map((key) => summary.activities[key]).find(Boolean);
  const record: RegistrationRecord = {
    activityId: String(activity.id || existing?.activityId || "").trim(),
    activityNo: String(activity.activityNo || existing?.activityNo || "").trim(),
    activityName: String(activity.name || existing?.activityName || "").trim(),
    formId: formId || existing?.formId || "",
    count: Number(existing?.count || 0),
    lastSubmittedAt: String(submission.submittedAt || new Date().toISOString())
  };

  const entry: RegistrationEntry = {
    id: crypto.randomUUID(),
    sourceId: String(submission.sourceId || `${formId}:${record.lastSubmittedAt}`).trim(),
    formId,
    submittedAt: record.lastSubmittedAt,
    activity,
    answers: normalizeAnswersRecord(submission.answers || {}),
    status: "active"
  };
  const count = await appendRegistrationList(env, keys, entry);
  record.count = Number(count || 0);

  for (const key of keys) summary.activities[key] = record;
  await writeRegistrationSummary(env, summary);

  const eventKey = `registrations/events/${Date.now()}-${crypto.randomUUID()}.json`;
  await env.ASSETS_BUCKET.put(eventKey, JSON.stringify(submission.raw || submission, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return json({ success: true, data: record });
}

async function handleFormSubmission(request: Request, env: Env) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (body.action && body.action !== "FORM_SUBMISSION") return json({ success: false, message: "Unknown action" }, 400);
  if (env.GOOGLE_FORMS_SHARED_SECRET && body.sharedSecret !== env.GOOGLE_FORMS_SHARED_SECRET) return json({ success: false, message: "Invalid shared secret" }, 403);
  const activity = (body.activity && typeof body.activity === "object" ? body.activity : {}) as Record<string, unknown>;
  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  return storeManagedSubmission(env, {
    activity,
    answers: normalizeAnswersRecord(answers),
    formId: String(body.formId || "").trim(),
    sourceId: String(body.responseId || body.submissionId || body.editResponseUrl || "").trim(),
    submittedAt: String(body.submittedAt || new Date().toISOString()),
    raw: body
  });
}

async function syncGoogleFormResponses(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const scriptUrl = env.GOOGLE_FORMS_SCRIPT_URL?.trim();
  if (!scriptUrl) return json({ success: false, message: "GOOGLE_FORMS_SCRIPT_URL is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activities = Array.isArray(input.activities) ? input.activities as Array<Record<string, unknown>> : [];
  const results = [];
  let imported = 0;

  for (const activity of activities) {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "SYNC_FORM_RESPONSES",
        sharedSecret: env.GOOGLE_FORMS_SHARED_SECRET || "",
        formId: activity.formId || activity.googleFormId || "",
        activity
      })
    });
    const result = await response.json().catch(() => ({ success: false, message: "Invalid Apps Script JSON" })) as Record<string, unknown>;
    if (!response.ok || result.success === false) {
      results.push({ activity: activity.name || activity.id, success: false, message: result.message || "Sync failed" });
      continue;
    }
    const submissions = Array.isArray(result.submissions) ? result.submissions as Array<Record<string, unknown>> : [];
    for (const submission of submissions) {
      const submissionRequest = new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "FORM_SUBMISSION", ...submission, activity: submission.activity || activity }) });
      await handleFormSubmission(submissionRequest, env);
      imported += 1;
    }
    results.push({ activity: activity.name || activity.id, success: true, formId: result.formId, count: submissions.length });
  }

  return json({ success: true, imported, results, data: await readRegistrationSummary(env) });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isSyntheticLineEmail(value: unknown) {
  return /^U[a-f0-9]{32}@aiwe\.cc$/i.test(clean(value));
}

function numberValue(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function answerValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => answerValue(item)).filter((item) => clean(item)).join(", ");
  }
  if (value && typeof value === "object") {
    const record = asRecord(value);
    for (const key of ["value", "answer", "label", "name", "text", "display", "display_value", "formatted", "url", "file_name"]) {
      const next = answerValue(record[key]);
      if (clean(next)) return next;
    }
    const scalarValues = Object.values(record)
      .map((item) => answerValue(item))
      .filter((item) => clean(item));
    if (scalarValues.length) return scalarValues.join(", ");
    return "";
  }
  return value ?? "";
}

function normalizeAnswersRecord(record: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record || {})) output[key] = answerValue(value);
  return output;
}

function stableSubmissionSourceId(payload: Record<string, unknown>, data: Record<string, unknown>, formId: string, submittedAt: string) {
  return firstClean(
    payload.submission_id,
    payload.submissionId,
    payload.id,
    data.id,
    `${formId}:${submittedAt}:${data.email || ""}:${data.phone || ""}:${data.name || ""}`
  );
}

function formMetaKey(formId: string) {
  return `forms/opnform/${encodeURIComponent(formId)}.json`;
}

async function writeOpnFormMeta(env: Env, formId: string, activity: Record<string, unknown>, form: Record<string, unknown>) {
  if (!env.ASSETS_BUCKET || !formId) return;
  const meta = { provider: "opnform", formId, activity, form, updatedAt: new Date().toISOString() };
  await env.ASSETS_BUCKET.put(formMetaKey(formId), JSON.stringify(meta, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function readOpnFormMeta(env: Env, formId: string) {
  if (!env.ASSETS_BUCKET || !formId) return {};
  const object = await env.ASSETS_BUCKET.get(formMetaKey(formId));
  return object ? asRecord(await object.json().catch(() => ({}))) : {};
}

function opnFormApiBase(env: Env) {
  return clean(env.OPNFORM_API_BASE || "https://api.opnform.com").replace(/\/+$/, "");
}

function opnFormPublicBase(env: Env) {
  return clean(env.OPNFORM_PUBLIC_BASE || "https://opnform.com/forms").replace(/\/+$/, "");
}

function opnFormHeaders(env: Env) {
  return { authorization: `Bearer ${clean(env.OPNFORM_API_TOKEN)}`, "content-type": "application/json", accept: "application/json" };
}

async function opnFormJson(env: Env, path: string, init: RequestInit = {}) {
  const response = await fetch(`${opnFormApiBase(env)}${path}`, { ...init, headers: { ...opnFormHeaders(env), ...(init.headers || {}) } });
  const text = await response.text().catch(() => "");
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  return { response, data: asRecord(data) };
}

async function opnFormRawJson(env: Env, path: string, init: RequestInit = {}) {
  const response = await fetch(`${opnFormApiBase(env)}${path}`, { ...init, headers: { ...opnFormHeaders(env), ...(init.headers || {}) } });
  const text = await response.text().catch(() => "");
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  return { response, data };
}

function opnFormType(type: unknown) {
  const key = clean(type).toLowerCase();
  if (key === "paragraph" || key === "textarea" || key === "long_text") return "text";
  if (key === "email") return "email";
  if (key === "phone" || key === "tel") return "phone_number";
  if (key === "number") return "number";
  if (key === "date") return "date";
  if (key === "file" || key === "files") return "files";
  if (key === "checkbox" || key === "checkboxes" || key === "multi_select") return "multi_select";
  if (key === "radio" || key === "choice" || key === "dropdown" || key === "select") return "select";
  return "text";
}

function opnFormIsLongText(type: unknown) {
  const key = clean(type).toLowerCase();
  return key === "paragraph" || key === "textarea" || key === "long_text";
}

function opnFormUsesFlatChoices(type: unknown) {
  const key = clean(type).toLowerCase();
  return key === "radio" || key === "choice" || key === "checkbox" || key === "checkboxes";
}

function normalizeOptions(options: unknown) {
  return (Array.isArray(options) ? options : clean(options).split(/\n|,/))
    .map((item) => clean(item))
    .filter(Boolean)
    .map((name) => ({ id: name, name }));
}

function firstClean(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function nativeFormKey(formId: string) {
  return `forms/native/${encodeURIComponent(formId)}.json`;
}

function nativeRegistrationKey(registrationId: string) {
  return `registrations/native/${encodeURIComponent(registrationId)}.json`;
}

function nativeQueryKey(queryCode: string) {
  return `registrations/native-query/${encodeURIComponent(queryCode)}.json`;
}

function nativeTokenKey(token: string) {
  return `registrations/native-token/${encodeURIComponent(token)}.json`;
}

function nativeLineUserKey(lineUserId: string) {
  return `registrations/native-line/${encodeURIComponent(lineUserId)}.json`;
}

function redeemKey(token: string) {
  return `redeem/requests/${encodeURIComponent(token)}.json`;
}

function nativeFormUrl(formId: string) {
  return `${nativeLiffUrl}?register=${encodeURIComponent(formId)}`;
}

function redeemUrl(token: string) {
  return `${workerBaseUrl}/?redeemSession=${encodeURIComponent(token)}`;
}

function nativeCheckinUrl(token: string) {
  return `${nativeLiffUrl}?checkin=${encodeURIComponent(token)}`;
}

function codeToken(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeNativeFields(settings: Record<string, unknown>): NativeField[] {
  const rows = Array.isArray(settings.fields) ? settings.fields as Array<Record<string, unknown>> : [];
  return rows.map((field, index) => {
    const type = clean(field.type || "text").toLowerCase();
    const choice = ["select", "dropdown"].includes(type) ? "dropdown" : ["radio", "choice"].includes(type) ? "radio" : ["checkbox", "checkboxes", "multi_select"].includes(type) ? "checkbox" : type === "paragraph" ? "paragraph" : type === "email" ? "email" : "text";
    return {
      key: clean(field.key) || `field_${index + 1}`,
      label: clean(field.label) || `甈? ${index + 1}`,
      type: choice,
      required: Boolean(field.required),
      options: normalizeOptions(field.options).map((option) => clean(option.name)).filter(Boolean)
    };
  }).filter((field) => field.label);
}

function normalizeNativeSessions(settings: Record<string, unknown>, activity: Record<string, unknown>): NativeSession[] {
  const rows = Array.isArray(settings.sessions) ? settings.sessions as Array<Record<string, unknown>> : [];
  const sessions = rows.map((row, index) => ({
    id: clean(row.id) || `session_${index + 1}`,
    name: clean(row.name) || `璇舀活 ${index + 1}`,
    startTime: clean(row.startTime || row.time),
    endTime: clean(row.endTime),
    capacity: Number(row.capacity || 0) || 0,
    status: clean(row.status || "open")
  })).filter((row) => row.name);
  if (sessions.length) return sessions;
  return [{
    id: "default",
    name: clean(activity.courseTime) || "一般場次",
    startTime: clean(activity.courseTime),
    endTime: "",
    capacity: Number(activity.capacity || 0) || 0,
    status: "open"
  }];
}

function nativeRegistrationMode(settings: Record<string, unknown>) {
  const mode = clean(settings.registrationMode || settings.lineLoginMode || "form").toLowerCase();
  if (["member_login", "line_login", "login"].includes(mode)) return "member_login";
  if (["mixed", "hybrid"].includes(mode)) return "mixed";
  return "form";
}

function nativeLoginEnabled(form: NativeForm) {
  const settings = form.settings || {};
  const mode = nativeRegistrationMode(settings);
  return mode === "member_login" || mode === "mixed" || clean(settings.memberField).toLowerCase() === "login" || settings.lineLoginRegistration === true;
}

function nativeMemberAutoFieldKeys() {
  return new Set(["line_user_id", "lineuserid", "lineid", "line_id", "lineuid", "line_uid", "uid", "name", "phone", "mobile", "email", "company", "memberno", "gender", "ismember", "membertype", "participantunit"]);
}

async function resolveLineLoginMember(env: Env, lineUserId: string): Promise<LineLoginMember | null> {
  const uid = clean(lineUserId);
  if (!uid) return null;
  const rows = await readAiweMembers(env);
  const lowerUid = uid.toLowerCase();
  const row = rows.find((item) => memberLineUid(item).toLowerCase() === lowerUid);
  if (!row) return null;
  const rosterType = clean(row.rosterType) === "vendor" ? "vendor" : "association";
  const memberNo = firstClean(row.rosterMemberNo, row.memberNo, row.user_login);
  const name = rosterType === "vendor"
    ? firstClean(row.rosterName, row.companyName, row.name, row.display_name)
    : firstClean(row.rosterName, row.name, row.display_name, row.user_nicename);
  const company = rosterType === "vendor" ? name : firstClean(row.companyName, row.company, row.organization, row.unit);
  return {
    rosterType,
    memberNo,
    name,
    role: rosterType === "vendor" ? "廠商會員" : "協會會員",
    lineUserId: uid,
    company,
    phone: firstClean(row.phone, row.mobile, row.tel, row.telephone, row.contactPhone, row.billing_phone, row.shipping_phone, row.phone_number, row.mobile_number, row.user_phone, row["手機"], row["手機號碼"], row["行動電話"], row["電話"]),
    email: isSyntheticLineEmail(firstClean(row.email, row.user_email)) ? "" : firstClean(row.email, row.user_email),
    gender: firstClean(row.gender, row.sex),
    raw: row
  };
}

function publicLineLoginMember(member: LineLoginMember) {
  return {
    rosterType: member.rosterType,
    memberNo: member.memberNo,
    name: member.name,
    role: member.role,
    lineUserId: member.lineUserId,
    company: member.company || "",
    phone: member.phone || "",
    email: member.email || "",
    gender: member.gender || ""
  };
}

function memberAnswers(member: LineLoginMember) {
  return normalizeAnswersRecord({
    LINE_user_id: member.lineUserId,
    name: member.name,
    phone: member.phone || "",
    email: member.email || "",
    memberNo: member.memberNo,
    company: member.company || (member.rosterType === "vendor" ? member.name : ""),
    gender: member.gender || "",
    isMember: "是",
    memberType: member.role
  });
}

function nativeAnswerText(answers: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = answers[key];
    if (Array.isArray(value)) {
      const text = value.map(clean).filter(Boolean).join(",");
      if (text) return text;
    } else {
      const text = clean(value);
      if (text) return text;
    }
  }
  return "";
}

function nativeAnswerClaimsMember(answers: Record<string, unknown>) {
  const text = nativeAnswerText(answers, ["isMember", "memberType", "memberRole", "qualification", "memberNo", "participantUnit"]).toLowerCase();
  if (!text) return false;
  if (text.includes("非會員") || text.includes("其他")) return false;
  return ["會員", "廠商", "vendor", "member", "yes", "true", "y", "1", "是"].some((item) => text.includes(item));
}

function nativeClaimedMemberNo(answers: Record<string, unknown>) {
  return nativeAnswerText(answers, ["memberNo", "member_no", "memberNumber"]).toUpperCase();
}

function nativeClaimedMemberName(answers: Record<string, unknown>) {
  return nativeAnswerText(answers, ["name", "memberName"]);
}

function validLineUid(value: unknown) {
  return /^U[0-9a-f]{32}$/i.test(clean(value));
}

function aiweRowDisplayName(row: Record<string, unknown>) {
  const rosterType = clean(row.rosterType) === "vendor" ? "vendor" : "association";
  return rosterType === "vendor"
    ? firstClean(row.rosterName, row.companyName, row.name, row.display_name)
    : firstClean(row.rosterName, row.name, row.display_name, row.user_nicename, row.companyName);
}

async function resolveAndBindNativeRegistrationMember(env: Env, lineUserId: string, answers: Record<string, unknown>): Promise<LineLoginMember | null> {
  const uid = clean(lineUserId);
  if (!uid || !nativeAnswerClaimsMember(answers)) return null;
  const alreadyBound = await resolveLineLoginMember(env, uid);
  if (alreadyBound) return alreadyBound;

  const memberNo = nativeClaimedMemberNo(answers);
  const memberName = nativeClaimedMemberName(answers);
  if (!memberNo || !memberName) throw new Error("會員或廠商會員尚未綁定 LINE UID，請填寫姓名與會員編號完成比對。");

  const rows = await readAiweMembers(env);
  const matched = rows.filter((row) => rowMatchesMemberNo(row, memberNo));
  if (!matched.length) throw new Error("查無此會員編號，請確認會員編號是否正確。");

  const targetName = clean(memberName);
  const exact = matched.find((row) => clean(aiweRowDisplayName(row)) === targetName);
  if (!exact) throw new Error("會員編號與姓名不一致，請確認後再送出。");

  const currentUid = memberLineUid(exact);
  if (validLineUid(currentUid) && currentUid.toLowerCase() !== uid.toLowerCase()) throw new Error("此會員編號已綁定其他 LINE 帳號，請聯絡協會處理。");

  for (const row of matched) setAiweRowLineUid(row, uid);
  await writeAiweMembers(env, rows);
  await syncBoundMemberPoints(env, uid);
  return resolveLineLoginMember(env, uid);
}

async function readNativeForm(env: Env, formId: string): Promise<NativeForm | null> {
  if (!env.ASSETS_BUCKET || !formId) return null;
  const object = await env.ASSETS_BUCKET.get(nativeFormKey(formId));
  if (!object) return null;
  const data = await object.json().catch(() => null) as NativeForm | null;
  return data && data.id ? data : null;
}

async function writeNativeForm(env: Env, form: NativeForm) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(nativeFormKey(form.id), JSON.stringify(form, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function readNativeRegistration(env: Env, registrationId: string): Promise<RegistrationEntry | null> {
  if (!env.ASSETS_BUCKET || !registrationId) return null;
  const object = await env.ASSETS_BUCKET.get(nativeRegistrationKey(registrationId));
  if (!object) return null;
  return await object.json().catch(() => null) as RegistrationEntry | null;
}

async function writeNativeRegistration(env: Env, entry: RegistrationEntry) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(nativeRegistrationKey(entry.id), JSON.stringify(entry, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  if (entry.queryCode) await env.ASSETS_BUCKET.put(nativeQueryKey(entry.queryCode), entry.id, { httpMetadata: { contentType: "text/plain; charset=utf-8", cacheControl: "no-store" } });
  if (entry.checkinToken) await env.ASSETS_BUCKET.put(nativeTokenKey(entry.checkinToken), entry.id, { httpMetadata: { contentType: "text/plain; charset=utf-8", cacheControl: "no-store" } });
  if (entry.lineUserId) {
    const key = nativeLineUserKey(entry.lineUserId);
    const object = await env.ASSETS_BUCKET.get(key);
    const ids = object ? await object.json().catch(() => []) as unknown : [];
    const list = Array.isArray(ids) ? ids.map(clean).filter(Boolean) : [];
    if (!list.includes(entry.id)) list.unshift(entry.id);
    await env.ASSETS_BUCKET.put(key, JSON.stringify(list.slice(0, 300), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  }
}

async function insertMemberPoint(env: Env, input: { lineUserId: string; eventName: string; eventContent: string; points: number; remark?: string }) {
  const apiKey = clean(env.WETW_POINT_API_KEY);
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  if (!input.lineUserId || !input.eventName || !input.points) return { success: false, code: "missing_required_fields", message: "LINE_user_id, event_name and get_point are required" };
  const response = await fetch(`${pointApiBase}/insert-user-point`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      LINE_user_id: input.lineUserId,
      shop_id: Number(env.WETW_SHOP_ID || 35),
      event_name: input.eventName,
      event_content: input.eventContent || input.eventName,
      point_type: env.WETW_POINT_TYPE || "system_point",
      get_point: input.points,
      shop_user_lineid: "",
      child_shop_name: "",
      child_shop_renew: 0,
      shop_remark: input.remark || "TDEA Worker check-in"
    })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
  return { httpStatus: response.status, ...(body as Record<string, unknown>) };
}

async function queryPointBalanceOnce(env: Env, payload: Record<string, unknown>) {
  const apiKey = clean(env.WETW_POINT_API_KEY);
  if (!apiKey) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  const response = await fetch(`${pointApiBase}/query-user-point-list`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, page: 1, per_page: 100, ...payload })
  });
  const body = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" })) as Record<string, unknown>;
  const data = asRecord(body.data);
  const list = Array.isArray(data.list) ? data.list.map(asRecord) : [];
  const explicitBalance = Number(data.balance ?? body.balance);
  const firstBalance = list.map((item) => Number(item.point_balance)).find((value) => Number.isFinite(value));
  const balance = Number.isFinite(explicitBalance)
    ? Number(explicitBalance)
    : Number.isFinite(firstBalance)
      ? Number(firstBalance)
      : list.reduce((sum, item) => sum + numberValue(item.get_point), 0);
  return { httpStatus: response.status, ...body, balance, list, queryPayload: payload };
}

async function queryPointBalance(env: Env, lineUserId: string) {
  if (!clean(env.WETW_POINT_API_KEY)) return { success: false, code: "missing_api_key", message: "WETW_POINT_API_KEY is not configured" };
  if (!lineUserId) return { success: false, code: "missing_line_user_id", message: "LINE user id is required" };
  const shopId = Number(env.WETW_SHOP_ID || 35);
  const pointType = clean(env.WETW_POINT_TYPE || "system_point");
  const attempts: Record<string, unknown>[] = [
    { LINE_user_id: lineUserId, shop_id: shopId, point_type: pointType },
    { LINE_user_id: lineUserId, shop_id: shopId },
    { LINE_user_id: lineUserId }
  ];
  const results = [];
  for (const payload of attempts) {
    const result = await queryPointBalanceOnce(env, payload) as Record<string, unknown>;
    results.push(result);
    const list = Array.isArray(result.list) ? result.list : [];
    if (result.success === true && (list.length || numberValue(result.balance) > 0)) return { ...result, attempts };
  }
  const successful = [...results].reverse().find((item) => item.success === true) || results[results.length - 1];
  return { ...successful, attempts };
}

async function syncMotherPointToLocal(env: Env, lineUserId: string) {
  const result = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  if (result.success !== true) return result;
  return { ...result, cached: false, syncedAt: new Date().toISOString(), source: "wetw-point/query-user-point-list" };
}

async function syncBoundMemberPoints(env: Env, lineUserId: string) {
  try {
    return await syncMotherPointToLocal(env, lineUserId);
  } catch (error) {
    return { success: false, message: String((error as Error).message || error || "點數同步失敗") };
  }
}

function pointCacheIsFresh(account: PointAccount, maxAgeMs = 6 * 60 * 60 * 1000) {
  const stamp = clean(account.syncedAt || account.updatedAt);
  if (!stamp) return false;
  const time = Date.parse(stamp);
  return Number.isFinite(time) && Date.now() - time < maxAgeMs;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function queryMemberPointBatchApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const rawIds = Array.isArray(input.lineUserIds) ? input.lineUserIds : [];
  const lineUserIds = Array.from(new Set(rawIds.map((item) => clean(item)).filter(Boolean))).slice(0, 1000);
  const data = await mapWithConcurrency(lineUserIds, 6, async (lineUserId) => {
    try {
      const result = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
      return { lineUserId, success: result.success === true, balance: result.success === true ? numberValue(result.balance) : null, cached: false, syncedAt: new Date().toISOString(), message: result.success === true ? "" : clean(result.message) || clean(result.code) || "mother point query failed", source: "wetw-point/query-user-point-list" };
    } catch (error) {
      return { lineUserId, success: false, balance: null, cached: false, syncedAt: "", message: String((error as Error).message || error || "mother point query failed") };
    }
  });
  return json({ success: true, data });
}

function parseMotherPointKeyword(text: string) {
  const raw = clean(text);
  const compact = raw.replace(/\s+/g, "");
  if (!compact) return null;
  const aliases = ["TDEA點數", "TDEA點數查詢"];
  if (aliases.some((alias) => normalizeKeyword(compact) === normalizeKeyword(alias))) {
    return { uid: "" };
  }
  for (const alias of aliases) {
    const prefix = normalizeKeyword(alias);
    const normalized = normalizeKeyword(compact);
    if (normalized.startsWith(prefix + "+") || normalized.startsWith(prefix + "：") || normalized.startsWith(prefix + ":") || normalized.startsWith(prefix + "，")) {
      return { uid: compact.slice(alias.length + 1).trim() };
    }
  }
  return null;
}

function formatMotherPointReply(result: Record<string, unknown>, label: string) {
  if (result.success !== true) {
    return `${label}點數查詢失敗：${clean(result.message) || clean(result.code) || "未知錯誤"}`;
  }
  const flatList = Array.isArray(result.list) ? result.list.map(asRecord) : [];
  const data = asRecord(result.data);
  const dataList = Array.isArray(data.list) ? data.list.map(asRecord) : [];
  const list = flatList.length ? flatList : dataList;
  if (!list.length) return `${label}目前查不到點數紀錄。`;
  const balance = result.balance ?? list[0].point_balance ?? "未知";
  const rows = list.slice(0, 3).map((item) => {
    const createdAt = clean(item.created_at);
    const eventName = clean(item.event_name) || "點數紀錄";
    const points = item.get_point ?? 0;
    return `${createdAt} ${eventName} ${points} 點`.trim();
  }).join("\n");
  return `${label}目前點數餘額：${balance}\n\n最近紀錄：\n${rows}`;
}

function pointLogsFromMotherList(list: Array<Record<string, unknown>>, fallbackLineUserId = "") {
  return list.map((item, index) => {
    const amount = numberValue(item.get_point);
    const createdAt = firstClean(item.created_at, item.createdAt) || new Date().toISOString();
    const ts = Date.parse(createdAt);
    return { logId: firstClean(item.id, "mother-" + index + "-" + createdAt), lineUserId: firstClean(item.LINE_user_id, item.lineUserId, fallbackLineUserId), type: amount >= 0 ? "EARN" : "SPEND", amount, points: Math.abs(amount), reason: firstClean(item.event_name, item.event_content, item.shop_remark), balanceAfter: numberValue(item.point_balance), createdAt, createdTs: Number.isFinite(ts) ? ts : Date.now(), source: "wetw-point/query-user-point-list", referenceId: firstClean(item.shop_remark, item.id), externalSync: item } as PointLog;
  });
}

async function handleMotherPointEvents(events: Array<{ event: LineEvent; query: { uid: string } }>, env: Env) {
  const lineReplies = await Promise.all(events.map(async ({ event, query }) => {
    if (!event.replyToken) return { ok: false, status: 400, message: "Missing replyToken" };
    const uid = query.uid || event.source?.userId || "";
    if (!uid) {
      return replyToLine(event.replyToken, [{ type: "text", text: "查詢點數需要 LINE UID，請輸入：TDEA點數+UID" }], env);
    }
    const result = await queryPointBalance(env, uid) as Record<string, unknown>;
    const label = query.uid ? `${uid} ` : "你 ";
    return replyToLine(event.replyToken, [{ type: "text", text: formatMotherPointReply(result, label) }], env);
  }));
  return json({ success: true, mode: "mother-point-keyword", matched: ["TDEA點數"], forwarded: false, lineReplies });
}

async function updateLocalPoints(env: Env, lineUserId: string, amount: number, reason: string, options: { source?: string; referenceId?: string; skipExternalSync?: boolean } = {}) {
  const numericAmount = Number(amount || 0);
  if (!lineUserId || !numericAmount) return { success: false, message: "Missing LINE UID or point amount" };
  const before = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  if (before.success !== true) return { success: false, message: clean(before.message) || clean(before.code) || "mother point query failed", before };
  const externalSync = await insertMemberPoint(env, { lineUserId, eventName: numericAmount >= 0 ? "TDEA add points" : "TDEA deduct points", eventContent: reason, points: numericAmount, remark: options.referenceId || options.source || "TDEA Worker" }) as Record<string, unknown>;
  if (externalSync.success !== true || clean(externalSync.code) !== "insert_success") return { success: false, message: clean(externalSync.message) || "mother point insert failed", externalSync, before };
  const after = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  const createdTs = Date.now();
  const balanceAfter = after.success === true ? numberValue(after.balance) : numberValue(before.balance) + numericAmount;
  const log: PointLog = { logId: crypto.randomUUID ? crypto.randomUUID() : String(createdTs), lineUserId, type: numericAmount >= 0 ? "EARN" : "SPEND", amount: numericAmount, points: Math.abs(numericAmount), reason, balanceAfter, createdAt: new Date(createdTs).toISOString(), createdTs, source: options.source || "tdea", referenceId: options.referenceId || "", externalSync, externalBalanceSync: after };
  return { success: true, balance: balanceAfter, log, account: { balance: balanceAfter, logs: after.success === true && Array.isArray(after.list) ? pointLogsFromMotherList(after.list as Record<string, unknown>[], lineUserId) : [log], updatedAt: new Date(createdTs).toISOString(), source: "wetw-point", syncedAt: new Date(createdTs).toISOString(), externalRaw: after }, before, externalSync, externalBalanceSync: after };
}

function taipeiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(date);
}

async function rewardMarqueePoint(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = firstClean(input.lineUserId, input.lineUid, input.uid, input.LINE_user_id, input.line_user_id);
  if (!lineUserId) return json({ success: false, message: "Missing LINE UID" }, 400);
  const config = await readMarqueeConfig(env);
  if (config.enabled === false) return json({ success: false, message: "廣告贈點尚未啟用" }, 403);
  if (clean(input.action) === "checkin") {
    if (config.left?.enabled === false) return json({ success: false, message: "系統簽到尚未啟用" }, 403);
    const points = Math.max(1, Math.round(Number(config.left?.points || 1)));
    const eventContent = clean(config.left?.eventContent || "廣告贈點系統簽到") || "廣告贈點系統簽到";
    const referenceId = `marquee:${taipeiDateKey()}:button:left`;
    const motherBefore = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
    if (motherBefore.success !== true) {
      return json({ success: false, message: clean(motherBefore.message) || clean(motherBefore.code) || "母站點數查詢失敗", before: motherBefore }, 502);
    }
    const motherLogs = Array.isArray(motherBefore.list) ? motherBefore.list.map(asRecord) : [];
    const existing = motherLogs.find((log) => firstClean(log.shop_remark, log.event_content, log.event_name).includes(referenceId));
    if (existing) {
      return json({ success: true, awarded: false, duplicate: true, points: 0, balance: motherBefore.balance, referenceId, message: "今日已完成系統簽到" });
    }
    const result = await updateLocalPoints(env, lineUserId, points, eventContent, {
      source: "marquee_button_checkin",
      referenceId
    }) as Record<string, unknown>;
    if (result.success !== true) return json({ success: false, message: clean(result.message) || "系統簽到贈點失敗", referenceId, points, result }, 502);
    return json({ success: true, awarded: true, duplicate: false, ...result, referenceId, points });
  }
  const imageId = firstClean(input.imageId, input.itemId, input.id);
  const imageUrl = firstClean(input.imageUrl, input.url);
  const items = Array.isArray(config.imageItems) ? config.imageItems : [];
  const item = items.find((entry) => clean(entry.id) === imageId) || items.find((entry) => clean(entry.imageUrl) === imageUrl);
  if (!item || item.enabled === false) return json({ success: false, message: "廣告贈點圖片尚未設定或未啟用" }, 404);
  const points = Math.max(1, Math.round(Number(item.points || 1)));
  const title = clean(item.title || config.title || "TDEA 廣告贈點");
  const dateKey = taipeiDateKey();
  const referenceId = `marquee:${dateKey}:${clean(item.id || item.imageUrl || imageUrl)}`;
  const motherBefore = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  const motherLogs = Array.isArray(motherBefore.list) ? motherBefore.list.map(asRecord) : [];
  const existing = motherLogs.find((log) => firstClean(log.shop_remark, log.event_content, log.event_name).includes(referenceId));
  if (existing) {
    return json({ success: true, awarded: false, duplicate: true, points: 0, balance: motherBefore.balance, imageId: item.id, linkUrl: clean(item.linkUrl), message: "already awarded" });
  }
  const eventContent = `${title} 圖片點擊每日贈點`;
  const result = await updateLocalPoints(env, lineUserId, points, eventContent, {
    source: "marquee_image_click",
    referenceId
  });
  const record = result as Record<string, unknown>;
  return json({
    success: Boolean(record.success),
    awarded: Boolean(record.success),
    duplicate: false,
    points,
    balance: record.balance,
    imageId: item.id,
    linkUrl: clean(item.linkUrl),
    eventContent,
    result
  });
}

async function queryMarqueePoints(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = firstClean(input.lineUserId, input.lineUid, input.uid, input.LINE_user_id, input.line_user_id);
  if (!lineUserId) return json({ success: false, message: "Missing LINE UID" }, 400);
  const config = await readMarqueeConfig(env);
  if (config.enabled === false) return json({ success: false, message: "廣告贈點尚未啟用" }, 403);
  if (config.right?.enabled === false) return json({ success: false, message: "查詢按鈕尚未啟用" }, 403);
  const result = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
  return json({
    success: result.success !== false,
    lineUserId,
    balance: result.balance ?? 0,
    list: list.slice(0, 5),
    logs: pointLogsFromMotherList(list, lineUserId).slice(0, 5),
    result
  }, result.success === false ? 502 : 200);
}

async function importLegacyPointsOnce(env: Env, lineUserId: string, force = false) {
  const result = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  if (result.success !== true) return { success: false, reason: clean(result.code) || "mother_query_failed", imported: 0, message: clean(result.message) || "mother point query failed", raw: result };
  return { success: true, reason: "mother_direct", imported: 0, balance: numberValue(result.balance), importedAt: new Date().toISOString(), source: "wetw-point/query-user-point-list", raw: result, message: "mother point is the source of truth; no local import was written" };
}

async function getUnifiedPointAccount(env: Env, lineUserId: string, options: { autoImport?: boolean } = {}) {
  if (!lineUserId) return { success: false, balance: 0, logs: [], message: "Missing LINE UID" };
  if (!motherPointApiReady(env)) return { success: false, balance: 0, logs: [], message: "Mother point API key is not configured" };
  const result = await queryPointBalance(env, lineUserId) as Record<string, unknown>;
  if (result.success !== true) return { success: false, balance: 0, logs: [], message: clean(result.message) || clean(result.code) || "mother point query failed", motherSynced: result };
  const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
  return { success: true, balance: numberValue(result.balance), logs: pointLogsFromMotherList(list, lineUserId), imported: null, legacySynced: null, motherSynced: result, source: "wetw-point/query-user-point-list" };
}

async function syncCheckinPoints(env: Env, entry: RegistrationEntry) {
  const activity = asRecord(entry.activity);
  const answers = asRecord(entry.answers);
  const lineUserId = firstClean(entry.lineUserId, answers.LINE_user_id, answers.lineUserId, answers.line_user_id, answers.uid, answers.UID);
  if (!lineUserId) return [{ success: false, code: "missing_line_user_id", message: "registration has no LINE user id" }];

  const eventName = firstClean(activity.name, activity.activityNo, "TDEA 瘣餃?蝪賢");
  const eventContent = firstClean(activity.courseTime, activity.activityNo, entry.id);
  const checkinPoints = numberValue(activity.checkinPoints || activity.checkinPointAmount);
  const feePoints = numberValue(activity.feePoints || activity.feePointAmount);
  const jobs: Array<{ label: string; points: number }> = [];
  if (checkinPoints > 0) jobs.push({ label: "蝪賢韐?", points: checkinPoints });
  if (feePoints > 0) jobs.push({ label: "鞎餌??", points: -Math.abs(feePoints) });
  if (!jobs.length) return [];

  const results = [];
  for (const job of jobs) {
    results.push(await insertMemberPoint(env, {
      lineUserId,
      eventName: `${eventName} ${job.label}`,
      eventContent,
      points: job.points,
      remark: entry.id
    }));
  }
  return results;
}

async function readRedeem(env: Env, token: string): Promise<RedeemRequest | null> {
  if (!env.ASSETS_BUCKET || !token) return null;
  const object = await env.ASSETS_BUCKET.get(redeemKey(token));
  if (!object) return null;
  const data = await object.json().catch(() => null) as RedeemRequest | null;
  return data && data.token ? data : null;
}

async function readRedeemList(env: Env): Promise<RedeemRequest[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(redeemListKey);
  if (!object) return [];
  const data = await object.json().catch(() => []);
  return Array.isArray(data) ? data as RedeemRequest[] : [];
}

async function writeRedeem(env: Env, redeem: RedeemRequest) {
  if (!env.ASSETS_BUCKET) return;
  const now = Date.now();
  const expired = ["active", "pending"].includes(redeem.status) && now > new Date(redeem.expiresAt).getTime();
  const next = expired ? { ...redeem, status: "expired" as const } : redeem;
  await env.ASSETS_BUCKET.put(redeemKey(next.token), JSON.stringify(next, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  const list = (await readRedeemList(env)).filter((item) => item.token !== next.token);
  list.unshift(next);
  await env.ASSETS_BUCKET.put(redeemListKey, JSON.stringify(list.slice(0, 500), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function redeemMemberInfoFromRows(rows: Array<Record<string, unknown>>, lineUserId: unknown) {
  const uid = clean(lineUserId).toLowerCase();
  if (!uid) return {};
  const row = rows.find((item) => memberLineUid(item).toLowerCase() === uid || explicitMemberLineUid(item).toLowerCase() === uid);
  if (!row) return {};
  const member = publicAiweMember(row);
  return {
    memberName: firstClean(member.rosterName, member.companyName),
    memberNo: firstClean(member.memberNo, member.rosterMemberNo),
    phone: clean(member.phone),
    rosterType: clean(member.rosterType)
  };
}

function enrichRedeemTransactions(redeem: RedeemRequest, memberRows: Array<Record<string, unknown>>) {
  const transactions = Array.isArray(redeem.transactions) ? redeem.transactions : [];
  if (!transactions.length || !memberRows.length) return redeem;
  return {
    ...redeem,
    transactions: transactions.map((tx) => {
      const extra = redeemMemberInfoFromRows(memberRows, tx.lineUserId);
      if (!Object.keys(extra).length) return tx;
      return {
        ...tx,
        memberName: tx.memberName || clean(extra.memberName),
        memberNo: tx.memberNo || clean(extra.memberNo),
        phone: tx.phone || clean(extra.phone),
        rosterType: tx.rosterType || clean(extra.rosterType)
      };
    })
  };
}
function publicRedeem(redeem: RedeemRequest, extra: Record<string, unknown> = {}) {
  const status = ["active", "pending"].includes(redeem.status) && Date.now() > new Date(redeem.expiresAt).getTime() ? "expired" : redeem.status;
  const transactions = Array.isArray(redeem.transactions) ? redeem.transactions : [];
  return {
    id: redeem.id,
    token: redeem.token,
    vendorName: redeem.vendorName,
    amount: redeem.amount || 0,
    points: redeem.points,
    maxPoints: redeem.maxPoints || 0,
    pointRate: redeem.pointRate || 0,
    mode: redeem.mode || "fixed",
    note: redeem.note || "",
    status,
    createdAt: redeem.createdAt,
    startsAt: redeem.startsAt || redeem.createdAt,
    expiresAt: redeem.expiresAt,
    usedAt: redeem.usedAt || "",
    redeemUrl: redeemUrl(redeem.token),
    sessionUrl: redeemUrl(redeem.token),
    transactions,
    usageCount: transactions.length,
    ...extra
  };
}

async function createRedeemRequest(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const vendorName = firstClean(input.vendorName, input.vendor, "??摨振");
  const now = new Date();
  const mode = (["fixed", "manual", "rate"].includes(clean(input.mode)) ? clean(input.mode) : "fixed") as RedeemMode;
  const points = Math.abs(numberValue(input.points));
  const maxPoints = Math.abs(numberValue(input.maxPoints));
  const pointRate = Math.abs(numberValue(input.pointRate));
  if (mode === "fixed" && !points) return json({ success: false, message: "固定扣點模式請輸入每次扣抵點數" }, 400);
  if (mode === "rate" && !pointRate) return json({ success: false, message: "比例扣點模式請輸入點數換算比例" }, 400);
  const startsAtInput = clean(input.startsAt);
  const expiresAtInput = clean(input.expiresAt);
  const ttl = Math.min(Math.max(numberValue(input.ttlMinutes) || 60, 1), 1440);
  const startsAt = startsAtInput ? new Date(startsAtInput) : now;
  const expiresAt = expiresAtInput ? new Date(expiresAtInput) : new Date(startsAt.getTime() + ttl * 60 * 1000);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime())) return json({ success: false, message: "起訖時間格式錯誤" }, 400);
  if (expiresAt.getTime() <= startsAt.getTime()) return json({ success: false, message: "結束時間必須晚於開始時間" }, 400);
  const token = `${codeToken(6)}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const redeem: RedeemRequest = {
    id: `REDEEM-${Date.now()}-${codeToken(4)}`,
    token,
    vendorId: clean(input.vendorId),
    vendorName,
    amount: numberValue(input.amount),
    points,
    maxPoints,
    pointRate,
    mode,
    note: clean(input.note),
    status: "active",
    createdAt: now.toISOString(),
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    transactions: []
  };
  await writeRedeem(env, redeem);
  return json({ success: true, data: publicRedeem(redeem), redeemUrl: redeemUrl(token) }, 201);
}

async function listRedeemRequests(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const list = await readRedeemList(env);
  const memberRows = await readAiweMembers(env).catch(() => [] as Array<Record<string, unknown>>);
  return json({ success: true, data: list.map((item) => publicRedeem(enrichRedeemTransactions(item, memberRows))) });
}

async function resolveRedeemMember(env: Env, input: { lineUserId?: unknown; phone?: unknown }) {
  const lineUserId = firstClean(input.lineUserId);
  if (lineUserId) return { lineUserId, member: await resolveLineLoginMember(env, lineUserId) };
  const phone = firstClean(input.phone);
  if (!phone) return { lineUserId: "", member: null };
  const managerData = await readManagerData(env);
  const rosterRows = [
    ...(Array.isArray(managerData?.association) ? managerData.association.map(asRecord) : []),
    ...(Array.isArray(managerData?.vendor) ? managerData.vendor.map(asRecord) : [])
  ];
  const rows = await readAiweMembers(env);
  const matched = [...rosterRows, ...rows].filter((row) => rowMatchesPhone(row, phone));
  if (!matched.length) return { lineUserId: "", member: null, phone, message: "查無此手機對應會員" };
  const withUid = matched.find((row) => explicitMemberLineUid(row));
  if (!withUid) return { lineUserId: "", member: null, phone, message: "此手機會員尚未綁定 LINE UID" };
  const uid = explicitMemberLineUid(withUid);
  return { lineUserId: uid, member: publicAiweMember(withUid), phone };
}

async function getRedeemRequest(request: Request, env: Env, token: string) {
  const redeem = await readRedeem(env, token);
  if (!redeem) return json({ success: false, message: "找不到此折抵授權" }, 404);
  const url = new URL(request.url);
  const resolved = await resolveRedeemMember(env, { lineUserId: url.searchParams.get("lineUserId"), phone: url.searchParams.get("phone") });
  const lineUserId = clean(resolved.lineUserId);
  let balanceInfo: Record<string, unknown> = {};
  if (!lineUserId && (url.searchParams.get("phone") || url.searchParams.get("lineUserId"))) {
    balanceInfo = { memberLookup: resolved, lookupMessage: clean(resolved.message) };
  }
  if (lineUserId && ["active", "pending"].includes(redeem.status)) {
    const account = await getUnifiedPointAccount(env, lineUserId, { autoImport: true }) as Record<string, unknown>;
    balanceInfo = { balance: account.balance, pointAccount: account, member: resolved.member || { lineUserId }, lineUserId };
  }
  await writeRedeem(env, redeem);
  return json({ success: true, data: publicRedeem(redeem, balanceInfo) });
}

async function confirmRedeemRequest(request: Request, env: Env, token: string) {
  const redeem = await readRedeem(env, token);
  if (!redeem) return json({ success: false, message: "找不到此折抵授權" }, 404);
  if (!["active", "pending"].includes(redeem.status)) return json({ success: false, message: redeem.status === "closed" ? "此折抵授權已關閉" : "此折抵授權不可使用" }, 409);
  const nowMs = Date.now();
  if (redeem.startsAt && nowMs < new Date(redeem.startsAt).getTime()) return json({ success: false, message: "此折抵授權尚未開始" }, 409);
  if (nowMs > new Date(redeem.expiresAt).getTime()) {
    redeem.status = "expired";
    await writeRedeem(env, redeem);
    return json({ success: false, message: "此折抵授權已過期" }, 409);
  }
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const resolved = await resolveRedeemMember(env, { lineUserId: input.lineUserId, phone: input.phone });
  const lineUserId = clean(resolved.lineUserId);
  if (!lineUserId) return json({ success: false, message: clean(resolved.message) || "請輸入會員手機或掃描會員 QR Code" }, 400);
  const mode = redeem.mode || "fixed";
  const amount = Math.abs(numberValue(input.amount));
  let points = Math.abs(numberValue(input.points));
  if (mode === "fixed") points = Math.abs(numberValue(redeem.points));
  if (mode === "rate") {
    if (!amount) return json({ success: false, message: "請輸入消費金額" }, 400);
    points = Math.floor(amount * Math.abs(numberValue(redeem.pointRate)));
  }
  if (!points) return json({ success: false, message: "請輸入扣抵點數" }, 400);
  if (redeem.maxPoints && points > redeem.maxPoints) return json({ success: false, message: `超過此授權單次可扣抵上限 ${redeem.maxPoints} 點` }, 409);
  const account = await getUnifiedPointAccount(env, lineUserId, { autoImport: true }) as Record<string, unknown>;
  if (account.success !== true) return json({ success: false, message: clean(account.message) || "母站點數查詢失敗", data: account }, 502);
  const pointBalance = Number(account.balance || 0);
  if (pointBalance < points) return json({ success: false, message: `點數不足，目前可用 ${pointBalance} 點`, data: { balance: pointBalance, required: points } }, 409);
  const reason = firstClean(clean(input.note), redeem.note, amount ? `${redeem.vendorName} 消費折抵 ${amount}` : `${redeem.vendorName} 扣抵 ${points} 點`);
  const result = await updateLocalPoints(env, lineUserId, -Math.abs(points), reason, { source: "vendor_redeem", referenceId: redeem.id }) as Record<string, unknown>;
  if (result.success !== true) return json({ success: false, message: clean(result.message) || "???憭望?", data: result }, 400);
  const createdAt = new Date().toISOString();
  const memberInfo = asRecord(resolved.member);
  const transaction: RedeemTransaction = {
    id: `TX-${Date.now()}-${codeToken(4)}`,
    lineUserId,
    memberName: firstClean(memberInfo.name, memberInfo.memberName),
    memberNo: firstClean(memberInfo.memberNo, memberInfo.rosterMemberNo),
    phone: clean(memberInfo.phone),
    rosterType: clean(memberInfo.rosterType),
    amount,
    points: -Math.abs(points),
    balanceBefore: pointBalance,
    balanceAfter: numberValue(result.balance || pointBalance - points),
    createdAt,
    note: clean(input.note),
    pointResult: result
  };
  redeem.status = "active";
  redeem.usedAt = createdAt;
  redeem.lineUserId = lineUserId;
  redeem.pointBalance = numberValue(result.balance || pointBalance - points);
  redeem.pointResult = result;
  redeem.transactions = [transaction, ...(Array.isArray(redeem.transactions) ? redeem.transactions : [])].slice(0, 200);
  await writeRedeem(env, redeem);
  return json({ success: true, data: publicRedeem(redeem, { balance: redeem.pointBalance, pointResult: result, transaction }) });
}

async function getPointAccountApi(request: Request, env: Env, lineUserId: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!lineUserId) return json({ success: false, message: "缺少會員 UID" }, 400);
  return json({ success: true, data: await getUnifiedPointAccount(env, lineUserId, { autoImport: true }) });
}

async function adjustMemberPointApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = firstClean(input.lineUserId, input.uid, input.LINE_user_id);
  const amount = numberValue(input.amount);
  const note = firstClean(input.note, input.reason, amount >= 0 ? "CRM 手動贈點" : "CRM 手動扣點");
  if (!lineUserId) return json({ success: false, message: "缺少會員 LINE UID" }, 400);
  if (!amount) return json({ success: false, message: "請輸入點數異動值" }, 400);
  const result = await updateLocalPoints(env, lineUserId, amount, note, { source: "crm_manual_point", referenceId: firstClean(input.referenceId, input.memberNo) }) as Record<string, unknown>;
  if (result.success !== true) return json({ success: false, message: clean(result.message) || "點數異動失敗", data: result }, 400);
  return json({ success: true, data: result });
}
async function listPointLedgerApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(numberValue(url.searchParams.get("limit")) || 200, 500));
  const lineUserId = clean(url.searchParams.get("lineUserId"));
  const payload: Record<string, unknown> = lineUserId ? { LINE_user_id: lineUserId, page: 1, per_page: limit } : { shop_id: Number(env.WETW_SHOP_ID || 35), page: 1, per_page: limit };
  const result = await queryPointBalanceOnce(env, payload) as Record<string, unknown>;
  if (result.success !== true) return json({ success: false, message: clean(result.message) || clean(result.code) || "mother point ledger query failed", data: [], raw: result }, 502);
  const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
  return json({ success: true, data: pointLogsFromMotherList(list), raw: result });
}


function buildNativeFormRecord(formId: string, activityInput: Record<string, unknown>, settingsInput: Record<string, unknown>, existing?: NativeForm | null): NativeForm {
  const now = new Date().toISOString();
  const activity = { ...asRecord(existing?.activity), ...activityInput };
  const settings = { ...asRecord(existing?.settings), ...settingsInput };
  return {
    id: formId,
    provider: "native_form",
    activity: {
      id: formId,
      activityNo: clean(activity.activityNo),
      name: firstClean(activity.name, "未命名活動"),
      type: clean(activity.type),
      courseTime: clean(activity.courseTime),
      deadline: clean(activity.deadline),
      capacity: Number(activity.capacity || 0) || 0,
      checkinPoints: numberValue(activity.checkinPoints || activity.checkinPointAmount),
      feePoints: numberValue(activity.feePoints || activity.feePointAmount),
      paymentAmount: activityPaymentAmount(activity),
      remittanceInfo: firstClean(activity.remittanceInfo, activity.bankInfo, activity.paymentInfo),
      detailText: clean(activity.detailText),
      posterUrl: firstClean(activity.posterUrl, activity.imageUrl),
      imageUrl: firstClean(activity.imageUrl, activity.posterUrl),
      youtubeUrl: clean(activity.youtubeUrl)
    },
    settings,
    fields: normalizeNativeFields(settings),
    sessions: normalizeNativeSessions(settings, activity),
    formUrl: existing?.formUrl || nativeFormUrl(formId),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}
function publicNativeForm(form: NativeForm) {
  const registrationMode = nativeRegistrationMode(form.settings || {});
  return {
    id: form.id,
    provider: form.provider,
    activity: form.activity,
    settings: { sessionsEnabled: form.sessions.length > 1, registrationMode, lineLoginEnabled: nativeLoginEnabled(form) },
    fields: form.fields,
    sessions: form.sessions.filter((session) => clean(session.status || "open") !== "closed"),
    formUrl: form.formUrl
  };
}

async function createNativeForm(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activity = asRecord(input.activity);
  const settings = asRecord(input.settings);
  const formId = firstClean(activity.id, activity.activityNo, `native-${crypto.randomUUID()}`);
  const existing = await readNativeForm(env, formId);
  const form = buildNativeFormRecord(formId, activity, settings, existing);
  await writeNativeForm(env, form);
  return json({ success: true, provider: "native_form", formId, nativeFormId: formId, formUrl: form.formUrl, nativeFormUrl: form.formUrl, data: { form: publicNativeForm(form) } }, 201);
}


async function updateNativeForm(request: Request, env: Env, formId: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const existing = await readNativeForm(env, formId);
  const activity = { ...asRecord(existing?.activity), ...asRecord(input.activity), id: formId };
  const settings = { ...asRecord(existing?.settings), ...asRecord(input.settings) };
  const form = buildNativeFormRecord(formId, activity, settings, existing);
  await writeNativeForm(env, form);
  return json({ success: true, provider: "native_form", formId, nativeFormId: formId, formUrl: form.formUrl, nativeFormUrl: form.formUrl, data: { form: publicNativeForm(form) } }, existing ? 200 : 201);
}
async function getNativeForm(request: Request, env: Env, formId: string) {
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const list = activeRegistrations(await readRegistrationList(env, form.id));
  const counts: Record<string, number> = {};
  for (const item of list) counts[clean(item.sessionId || "default")] = (counts[clean(item.sessionId || "default")] || 0) + 1;
  return json({ success: true, data: { ...publicNativeForm(form), counts, total: list.length } });
}

async function getNativeLoginMember(request: Request, env: Env, formId: string) {
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const url = new URL(request.url);
  const lineUserId = firstClean(url.searchParams.get("lineUserId"), url.searchParams.get("uid"), url.searchParams.get("LINE_user_id"));
  if (!lineUserId) return json({ success: false, message: "缺少 LINE UID" }, 400);
  const member = await resolveLineLoginMember(env, lineUserId);
  if (!member) return json({ success: false, code: "member_not_found", message: "此 LINE 帳號尚未綁定會員或廠商會員資料" }, 404);
  return json({ success: true, data: publicLineLoginMember(member) });
}

function validateNativeAnswers(form: NativeForm, answers: Record<string, unknown>, sessionId: string) {
  const errors: string[] = [];
  const session = form.sessions.find((item) => item.id === sessionId);
  if (!session) errors.push("請選擇有效場次");
  for (const field of form.fields) {
    const value = answers[field.key];
    const hasValue = Array.isArray(value) ? value.length > 0 : clean(value) !== "";
    if (field.required && !hasValue) errors.push(`${field.label} 為必填`);
    if ((field.type === "radio" || field.type === "dropdown") && hasValue && field.options?.length && !field.options.includes(clean(value))) errors.push(`${field.label} 選項不正確`);
    if (field.type === "checkbox" && hasValue && field.options?.length) {
      const values = Array.isArray(value) ? value.map(clean) : [clean(value)];
      if (values.some((item) => !field.options?.includes(item))) errors.push(`${field.label} 選項不正確`);
    }
  }
  return errors;
}

function validateNativeLoginAnswers(form: NativeForm, answers: Record<string, unknown>, sessionId: string) {
  const errors: string[] = [];
  const session = form.sessions.find((item) => item.id === sessionId);
  if (!session) errors.push("請選擇有效場次");
  const autoKeys = nativeMemberAutoFieldKeys();
  for (const field of form.fields) {
    const key = clean(field.key).toLowerCase();
    if (autoKeys.has(key)) continue;
    const value = answers[field.key];
    const hasValue = Array.isArray(value) ? value.length > 0 : clean(value) !== "";
    if (field.required && !hasValue) errors.push(`${field.label} 為必填`);
    if ((field.type === "radio" || field.type === "dropdown") && hasValue && field.options?.length && !field.options.includes(clean(value))) errors.push(`${field.label} 選項不正確`);
    if (field.type === "checkbox" && hasValue && field.options?.length) {
      const values = Array.isArray(value) ? value.map(clean) : [clean(value)];
      if (values.some((item) => !field.options?.includes(item))) errors.push(`${field.label} 選項不正確`);
    }
  }
  return errors;
}

async function submitNativeForm(request: Request, env: Env, formId: string) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "?曆??啣?”" }, 404);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const rawAnswers = asRecord(input.answers);
  const answers = normalizeAnswersRecord(rawAnswers);
  const lineUserId = firstClean(input.lineUserId, rawAnswers.LINE_user_id, rawAnswers.lineUserId, rawAnswers.line_user_id, rawAnswers.uid, rawAnswers.UID);
  if (lineUserId) answers.LINE_user_id = lineUserId;
  const sessionId = clean(input.sessionId || "default");
  let member: LineLoginMember | null = null;
  try {
    member = await resolveAndBindNativeRegistrationMember(env, lineUserId, answers);
  } catch (error) {
    return json({ success: false, message: error instanceof Error ? error.message : "?鞈?瘥?憭望?" }, 400);
  }
  const finalAnswers = member ? normalizeAnswersRecord({ ...answers, ...memberAnswers(member) }) : answers;
  const errors = member ? validateNativeLoginAnswers(form, finalAnswers, sessionId) : validateNativeAnswers(form, finalAnswers, sessionId);
  if (errors.length) return json({ success: false, message: errors[0], errors }, 400);
  return createNativeRegistration(env, form, finalAnswers, member?.lineUserId || lineUserId, sessionId, member ? "line_member_claim" : "form", member || undefined);
}

async function createNativeRegistration(env: Env, form: NativeForm, answers: Record<string, unknown>, lineUserId: string, sessionId: string, source: string, member?: LineLoginMember) {
  const active = activeRegistrations(await readRegistrationList(env, form.id));
  if (lineUserId) {
    const existing = active.find((item) => clean(item.lineUserId).toLowerCase() === clean(lineUserId).toLowerCase());
    if (existing) {
      return json({
        success: true,
        data: {
          registrationId: existing.id,
          queryCode: existing.queryCode,
          checkinUrl: existing.checkinToken ? nativeCheckinUrl(existing.checkinToken) : "",
          submittedAt: existing.submittedAt,
          activity: existing.activity || form.activity,
          session: form.sessions.find((item) => item.id === clean(existing.sessionId || sessionId)),
          duplicate: true
        }
      });
    }
  }
  const session = form.sessions.find((item) => item.id === sessionId);
  const sessionCount = active.filter((item) => clean(item.sessionId || "default") === sessionId).length;
  const sessionCapacity = Number(session?.capacity || 0);
  const totalCapacity = Number(form.activity.capacity || 0);
  if (sessionCapacity > 0 && sessionCount >= sessionCapacity) return json({ success: false, message: "此場次已額滿" }, 409);
  if (totalCapacity > 0 && active.length >= totalCapacity) return json({ success: false, message: "此活動已額滿" }, 409);

  const registrationId = `REG-${Date.now()}-${codeToken(4)}`;
  const queryCode = codeToken(8);
  const checkinToken = crypto.randomUUID().replace(/-/g, "");
  const submittedAt = new Date().toISOString();
  const entry: RegistrationEntry = {
    id: registrationId,
    sourceId: registrationId,
    formId: form.id,
    submittedAt,
    activity: form.activity,
    answers: { ...answers, registrationSource: source, ...(member ? { memberType: member.role, memberNo: member.memberNo, memberName: member.name } : {}) },
    status: "active",
    sessionId,
    queryCode,
    checkinToken,
    lineUserId,
    payment: initialRegistrationPayment(form.activity)
  };
  const keys = registrationKeys(form.activity, form.id);
  const count = await appendRegistrationList(env, keys, entry);
  const summary = await readRegistrationSummary(env);
  const record: RegistrationRecord = {
    activityId: clean(form.activity.id),
    activityNo: clean(form.activity.activityNo),
    activityName: clean(form.activity.name),
    formId: form.id,
    count: Number(count || 0),
    lastSubmittedAt: submittedAt
  };
  for (const key of keys) summary.activities[key] = record;
  await writeRegistrationSummary(env, summary);
  await writeNativeRegistration(env, entry);
  return json({ success: true, data: { registrationId, queryCode, checkinUrl: nativeCheckinUrl(checkinToken), submittedAt, activity: form.activity, session, payment: entry.payment } }, 201);
}

async function submitNativeLoginRegistration(request: Request, env: Env, formId: string) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const lineUserId = firstClean(input.lineUserId, input.uid, input.LINE_user_id);
  if (!lineUserId) return json({ success: false, message: "請透過 LINE Login 取得會員身份" }, 400);
  const sessionId = clean(input.sessionId || "default");
  const session = form.sessions.find((item) => item.id === sessionId);
  if (!session) return json({ success: false, message: "請選擇有效場次" }, 400);
  const userAnswers = normalizeAnswersRecord(asRecord(input.answers));
  let member = await resolveLineLoginMember(env, lineUserId);
  if (!member && nativeAnswerClaimsMember(userAnswers)) {
    try {
      member = await resolveAndBindNativeRegistrationMember(env, lineUserId, userAnswers);
    } catch (error) {
      return json({ success: false, code: "member_bind_failed", message: error instanceof Error ? error.message : "會員資料比對失敗，請確認姓名與會員編號。" }, 400);
    }
  }
  if (!member) return json({ success: false, code: "member_not_found", message: "此 LINE 帳號尚未綁定會員或廠商會員資料，請先補齊姓名與會員編號完成綁定。" }, 403);
  const answers = normalizeAnswersRecord({ ...userAnswers, ...memberAnswers(member) });
  const errors = validateNativeLoginAnswers(form, answers, sessionId);
  if (errors.length) return json({ success: false, message: errors[0], errors }, 400);
  return createNativeRegistration(env, form, answers, member.lineUserId, sessionId, "line_login", member);
}

async function queryNativeRegistration(request: Request, env: Env) {
  const url = new URL(request.url);
  const queryCode = clean(url.searchParams.get("code"));
  const registrationId = clean(url.searchParams.get("registrationId"));
  let targetId = registrationId;
  if (!targetId && queryCode && env.ASSETS_BUCKET) {
    const object = await env.ASSETS_BUCKET.get(nativeQueryKey(queryCode));
    targetId = object ? await object.text() : "";
  }
  const entry = await readNativeRegistration(env, targetId);
  if (!entry || (queryCode && entry.queryCode !== queryCode)) return json({ success: false, message: "查無報名資料" }, 404);
  return json({ success: true, data: { ...publicRegistrationEntry(entry), checkinUrl: entry.checkinToken ? nativeCheckinUrl(entry.checkinToken) : "" } });
}

async function queryNativeRegistrationsByLine(request: Request, env: Env) {
  const url = new URL(request.url);
  const lineUserId = clean(url.searchParams.get("lineUserId"));
  if (!lineUserId || !env.ASSETS_BUCKET) return json({ success: false, message: "Missing LINE user id" }, 400);
  const object = await env.ASSETS_BUCKET.get(nativeLineUserKey(lineUserId));
  const ids = object ? await object.json().catch(() => []) as unknown : [];
  const entries: RegistrationEntry[] = [];
  for (const id of Array.isArray(ids) ? ids.map(clean).filter(Boolean) : []) {
    const entry = await readNativeRegistration(env, id);
    if (entry && clean(entry.lineUserId) === lineUserId) entries.push(entry);
  }
  return json({ success: true, data: entries.map((entry) => ({ ...publicRegistrationEntry(entry), checkinUrl: entry.checkinToken ? nativeCheckinUrl(entry.checkinToken) : "" })) });
}

async function updateRegistrationEverywhere(env: Env, entry: RegistrationEntry) {
  await writeNativeRegistration(env, entry);
  const keys = registrationKeys(entry.activity || {}, clean(entry.formId));
  for (const key of keys) {
    const list = await readRegistrationList(env, key);
    const next = list.map((item) => item.id === entry.id ? { ...item, ...entry } : item);
    await writeRegistrationList(env, key, next);
  }
  const summary = await readRegistrationSummary(env);
  const count = activeRegistrations(await readRegistrationList(env, clean(entry.formId))).length;
  for (const key of keys) {
    const existing = summary.activities[key];
    if (existing) summary.activities[key] = { ...existing, count, lastSubmittedAt: existing.lastSubmittedAt };
  }
  await writeRegistrationSummary(env, summary);
}

async function updateNativeRegistration(request: Request, env: Env) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const registrationId = clean(input.registrationId);
  const queryCode = clean(input.queryCode);
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.queryCode !== queryCode) return json({ success: false, message: "查無可修改的報名資料" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: false, message: "此報名已取消，不能修改" }, 409);
  if (clean(entry.checkedInAt)) return json({ success: false, message: "此報名已完成核銷，不能修改" }, 409);
  const form = await readNativeForm(env, clean(entry.formId));
  if (!form) return json({ success: false, message: "找不到原報名表設定，無法修改" }, 404);

  const sessionId = clean(input.sessionId || entry.sessionId || "default");
  const active = activeRegistrations(await readRegistrationList(env, form.id)).filter((item) => item.id !== entry.id);
  const session = form.sessions.find((item) => item.id === sessionId);
  const sessionCapacity = Number(session?.capacity || 0);
  const sessionCount = active.filter((item) => clean(item.sessionId || "default") === sessionId).length;
  if (sessionCapacity > 0 && sessionCount >= sessionCapacity) return json({ success: false, message: "此場次已額滿" }, 409);

  const previousAnswers = normalizeAnswersRecord(entry.answers || {});
  const editedAnswers = normalizeAnswersRecord(asRecord(input.answers));
  const answers = normalizeAnswersRecord({ ...previousAnswers, ...editedAnswers });
  if (entry.lineUserId) answers.LINE_user_id = entry.lineUserId;
  const source = clean(previousAnswers.registrationSource);
  const errors = source === "line_member_claim"
    ? validateNativeLoginAnswers(form, answers, sessionId)
    : validateNativeAnswers(form, answers, sessionId);
  if (errors.length) return json({ success: false, message: errors[0], errors }, 400);

  entry.sessionId = sessionId;
  entry.answers = answers;
  entry.updatedAt = new Date().toISOString();
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: { ...publicRegistrationEntry(entry), checkinUrl: entry.checkinToken ? nativeCheckinUrl(entry.checkinToken) : "" } });
}

async function cancelNativeRegistration(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const registrationId = clean(input.registrationId);
  const queryCode = clean(input.queryCode);
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.queryCode !== queryCode) return json({ success: false, message: "查無可取消的報名資料" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: true, data: entry });
  entry.status = "cancelled";
  entry.cancelledAt = new Date().toISOString();
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: entry });
}

async function reportNativeRegistrationPayment(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const registrationId = clean(input.registrationId);
  const queryCode = clean(input.queryCode);
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.queryCode !== queryCode) return json({ success: false, message: "查無可回報的報名資料" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: false, message: "此報名已取消，不能回報付款" }, 409);
  const payment = normalizeRegistrationPayment(entry);
  if (payment.amount <= 0) return json({ success: false, message: "此活動不需要付款" }, 400);
  if (payment.status === "paid") return json({ success: true, data: publicRegistrationEntry(entry) });
  const remittanceLast5 = clean(input.remittanceLast5 || input.last5).replace(/\D/g, "");
  if (remittanceLast5.length !== 5) return json({ success: false, message: "請輸入匯款帳號末五碼" }, 400);
  const now = new Date().toISOString();
  entry.payment = {
    ...payment,
    status: "reported",
    method: "bank_transfer",
    remittanceLast5,
    reportedAt: now,
    note: clean(input.note || payment.note),
    updatedAt: now,
    transactions: [{ type: "reported", remittanceLast5, at: now, note: clean(input.note) }, ...(payment.transactions || [])].slice(0, 50)
  };
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: publicRegistrationEntry(entry) });
}

async function updateNativeRegistrationPayment(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const registrationId = clean(input.registrationId);
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry) return json({ success: false, message: "查無報名資料" }, 404);
  const payment = normalizeRegistrationPayment(entry);
  const status = clean(input.status) as PaymentStatus;
  const safeStatus: PaymentStatus = ["unpaid", "reported", "paid", "cancelled", "refunded"].includes(status) ? status : payment.status;
  const now = new Date().toISOString();
  const admin = adminEmailFromRequest(request) || adminMemberNoFromRequest(request) || adminLineUserIdFromRequest(request) || "admin";
  const amount = input.amount === undefined ? payment.amount : Math.max(0, numberValue(input.amount));
  entry.payment = {
    ...payment,
    status: amount <= 0 ? "free" : safeStatus,
    method: clean(input.method) as RegistrationPayment["method"] || payment.method || "bank_transfer",
    amount,
    remittanceLast5: clean(input.remittanceLast5 || payment.remittanceLast5).replace(/\D/g, "").slice(-5),
    note: clean(input.note || payment.note),
    paidAt: safeStatus === "paid" ? clean(input.paidAt) || payment.paidAt || now : "",
    verifiedAt: safeStatus === "paid" ? now : "",
    verifiedBy: safeStatus === "paid" ? admin : "",
    updatedAt: now,
    transactions: [{ type: "admin_update", status: safeStatus, amount, at: now, by: admin, note: clean(input.note) }, ...(payment.transactions || [])].slice(0, 50)
  };
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: publicRegistrationEntry(entry) });
}

async function verifyNativeCheckin(request: Request, env: Env) {
  const url = new URL(request.url);
  const token = clean(url.searchParams.get("token"));
  if (!token || !env.ASSETS_BUCKET) return json({ success: false, message: "缺少核銷碼" }, 400);
  const object = await env.ASSETS_BUCKET.get(nativeTokenKey(token));
  const registrationId = object ? await object.text() : "";
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.checkinToken !== token) return json({ success: false, message: "核銷碼無效" }, 404);
  if (!paymentIsSettled(entry)) return json({ success: false, message: "此報名尚未完成付款，不能核銷" }, 409);
  return json({ success: true, data: publicRegistrationEntry(entry) });
}

async function confirmNativeCheckin(request: Request, env: Env) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const operatorLineUserId = firstClean(input.operatorLineUserId, input.operatorUid, input.adminLineUserId, input.lineUserId, adminLineUserIdFromRequest(request));
  if (!operatorLineUserId || !await isCheckinOperator(operatorLineUserId, env)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }
  const token = clean(input.token);
  if (!token || !env.ASSETS_BUCKET) return json({ success: false, message: "缺少核銷碼" }, 400);
  const object = await env.ASSETS_BUCKET.get(nativeTokenKey(token));
  const registrationId = object ? await object.text() : "";
  const entry = await readNativeRegistration(env, registrationId);
  if (!entry || entry.checkinToken !== token) return json({ success: false, message: "核銷碼無效" }, 404);
  if (clean(entry.status || "active") === "cancelled") return json({ success: false, message: "此報名已取消，不能核銷" }, 409);
  if (!paymentIsSettled(entry)) return json({ success: false, message: "此報名尚未完成付款，不能核銷" }, 409);
  const firstCheckin = !entry.checkedInAt;
  if (firstCheckin) {
    entry.checkedInAt = new Date().toISOString();
    entry.pointResults = await syncCheckinPoints(env, entry);
    entry.pointsSyncedAt = new Date().toISOString();
  }
  await updateRegistrationEverywhere(env, entry);
  return json({ success: true, data: entry });
}

function opnFormIntroProperties(activity: Record<string, unknown>, settings: Record<string, unknown>) {
  const posterUrl = firstClean(activity.posterUrl, activity.imageUrl, activity.coverUrl, settings.posterUrl, settings.imageUrl, settings.coverUrl);
  const detailText = firstClean(activity.detailText, settings.detailText, settings.description);
  const blocks: Record<string, unknown>[] = [];
  if (posterUrl) blocks.push({ id: "tdea_activity_poster", type: "nf-image", name: "瘣餃?瘚瑕", image_block: posterUrl, align: "center", width: "full" });
  if (detailText) blocks.push({ id: "tdea_activity_description", type: "nf-text", name: "瘣餃?隤芣?", content: `<p>${esc(detailText).replace(/\r?\n/g, "<br>")}</p>` });
  blocks.push({ id: "tdea_activity_divider", type: "nf-divider", name: "?勗?鞈?" });
  return blocks;
}

function opnFormProperties(activity: Record<string, unknown>, settings: Record<string, unknown>) {
  const fields = settings.fields;
  const rows = Array.isArray(fields) ? fields as Array<Record<string, unknown>> : [];
  const normal = rows.map((field, index) => {
    const type = opnFormType(field.type);
    const property: Record<string, unknown> = {
      id: clean(field.key) || `field_${index + 1}`,
      type,
      name: clean(field.label) || `甈? ${index + 1}`,
      required: Boolean(field.required),
      width: "full"
    };
    if (type === "text" && opnFormIsLongText(field.type)) property.multi_lines = true;
    if (type === "select" || type === "multi_select") {
      const options = normalizeOptions(field.options);
      property[type] = { options };
      if (opnFormUsesFlatChoices(field.type)) property.without_dropdown = true;
    }
    return property;
  });
  return [
    ...opnFormIntroProperties(activity, settings),
    ...normal,
    { id: "tdea_activity_id", type: "text", name: "TDEA Activity ID", hidden: true, required: false, width: "full" },
    { id: "tdea_activity_no", type: "text", name: "TDEA Activity No", hidden: true, required: false, width: "full" },
    { id: "tdea_activity_name", type: "text", name: "TDEA Activity Name", hidden: true, required: false, width: "full" }
  ];
}

function opnFormUrl(env: Env, form: Record<string, unknown>) {
  const direct = clean(form.share_url || form.public_url || form.url || form.shareUrl || form.publicUrl);
  if (/^https?:\/\//i.test(direct)) return direct;
  const slug = clean(form.slug);
  const formId = clean(form.id || form.uuid);
  return slug || formId ? `${opnFormPublicBase(env)}/${encodeURIComponent(slug || formId)}` : "";
}

async function resolveOpnFormWorkspaceId(env: Env) {
  const configured = Number(clean(env.OPNFORM_WORKSPACE_ID));
  const list = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
  const rows = Array.isArray(list.data) ? list.data.map((item) => asRecord(item)) : [];
  const ids = rows.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
  if (Number.isFinite(configured) && ids.includes(configured)) return { workspaceId: configured, configuredWorkspaceId: configured, workspaces: rows, autoSelected: false };
  if (ids.length === 1) return { workspaceId: ids[0], configuredWorkspaceId: Number.isFinite(configured) ? configured : 0, workspaces: rows, autoSelected: true };
  return { workspaceId: configured, configuredWorkspaceId: Number.isFinite(configured) ? configured : 0, workspaces: rows, autoSelected: false };
}

async function createOpnForm(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN) || !clean(env.OPNFORM_WORKSPACE_ID)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN / OPNFORM_WORKSPACE_ID is not configured" }, 503);

  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activity = asRecord(input.activity);
  const settings = asRecord(input.settings);
  const workspace = await resolveOpnFormWorkspaceId(env);
  const payload = {
    workspace_id: workspace.workspaceId,
    title: clean(activity.name) || "TDEA 活動報名",
    visibility: "public",
    language: "zh",
    tags: ["TDEA"],
    theme: "default",
    presentation_style: "classic",
    color: "#06C755",
    dark_mode: "light",
    width: "centered",
    size: "md",
    border_radius: "small",
    layout_rtl: false,
    uppercase_labels: false,
    no_branding: true,
    redirect_url: firstClean(settings.redirectUrl, activity.redirectUrl, defaultLiffCloseUrl),
    transparent_background: false,
    submit_button_text: "送出報名",
    submitted_text: "報名已送出，請關閉視窗。",
    re_fillable: false,
    re_fill_button_text: "重新填寫",
    confetti_on_submission: false,
    show_progress_bar: true,
    auto_save: true,
    auto_focus: false,
    enable_partial_submissions: false,
    editable_submissions: false,
    editable_submissions_button_text: "修改回覆",
    use_captcha: false,
    captcha_provider: "recaptcha",
    can_be_indexed: false,
    seo_meta: {},
    max_submissions_count: Number(activity.capacity || 0) > 0 ? Number(activity.capacity) : undefined,
    properties: opnFormProperties(activity, settings)
  };
  const create = await opnFormJson(env, "/open/forms", { method: "POST", body: JSON.stringify(payload) });
  if (!create.response.ok) {
    let workspaces: unknown = undefined;
    if (create.response.status === 401 || create.response.status === 403) {
      const list = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
      workspaces = list.response.ok ? list.data : list.data;
    }
    return json({ success: false, code: "opnform_create_failed", message: clean(create.data.message) || "OpnForm create failed", workspaceId: workspace.workspaceId, configuredWorkspaceId: workspace.configuredWorkspaceId, workspaces: workspaces || workspace.workspaces, data: create.data }, create.response.status);
  }

  const form = asRecord(create.data.data || create.data.form || create.data);
  const formId = clean(form.id || form.uuid);
  const formUrl = opnFormUrl(env, form);
  if (formId) await writeOpnFormMeta(env, formId, activity, form);

  let webhookInstalled = false;
  let webhookMessage = "";
  if (formId) {
    const webhookSecret = clean(env.OPNFORM_WEBHOOK_SECRET);
    const webhookUrl = `${new URL(request.url).origin}/api/opnform/webhook`;
    const webhookPayload = {
      integration_id: "webhook",
      status: "active",
      data: {
        webhook_url: webhookUrl,
        ...(webhookSecret ? { webhook_secret: webhookSecret } : {})
      }
    };
    const integration = await opnFormJson(env, `/open/forms/${encodeURIComponent(formId)}/integrations`, { method: "POST", body: JSON.stringify(webhookPayload) });
    webhookInstalled = integration.response.ok;
    webhookMessage = webhookInstalled ? "" : clean(integration.data.message || integration.data.error || "Webhook integration was not installed");
  }

  return json({
    success: true,
    provider: "opnform",
    formId,
    opnformFormId: formId,
    formUrl,
    opnformFormUrl: formUrl,
    slug: clean(form.slug),
    editUrl: clean(form.edit_url || form.admin_url),
    webhookInstalled,
    webhookMessage,
    workspaceId: workspace.workspaceId,
    configuredWorkspaceId: workspace.configuredWorkspaceId,
    workspaceAutoSelected: workspace.autoSelected,
    data: { form, webhookInstalled, webhookMessage }
  }, 201);
}

async function listOpnFormWorkspaces(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN is not configured" }, 503);
  const result = await opnFormRawJson(env, "/open/workspaces", { method: "GET" });
  return json({ success: result.response.ok, configuredWorkspaceId: clean(env.OPNFORM_WORKSPACE_ID), data: result.data }, result.response.ok ? 200 : result.response.status);
}

function normalizeOpnFormSubmission(payload: Record<string, unknown>, fallbackActivity: Record<string, unknown> = {}) {
  const data = normalizeAnswersRecord(asRecord(payload.data || asRecord(payload.submission).data || payload.answers || payload.fields));
  const form = asRecord(payload.form);
  const formId = clean(payload.form_id || payload.formId || form.id || fallbackActivity.formId || fallbackActivity.opnformFormId);
  const submittedAt = clean(payload.submitted_at || payload.created_at || data.created_at) || new Date().toISOString();
  const activity = {
    id: clean(data.tdea_activity_id || fallbackActivity.id),
    activityNo: clean(data.tdea_activity_no || fallbackActivity.activityNo),
    name: clean(data.tdea_activity_name || fallbackActivity.name)
  };
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("tdea_") && key !== "status" && key !== "created_at" && key !== "id") answers[key] = value;
  }
  return {
    formId,
    sourceId: stableSubmissionSourceId(payload, data, formId, submittedAt),
    submittedAt,
    activity,
    answers
  };
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTextEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function verifyOpnFormSignature(rawBody: string, signature: string | null, secret?: string) {
  const cleanSecret = clean(secret);
  if (!cleanSecret) return true;
  const cleanSignature = clean(signature).replace(/^sha256=/i, "");
  if (!cleanSignature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(cleanSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expectedHex = hex(digest);
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return constantTextEqual(cleanSignature, expectedHex) || constantTextEqual(cleanSignature, expectedBase64);
}

async function handleOpnFormWebhook(request: Request, env: Env) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-opnform-signature") || request.headers.get("x-webhook-signature") || request.headers.get("x-signature");
  if (!await verifyOpnFormSignature(rawBody, signature, env.OPNFORM_WEBHOOK_SECRET)) return json({ success: false, message: "Invalid signature" }, 403);
  const payload = await JSON.parse(rawBody || "{}") as Record<string, unknown>;
  const normalized = normalizeOpnFormSubmission(payload);
  const meta = asRecord(await readOpnFormMeta(env, normalized.formId || ""));
  const metaActivity = asRecord(meta.activity);
  const activity = normalized.activity.id || normalized.activity.activityNo || normalized.activity.name ? normalized.activity : metaActivity;
  return storeManagedSubmission(env, { ...normalized, activity, raw: payload });
}

async function syncOpnFormResponses(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!clean(env.OPNFORM_API_TOKEN)) return json({ success: false, code: "opnform_not_configured", message: "OPNFORM_API_TOKEN is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const activities = Array.isArray(input.activities) ? input.activities as Array<Record<string, unknown>> : [];
  const results = [];
  let imported = 0;

  for (const activity of activities) {
    const formId = clean(activity.opnformFormId || activity.formId);
    if (!formId) continue;
    const response = await opnFormJson(env, `/open/forms/${encodeURIComponent(formId)}/submissions?per_page=100&status=completed`, { method: "GET" });
    if (!response.response.ok) {
      results.push({ activity: activity.name || activity.id, formId, success: false, message: clean(response.data.message) || "OpnForm sync failed" });
      continue;
    }
    const submissions = Array.isArray(response.data.data) ? response.data.data as Array<Record<string, unknown>> : [];
    for (const submission of submissions) {
      const normalized = normalizeOpnFormSubmission({ ...submission, form_id: formId }, activity);
      await storeManagedSubmission(env, { ...normalized, activity: normalized.activity.id || normalized.activity.activityNo || normalized.activity.name ? normalized.activity : activity, raw: submission });
      imported += 1;
    }
    results.push({ activity: activity.name || activity.id, formId, success: true, count: submissions.length });
  }

  return json({ success: true, provider: "opnform", imported, results, data: await readRegistrationSummary(env) });
}

function normalizeConfig(config: MonthlyConfig): MonthlyConfig {
  const pages = Array.isArray(config.pages) ? config.pages : [];
  const cleanUrls = (value: unknown) => {
    const seen = new Set<string>();
    const values = (Array.isArray(value) ? value : [value]).flatMap((item) => String(item || "").split(/[\n,]+/));
    return values
      .map((item) => String(item || "").trim())
      .filter((item) => /^https?:\/\//i.test(item))
      .filter((item) => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  };
  const normalizedPages = pages.slice(0, 12).map((page, index) => ({
    id: String(page.id || crypto.randomUUID()),
    manual: page.manual === true,
    activityNo: String(page.activityNo || "").trim(),
    activityId: String(page.activityId || "").trim(),
    activityName: String(page.activityName || "").trim(),
    imageUrl: String(page.imageUrl || "").trim(),
    galleryUrls: cleanUrls(page.galleryUrls),
    formImageUrl: String(page.formImageUrl || "").trim(),
    detailTitle: String(page.detailTitle || "詳細說明").trim() || "詳細說明",
    detailText: String(page.detailText || "").trim(),
    detailUrl: String(page.detailUrl || "").trim(),
    formUrl: String(page.formUrl || "").trim(),
    shareUrl: String(page.shareUrl || "").trim(),
    order: Number(page.order ?? index)
  })).filter((page) => page.activityNo || page.activityId || page.imageUrl || page.formUrl || page.detailText || page.detailUrl);
  return {
    enabled: config.enabled !== false && normalizedPages.length > 0,
    keyword: fixedKeyword,
    month: String(config.month || "").trim(),
    altText: String(config.altText || "TDEA 每月活動").trim() || "TDEA 每月活動",
    detailBaseUrl: String(config.detailBaseUrl || defaultLiffBase).trim(),
    updatedAt: config.updatedAt,
    pages: normalizedPages
  };
}

function validateMonthlyConfigForPublish(config: MonthlyConfig) {
  const normalized = normalizeConfig(config);
  if (normalized.enabled === false || !normalized.pages?.length) return "";
  for (let index = 0; index < normalized.pages.length; index += 1) {
    const page = normalized.pages[index];
    const label = `第 ${index + 1} 頁`;
    if (!clean(page.activityNo) && !clean(page.activityId) && !page.manual) return `${label}：請先選擇連動活動。`;
    if (!clean(page.activityName || page.detailTitle)) return `${label}：請輸入活動標題。`;
    if (!clean(page.detailText)) return `${label}：請先補齊活動詳細說明。`;
    if (!clean(page.formUrl)) return `${label}：報名表尚未連動，不能發布。`;
    const imageUrl = clean(page.imageUrl);
    if (!/^https?:\/\//i.test(imageUrl) || imageUrl === monthlyDefaultImageUrl) return `${label}：主圖尚未上傳或仍使用預設圖，不能發布。`;
    if (!Array.isArray(page.galleryUrls) || !page.galleryUrls.some((url) => /^https?:\/\//i.test(clean(url)))) return `${label}：活動圖集尚未上傳，不能發布。`;
  }
  return "";
}

function activityStatusIsOnline(activity: Record<string, unknown>) {
  const status = clean(activity.status || activity["狀態"]);
  if (activity.archived === true || activity.deleted === true || clean(activity.deletedAt)) return false;
  if (status === "已封存" || status === "封存") return false;
  return !status || status === "上架" || /online|active|published/i.test(status);
}

function activityIdentity(activity: Record<string, unknown>) {
  return firstClean(activity.activityNo, activity.no, activity.activityId, activity.id);
}

function pageIdentity(page: MonthlyPage) {
  return firstClean(page.activityNo, page.activityId, page.id);
}

function isManualMonthlyPage(page: MonthlyPage) {
  return page.manual === true && !clean(page.activityNo) && !clean(page.activityId);
}

function monthlyUrlList(value: unknown) {
  const seen = new Set<string>();
  const values = (Array.isArray(value) ? value : [value]).flatMap((item) => String(item || "").split(/[\n,]+/));
  return values
    .map((item) => clean(item))
    .filter((item) => /^https?:\/\//i.test(item))
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function pageFromActivity(activity: Record<string, unknown>, order: number): MonthlyPage | null {
  const activityId = activityIdentity(activity);
  const name = firstClean(activity.name, activity.activityName, activity.title, activity["活動名稱"]);
  if (!activityId && !name) return null;
  return {
    id: activityId || `monthly-${order}`,
    activityNo: firstClean(activity.activityNo, activity.no),
    activityId,
    activityName: name,
    imageUrl: firstClean(activity.imageUrl, activity.posterUrl, activity.formImageUrl),
    galleryUrls: monthlyUrlList(activity.galleryUrls),
    formImageUrl: firstClean(activity.formImageUrl, activity.imageUrl),
    detailTitle: name || "詳細說明",
    detailText: firstClean(activity.detailText, activity.description, activity.note),
    detailUrl: firstClean(activity.detailUrl),
    formUrl: firstClean(activity.nativeFormUrl, activity.formUrl),
    shareUrl: firstClean(activity.shareUrl),
    order
  };
}

async function readEffectiveMonthly(env: Env): Promise<MonthlyConfig> {
  const monthly = await readMonthly(env);
  const managerData = await readManagerData(env);
  const activities = Array.isArray(managerData?.activities) ? managerData.activities : [];
  const manualPages = (monthly.pages || []).filter(isManualMonthlyPage);
  const activityPages = activities
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && activityStatusIsOnline(item as Record<string, unknown>))
    .map((item, index) => pageFromActivity(item, index))
    .filter((page): page is MonthlyPage => Boolean(page));
  if (!activityPages.length) return normalizeConfig({ ...monthly, enabled: monthly.enabled !== false && manualPages.length > 0, pages: manualPages });

  const merged = new Map<string, MonthlyPage>();
  activityPages.forEach((page) => merged.set(pageIdentity(page), page));
  (monthly.pages || []).forEach((page, index) => {
    if (isManualMonthlyPage(page)) {
      merged.set(pageIdentity(page), { ...page, order: Number.isFinite(Number(page.order)) ? page.order : index });
      return;
    }
    const key = pageIdentity(page);
    if (!key) return;
    const base = merged.get(key);
    if (!base) return;
    merged.set(key, {
      ...page,
      ...base,
      manual: false,
      id: base.id || page.id,
      activityId: base.activityId || page.activityId,
      activityNo: base.activityNo || page.activityNo,
      activityName: base.activityName || page.activityName,
      detailTitle: base.detailTitle || page.detailTitle,
      detailText: base.detailText || page.detailText,
      detailUrl: base.detailUrl || page.detailUrl,
      formUrl: base.formUrl || page.formUrl,
      shareUrl: page.shareUrl || base.shareUrl,
      order: Number.isFinite(Number(page.order)) ? page.order : index
    });
  });

  return normalizeConfig({
    ...monthly,
    enabled: monthly.enabled !== false || merged.size > 0,
    pages: [...merged.values()].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  });
}

function appendIdToUrl(baseUrl: string | undefined, activityNo: string | undefined, pageId: string | undefined) {
  const raw = String(baseUrl || defaultLiffBase).trim();
  const target = String(activityNo || pageId || "").trim();
  const encoded = encodeURIComponent(target);
  if (raw.includes("{id}")) return raw.replaceAll("{id}", encoded);
  if (raw.includes("{activityNo}")) return raw.replaceAll("{activityNo}", encoded);
  return raw + (raw.includes("?") ? "&" : "?") + "monthlyDetail=" + encoded;
}

function detailUrlForPage(page: MonthlyPage, config: MonthlyConfig) {
  const generated = appendIdToUrl(config.detailBaseUrl, page.activityNo || page.activityId, page.id);
  return generated || page.detailUrl || `${workerBaseUrl}/monthly-detail/${encodeURIComponent(String(page.id || ""))}`;
}

function registerUrlForPage(page: MonthlyPage) {
  const target = String(page.activityNo || page.activityId || page.id || "").trim();
  const current = String(page.formUrl || "").trim();
  if (page.manual === true && !current) return "";
  if (current) return current;
  return target ? `${nativeLiffUrl}?register=${encodeURIComponent(target)}` : workerBaseUrl;
}

function appendQueryParam(url: string, key: string, value: string) {
  const raw = clean(url);
  if (!raw) return "";
  const separator = raw.includes("?") ? "&" : "?";
  return `${raw}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function shareUrlForPage(page: MonthlyPage, config: MonthlyConfig) {
  const target = firstClean(page.activityNo, page.activityId, page.id);
  return appendQueryParam(detailUrlForPage(page, config), "share", target || "1");
}

function normalizeCustomKeywordText(value: unknown) {
  return normalizeKeyword(clean(value));
}

function customKeywordMatches(rule: Record<string, unknown>, text: string) {
  if (rule.enabled === false) return false;
  const keyword = normalizeCustomKeywordText(rule.keyword);
  const incoming = normalizeCustomKeywordText(text);
  if (!keyword || !incoming) return false;
  const aliases = String(rule.aliases || "").split(/[\n,、]+/).map(normalizeCustomKeywordText).filter(Boolean);
  const terms = [keyword, ...aliases];
  const mode = clean(rule.matchMode) === "contains" ? "contains" : "exact";
  return mode === "contains" ? terms.some((term) => incoming.includes(term)) : terms.includes(incoming);
}

function customKeywordMessage(rule: Record<string, unknown>) {
  if (clean(rule.replyType) === "flex") {
    try {
      const contents = JSON.parse(clean(rule.flexJson));
      if (contents && typeof contents === "object" && clean(contents.type)) return { type: "flex", altText: clean(rule.altText || rule.title || rule.keyword || "TDEA 訊息"), contents };
    } catch (_) {}
  }
  const lines = [clean(rule.replyText || rule.text || rule.reply), clean(rule.url || rule.entryUrl || rule.link)].filter(Boolean);
  return { type: "text", text: lines.join("\n") || clean(rule.title || rule.keyword || "已收到訊息") };
}

async function handleCustomKeywordEvents(events: LineEvent[], env: Env) {
  const data = await readManagerDataRaw(env) || {};
  const rules = [...(Array.isArray(data.keywordRules) ? data.keywordRules as Record<string, unknown>[] : []), ...(Array.isArray(data.flexRules) ? data.flexRules as Record<string, unknown>[] : [])];
  const matches = events
    .map((event) => ({ event, text: extractTriggerText(event), rule: rules.find((rule) => customKeywordMatches(rule, extractTriggerText(event))) }))
    .filter((item): item is { event: LineEvent; text: string; rule: Record<string, unknown> } => Boolean(item.rule));
  if (!matches.length) return null;
  const lineReplies = await Promise.all(matches.map(({ event, rule }) => event.replyToken
    ? replyToLine(event.replyToken, [customKeywordMessage(rule)], env)
    : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
  return json({ success: true, mode: "custom-keyword", matched: matches.map((item) => clean(item.rule.keyword)), lineReplies });
}
function buildMonthlyFlex(config: MonthlyConfig) {
  const normalized = normalizeConfig(config);
  if (!(normalized.pages || []).length) return { type: "text", text: "TDEA 每月活動目前沒有上架活動。" };
  return { type: "flex", altText: normalized.altText || "TDEA 每月活動", contents: { type: "carousel", contents: (normalized.pages || []).map((page) => buildMonthlyBubble(page, normalized)) } };
}

function buildMonthlyBubble(page: MonthlyPage, config: MonthlyConfig) {
  const detailUri = detailUrlForPage(page, config);
  const formUri = registerUrlForPage(page) || detailUri;
  const shareUri = shareUrlForPage(page, config);
  return {
    type: "bubble",
    size: "kilo",
    body: { type: "box", layout: "vertical", paddingAll: "0px", contents: [
      { type: "image", url: page.imageUrl || "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png", size: "full", aspectMode: "cover", aspectRatio: "2:3", gravity: "top", action: { type: "uri", label: "報名", uri: formUri } },
      { type: "box", layout: "vertical", position: "absolute", cornerRadius: "20px", offsetTop: "18px", offsetStart: "18px", backgroundColor: "#ff334b", height: "25px", width: "53px", action: { type: "uri", label: "分享", uri: shareUri }, contents: [{ type: "text", text: "分享", color: "#ffffff", align: "center", size: "xs", offsetTop: "3px", action: { type: "uri", label: "分享", uri: shareUri } }] }
    ] },
    footer: { type: "box", layout: "horizontal", contents: [
      { type: "button", height: "sm", style: "primary", action: { type: "uri", label: "詳細說明", uri: detailUri } },
      { type: "button", height: "sm", style: "primary", margin: "md", action: { type: "uri", label: "點我報名", uri: formUri } }
    ] }
  };
}

async function monthlyActivityShareApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = firstClean(url.searchParams.get("id"), url.searchParams.get("monthlyDetail"), url.searchParams.get("activityNo"), url.searchParams.get("activityId"));
  const config = await readMonthlyReplyConfig(env);
  const page = (config.pages || []).find((item) => String(item.id) === id || String(item.activityNo) === id || String(item.activityId) === id);
  if (!page) return json({ success: false, message: "Activity not found" }, 404);
  return json({ success: true, message: { type: "flex", altText: page.detailTitle || page.activityName || config.altText || "TDEA 每月活動", contents: buildMonthlyBubble(page, config) } });
}
function vendorCardLabel(label: string) {
  const text = clean(label);
  return text.length > 10 ? text.slice(0, 10) : text;
}

function monthlyPageImages(page: MonthlyPage) {
  const seen = new Set<string>();
  return [page.imageUrl, ...(Array.isArray(page.galleryUrls) ? page.galleryUrls : [])]
    .map((value) => String(value || "").trim())
    .filter((value) => /^https?:\/\//i.test(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function monthlySliderHtml(page: MonthlyPage) {
  const images = monthlyPageImages(page);
  if (!images.length) return "";
  if (images.length === 1) return `<img src="${esc(images[0])}" alt="">`;
  return `<div class="slider" data-slider><div class="track">${images.map((url) => `<div class="slide"><img src="${esc(url)}" alt=""></div>`).join("")}</div><div class="slider-nav"><button type="button" data-prev>&lt;</button><button type="button" data-next>&gt;</button></div><div class="dots">${images.map((_, index) => `<button type="button" data-dot="${index}" class="${index === 0 ? "active" : ""}"></button>`).join("")}</div></div><script>(()=>{const root=document.querySelector("[data-slider]");if(!root)return;const track=root.querySelector(".track");const dots=[...root.querySelectorAll("[data-dot]")];let i=0,t=null;const go=n=>{i=(n+dots.length)%dots.length;track.style.transform="translateX(-"+(i*100)+"%)";dots.forEach((d,di)=>d.classList.toggle("active",di===i));};const restart=()=>{if(t)clearInterval(t);t=setInterval(()=>go(i+1),3000);};root.querySelector("[data-prev]").onclick=()=>{go(i-1);restart();};root.querySelector("[data-next]").onclick=()=>{go(i+1);restart();};dots.forEach(d=>d.onclick=()=>{go(Number(d.dataset.dot||0));restart();});restart();})();</script>`;
}

function buildVendorCardFlex(config: VendorCardConfig) {
  const normalized = normalizeVendorCardConfig(config);
  const items = (normalized.items || [])
    .filter((item) => item.enabled !== false && clean(item.imageUrl))
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const rows = [] as Array<Record<string, unknown>>;
  for (let index = 0; index < items.length; index += 4) {
    rows.push({
      type: "box",
      layout: "horizontal",
      justifyContent: "space-around",
      contents: items.slice(index, index + 4).map((item) => {
        const label = vendorCardLabel(clean(item.label || item.name || item.actionText));
        const text = clean(item.actionText || item.name || item.label);
        return {
          type: "box",
          layout: "vertical",
          alignItems: "center",
          spacing: "sm",
          action: { type: "message", text },
          contents: [
            { type: "image", url: clean(item.imageUrl), size: "60px", aspectMode: "cover", action: { type: "message", label: "action", text } },
            { type: "text", text: label, size: "xxs", align: "center", wrap: true, action: { type: "message", label: "action", text } }
          ]
        };
      })
    });
  }
  return {
    type: "flex",
    altText: normalized.altText || "TDEA 廠商列表",
    contents: {
      type: "bubble",
      size: "giga",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: rows.length ? rows : [
          { type: "text", text: normalized.title || "TDEA 廠商列表", weight: "bold", size: "lg", align: "center" },
          { type: "text", text: "尚未設定廠商名片", wrap: true, align: "center", color: "#666666" }
        ]
      }
    }
  };
}

function base64ToBytes(value: string) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
function constantTimeEqual(a: string, b: string) { let left: Uint8Array; let right: Uint8Array; try { left = base64ToBytes(a); right = base64ToBytes(b); } catch (_) { return false; } if (left.length !== right.length) return false; let diff = 0; for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index]; return diff === 0; }
async function verifyLineSignature(rawBody: string, signature: string | null, channelSecret?: string) { const cleanSignature = signature?.trim(); const cleanSecret = channelSecret?.trim(); if (!cleanSignature || !cleanSecret) return false; const encoder = new TextEncoder(); const key = await crypto.subtle.importKey("raw", encoder.encode(cleanSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]); return crypto.subtle.verify("HMAC", key, base64ToBytes(cleanSignature), encoder.encode(rawBody)); }
function extractLineEvents(payload: unknown): LineEvent[] { if (!payload || typeof payload !== "object") return []; const events = (payload as { events?: unknown }).events; return Array.isArray(events) ? events as LineEvent[] : []; }
function extractTriggerText(event: LineEvent) { if (event.message?.type === "text" && event.message.text) return event.message.text; if (event.postback?.data) return event.postback.data; return ""; }
async function replyToLine(replyToken: string, messages: Array<Record<string, unknown>>, env: Env) { const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim(); if (!token) return { ok: false, status: 503, message: "LINE token is not configured" }; const response = await fetch("https://api.line.me/v2/bot/message/reply", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ replyToken, messages }) }); return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") }; }
async function pushToLine(to: string, messages: Array<Record<string, unknown>>, env: Env) { const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim(); if (!token) return { ok: false, status: 503, message: "LINE token is not configured" }; const response = await fetch("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ to, messages }) }); return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") }; }
function rebuildRequest(request: Request, rawBody: string) { return new Request(request.url, { method: request.method, headers: request.headers, body: rawBody }); }

function personalMessagesUrl() {
  return `${publicLiffUrl}?personalMessages=1`;
}

async function readPersonalMessages(env: Env): Promise<PersonalMessageRecord[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(personalMessagesKey);
  const rows = object ? await object.json().catch(() => []) : [];
  return Array.isArray(rows)
    ? rows.map((row) => normalizePersonalMessage(asRecord(row))).filter(Boolean) as PersonalMessageRecord[]
    : [];
}

async function writePersonalMessages(env: Env, rows: PersonalMessageRecord[]) {
  if (!env.ASSETS_BUCKET) return false;
  await env.ASSETS_BUCKET.put(personalMessagesKey, JSON.stringify(rows.slice(0, 1000), null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
  return true;
}

function normalizePersonalMessage(input: Record<string, unknown>): PersonalMessageRecord | null {
  const subject = firstClean(input.subject, input.title, "TDEA 個人訊息");
  const body = firstClean(input.body, input.message, input.content);
  const attachments = Array.isArray(input.attachments)
    ? input.attachments.map(asRecord).map((item) => ({
        name: firstClean(item.name, item.filename, "附件"),
        url: firstClean(item.url, item.href),
        type: firstClean(item.type, item.contentType),
        size: numberValue(item.size)
      })).filter((item) => clean(item.url))
    : [];
  if (!body && !attachments.length) return null;
  return {
    id: firstClean(input.id, `pm-${Date.now()}-${codeToken(5)}`),
    createdAt: firstClean(input.createdAt, new Date().toISOString()),
    updatedAt: firstClean(input.updatedAt),
    recipientMemberNo: firstClean(input.recipientMemberNo, input.memberNo, input.rosterMemberNo).toUpperCase(),
    recipientLineUserId: firstClean(input.recipientLineUserId, input.lineUserId, input.uid, input.LINE_user_id),
    recipientName: firstClean(input.recipientName, input.name),
    sender: firstClean(input.sender, input.senderEmail, input.adminEmail),
    subject,
    body,
    attachments,
    status: clean(input.status) === "deleted" ? "deleted" : "active",
    readAt: firstClean(input.readAt)
  };
}

async function resolvePersonalMessageRecipient(env: Env, input: Record<string, unknown>) {
  const memberNo = firstClean(input.recipientMemberNo, input.memberNo, input.rosterMemberNo).toUpperCase();
  const lineUserId = firstClean(input.recipientLineUserId, input.lineUserId, input.uid, input.LINE_user_id);
  const name = firstClean(input.recipientName, input.name);
  const rows = await readAiweMembers(env);
  const matched = rows.find((row) =>
    (memberNo && rowMatchesMemberNo(row, memberNo)) ||
    (lineUserId && memberLineUid(row).toLowerCase() === lineUserId.toLowerCase())
  );
  if (!matched) return { memberNo, lineUserId, name };
  return {
    memberNo: memberNo || aiweMemberNo(matched),
    lineUserId: lineUserId || memberLineUid(matched),
    name: name || publicAiweMember(matched).rosterName
  };
}

async function listPersonalMessagesApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const lineUserId = clean(url.searchParams.get("lineUserId"));
  if (!lineUserId) return json({ success: false, message: "Missing lineUserId" }, 400);
  const rows = await readAiweMembers(env);
  const lowerUid = lineUserId.toLowerCase();
  const matchedMembers = rows.filter((row) => memberLineUid(row).toLowerCase() === lowerUid);
  const memberNos = new Set(matchedMembers.map(aiweMemberNo).filter(Boolean));
  const messages = (await readPersonalMessages(env)).filter((item) => {
    if (item.status !== "active") return false;
    if (clean(item.recipientLineUserId).toLowerCase() === lowerUid) return true;
    return Boolean(item.recipientMemberNo && memberNos.has(clean(item.recipientMemberNo).toUpperCase()));
  });
  return json({ success: true, member: matchedMembers[0] ? publicAiweMember(matchedMembers[0]) : { lineUserId }, data: messages });
}

async function listPersonalMessagesAdminApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const memberNo = clean(url.searchParams.get("memberNo")).toUpperCase();
  const lineUserId = clean(url.searchParams.get("lineUserId")).toLowerCase();
  const messages = (await readPersonalMessages(env)).filter((item) => {
    if (memberNo && clean(item.recipientMemberNo).toUpperCase() !== memberNo) return false;
    if (lineUserId && clean(item.recipientLineUserId).toLowerCase() !== lineUserId) return false;
    return item.status !== "deleted";
  });
  return json({ success: true, data: messages });
}

async function createPersonalMessageApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const resolved = await resolvePersonalMessageRecipient(env, input);
  const normalized = normalizePersonalMessage({
    ...input,
    recipientMemberNo: resolved.memberNo,
    recipientLineUserId: resolved.lineUserId,
    recipientName: resolved.name,
    sender: adminEmailFromRequest(request) || firstClean(input.sender)
  });
  if (!normalized) return json({ success: false, message: "請輸入訊息內容或上傳附件。" }, 400);
  if (!normalized.recipientMemberNo && !normalized.recipientLineUserId) return json({ success: false, message: "缺少收件人會員編號或 LINE UID。" }, 400);
  const rows = await readPersonalMessages(env);
  rows.unshift(normalized);
  await writePersonalMessages(env, rows);
  const notice = {
    type: "template",
    altText: "TDEA 個人訊息",
    template: {
      type: "buttons",
      title: "TDEA 個人訊息",
      text: `你有一則新訊息：${normalized.subject}`.slice(0, 160),
      actions: [{ type: "uri", label: "查看訊息", uri: personalMessagesUrl() }]
    }
  };
  const pushResult = normalized.recipientLineUserId ? await pushToLine(normalized.recipientLineUserId, [notice], env) : null;
  return json({ success: true, data: normalized, messageUrl: personalMessagesUrl(), pushResult });
}

function safeUploadFileName(value: string) {
  return clean(value).replace(/[\\/:*?"<>|#%{}]/g, "_").slice(0, 120) || "file";
}

async function uploadPersonalMessageFileApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ success: false, message: "Missing file" }, 400);
  const memberNo = safeUploadFileName(clean(form?.get("memberNo") || "unknown").toUpperCase());
  const key = `personal-messages/files/${memberNo}/${Date.now()}-${crypto.randomUUID()}-${safeUploadFileName(file.name)}`;
  await env.ASSETS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream", cacheControl: "public, max-age=31536000" }
  });
  return json({
    success: true,
    data: {
      name: file.name || "附件",
      url: `${workerBaseUrl}/api/uploads/${key.split("/").map(encodeURIComponent).join("/")}`,
      type: file.type || "application/octet-stream",
      size: file.size
    }
  });
}

async function forwardToMotherWebhook(request: Request, env: Env, rawBody: string) {
  const target = clean(env.FORWARD_WEBHOOK_URL);
  if (!target) return json({ success: false, forwarded: false, message: "FORWARD_WEBHOOK_URL is not configured" }, 503);
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
      "x-line-signature": request.headers.get("x-line-signature") || "",
      "x-tdea-forwarded-by": "tdeawork"
    },
    body: rawBody
  });
  const body = await response.text().catch(() => "");
  return new Response(body || JSON.stringify({ success: response.ok, forwarded: true, status: response.status }), {
    status: response.status,
    headers: {
      ...headers,
      "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function forwardToMotherWebhookWithLog(request: Request, env: Env, rawBody: string) {
  const startedAt = Date.now();
  let texts: string[] = [];
  let eventCount = 0;
  try {
    const payload = JSON.parse(rawBody);
    const events = extractLineEvents(payload);
    eventCount = events.length;
    texts = events.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5);
  } catch (_) {}
  try {
    const response = await forwardToMotherWebhook(request, env, rawBody);
    await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "mother-forward",
      result: response.ok ? "ok" : "bad-status",
      status: response.status,
      durationMs: Date.now() - startedAt,
      hasSignature: Boolean(clean(request.headers.get("x-line-signature"))),
      texts,
      eventCount
    });
    if (response.ok && texts.some((text) => isMemberCheckinText(text))) {
      await syncAiweMembersFromMother(env, { pages: 20, perPage: 100, reason: "member-checkin-forward" }).then((sync) => appendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "mother-member-sync",
        result: sync.success ? "ok" : "failed",
        durationMs: Date.now() - startedAt,
        texts,
        eventCount,
        sync
      })).catch((syncError) => appendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "mother-member-sync",
        result: "error",
        durationMs: Date.now() - startedAt,
        texts,
        eventCount,
        error: syncError instanceof Error ? syncError.message : String(syncError)
      }));
    }
    return response;
  } catch (error) {
    await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "mother-forward",
      result: "error",
      durationMs: Date.now() - startedAt,
      hasSignature: Boolean(clean(request.headers.get("x-line-signature"))),
      texts,
      eventCount,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
function lineActivityDraftKey(lineUserId: string) {
  return `line-activity/draft-${encodeURIComponent(lineUserId)}.json`;
}

function lineUserIdFromEvent(event: LineEvent) {
  return firstClean(event.source?.userId, event.source?.groupId, event.source?.roomId, "global-line-activity-maker");
}

function isLineActivityStart(text: string) {
  const normalized = normalizeKeyword(text);
  return [lineActivityCreateKeyword, ...lineActivityCreateAliases].some((keyword) => normalized === normalizeKeyword(keyword));
}

function isLineActivityCancel(text: string) {
  return ["??", "??銝阮", "TDEA??撱箇?"].some((keyword) => normalizeKeyword(text) === normalizeKeyword(keyword));
}

function canUseLineActivityMaker(lineUserId: string, env: Env) {
  const allowed = clean(env.TDEA_ADMIN_LINE_USER_IDS)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return !allowed.length || allowed.includes(lineUserId);
}

function isLineImageMessage(event: LineEvent) {
  return event.message?.type === "image" && clean(event.message?.id);
}

function lineImageExtension(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

async function saveLineActivityImageFromLine(env: Env, draft: LineActivityDraft, messageId: string) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket is not configured");
  const token = clean(env.LINE_CHANNEL_ACCESS_TOKEN);
  if (!token) throw new Error("LINE channel access token is not configured");
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`LINE image download failed: ${response.status}`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const key = `line-activity/${draft.id}/${messageId}.${lineImageExtension(contentType)}`;
  const body = await response.arrayBuffer();
  await env.ASSETS_BUCKET.put(key, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000" }
  });
  return `${workerBaseUrl}/api/uploads/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function getUploadedFile(env: Env, key: string) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const normalizedKey = clean(key).replace(/^\/+/, "");
  if (!normalizedKey || normalizedKey.includes("..")) return json({ success: false, message: "Invalid upload key" }, 400);
  const object = await env.ASSETS_BUCKET.get(normalizedKey);
  if (!object) return json({ success: false, message: "Upload not found" }, 404);
  const responseHeaders = new Headers();
  object.writeHttpMetadata(responseHeaders);
  responseHeaders.set("etag", object.httpEtag);
  responseHeaders.set("cache-control", "public, max-age=31536000");
  responseHeaders.set("access-control-allow-origin", "*");
  return new Response(object.body, { headers: responseHeaders });
}

async function uploadGenericImageApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ success: false, message: "Missing image file" }, 400);
  if (!file.type.startsWith("image/")) return json({ success: false, message: "Only image files are supported" }, 400);
  const rawPurpose = clean(form?.get("purpose") || "uploads").toLowerCase();
  const purpose = ["monthly", "monthly-gallery", "marquee"].includes(rawPurpose) ? rawPurpose : "uploads";
  const activityId = safeUploadFileName(clean(form?.get("activityId") || "draft"));
  const key = `${purpose}/${activityId}/${Date.now()}-${crypto.randomUUID()}-${safeUploadFileName(file.name)}`;
  await env.ASSETS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream", cacheControl: "public, max-age=31536000" }
  });
  return json({ success: true, key, url: `${workerBaseUrl}/api/uploads/${key.split("/").map(encodeURIComponent).join("/")}` });
}

async function uploadMarqueeImageApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ success: false, message: "Missing image file" }, 400);
  if (!file.type.startsWith("image/")) return json({ success: false, message: "Only image files are supported" }, 400);
  const key = `marquee/${Date.now()}-${crypto.randomUUID()}-${safeUploadFileName(file.name)}`;
  await env.ASSETS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream", cacheControl: "public, max-age=31536000" }
  });
  return json({ success: true, key, url: `${workerBaseUrl}/api/uploads/${key.split("/").map(encodeURIComponent).join("/")}` });
}

async function readLineActivityDraft(env: Env, lineUserId: string): Promise<LineActivityDraft | null> {
  if (!env.ASSETS_BUCKET || !lineUserId) return null;
  const object = await env.ASSETS_BUCKET.get(lineActivityDraftKey(lineUserId));
  if (!object) return null;
  const data = await object.json().catch(() => null) as LineActivityDraft | null;
  return data && data.status === "active" ? data : null;
}

async function writeLineActivityDraft(env: Env, draft: LineActivityDraft) {
  if (!env.ASSETS_BUCKET) return;
  draft.updatedAt = new Date().toISOString();
  const body = JSON.stringify(draft, null, 2);
  await r2PutWithTimeout(env, lineActivityDraftKey(draft.lineUserId), body, 3000);
  await r2PutWithTimeout(env, lineActivityLatestDraftKey, body, 3000);
}

async function r2PutWithTimeout(env: Env, key: string, body: string, timeoutMs = 3000) {
  if (!env.ASSETS_BUCKET) return;
  await Promise.race([
    env.ASSETS_BUCKET.put(key, body, { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`R2 put timeout: ${key}`)), timeoutMs))
  ]);
}

async function appendCompletedLineActivityDraft(env: Env, draft: LineActivityDraft) {
  if (!env.ASSETS_BUCKET) return;
  const object = await env.ASSETS_BUCKET.get(lineActivityDraftListKey);
  const rows = object ? await object.json().catch(() => []) : [];
  const list = Array.isArray(rows) ? rows as LineActivityDraft[] : [];
  await env.ASSETS_BUCKET.put(lineActivityDraftListKey, JSON.stringify([draft, ...list].slice(0, 200), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function writeLineActivityDebug(env: Env, row: Record<string, unknown>) {
  if (!env.ASSETS_BUCKET) return;
  const object = await env.ASSETS_BUCKET.get(lineActivityDebugKey);
  const rows = object ? await object.json().catch(() => []) : [];
  const list = Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
  await env.ASSETS_BUCKET.put(lineActivityDebugKey, JSON.stringify([{ at: new Date().toISOString(), ...row }, ...list].slice(0, 50), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function queueLineActivityDebug(ctx: ExecutionContext | undefined, env: Env, row: Record<string, unknown>) {
  const task = writeLineActivityDebug(env, row).catch(() => undefined);
  if (ctx) ctx.waitUntil(task);
}

function queueLineActivityDraftWrite(ctx: ExecutionContext | undefined, env: Env, draft: LineActivityDraft, row: Record<string, unknown>) {
  const task = (async () => {
    await writeLineActivityDraft(env, draft);
    await writeLineActivityDebug(env, { stage: "started", ...row });
  })().catch((error) => writeLineActivityDebug(env, { stage: "start_write_failed", ...row, message: error instanceof Error ? error.message : String(error) }).catch(() => undefined));
  if (ctx) ctx.waitUntil(task);
}

async function readLatestLineActivityDraft(env: Env): Promise<LineActivityDraft | null> {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(lineActivityLatestDraftKey);
  if (!object) return null;
  const data = await object.json().catch(() => null) as LineActivityDraft | null;
  if (!data || data.status !== "active") return null;
  const updated = new Date(data.updatedAt || data.createdAt || "").getTime();
  if (!updated || Date.now() - updated > 2 * 60 * 60 * 1000) return null;
  return data;
}

function lineActivityQuestion(step: string): Record<string, unknown> {
  const quick = (items: string[]) => ({
    items: items.slice(0, 13).map((label) => ({ type: "action", action: { type: "message", label, text: label } }))
  });
  if (step === "posterUrl") return { type: "text", text: "請先上傳活動海報圖片，或貼上海報圖片網址。上傳完成後再選擇活動類型。" };
  if (step === "eventInfo") return { type: "text", text: "請貼上活動文案。可以一次包含活動名稱、時間、報名截止、名額、點數與報名方式，系統會整理成草稿。" };
  if (step === "name") return { type: "text", text: "請輸入活動名稱。", quickReply: quick(["取消"]) };
  if (step === "type") return { type: "text", text: "請選擇活動類型。", quickReply: quick(["講座類", "教學類", "聯誼類", "企業參訪", "年度會議"]) };
  if (step === "courseTime") return { type: "text", text: "請輸入活動時間。", quickReply: quick(["明天下午", "下週下午", "今天", "手動輸入"]) };
  if (step === "deadline") return { type: "text", text: "請選擇報名截止。", quickReply: quick(["活動前一天", "活動前三天", "活動前一週", "手動輸入"]) };
  if (step === "capacity") return { type: "text", text: "請選擇名額。", quickReply: quick(["不限", "20", "30", "50", "100"]) };
  if (step === "checkinPoints") return { type: "text", text: "請選擇簽到贈點。", quickReply: quick(["0", "50", "100", "200", "500"]) };
  if (step === "feePoints") return { type: "text", text: "請選擇報名扣點。", quickReply: quick(["0", "50", "100", "200", "500"]) };
  if (step === "registrationMode") return { type: "text", text: "請選擇報名方式。", quickReply: quick(["會員/廠商登入報名", "開放填表報名", "會員優先，非會員填表"]) };
  if (step === "status") return { type: "text", text: "請選擇活動狀態。", quickReply: quick(["上架", "下架"]) };
  if (step === "confirm") return { type: "text", text: "請確認是否建立活動草稿。", quickReply: quick(["建立草稿", "重新整理", "取消"]) };
  return { type: "text", text: "請回覆活動資料。" };
}

function nextLineActivityStep(step: string) {
  const index = lineActivitySteps.indexOf(step);
  return index >= 0 ? lineActivitySteps[Math.min(index + 1, lineActivitySteps.length - 1)] : "name";
}

function lineActivityDraftTemplate(draft: LineActivityDraft): Record<string, unknown> {
  const answers = draft.answers || {};
  const selectedType = firstClean(answers.type, "講座類 / 教學類 / 聯誼類 / 企業參訪 / 年度會議");
  const templateMode = selectedType.includes("企業參訪") ? "模式1：常見活動報名" : firstClean(answers.templateMode, "一般活動");
  const name = firstClean(answers.name);
  const detailText = firstClean(answers.detailText);
  const courseTime = firstClean(answers.courseTime);
  const deadline = firstClean(answers.deadline);
  const registrationStart = firstClean(answers.registrationStart);
  const registrationEnd = firstClean(answers.registrationEnd);
  const capacity = firstClean(answers.capacity, "0");
  const checkinPoints = firstClean(answers.checkinPoints, "0");
  const feePoints = firstClean(answers.feePoints, "0");
  const registrationMode = firstClean(answers.registrationMode, "會員/廠商登入報名");
  const status = firstClean(answers.status, "下架");
  return {
    type: "text",
    text: [
      "以下是活動草稿，請確認後回覆「建立草稿」。",
      "",
      `表單類型：${templateMode}`,
      `活動名稱：${name || "未填"}`,
      `活動類型：${selectedType}`,
      "活動說明：",
      detailText || "未填",
      "",
      `活動時間：${courseTime || "未填"}`,
      `報名開始：${registrationStart || "立即"}`,
      `報名截止：${deadline || registrationEnd || "未填"}`,
      `名額：${capacity}`,
      `簽到贈點：${checkinPoints}`,
      `報名扣點：${feePoints}`,
      `報名方式：${registrationMode}`,
      `狀態：${status}`
    ].join("\n")
  };
}

function lineActivityPromptForDraft(draft: LineActivityDraft): Record<string, unknown> {
  if (draft.step === "eventInfo") return lineActivityDraftTemplate(draft);
  return lineActivityQuestion(draft.step);
}

function lineActivityStepKey(step: string) {
  return step === "courseTime" ? "courseTime"
    : step === "registrationMode" ? "registrationMode"
      : step === "eventInfo" ? "eventInfo"
      : step;
}

function lineActivityRegistrationMode(value: string) {
  if (/line|login/i.test(value) || value.includes("會員/廠商")) return "member_login";
  if (value.includes("會員優先")) return "mixed";
  if (value.includes("開放") || value.includes("填表")) return "form";
  return "form";
}

const lineActivitySteps = ["posterUrl", "type", "eventInfo", "confirm"];
const lineActivityAnswerSteps = lineActivitySteps.filter((step) => step !== "confirm");

function lineActivityAnswerFilled(answers: Record<string, unknown>, key: string) {
  const value = answers[key];
  if (["capacity", "checkinPoints", "feePoints"].includes(key)) return value !== undefined && value !== null && clean(value) !== "" && Number.isFinite(Number(value));
  if (key === "eventInfo") return clean(answers.name) !== "" && clean(answers.detailText) !== "" && clean(answers.courseTime) !== "";
  return clean(value) !== "";
}

function lineActivityMissingStep(draft: LineActivityDraft) {
  const answers = draft.answers || {};
  return lineActivityAnswerSteps.find((step) => !lineActivityAnswerFilled(answers, lineActivityStepKey(step))) || "confirm";
}

function normalizeLineActivityField(key: string, value: unknown) {
  const text = clean(value);
  if (!text) return undefined;
  if (["capacity", "checkinPoints", "feePoints"].includes(key)) {
    const numeric = Number(text.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (key === "registrationMode") {
    const normalized = normalizeKeyword(text);
    if (normalized.includes("LINE") || normalized.includes("LOGIN") || text.includes("會員/廠商")) return "會員/廠商登入報名";
    if (text.includes("會員優先")) return "會員優先，非會員填表";
    return "開放填表報名";
  }
  if (key === "status") {
    if (text.includes("下架") || text.toLowerCase() === "off") return "下架";
    return "上架";
  }
  if (key === "templateMode") {
    if (text.includes("模式1") || text.includes("企業參訪")) return "mode1_vendor_visit";
    return "custom";
  }
  return text;
}

function lineActivityFieldKeys() {
  return ["templateMode", "name", "type", "courseTime", "deadline", "capacity", "checkinPoints", "feePoints", "registrationMode", "status", "detailText", "registrationStart", "registrationEnd"];
}

function mergeLineActivityAiFields(draft: LineActivityDraft, fields?: Record<string, unknown>) {
  if (!fields || typeof fields !== "object") return [];
  const changed: string[] = [];
  for (const key of lineActivityFieldKeys()) {
    if (!(key in fields)) continue;
    if (lineActivityAnswerFilled(draft.answers, key)) continue;
    const normalized = normalizeLineActivityField(key, fields[key]);
    if (normalized === undefined) continue;
    draft.answers[key] = normalized;
    changed.push(key);
  }
  return changed;
}

function applyLineActivityTextHeuristics(draft: LineActivityDraft, text: string) {
  const changed: string[] = [];
  if (!lineActivityAnswerFilled(draft.answers, "feePoints") && /(不扣點|免扣點|免費|無費用|不用點數)/.test(text)) {
    draft.answers.feePoints = 0;
    changed.push("feePoints");
  }
  if (!lineActivityAnswerFilled(draft.answers, "checkinPoints") && /(不贈點|免贈點|無贈點|簽到不給點|簽到沒有點數)/.test(text)) {
    draft.answers.checkinPoints = 0;
    changed.push("checkinPoints");
  }
  if (!lineActivityAnswerFilled(draft.answers, "capacity") && /(不限人數|無名額限制|不限制人數|名額不限)/.test(text)) {
    draft.answers.capacity = 0;
    changed.push("capacity");
  }
  return changed;
}

function shouldUseLineActivityAi(text: string, draft: LineActivityDraft) {
  if (draft.step === "eventInfo") return true;
  if (draft.step !== "name") return false;
  return text.includes("\n") || text.length >= 30 || /\d{4}[/-]\d{1,2}/.test(text);
}

function manualLineActivityAnswerValue(step: string, text: string) {
  const key = lineActivityStepKey(step);
  if (key === "deadline" && ["手動輸入", "手動"].includes(text)) return undefined;
  if (key === "courseTime" && ["手動輸入", "手動"].includes(text)) return undefined;
  if (key === "capacity" && ["不限", "不限名額"].includes(text)) return 0;
  if (key === "deadline") return text;
  if (["capacity", "checkinPoints", "feePoints"].includes(key)) {
    const numeric = Number(text.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return text;
}

function extractLineActivityDate(value: unknown) {
  const text = clean(value);
  const match = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatLineActivityDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function resolveLineActivityRelativeAnswer(step: string, text: string, draft: LineActivityDraft) {
  if (step !== "deadline") return manualLineActivityAnswerValue(step, text);
  const eventDate = extractLineActivityDate(draft.answers.courseTime);
  const days = text.includes("前一週") ? 7 : text.includes("前三天") ? 3 : text.includes("前一天") ? 1 : 0;
  if (days && eventDate) {
    const deadline = new Date(eventDate.getTime());
    deadline.setDate(deadline.getDate() - days);
    return formatLineActivityDate(deadline);
  }
  return manualLineActivityAnswerValue(step, text);
}

function displayLineActivityDeadline(draft: LineActivityDraft) {
  const value = firstClean(draft.answers.deadline);
  const resolved = resolveLineActivityRelativeAnswer("deadline", value, draft);
  return resolved === undefined ? value : String(resolved);
}

const lineActivityDraftFieldLabels = [
  "表單類型",
  "活動名稱",
  "活動類型",
  "活動說明",
  "活動時間",
  "報名開始",
  "報名截止",
  "報名結束",
  "名額",
  "簽到贈點",
  "報名扣點",
  "報名方式",
  "狀態"
];

function extractLineActivityLabeledValue(text: string, labels: string[], block = false) {
  const lines = text.split(/\r?\n/);
  const labelPattern = lineActivityDraftFieldLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const anyLabel = new RegExp(`^\\s*(?:${labelPattern})\\s*[:：]`);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || "";
    for (const label of labels) {
      const match = line.match(new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:：]\\s*(.*)$`));
      if (!match) continue;
      const first = clean(match[1]);
      if (!block) return first;
      const values = first ? [first] : [];
      for (let next = index + 1; next < lines.length; next += 1) {
        const candidate = lines[next] || "";
        if (anyLabel.test(candidate)) break;
        values.push(candidate);
      }
      return values.join("\n").trim();
    }
  }
  return "";
}

function setLineActivityDraftFieldFromLabel(draft: LineActivityDraft, changed: string[], key: string, rawValue: string) {
  if (!clean(rawValue)) return;
  const normalized = normalizeLineActivityField(key, rawValue);
  if (normalized === undefined) return;
  draft.answers[key] = normalized;
  changed.push(key);
}

function applyLineActivityEventInfoFallback(draft: LineActivityDraft, text: string) {
  const changed: string[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  setLineActivityDraftFieldFromLabel(draft, changed, "name", extractLineActivityLabeledValue(text, ["活動名稱"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "templateMode", extractLineActivityLabeledValue(text, ["表單類型"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "type", extractLineActivityLabeledValue(text, ["活動類型"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "detailText", extractLineActivityLabeledValue(text, ["活動說明"], true));
  setLineActivityDraftFieldFromLabel(draft, changed, "courseTime", extractLineActivityLabeledValue(text, ["活動時間"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "registrationStart", extractLineActivityLabeledValue(text, ["報名開始"]));
  const registrationEnd = extractLineActivityLabeledValue(text, ["報名截止", "報名結束"]);
  setLineActivityDraftFieldFromLabel(draft, changed, "deadline", registrationEnd);
  setLineActivityDraftFieldFromLabel(draft, changed, "registrationEnd", registrationEnd);
  setLineActivityDraftFieldFromLabel(draft, changed, "capacity", extractLineActivityLabeledValue(text, ["名額"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "checkinPoints", extractLineActivityLabeledValue(text, ["簽到贈點"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "feePoints", extractLineActivityLabeledValue(text, ["報名扣點"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "registrationMode", extractLineActivityLabeledValue(text, ["報名方式"]));
  setLineActivityDraftFieldFromLabel(draft, changed, "status", extractLineActivityLabeledValue(text, ["狀態"]));
  if (!lineActivityAnswerFilled(draft.answers, "name") && lines[0]) {
    draft.answers.name = lines[0].replace(/^(活動名稱)[:：\s]*/, "");
    changed.push("name");
  }
  if (!lineActivityAnswerFilled(draft.answers, "detailText") && text.trim()) {
    draft.answers.detailText = text.trim();
    changed.push("detailText");
  }
  if (!lineActivityAnswerFilled(draft.answers, "courseTime")) {
    const timeLine = lines.find((line) => /(活動時間|時間|\d{4}[/-]\d{1,2}[/-]\d{1,2})/.test(line));
    if (timeLine) {
      draft.answers.courseTime = timeLine.replace(/^(活動時間|時間)[:：\s]*/, "");
      changed.push("courseTime");
    }
  }
  if (!lineActivityAnswerFilled(draft.answers, "deadline")) {
    const deadlineLine = lines.find((line) => /(報名截止|截止)/.test(line));
    if (deadlineLine) {
      draft.answers.deadline = deadlineLine.replace(/^(報名截止|截止)[:：\s]*/, "");
      changed.push("deadline");
    }
  }
  return changed;
}

function lineActivityFreeTextQuestion(step: string): Record<string, unknown> {
  if (step === "eventInfo") return { type: "text", text: "請貼上完整活動文案，包含活動名稱、時間、報名截止、名額與報名方式。" };
  if (step === "courseTime") return { type: "text", text: "請輸入活動時間，例如：2026/06/04 14:00-16:00" };
  if (step === "deadline") return { type: "text", text: "請輸入報名截止日期，例如：2026/06/03" };
  return lineActivityQuestion(step);
}

function openAiOutputText(payload: unknown) {
  const data = payload as Record<string, unknown>;
  const direct = clean(data.output_text);
  if (direct) return direct;
  const output = Array.isArray(data.output) ? data.output as Array<Record<string, unknown>> : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : [];
    for (const part of content) {
      const text = clean(part.text);
      if (text) return text;
    }
  }
  return "";
}

async function extractLineActivityWithOpenAI(text: string, draft: LineActivityDraft, env: Env): Promise<LineActivityAiResult | null> {
  const apiKey = clean(env.OPENAI_API_KEY);
  if (!apiKey) return null;
  const model = clean(env.OPENAI_MODEL) || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "你是 TDEA 活動建立助手，只協助從訊息中抽取活動設定。",
                "只能輸出符合 schema 的 JSON，不要輸出說明文字。",
                "可抽取欄位：templateMode, name, type, detailText, courseTime, deadline, registrationStart, registrationEnd, capacity, checkinPoints, feePoints, registrationMode, status。",
                "活動類型請盡量正規化為：講座類、教學類、聯誼類、企業參訪、年度會議。",
                "registrationMode 請使用：會員/廠商登入報名、開放填表報名、會員優先，非會員填表。",
                "status 請使用：上架 或 下架。",
                "intent 請使用 activity_create、confirm、cancel、irrelevant。"
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                currentDraft: draft.answers || {},
                currentStep: draft.step,
                message: text
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tdea_activity_extract",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              intent: { type: "string", enum: ["activity_create", "confirm", "cancel", "irrelevant"] },
              confidence: { type: "number" },
              question: { type: "string" },
              fields: {
                type: "object",
                additionalProperties: false,
                properties: {
                  templateMode: { type: "string" },
                  name: { type: "string" },
                  type: { type: "string" },
                  courseTime: { type: "string" },
                  deadline: { type: "string" },
                  registrationStart: { type: "string" },
                  registrationEnd: { type: "string" },
                  capacity: { type: "string" },
                  checkinPoints: { type: "string" },
                  feePoints: { type: "string" },
                  registrationMode: { type: "string" },
                  status: { type: "string" },
                  detailText: { type: "string" }
                },
                required: ["templateMode", "name", "type", "courseTime", "deadline", "registrationStart", "registrationEnd", "capacity", "checkinPoints", "feePoints", "registrationMode", "status", "detailText"]
              }
            },
            required: ["intent", "confidence", "question", "fields"]
          }
        }
      }
    })
  });
  const bodyText = await response.text();
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${bodyText.slice(0, 300)}`);
  const payload = JSON.parse(bodyText);
  const output = openAiOutputText(payload);
  if (!output) return null;
  return JSON.parse(output) as LineActivityAiResult;
}

function buildLineActivityFromDraft(draft: LineActivityDraft) {
  const answers = draft.answers || {};
  const now = new Date();
  const id = `LINE-${now.getTime()}-${codeToken(4)}`;
  const name = firstClean(answers.name, "LINE 建立活動");
  const type = firstClean(answers.type, "講座類");
  const templateMode = firstClean(answers.templateMode) || (type.includes("企業參訪") ? "mode1_vendor_visit" : "custom");
  return {
    id,
    activityNo: `ACT-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${codeToken(3)}`,
    name,
    templateMode,
    type,
    typeLabel: type,
    courseTime: firstClean(answers.courseTime),
    deadline: displayLineActivityDeadline(draft),
    registrationStart: firstClean(answers.registrationStart),
    registrationEnd: firstClean(answers.registrationEnd),
    detailText: firstClean(answers.detailText, answers.eventInfo),
    capacity: Number(answers.capacity || 0),
    checkinPoints: Number(answers.checkinPoints || 0),
    feePoints: Number(answers.feePoints || 0),
    registrationMode: lineActivityRegistrationMode(firstClean(answers.registrationMode, "開放填表報名")),
    reg: 0,
    check: 0,
    status: firstClean(answers.status, "下架"),
    imageUrl: firstClean(answers.posterUrl),
    posterUrl: firstClean(answers.posterUrl),
    formUrl: "",
    lineDraftId: draft.id,
    lineCreatedBy: draft.lineUserId,
    createdAt: now.toISOString()
  };
}

function lineActivityConfirmMessage(draft: LineActivityDraft): Record<string, unknown> {
  const answers = draft.answers || {};
  const quick = (items: string[]) => ({
    items: items.slice(0, 13).map((label) => ({ type: "action", action: { type: "message", label, text: label } }))
  });
  return {
    type: "text",
    text: [
      "請確認活動草稿：",
      "",
      `活動名稱：${firstClean(answers.name)}`,
      `活動類型：${firstClean(answers.type)}`,
      `活動時間：${firstClean(answers.courseTime)}`,
      `報名截止：${displayLineActivityDeadline(draft)}`,
      `名額：${firstClean(answers.capacity)}`,
      `簽到贈點：${firstClean(answers.checkinPoints)}`,
      `報名扣點：${firstClean(answers.feePoints)}`,
      `報名方式：${firstClean(answers.registrationMode)}`,
      `狀態：${firstClean(answers.status)}`,
      "",
      "請選擇是否建立草稿。"
    ].join("\n"),
    quickReply: quick(["建立草稿", "重新整理", "取消"])
  };
}

function lineActivitySummary(activity: Record<string, unknown>) {
  return [
    "活動草稿已建立，可回後台匯入。",
    "",
    `活動名稱：${activity.name || ""}`,
    `活動類型：${activity.typeLabel || activity.type || ""}`,
    `活動時間：${activity.courseTime || ""}`,
    `報名截止：${activity.deadline || ""}`,
    `名額：${activity.capacity || 0}`,
    `報名方式：${activity.registrationMode || "form"}`,
    `狀態：${activity.status || "下架"}`,
    "",
    `後台：${publicAppUrl}`
  ].join("\n");
}

async function handleLineActivityMakerEvent(event: LineEvent, env: Env, ctx?: ExecutionContext): Promise<Record<string, unknown> | null> {
  const text = clean(extractTriggerText(event));
  const lineUserId = lineUserIdFromEvent(event);
  const isImage = isLineImageMessage(event);
  try {
    if ((!text && !isImage) || !lineUserId) return null;
    const starts = isLineActivityStart(text);
    let draft = starts ? null : await readLineActivityDraft(env, lineUserId);
    queueLineActivityDebug(ctx, env, { stage: "event", text, lineUserId, starts, hasDraft: Boolean(draft), step: draft?.step || "" });
    if (!starts && !draft) return null;
    if (!canUseLineActivityMaker(lineUserId, env)) {
      queueLineActivityDebug(ctx, env, { stage: "blocked", text, lineUserId, reason: "not_allowed" });
      return { type: "text", text: "此 LINE 帳號沒有建立活動權限。" };
    }
    if (!env.ASSETS_BUCKET) return { type: "text", text: "活動建立功能暫不可用：R2 尚未設定。" };
    if (starts || (draft && normalizeKeyword(text) === normalizeKeyword("重新整理"))) {
      draft = { id: crypto.randomUUID(), lineUserId, step: "posterUrl", answers: {}, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      queueLineActivityDebug(ctx, env, { stage: "start_before_write", text, lineUserId, draftId: draft.id });
      queueLineActivityDraftWrite(ctx, env, draft, { text, lineUserId, draftId: draft.id });
      queueLineActivityDebug(ctx, env, { stage: "start_reply_queued", text, lineUserId, draftId: draft.id });
      return lineActivityQuestion("posterUrl");
    }
    if (!draft) return null;
    if (isImage) {
      const messageId = clean(event.message?.id);
      if (!messageId) return { type: "text", text: "圖片沒有 message id，請重新上傳一次。" };
      const imageUrl = await saveLineActivityImageFromLine(env, draft, messageId);
      draft.answers.posterUrl = imageUrl;
      if (draft.step === "posterUrl") draft.step = lineActivityMissingStep(draft);
      await writeLineActivityDraft(env, draft);
      await writeLineActivityDebug(env, { stage: "image_saved", lineUserId, draftId: draft.id, imageUrl, nextStep: draft.step });
      return draft.step === "confirm" ? lineActivityConfirmMessage(draft) : lineActivityPromptForDraft(draft);
    }
    if (isLineActivityCancel(text)) {
      draft.status = "cancelled";
      await writeLineActivityDraft(env, draft);
      await writeLineActivityDebug(env, { stage: "cancelled", text, lineUserId, draftId: draft.id });
      return { type: "text", text: "已取消建立活動流程。" };
    }
    if (["capacity", "checkinPoints", "feePoints", "registrationMode", "status", "name", "courseTime", "deadline"].includes(draft.step)) {
      draft.step = "eventInfo";
    }
    if (draft.step === "confirm") {
      if (normalizeKeyword(text) !== normalizeKeyword("建立草稿")) return lineActivityConfirmMessage(draft);
      const activity = buildLineActivityFromDraft(draft);
      draft.status = "completed";
      draft.activity = activity;
      draft.completedAt = new Date().toISOString();
      await writeLineActivityDraft(env, draft);
      await appendCompletedLineActivityDraft(env, draft);
      await writeLineActivityDebug(env, { stage: "completed", text, lineUserId, draftId: draft.id, activity });
      return { type: "text", text: lineActivitySummary(activity) };
    }
    if (draft.step === "posterUrl") return lineActivityQuestion("posterUrl");
    const requiredStep = lineActivityMissingStep(draft);
    if (["name", "courseTime"].includes(draft.step) && requiredStep !== draft.step && requiredStep !== "confirm") {
      draft.step = requiredStep;
      await writeLineActivityDraft(env, draft);
      await writeLineActivityDebug(env, { stage: "migrated_to_required_step", text, lineUserId, draftId: draft.id, nextStep: requiredStep });
      return lineActivityPromptForDraft(draft);
    }
    let changed: string[] = [];
    if (clean(env.OPENAI_API_KEY) && shouldUseLineActivityAi(text, draft)) {
      try {
        const ai = await extractLineActivityWithOpenAI(text, draft, env);
        if (ai?.intent === "cancel") {
          draft.status = "cancelled";
          await writeLineActivityDraft(env, draft);
          await writeLineActivityDebug(env, { stage: "ai_cancelled", text, lineUserId, draftId: draft.id, ai });
          return { type: "text", text: "已取消建立活動流程。" };
        }
        changed = mergeLineActivityAiFields(draft, ai?.fields);
        if (draft.step === "eventInfo") changed.push(...applyLineActivityEventInfoFallback(draft, text));
        changed.push(...applyLineActivityTextHeuristics(draft, text));
        await writeLineActivityDebug(env, { stage: "ai_extract", text, lineUserId, draftId: draft.id, changed, ai });
      } catch (error) {
        await writeLineActivityDebug(env, { stage: "ai_error", text, lineUserId, draftId: draft.id, message: error instanceof Error ? error.message : String(error) });
      }
    }
    if (draft.step === "eventInfo" && !changed.length) changed.push(...applyLineActivityEventInfoFallback(draft, text));
  if (!changed.length) {
    const key = lineActivityStepKey(draft.step);
    const manualValue = resolveLineActivityRelativeAnswer(draft.step, text, draft);
    if (manualValue === undefined) return lineActivityFreeTextQuestion(draft.step);
    draft.answers[key] = manualValue;
    draft.step = nextLineActivityStep(draft.step);
  } else {
      draft.step = lineActivityMissingStep(draft);
    }
    await writeLineActivityDraft(env, draft);
    await writeLineActivityDebug(env, { stage: "advanced", text, lineUserId, draftId: draft.id, nextStep: draft.step, answers: draft.answers });
    return draft.step === "confirm" ? lineActivityConfirmMessage(draft) : lineActivityPromptForDraft(draft);
  } catch (error) {
    await writeLineActivityDebug(env, { stage: "fatal", text, lineUserId, message: error instanceof Error ? error.message : String(error) });
    return { type: "text", text: `建立活動時發生錯誤：${error instanceof Error ? error.message : String(error)}` };
  }
}

async function handleLineActivityMaker(request: Request, env: Env, rawBody: string, allEvents: LineEvent[], ctx?: ExecutionContext) {
  const candidates = allEvents.filter((event) => {
    const text = clean(extractTriggerText(event));
    if (isMonthlyActivityKeyword(text)) return false;
    return (text || isLineImageMessage(event)) && lineUserIdFromEvent(event);
  });
  if (!candidates.length) return null;
  const relevant = [] as LineEvent[];
  for (const event of candidates) {
    const text = clean(extractTriggerText(event));
    if (isLineActivityStart(text) || isLineImageMessage(event) || await readLineActivityDraft(env, lineUserIdFromEvent(event))) relevant.push(event);
  }
  if (!relevant.length) return null;
  const signature = request.headers.get("x-line-signature");
  if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) return new Response("Invalid Signature", { status: 403, headers });
  const messages = [] as Array<{ event: LineEvent; message: Record<string, unknown> }>;
  let handled = 0;
  for (const event of relevant) {
    const text = clean(extractTriggerText(event));
    const lineUserId = lineUserIdFromEvent(event);
    const starts = isLineActivityStart(text);
    const draft = !starts ? await readLineActivityDraft(env, lineUserId) : null;
    if (!starts && draft && event.source?.userId) {
      handled += 1;
      if (clean(env.OPENAI_API_KEY) && shouldUseLineActivityAi(text, draft) && event.replyToken) messages.push({ event, message: { type: "text", text: "?渡?銝哨?蝔????渡?蝯?..." } });
      const task = (async () => {
        const finalMessage = await handleLineActivityMakerEvent(event, env, ctx);
        if (!finalMessage) return;
        const result = await pushToLine(event.source?.userId || lineUserId, [finalMessage], env);
        await writeLineActivityDebug(env, { stage: "line_push_result", text, lineUserId, draftId: draft.id, result });
      })().catch((error) => writeLineActivityDebug(env, { stage: "line_push_failed", text, lineUserId, draftId: draft.id, message: error instanceof Error ? error.message : String(error) }).catch(() => undefined));
      if (ctx) ctx.waitUntil(task);
      else await task;
      if (!messages.some((item) => item.event === event)) queueLineActivityDebug(ctx, env, { stage: "line_push_only", text, lineUserId, draftId: draft.id });
      continue;
    }
    const message = await handleLineActivityMakerEvent(event, env, ctx);
    if (message) {
      handled += 1;
      messages.push({ event, message });
    }
  }
  if (!messages.length && handled) return json({ success: true, mode: "line-activity-maker", matched: [lineActivityCreateKeyword], forwarded: false, lineReplies: [] });
  if (!messages.length) return null;
  const lineReplies = await Promise.all(messages.map(({ event, message }) => event.replyToken ? replyToLine(event.replyToken, [message], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
  queueLineActivityDebug(ctx, env, { stage: "line_reply_results", count: lineReplies.length, results: lineReplies });
  return json({ success: true, mode: "line-activity-maker", matched: [lineActivityCreateKeyword], forwarded: false, lineReplies });
}

async function listLineActivityDrafts(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const object = await env.ASSETS_BUCKET.get(lineActivityDraftListKey);
  const rows = object ? await object.json().catch(() => []) : [];
  const list = Array.isArray(rows) ? rows as LineActivityDraft[] : [];
  const latest = await readLatestLineActivityDraft(env);
  const merged = latest ? [latest, ...list.filter((item) => item.id !== latest.id)] : list;
  return json({ success: true, data: merged.map((item) => ({ ...item, activity: item.activity || buildLineActivityFromDraft(item) })) });
}

async function deleteLineActivityDraft(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const url = new URL(request.url);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const keys = new Set(
    [
      input.id,
      input.lineDraftId,
      input.activityId,
      input.activityNo,
      input.name,
      url.searchParams.get("id"),
      url.searchParams.get("lineDraftId"),
      url.searchParams.get("activityId"),
      url.searchParams.get("activityNo"),
      url.searchParams.get("name"),
      ...(Array.isArray(input.keys) ? input.keys : [])
    ].map((value) => clean(value)).filter(Boolean)
  );
  if (!keys.size) return json({ success: false, message: "Missing activity key" }, 400);
  const object = await env.ASSETS_BUCKET.get(lineActivityDraftListKey);
  const rows = object ? await object.json().catch(() => []) : [];
  const list = Array.isArray(rows) ? rows as LineActivityDraft[] : [];
  const removed: LineActivityDraft[] = [];
  const kept = list.filter((item) => {
    const activity = item.activity || {};
    const candidates = [
      item.id,
      item.lineUserId,
      activity.id,
      activity.lineDraftId,
      activity.activityNo,
      activity.name
    ].map((value) => clean(value)).filter(Boolean);
    const matched = candidates.some((value) => keys.has(value));
    if (matched) removed.push(item);
    return !matched;
  });
  if (removed.length) {
    await env.ASSETS_BUCKET.put(lineActivityDraftListKey, JSON.stringify(kept, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
    await Promise.allSettled(removed.map((item) => env.ASSETS_BUCKET!.delete(lineActivityDraftKey(item.lineUserId))));
  }
  return json({ success: true, deleted: removed.length });
}

async function getLineActivityDebug(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const object = await env.ASSETS_BUCKET.get(lineActivityDebugKey);
  const rows = object ? await object.json().catch(() => []) : [];
  return json({ success: true, openaiConfigured: Boolean(clean(env.OPENAI_API_KEY)), openaiModel: clean(env.OPENAI_MODEL) || "gpt-4o-mini", data: Array.isArray(rows) ? rows : [] });
}

async function testLineActivityAi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const input = request.method === "POST" ? await request.json().catch(() => ({})) as Record<string, unknown> : {};
  const text = firstClean(input.text, url.searchParams.get("text"), "蝡臬???嚗?026/06/10 14:00-17:00嚗? 2026/06/05嚗?憿?0嚗隤潮?嚗??塚?蝪賢韐?100嚗????嚗INE?敹怠");
  const draft: LineActivityDraft = { id: "ai-check", lineUserId: "ai-check", step: "name", answers: {}, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  try {
    const result = await extractLineActivityWithOpenAI(text, draft, env);
    const changed = mergeLineActivityAiFields(draft, result?.fields);
    changed.push(...applyLineActivityTextHeuristics(draft, text));
    draft.step = lineActivityMissingStep(draft);
    return json({ success: true, openaiConfigured: Boolean(clean(env.OPENAI_API_KEY)), openaiModel: clean(env.OPENAI_MODEL) || "gpt-4o-mini", input: text, changed, nextStep: draft.step, normalized: draft.answers, data: result });
  } catch (error) {
    return json({ success: false, openaiConfigured: Boolean(clean(env.OPENAI_API_KEY)), message: error instanceof Error ? error.message : String(error) }, 500);
  }
}

async function readAiweMembers(env: Env): Promise<Array<Record<string, unknown>>> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(aiweMembersKey);
  const rows = object ? await object.json().catch(() => []) : [];
  return Array.isArray(rows) ? rows.map(asRecord) : [];
}

async function writeAiweMembers(env: Env, rows: Array<Record<string, unknown>>) {
  if (!env.ASSETS_BUCKET) return false;
  await env.ASSETS_BUCKET.put(aiweMembersKey, JSON.stringify(rows, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
  return true;
}

function publicAiweMember(row: Record<string, unknown>) {
  const rosterType = clean(row.rosterType) === "vendor" ? "vendor" : "association";
  return {
    rosterType,
    rosterMemberNo: firstClean(row.rosterMemberNo, row.memberNo, row.user_login),
    memberNo: firstClean(row.memberNo, row.rosterMemberNo, row.user_login),
    rosterName: firstClean(row.rosterName, row.name, row.display_name, row.user_nicename, row.companyName),
    companyName: firstClean(row.companyName, row.company, row.organization, row.unit),
    lineUserId: memberLineUid(row),
    phone: firstClean(row.phone, row.mobile, row.tel, row.telephone, row.contactPhone, row.billing_phone, row.shipping_phone, row.phone_number, row.mobile_number, row.user_phone, row["手機"], row["手機號碼"], row["行動電話"], row["電話"]),
    email: firstClean(row.email, row.user_email),
    qualification: firstClean(row.qualification, row.memberQualification, row.status)
  };
}

function collectNestedValues(input: unknown, wantedKeys: string[], depth = 0): string[] {
  if (!input || depth > 4) return [];
  const wanted = new Set(wantedKeys.map((key) => key.toLowerCase()));
  const values: string[] = [];
  if (Array.isArray(input)) {
    for (const item of input.slice(0, 50)) values.push(...collectNestedValues(item, wantedKeys, depth + 1));
    return values;
  }
  if (typeof input !== "object") return [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (wanted.has(key.toLowerCase())) values.push(clean(value));
    if (value && typeof value === "object") values.push(...collectNestedValues(value, wantedKeys, depth + 1));
  }
  return values.filter(Boolean);
}

function wpUserField(user: Record<string, unknown>, keys: string[]) {
  return firstClean(...collectNestedValues(user, keys));
}

function normalizePhoneFromWpUser(user: Record<string, unknown>) {
  const direct = wpUserField(user, ["phone", "mobile", "tel", "telephone", "contactPhone", "billing_phone", "shipping_phone", "phone_number", "mobile_number", "user_phone", "手機", "手機號碼", "行動電話", "電話"]);
  if (direct) return direct;
  const match = JSON.stringify(user).match(/09\d{8}/);
  return match ? match[0] : "";
}

function normalizeWpUserToAiweMember(user: Record<string, unknown>, sourceUrl: string) {
  const raw = JSON.stringify(user);
  const displayName = firstClean(user.name, user.display_name, user.nickname, user.user_nicename, user.slug, user.username, user.user_login);
  const memberNo = firstClean(wpUserField(user, ["memberNo", "member_no", "rosterMemberNo", "aiweMemberNo", "motherMemberNo", "會員編號", "會員代號"]), raw.match(/[A-Z]\d{7}/i)?.[0], displayName.match(/[A-Z]\d{7}/i)?.[0]).toUpperCase();
  const lineUserId = firstClean(lineUidFromText(raw), user.slug, user.username, user.user_login);
  const email = firstClean(user.email, user.user_email, wpUserField(user, ["email", "user_email", "電子郵件"]));
  const companyName = wpUserField(user, ["companyName", "company", "organization", "unit", "公司", "公司名稱", "單位"]);
  const roles = Array.isArray(user.roles) ? user.roles.map(clean).join(",") : clean(user.roles);
  return normalizeRosterSyncMember({
    source: "wp-rest-users",
    rosterType: roles.includes("vendor") || companyName ? "vendor" : "association",
    wpUserId: Number(user.id || 0) || undefined,
    user_login: firstClean(user.user_login, user.slug, user.username),
    lineUserId,
    LINE_user_id: lineUserId,
    email,
    memberNo,
    rosterMemberNo: memberNo,
    name: displayName.replace(/[A-Z]\d{7}/i, "").trim() || displayName,
    rosterName: displayName.replace(/[A-Z]\d{7}/i, "").trim() || displayName,
    companyName,
    phone: normalizePhoneFromWpUser(user),
    qualification: firstClean(wpUserField(user, ["qualification", "memberQualification", "會員資格"]), "Y"),
    sourceUrl,
    importedAt: new Date().toISOString()
  });
}

async function fetchMotherWpUsers(env: Env, page: number, perPage: number, search = "") {
  const user = clean(env.AIWE_WP_USER);
  const password = clean(env.AIWE_WP_APP_PASSWORD);
  if (!user || !password) throw new Error("AIWE_WP_USER or AIWE_WP_APP_PASSWORD is not configured");
  const url = new URL("https://aiwe.cc/index.php/wp-json/wp/v2/users");
  url.searchParams.set("context", "edit");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  if (search) url.searchParams.set("search", search);
  const response = await fetch(url.href, {
    headers: {
      authorization: `Basic ${btoa(`${user}:${password}`)}`,
      accept: "application/json"
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === "object" ? JSON.stringify(body) : `WordPress users HTTP ${response.status}`);
  if (!Array.isArray(body)) throw new Error("WordPress users API did not return an array");
  return {
    rows: body.map(asRecord),
    total: Number(response.headers.get("x-wp-total") || body.length || 0),
    totalPages: Number(response.headers.get("x-wp-totalpages") || 1),
    sourceUrl: url.href
  };
}

async function syncAiweMembersFromMother(env: Env, options: { startPage?: number; pages?: number; perPage?: number; search?: string; reason?: string } = {}) {
  if (!env.ASSETS_BUCKET) return { success: false, message: "R2 bucket is not configured" };
  const startPage = Math.max(1, Number(options.startPage || 1));
  const pages = Math.min(20, Math.max(1, Number(options.pages || 3)));
  const perPage = Math.min(100, Math.max(1, Number(options.perPage || 100)));
  const search = clean(options.search);
  const rows = await readAiweMembers(env);
  const fetched: Array<Record<string, unknown>> = [];
  let total = 0;
  let totalPages = 0;
  for (let offset = 0; offset < pages; offset += 1) {
    const page = startPage + offset;
    const result = await fetchMotherWpUsers(env, page, perPage, search);
    total = result.total || total;
    totalPages = result.totalPages || totalPages;
    fetched.push(...result.rows.map((row) => normalizeWpUserToAiweMember(row, result.sourceUrl)));
    if (!result.rows.length || page >= result.totalPages) break;
  }
  const report = upsertAiweMemberRows(rows, fetched);
  await writeAiweMembers(env, rows);
  const crm = await readManagerData(env).then((data) => ({ merged: true, aiweUidMergedAt: clean((data as Record<string, unknown>)?.aiweUidMergedAt), aiweUidMergeReport: (data as Record<string, unknown>)?.aiweUidMergeReport || null })).catch((error) => ({ merged: false, message: error instanceof Error ? error.message : String(error) }));
  const withUid = fetched.filter((row) => explicitMemberLineUid(row)).length;
  const withPhone = fetched.filter((row) => phoneDigits(firstClean(row.phone, row.mobile, row.tel, row.telephone, row.contactPhone))).length;
  return { success: true, source: "wp-rest-users", reason: clean(options.reason), fetched: fetched.length, withUid, withPhone, total, totalPages, ...report, cachedTotal: rows.length, crm };
}

async function syncAiweMembersFromMotherApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const result = await syncAiweMembersFromMother(env, {
    startPage: Number(url.searchParams.get("start") || 1),
    pages: Number(url.searchParams.get("pages") || 3),
    perPage: Number(url.searchParams.get("per_page") || 100),
    search: clean(url.searchParams.get("search")),
    reason: "admin-api"
  });
  return json(result, result.success ? 200 : 503);
}
function richMenuSnapshot(config: RichMenuConfig): RichMenuSnapshot {
  const normalized = normalizeRichMenuConfig(config);
  const snapshotConfig: Omit<RichMenuConfig, "snapshots" | "deployments"> = {
    name: normalized.name,
    chatBarText: normalized.chatBarText,
    selected: normalized.selected,
    size: normalized.size,
    imageUrl: normalized.imageUrl,
    areas: normalized.areas,
    lastRichMenuId: normalized.lastRichMenuId,
    updatedAt: normalized.updatedAt
  };
  return {
    id: `RMS-${Date.now()}-${codeToken(4)}`,
    savedAt: new Date().toISOString(),
    name: clean(normalized.name),
    chatBarText: clean(normalized.chatBarText),
    areaCount: normalized.areas?.length || 0,
    imageUrl: clean(normalized.imageUrl),
    config: snapshotConfig
  };
}

function normalizedMemberClaim(input: Record<string, unknown>) {
  return {
    memberNo: firstClean(input.memberNo, input.member_no, input["會員編號"], input["會員編號:"], input["會員編號："]).toUpperCase(),
    name: firstClean(input.name, input.memberName, input["姓名"], input["姓名:"], input["姓名："])
  };
}

function isMemberAnswer(value: unknown) {
  const text = clean(Array.isArray(value) ? value.join(",") : value).toLowerCase();
  return ["y", "yes", "true", "1", "會員", "是", "協會會員", "廠商會員"].some((item) => text.includes(item.toLowerCase()));
}

function answersClaimMember(answers: Record<string, unknown>) {
  return isMemberAnswer(firstClean(answers.isMember, answers.memberType, answers["是否為會員"], answers["會員資格"]));
}

async function resolveAndBindClaimedMember(env: Env, lineUserId: string, answers: Record<string, unknown>): Promise<LineLoginMember | null> {
  const uid = clean(lineUserId);
  if (!uid || !answersClaimMember(answers)) return null;
  const claim = normalizedMemberClaim(answers);
  if (!claim.memberNo || !claim.name) return null;
  const rows = await readAiweMembers(env);
  const matched = rows.filter((row) => rowMatchesMemberNo(row, claim.memberNo));
  if (!matched.length) return null;
  const nameKey = clean(claim.name);
  const exact = matched.find((row) => {
    const rosterType = clean(row.rosterType) === "vendor" ? "vendor" : "association";
    const rowName = rosterType === "vendor"
      ? firstClean(row.rosterName, row.companyName, row.name, row.display_name)
      : firstClean(row.rosterName, row.name, row.display_name, row.user_nicename);
    return clean(rowName) === nameKey;
  });
  if (!exact) return null;
  const currentUid = memberLineUid(exact);
  if (currentUid && currentUid.toLowerCase() !== uid.toLowerCase()) throw new Error("此會員編號已綁定其他 LINE UID，請由後台確認後再變更。");
  for (const row of matched) setAiweRowLineUid(row, uid);
  await writeAiweMembers(env, rows);
  await syncBoundMemberPoints(env, uid);
  return resolveLineLoginMember(env, uid);
}

async function listAiweMembersPublicApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const rows = await readAiweMembers(env);
  return json({ success: true, data: rows.map(publicAiweMember), total: rows.length });
}

function normalizeRosterSyncMember(input: Record<string, unknown>, fallbackType = "association") {
  const rosterType = clean(input.rosterType || fallbackType) === "vendor" ? "vendor" : "association";
  const memberNo = firstClean(input.rosterMemberNo, input.memberNo, input.member_no, input.user_login).toUpperCase();
  const name = rosterType === "vendor"
    ? firstClean(input.rosterName, input.companyName, input.company, input.name)
    : firstClean(input.rosterName, input.name, input.display_name);
  return {
    ...input,
    rosterType,
    rosterMemberNo: memberNo,
    memberNo,
    rosterName: name,
    name,
    companyName: firstClean(input.companyName, input.company, rosterType === "vendor" ? name : ""),
    phone: firstClean(input.phone, input.mobile, input.tel, input.telephone, input.contactPhone, input.billing_phone, input.shipping_phone, input.phone_number, input.mobile_number, input.user_phone, input["手機"], input["手機號碼"], input["行動電話"], input["電話"]),
    email: firstClean(input.email, input.user_email),
    qualification: firstClean(input.qualification, input.memberQualification, input.status, "Y"),
    lineUserId: firstClean(input.lineUserId, input.LINE_user_id, input.uid),
    updatedAt: new Date().toISOString()
  };
}

function upsertAiweMemberRows(rows: Array<Record<string, unknown>>, incoming: Array<Record<string, unknown>>) {
  let inserted = 0;
  let updated = 0;
  for (const raw of incoming) {
    const next = normalizeRosterSyncMember(raw, clean(raw.rosterType) || "association");
    const memberNo = clean(next.rosterMemberNo || next.memberNo).toUpperCase();
    if (!memberNo && !clean(next.rosterName || next.name)) continue;
    const type = clean(next.rosterType) === "vendor" ? "vendor" : "association";
    const row = rows.find((item) => {
      const itemType = clean(item.rosterType) === "vendor" ? "vendor" : "association";
      return itemType === type && rowMatchesMemberNo(item, memberNo);
    });
    if (row) {
      for (const [key, value] of Object.entries(next)) {
        if (["lineUserId", "LINE_user_id", "uid"].includes(key) && !clean(value)) continue;
        if (clean(value) || !clean(row[key])) row[key] = value;
      }
      updated += 1;
    } else {
      rows.unshift({ id: `crm-${type}-${memberNo || crypto.randomUUID()}`, ...next, createdAt: new Date().toISOString() });
      inserted += 1;
    }
  }
  return { inserted, updated };
}

async function importAiweMembersApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const list = Array.isArray(input.members)
    ? input.members.map(asRecord)
    : Array.isArray(input.data)
      ? input.data.map(asRecord)
      : [asRecord(input.member || input)];
  const rows = await readAiweMembers(env);
  const report = upsertAiweMemberRows(rows, list);
  await writeAiweMembers(env, rows);
  return json({ success: true, ...report, total: rows.length });
}

function isMemberCheckinText(text: string) {
  const normalized = normalizeKeyword(text);
  const keywords = memberCheckinAliases.map(normalizeKeyword);
  return keywords.some((keyword) => normalized === keyword || normalized.startsWith(keyword))
    || (normalized.includes("會員") && (normalized.includes("報到") || normalized.includes("打卡") || normalized.includes("簽到")));
}

function parseUidBindKeyword(text: string) {
  const raw = clean(text);
  const normalized = normalizeKeyword(raw);
  if (normalized === uidBindKeyword) return { active: true, memberNo: "" };
  if (!normalized.startsWith(uidBindKeyword)) return { active: false, memberNo: "" };
  const suffix = raw.replace(/^UID\s*[+＋:：]?\s*/i, "").trim();
  return suffix ? { active: true, memberNo: clean(suffix).toUpperCase() } : { active: false, memberNo: "" };
}

function parseMemberCheckinKeyword(text: string) {
  const raw = clean(text);
  const normalized = normalizeKeyword(raw);
  const keyword = memberCheckinAliases.map(normalizeKeyword).find((item) => normalized === item || normalized.startsWith(item));
  if (!keyword) return { active: false, memberNo: "", name: "" };
  if (normalized === keyword) return { active: true, memberNo: "", name: "" };
  const suffix = raw.replace(/^\s*會員\s*(報到|打卡|簽到)\s*[+＋:：]?\s*/i, "").trim();
  if (!suffix) return { active: true, memberNo: "", name: "" };
  const parts = suffix.split(/[+＋,，\s/／]+/).map(clean).filter(Boolean);
  const memberNoPart = parts.find((part) => /[A-Za-z]/.test(part) && /\d/.test(part) && /^[A-Za-z][A-Za-z0-9-]{3,}$/.test(part));
  const memberNo = clean(memberNoPart).toUpperCase();
  const name = parts.filter((part) => part !== memberNoPart).join("");
  return { active: true, memberNo, name };
}

function aiweMemberNo(row: Record<string, unknown>) {
  return firstClean(row.rosterMemberNo, row.memberNo, row.user_login).toUpperCase();
}

function rowMatchesMemberNo(row: Record<string, unknown>, memberNo: string) {
  const target = clean(memberNo).toUpperCase();
  return Boolean(target) && [row.rosterMemberNo, row.memberNo, row.user_login].some((value) => clean(value).toUpperCase() === target);
}

function normalizedNameForMatch(value: unknown) {
  return clean(value).replace(/\s+/g, "").toLowerCase();
}

function rowMatchesMemberName(row: Record<string, unknown>, name: string) {
  const target = normalizedNameForMatch(name);
  if (!target) return false;
  const member = publicAiweMember(row);
  return [
    aiweRowDisplayName(row),
    member.rosterName,
    member.companyName,
    row.rosterName,
    row.name,
    row.display_name,
    row.user_nicename,
    row.companyName,
    row.company,
    row.organization,
    row.unit
  ].some((value) => normalizedNameForMatch(value) === target);
}

function selectAiweBindRows(rows: Array<Record<string, unknown>>, memberNo: string) {
  const target = clean(memberNo).toUpperCase();
  if (!target) return [];
  const bothExact = rows.filter((row) =>
    clean(row.rosterMemberNo).toUpperCase() === target &&
    clean(row.memberNo).toUpperCase() === target
  );
  if (bothExact.length) return bothExact.slice(0, 1);
  const rosterExact = rows.filter((row) => clean(row.rosterMemberNo).toUpperCase() === target);
  if (rosterExact.length) return rosterExact.slice(0, 1);
  const memberExact = rows.filter((row) => clean(row.memberNo).toUpperCase() === target);
  if (memberExact.length) return memberExact.slice(0, 1);
  const loginExact = rows.filter((row) => clean(row.user_login).toUpperCase() === target);
  return loginExact.slice(0, 1);
}

function setAiweRowLineUid(row: Record<string, unknown>, lineUserId: string) {
  row.lineUserId = lineUserId;
  row.LINE_user_id = lineUserId;
  row.uid = lineUserId;
  if (isSyntheticLineEmail(row.email)) row.email = "";
}

async function upsertBoundMemberToManagerCrm(env: Env, sourceRow: Record<string, unknown>, lineUserId: string) {
  if (!env.ASSETS_BUCKET) return { written: false, reason: "r2-not-configured" };
  const raw = await readManagerDataRaw(env) || {};
  const type = clean(sourceRow.rosterType) === "vendor" ? "vendor" : "association";
  const rows = Array.isArray(raw[type]) ? [...raw[type] as Array<Record<string, unknown>>] : [];
  const member = publicAiweMember(sourceRow);
  const memberNo = firstClean(member.rosterMemberNo, member.memberNo, aiweMemberNo(sourceRow)).toUpperCase();
  const index = rows.findIndex((row) => rowMatchesMemberNo(row, memberNo));
  const existing = index >= 0 ? rows[index] : {};
  const name = type === "vendor"
    ? firstClean(existing.name, existing.companyName, member.companyName, member.rosterName)
    : firstClean(existing.name, member.rosterName);
  const next: Record<string, unknown> = {
    ...existing,
    id: clean(existing.id) || `crm-${type}-${memberNo || crypto.randomUUID()}`,
    memberNo: firstClean(existing.memberNo, memberNo),
    rosterMemberNo: firstClean(existing.rosterMemberNo, memberNo),
    aiweMemberNo: firstClean(existing.aiweMemberNo, member.memberNo, member.rosterMemberNo, memberNo),
    lineUserId,
    LINE_user_id: lineUserId,
    uid: lineUserId,
    name,
    phone: firstClean(existing.phone, member.phone),
    email: isSyntheticLineEmail(firstClean(existing.email, member.email)) ? "" : firstClean(existing.email, member.email),
    qualification: firstClean(existing.qualification, member.qualification, "Y"),
    updatedAt: new Date().toISOString(),
    syncSource: "member-checkin"
  };
  if (type === "vendor") next.companyName = firstClean(existing.companyName, member.companyName, name);
  else next.company = firstClean(existing.company, member.companyName);
  if (index >= 0) rows[index] = next;
  else rows.unshift(next);
  raw[type] = rows;
  await writeManagerData(env, raw, "member-checkin");
  return { written: true, type, memberNo, inserted: index < 0 };
}

async function verifyAndBindMemberCheckin(env: Env, lineUserId: string, memberNo: string, memberName: string) {
  const uid = clean(lineUserId);
  const normalizedMemberNo = clean(memberNo).toUpperCase();
  const rows = await readAiweMembers(env);
  const matched = selectAiweBindRows(rows, normalizedMemberNo);
  if (!matched.length) return { success: false, reason: "member-not-found", memberNo: normalizedMemberNo };
  const requiredName = clean(memberName);
  const verified = requiredName ? matched.filter((row) => rowMatchesMemberName(row, requiredName)) : matched;
  if (!verified.length) return { success: false, reason: "name-mismatch", memberNo: normalizedMemberNo };
  const currentUid = memberLineUid(verified[0]);
  if (validLineUid(currentUid) && currentUid.toLowerCase() !== uid.toLowerCase()) return { success: false, reason: "uid-conflict", memberNo: normalizedMemberNo };
  for (const row of verified) setAiweRowLineUid(row, uid);
  await writeAiweMembers(env, rows);
  const crm = await upsertBoundMemberToManagerCrm(env, verified[0], uid);
  return { success: true, memberNo: normalizedMemberNo, name: aiweRowDisplayName(verified[0]), updated: verified.length, crm };
}

function inferUidBindMemberNo(rows: Array<Record<string, unknown>>, lineUserId: string, env: Env) {
  const lowerUid = clean(lineUserId).toLowerCase();
  const uidMatched = rows.filter((row) => memberLineUid(row).toLowerCase() === lowerUid);
  const uidMemberNos = Array.from(new Set(uidMatched.map(aiweMemberNo).filter(Boolean)));
  if (uidMemberNos.length === 1) return { memberNo: uidMemberNos[0], reason: "uid" };
  return { memberNo: "", reason: "" };
}

async function bindLineUidEvents(events: LineEvent[], env: Env) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const rows = await readAiweMembers(env);
  const replies = [];
  const results = [];
  for (const event of events) {
    const lineUserId = clean(event.source?.userId);
    const parsed = parseUidBindKeyword(extractTriggerText(event));
    if (!lineUserId) {
      const message = { type: "text", text: "系統尚未取得你的 LINE UID，請從 LINE 官方帳號聊天室重新觸發會員報到。" };
      replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });
      results.push({ success: false, message: message.text });
      continue;
    }
    const inferred = parsed.memberNo
      ? { memberNo: parsed.memberNo, reason: "input" }
      : normalizeKeyword(extractTriggerText(event)) === uidBindKeyword
        ? inferUidBindMemberNo(rows, lineUserId, env)
        : { memberNo: "", reason: "" };
    if (!inferred.memberNo) {
      const message = {
        type: "text",
        text: "請輸入你的會員編號完成 LINE 綁定。\n格式：會員報到+會員編號\n範例：會員報到+A1090001",
        quickReply: quickReply([fixedKeyword, "取消"])
      };
      replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });
      results.push({ success: false, lineUserId, message: "missing-member-no" });
      continue;
    }
    const matched = selectAiweBindRows(rows, inferred.memberNo);
    if (!matched.length) {
      const message = { type: "text", text: `已取得你的 LINE UID：${lineUserId}\n但查無會員編號 ${inferred.memberNo}，請確認會員編號是否正確。` };
      replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });
      results.push({ success: false, lineUserId, memberNo: inferred.memberNo, message: "member-not-found" });
      continue;
    }
    for (const row of matched) setAiweRowLineUid(row, lineUserId);
    const pointSync = await syncBoundMemberPoints(env, lineUserId) as Record<string, unknown>;
    const pointText = pointSync.success === true ? `\n目前點數：${numberValue(pointSync.balance)} 點` : "\n點數同步：稍後可在後台重新同步";
    const message = { type: "text", text: `UID 已綁定。\n會員編號：${inferred.memberNo}\nLINE UID：${lineUserId}\n更新筆數：${matched.length}${pointText}` };
    replies.push(event.replyToken ? await replyToLine(event.replyToken, [message], env) : { ok: false, status: 400, message: "Missing replyToken" });
    results.push({ success: true, lineUserId, memberNo: inferred.memberNo, updated: matched.length, reason: inferred.reason, pointSync });
  }
  await writeAiweMembers(env, rows);
  return json({ success: true, mode: "uid-bind", results, lineReplies: replies });
}

function lineUidFromText(value: unknown) {
  const match = String(value || "").match(/U[0-9a-f]{32}/i);
  return match ? match[0] : "";
}

function memberLineUid(row: Record<string, unknown>) {
  return firstClean(
    lineUidFromText(row.lineUserId),
    lineUidFromText(row.LINE_user_id),
    lineUidFromText(row.uid),
    lineUidFromText(row.lineUid),
    lineUidFromText(row.line_user_id),
    lineUidFromText(JSON.stringify(row))
  );
}

function explicitMemberLineUid(row: Record<string, unknown>) {
  return firstClean(row.lineUserId, row.LINE_user_id, row.uid);
}

function quickReply(items: string[]) {
  return {
    items: items.slice(0, 13).map((label) => ({
      type: "action",
      action: { type: "message", label, text: label }
    }))
  };
}

function memberOnboardingSessionKey(lineUserId: string) {
  return `member-onboarding/session-${encodeURIComponent(lineUserId)}.json`;
}

const memberOnboardingMemorySessions = new Map<string, MemberOnboardingSession>();

async function readMemberOnboardingSession(env: Env, lineUserId: string): Promise<MemberOnboardingSession | null> {
  if (!lineUserId) return null;
  const memorySession = memberOnboardingMemorySessions.get(lineUserId);
  if (memorySession) return memorySession;
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(memberOnboardingSessionKey(lineUserId));
  const session = object ? await object.json().catch(() => null) as MemberOnboardingSession | null : null;
  if (session) memberOnboardingMemorySessions.set(lineUserId, session);
  return session;
}

async function writeMemberOnboardingSession(env: Env, session: MemberOnboardingSession) {
  session.updatedAt = new Date().toISOString();
  memberOnboardingMemorySessions.set(session.lineUserId, { ...session, answers: { ...session.answers } });
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(memberOnboardingSessionKey(session.lineUserId), JSON.stringify(session, null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

function queueMemberOnboardingSessionWrite(env: Env, session: MemberOnboardingSession, ctx: ExecutionContext | undefined, meta: Record<string, unknown>) {
  memberOnboardingMemorySessions.set(session.lineUserId, { ...session, answers: { ...session.answers } });
  const task = writeMemberOnboardingSession(env, session).then(
    () => safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-onboarding-session", result: "written", lineUserId: session.lineUserId, step: session.step, ...meta }),
    (error) => safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-onboarding-session", result: "write-failed", lineUserId: session.lineUserId, step: session.step, error: error instanceof Error ? error.message : String(error), ...meta })
  );
  if (ctx) ctx.waitUntil(task);
  else task.catch(() => null);
}

async function deleteMemberOnboardingSession(env: Env, lineUserId: string) {
  if (!lineUserId) return;
  memberOnboardingMemorySessions.delete(lineUserId);
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.delete(memberOnboardingSessionKey(lineUserId));
}

function yesNoIntent(text: string) {
  const normalized = normalizeKeyword(text);
  if (["是", "YES", "Y", "我是", "本協會會員", "會員", "廠商會員"].includes(normalized)) return "yes";
  if (["否", "NO", "N", "不是", "非會員", "其他"].includes(normalized)) return "no";
  if (["有", "有興趣", "我要加入", "想加入", "申請加入"].includes(normalized)) return "interested";
  if (["不用", "暫時不用", "沒有", "沒興趣"].includes(normalized)) return "decline";
  return "";
}

function phoneDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function rowMatchesPhone(row: Record<string, unknown>, phone: string) {
  const target = phoneDigits(phone);
  if (!target) return false;
  return [row.phone, row.mobile, row.tel, row.telephone, row.contactPhone, row.billing_phone, row.shipping_phone, row.phone_number, row.mobile_number, row.user_phone, row["手機"], row["手機號碼"], row["行動電話"], row["電話"]].some((value) => {
    const current = phoneDigits(value);
    return Boolean(current) && (current === target || current.endsWith(target) || target.endsWith(current));
  });
}

function parseApplicantInfo(text: string) {
  const parts = clean(text).split(/[+＋,，\s/／]+/).map(clean).filter(Boolean);
  const phone = parts.find((item) => phoneDigits(item).length >= 8) || "";
  const name = parts.find((item) => item !== phone) || "";
  return { name, phone };
}

async function readMemberApplications(env: Env): Promise<MemberApplication[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(memberApplicationListKey);
  const data = object ? await object.json().catch(() => []) : [];
  return Array.isArray(data) ? data as MemberApplication[] : [];
}

async function writeMemberApplications(env: Env, list: MemberApplication[]) {
  if (!env.ASSETS_BUCKET) return;
  await env.ASSETS_BUCKET.put(memberApplicationListKey, JSON.stringify(list.slice(0, 500), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function appendMemberApplication(env: Env, input: { lineUserId: string; name?: string; phone?: string; triggerText?: string }) {
  const now = new Date().toISOString();
  const list = await readMemberApplications(env);
  const existing = list.find((item) => item.status === "pending" && item.lineUserId === input.lineUserId);
  if (existing) {
    existing.name = input.name || existing.name;
    existing.phone = input.phone || existing.phone;
    existing.triggerText = input.triggerText || existing.triggerText;
    existing.updatedAt = now;
  } else {
    list.unshift({ id: crypto.randomUUID(), lineUserId: input.lineUserId, status: "pending", source: "line", name: input.name || "", phone: input.phone || "", triggerText: input.triggerText || "", createdAt: now });
  }
  await writeMemberApplications(env, list);
}

async function listMemberApplicationsApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const url = new URL(request.url);
  const status = clean(url.searchParams.get("status"));
  let list = await readMemberApplications(env);
  if (status) list = list.filter((item) => item.status === status);
  return json({ success: true, data: list });
}

function membershipQuestionMessage() {
  return {
    type: "text",
    text: "系統需要先確認身分。\n請問你是本協會會員或廠商會員嗎？",
    quickReply: quickReply(["是", "否"])
  };
}

async function startMemberOnboarding(env: Env, event: LineEvent, triggerText: string, preset?: { memberNo?: string }, ctx?: ExecutionContext) {
  const lineUserId = clean(event.source?.userId);
  if (!lineUserId || !event.replyToken) return { ok: false, status: 400, message: "Missing LINE UID or replyToken" };
  const now = new Date().toISOString();
  const presetMemberNo = clean(preset?.memberNo).toUpperCase();
  const session: MemberOnboardingSession = {
    lineUserId,
    step: "name",
    answers: presetMemberNo ? { memberNo: presetMemberNo } : {},
    triggerText,
    createdAt: now,
    updatedAt: now
  };
  await writeMemberOnboardingSession(env, session);
  const sessionLogTask = safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-onboarding-session", result: "written-before-reply", lineUserId, step: session.step, text: triggerText, source: "start" });
  if (ctx) ctx.waitUntil(sessionLogTask);
  else await sessionLogTask;
  const reply = await replyToLine(event.replyToken, [{
    type: "text",
    text: presetMemberNo ? "請輸入姓名，用來核對身分。" : "請先輸入姓名。"
  }], env);
  return { ...reply, sessionWrite: "written-before-reply" };
}

async function handleMemberOnboardingEvent(event: LineEvent, env: Env, ctx?: ExecutionContext): Promise<Record<string, unknown> | null> {
  const lineUserId = clean(event.source?.userId);
  const text = clean(extractTriggerText(event));
  if (!lineUserId || !event.replyToken || !text) return null;
  let session = await readMemberOnboardingSession(env, lineUserId);
  if (!session) return null;
  if (normalizeKeyword(text) === "取消") {
    await deleteMemberOnboardingSession(env, lineUserId);
    return replyToLine(event.replyToken, [{ type: "text", text: "已取消身分確認流程。" }], env) as unknown as Record<string, unknown>;
  }
  const intent = yesNoIntent(text);
  if (session.step === "askMember") {
    if (intent === "yes") {
      session.step = "memberNo";
      queueMemberOnboardingSessionWrite(env, session, ctx, { text, source: "askMember-yes" });
      return replyToLine(event.replyToken, [{ type: "text", text: "請輸入會員編號。", quickReply: quickReply(["取消"]) }], env) as unknown as Record<string, unknown>;
    }
    if (intent === "no") {
      session.step = "joinInterest";
      await writeMemberOnboardingSession(env, session);
      return replyToLine(event.replyToken, [{ type: "text", text: "歡迎加入 TDEA。\n請問你是否有加入協會或成為廠商會員的意願？", quickReply: quickReply(["有興趣", "暫時不用"]) }], env) as unknown as Record<string, unknown>;
    }
    return replyToLine(event.replyToken, [membershipQuestionMessage()], env) as unknown as Record<string, unknown>;
  }
  if (session.step === "name") {
    session.answers.name = text;
    session.step = "memberNo";
    await writeMemberOnboardingSession(env, session);
    const sessionLogTask = safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-onboarding-session", result: "written-before-reply", lineUserId, step: session.step, text, source: "name" });
    if (ctx) ctx.waitUntil(sessionLogTask);
    else await sessionLogTask;
    return replyToLine(event.replyToken, [{ type: "text", text: "請輸入會員編號。" }], env) as unknown as Record<string, unknown>;
  }
  if (session.step === "memberNo") {
    if (intent === "no") {
      session.step = "joinInterest";
      await writeMemberOnboardingSession(env, session);
      return replyToLine(event.replyToken, [{ type: "text", text: "歡迎加入 TDEA。\n請問你是否有加入協會或成為廠商會員的意願？", quickReply: quickReply(["有興趣", "暫時不用"]) }], env) as unknown as Record<string, unknown>;
    }
    const memberNo = clean(text).toUpperCase();
    const result = await verifyAndBindMemberCheckin(env, lineUserId, memberNo, clean(session.answers.name));
    if (!result.success && result.reason === "member-not-found") {
      await deleteMemberOnboardingSession(env, lineUserId);
      return replyToLine(event.replyToken, [{ type: "text", text: `查無會員編號 ${memberNo}，請確認後重新點「會員報到」。` }], env) as unknown as Record<string, unknown>;
    }
    if (!result.success && result.reason === "name-mismatch") {
      return replyToLine(event.replyToken, [{ type: "text", text: "會員編號與姓名不一致，請重新輸入會員編號，或輸入「取消」中止。" }], env) as unknown as Record<string, unknown>;
    }
    if (!result.success && result.reason === "uid-conflict") {
      await deleteMemberOnboardingSession(env, lineUserId);
      return replyToLine(event.replyToken, [{ type: "text", text: "此會員編號已綁定其他 LINE 帳號，請聯絡協會後台確認。" }], env) as unknown as Record<string, unknown>;
    }
    await deleteMemberOnboardingSession(env, lineUserId);
    const bound = result as { memberNo: string; name: string; updated: number; crm?: Record<string, unknown> };
    const pointTask = syncBoundMemberPoints(env, lineUserId)
      .then((pointSync) => safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-checkin-point-sync", result: "ok", lineUserId, memberNo: bound.memberNo, balance: numberValue((pointSync as Record<string, unknown>).balance) }))
      .catch((error) => safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-checkin-point-sync", result: "error", lineUserId, memberNo: bound.memberNo, error: error instanceof Error ? error.message : String(error) }));
    if (ctx) ctx.waitUntil(pointTask);
    else pointTask.catch(() => null);
    return replyToLine(event.replyToken, [{ type: "text", text: `身分已確認並完成 LINE 綁定，已寫入子站 CRM。\n會員編號：${bound.memberNo}\n姓名/單位：${bound.name}\n更新筆數：${bound.updated}\n點數將於背景同步，稍後可在會員資料查看。\n之後可直接使用活動報名與會員功能。` }], env) as unknown as Record<string, unknown>;
  }
  if (session.step === "joinInterest") {
    if (intent === "interested") {
      session.step = "applicantInfo";
      await writeMemberOnboardingSession(env, session);
      return replyToLine(event.replyToken, [{ type: "text", text: "請留下姓名與行動電話。\n格式：姓名+手機\n例如：王小明+0912345678", quickReply: quickReply(["取消"]) }], env) as unknown as Record<string, unknown>;
    }
    if (intent === "decline") {
      await deleteMemberOnboardingSession(env, lineUserId);
      return replyToLine(event.replyToken, [{ type: "text", text: "了解，歡迎持續關注 TDEA 活動資訊。" }], env) as unknown as Record<string, unknown>;
    }
    return replyToLine(event.replyToken, [{ type: "text", text: "請選擇是否有加入意願。", quickReply: quickReply(["有興趣", "暫時不用"]) }], env) as unknown as Record<string, unknown>;
  }
  if (session.step === "applicantInfo") {
    const info = parseApplicantInfo(text);
    if (!info.name || !info.phone) {
      return replyToLine(event.replyToken, [{ type: "text", text: "請用「姓名+手機」格式留下資料。\n例如：王小明+0912345678", quickReply: quickReply(["取消"]) }], env) as unknown as Record<string, unknown>;
    }
    await appendMemberApplication(env, { lineUserId, name: info.name, phone: info.phone, triggerText: session.triggerText });
    await deleteMemberOnboardingSession(env, lineUserId);
    return replyToLine(event.replyToken, [{ type: "text", text: "已收到你的加入意願，協會後台會看到申請通知，後續將由協會人員聯繫。" }], env) as unknown as Record<string, unknown>;
  }
  return null;
}

async function hasMemberOnboardingSession(events: LineEvent[], env: Env) {
  for (const event of events) {
    const lineUserId = clean(event.source?.userId);
    if (lineUserId && await readMemberOnboardingSession(env, lineUserId)) return true;
  }
  return false;
}

async function handleMemberCheckinEvents(events: LineEvent[], env: Env, ctx?: ExecutionContext) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const replies = [];
  const results = [];
  for (const event of events) {
    const lineUserId = clean(event.source?.userId);
    const text = clean(extractTriggerText(event));
    const parsed = parseMemberCheckinKeyword(text);
    if (!event.replyToken) {
      results.push({ success: false, lineUserId, text, message: "missing-reply-token" });
      continue;
    }
    if (!lineUserId) {
      const message = { type: "text", text: "系統尚未取得你的 LINE UID，請從 LINE 官方帳號聊天室重新點「會員報到」。" };
      replies.push(await replyToLine(event.replyToken, [message], env));
      results.push({ success: false, text, message: "missing-line-user" });
      continue;
    }
    if (parsed.memberNo && parsed.name) {
      await deleteMemberOnboardingSession(env, lineUserId);
      const result = await verifyAndBindMemberCheckin(env, lineUserId, parsed.memberNo, parsed.name);
      if (!result.success && result.reason === "member-not-found") {
        replies.push(await replyToLine(event.replyToken, [{ type: "text", text: `查無會員編號 ${parsed.memberNo}，請確認後重新輸入。\n格式：會員報到+姓名+會員編號` }], env));
        results.push({ success: false, lineUserId, text, memberNo: parsed.memberNo, name: parsed.name, message: "member-not-found" });
        continue;
      }
      if (!result.success && result.reason === "name-mismatch") {
        replies.push(await replyToLine(event.replyToken, [{ type: "text", text: "會員姓名與會員編號不一致，請確認後重新輸入。\n格式：會員報到+姓名+會員編號\n範例：會員報到+王小明+A1090001" }], env));
        results.push({ success: false, lineUserId, text, memberNo: parsed.memberNo, name: parsed.name, message: "name-mismatch" });
        continue;
      }
      if (!result.success && result.reason === "uid-conflict") {
        replies.push(await replyToLine(event.replyToken, [{ type: "text", text: "此會員編號已綁定其他 LINE 帳號，請聯絡協會後台確認。" }], env));
        results.push({ success: false, lineUserId, text, memberNo: parsed.memberNo, name: parsed.name, message: "uid-conflict" });
        continue;
      }
      if (!result.success) {
        replies.push(await replyToLine(event.replyToken, [{ type: "text", text: "會員報到失敗，請確認姓名與會員編號後重新輸入。\n格式：會員報到+姓名+會員編號" }], env));
        results.push({ success: false, lineUserId, text, memberNo: parsed.memberNo, name: parsed.name, message: result.reason || "bind-failed" });
        continue;
      }
      const bound = result as { memberNo: string; name: string; updated: number; crm?: Record<string, unknown> };
      const pointTask = syncBoundMemberPoints(env, lineUserId)
        .then((pointSync) => safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-checkin-point-sync", result: "ok", lineUserId, memberNo: bound.memberNo, balance: numberValue((pointSync as Record<string, unknown>).balance) }))
        .catch((error) => safeAppendLineWebhookLog(env, { at: new Date().toISOString(), mode: "member-checkin-point-sync", result: "error", lineUserId, memberNo: bound.memberNo, error: error instanceof Error ? error.message : String(error) }));
      if (ctx) ctx.waitUntil(pointTask);
      else pointTask.catch(() => null);
      replies.push(await replyToLine(event.replyToken, [{ type: "text", text: `身分已確認並完成 LINE 綁定，已寫入子站 CRM。\n會員編號：${bound.memberNo}\n姓名/單位：${bound.name}\n更新筆數：${bound.updated}\n點數將於背景同步，稍後可在會員資料查看。\n之後可直接使用活動報名與會員功能。` }], env));
      results.push({ success: true, lineUserId, text, memberNo: bound.memberNo, name: bound.name, message: "bound-direct-member-checkin" });
      continue;
    }
    await deleteMemberOnboardingSession(env, lineUserId);
    replies.push(await replyToLine(event.replyToken, [{ type: "text", text: "請輸入姓名與會員編號完成 LINE 綁定。\n格式：會員報到+姓名+會員編號\n範例：會員報到+王小明+A1090001" }], env));
    results.push({ success: false, lineUserId, text, memberNo: parsed.memberNo, name: parsed.name, message: "prompted-name-and-member-no-format" });
  }
  const logTask = safeAppendLineWebhookLog(env, {
    at: new Date().toISOString(),
    mode: "member-checkin",
    result: "prompted",
    texts: events.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
    eventCount: events.length,
    results,
    lineReplies: replies
  });
  if (ctx) ctx.waitUntil(logTask);
  else await logTask;
  return json({ success: true, mode: "member-checkin", results, lineReplies: replies });
}
async function handleClosedMemberGate(allEvents: LineEvent[], gatedEvents: LineEvent[], env: Env, ctx?: ExecutionContext) {
  for (const event of allEvents) {
    const handled = await handleMemberOnboardingEvent(event, env, ctx);
    if (handled) return handled;
  }
  for (const event of gatedEvents) {
    const lineUserId = clean(event.source?.userId);
    if (!event.replyToken) continue;
    if (!lineUserId) {
      const message = {
        type: "text",
        text: "系統尚未取得你的 LINE UID，請從 LINE 官方帳號聊天室重新操作。"
      };
      return replyToLine(event.replyToken, [message], env);
    }
    const member = await resolveLineLoginMember(env, lineUserId);
    if (member) continue;
    return startMemberOnboarding(env, event, extractTriggerText(event));
  }
  return null;
}

async function monthlyMemberStatusPrompt(event: LineEvent, env: Env): Promise<Record<string, unknown> | null> {
  const lineUserId = clean(event.source?.userId);
  if (!lineUserId) return {
    type: "text",
    text: "系統尚未取得你的 LINE UID。若你是會員，請先點「會員報到」完成綁定。",
    quickReply: quickReply(["會員報到", fixedKeyword])
  };
  const rows = await readAiweMembers(env);
  const lowerUid = lineUserId.toLowerCase();
  const matched = rows.find((row) => explicitMemberLineUid(row).toLowerCase() === lowerUid);
  if (matched) return null;
  return {
    type: "text",
    text: "若你是 TDEA 會員或廠商會員，請先點「會員報到」完成 LINE 綁定。完成後以後活動就能快速報名。",
    quickReply: quickReply(["會員報到", fixedKeyword, queryKeyword])
  };
}

function manualLineUids(value: unknown) {
  return Array.from(new Set(String(value || "").match(/U[0-9a-f]{32}/gi) || []));
}

function pushTargetMatches(row: Record<string, unknown>, target: PushTarget) {
  const kind = clean(target.kind || "known");
  const rosterType = clean(row.rosterType);
  const qualification = firstClean(row.qualification, row.memberQualification, row.status);
  const memberNo = firstClean(row.rosterMemberNo, row.memberNo).toUpperCase();
  if (kind === "association") return rosterType === "association";
  if (kind === "vendor") return rosterType === "vendor";
  if (kind === "qualified") return qualification.toUpperCase() === "Y";
  if (kind === "memberPrefix") return Boolean(target.memberNoPrefix && memberNo.startsWith(clean(target.memberNoPrefix).toUpperCase()));
  return true;
}

async function resolvePushRecipients(env: Env, target: PushTarget) {
  const kind = clean(target.kind || "known");
  if (kind === "broadcast") return { mode: "broadcast", recipients: [] as string[], totalKnown: 0 };
  const members = await readAiweMembers(env);
  const manual = manualLineUids(target.manualUids);
  if (kind === "manual") return { mode: "multicast", recipients: manual, totalKnown: members.length };
  const fromMembers = members.filter((row) => pushTargetMatches(row, target)).map(memberLineUid).filter(Boolean);
  const recipients = Array.from(new Set([...fromMembers, ...manual]));
  return { mode: "multicast", recipients, totalKnown: members.length };
}

function buildPushMessages(input: Record<string, unknown>) {
  const messageType = clean(input.messageType || "text");
  if (messageType === "flex") {
    const altText = firstClean(input.altText, input.title, "TDEA 訊息");
    const raw = firstClean(input.flexJson, input.contents);
    const parsed = raw ? JSON.parse(raw) : asRecord(input.flexContents || input.contents);
    const contents = parsed.type === "flex" ? parsed.contents : parsed;
    if (!contents || typeof contents !== "object" || !clean((contents as Record<string, unknown>).type)) throw new Error("Flex JSON 缺少 contents/type");
    return [{ type: "flex", altText, contents } as Record<string, unknown>];
  }
  const title = clean(input.title);
  const text = clean(input.text || input.body);
  if (!text) throw new Error("請輸入推播文字內容");
  return [{ type: "text", text: title ? `${title}\n\n${text}` : text }];
}

async function sendLineApi(env: Env, path: string, payload: Record<string, unknown>) {
  const token = clean(env.LINE_CHANNEL_ACCESS_TOKEN);
  if (!token) return { ok: false, status: 503, body: "LINE_CHANNEL_ACCESS_TOKEN is not configured" };
  const response = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-line-retry-key": crypto.randomUUID()
    },
    body: JSON.stringify(payload)
  });
  return { ok: response.ok, status: response.status, body: await response.text().catch(() => "") };
}

async function readPushLogs(env: Env): Promise<PushLog[]> {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(pushLogKey);
  const rows = object ? await object.json().catch(() => []) : [];
  return Array.isArray(rows) ? rows as PushLog[] : [];
}

async function appendPushLog(env: Env, log: PushLog) {
  if (!env.ASSETS_BUCKET) return;
  const rows = await readPushLogs(env);
  await env.ASSETS_BUCKET.put(pushLogKey, JSON.stringify([log, ...rows].slice(0, 300), null, 2), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}

async function getPushSegments(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const members = await readAiweMembers(env);
  const counts = {
    known: members.map(memberLineUid).filter(Boolean).length,
    association: members.filter((row) => pushTargetMatches(row, { kind: "association" })).map(memberLineUid).filter(Boolean).length,
    vendor: members.filter((row) => pushTargetMatches(row, { kind: "vendor" })).map(memberLineUid).filter(Boolean).length,
    qualified: members.filter((row) => pushTargetMatches(row, { kind: "qualified" })).map(memberLineUid).filter(Boolean).length
  };
  return json({ success: true, data: { total: members.length, counts, logs: (await readPushLogs(env)).slice(0, 100) } });
}

async function resolvePushTargetsApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const target = asRecord(input.target) as PushTarget;
  const resolved = await resolvePushRecipients(env, target);
  return json({ success: true, data: { mode: resolved.mode, count: resolved.mode === "broadcast" ? null : resolved.recipients.length, sample: resolved.recipients.slice(0, 10), totalKnown: resolved.totalKnown } });
}

async function sendPushApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const target = asRecord(input.target) as PushTarget;
  const dryRun = Boolean(input.dryRun);
  let messages: Array<Record<string, unknown>>;
  try { messages = buildPushMessages(input); }
  catch (error) { return json({ success: false, message: String((error as Error).message || error) }, 400); }
  const resolved = await resolvePushRecipients(env, target);
  const responses: unknown[] = [];
  if (!dryRun) {
    if (resolved.mode === "broadcast") {
      responses.push(await sendLineApi(env, "broadcast", { messages, notificationDisabled: Boolean(input.notificationDisabled) }));
    } else {
      if (!resolved.recipients.length) return json({ success: false, message: "沒有可推播的 LINE UID" }, 400);
      for (let index = 0; index < resolved.recipients.length; index += 500) {
        responses.push(await sendLineApi(env, "multicast", { to: resolved.recipients.slice(index, index + 500), messages, notificationDisabled: Boolean(input.notificationDisabled) }));
      }
    }
  }
  const failed = responses.filter((item) => !(item as Record<string, unknown>).ok);
  const log: PushLog = {
    id: `PUSH-${Date.now()}`,
    createdAt: new Date().toISOString(),
    mode: resolved.mode,
    target,
    count: resolved.mode === "broadcast" ? 0 : resolved.recipients.length,
    messageType: clean(input.messageType || "text"),
    title: clean(input.title || input.altText),
    dryRun,
    responses
  };
  await appendPushLog(env, log);
  return json({ success: !failed.length, data: log, message: dryRun ? "測試推播已完成" : failed.length ? "部分推播失敗" : "推播已送出" }, failed.length ? 502 : 200);
}

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function icsClean(value: string) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcsDate(value: string) {
  const cleanValue = clean(value);
  const dateOnly = cleanValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  const match = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return cleanValue;
  const [, year, month, day, hour, minute, second, zulu] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${zulu ? "Z" : "+08:00"}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString();
}

function calendarDisplayTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\//g, "/");
}

function parseIcsEvents(ics: string) {
  const source = unfoldIcs(ics);
  const blocks = source.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.map((block) => {
    const event: Record<string, string> = {};
    for (const rawLine of block.split(/\r?\n/)) {
      const index = rawLine.indexOf(":");
      if (index < 0) continue;
      const left = rawLine.slice(0, index);
      const value = rawLine.slice(index + 1);
      const key = left.split(";")[0].toUpperCase();
      event[key] = icsClean(value);
    }
    const start = parseIcsDate(event.DTSTART || "");
    const end = parseIcsDate(event.DTEND || "");
    const summary = event.SUMMARY || "未命名活動";
    return {
      id: event.UID || `${summary}-${start}`,
      uid: event.UID || "",
      name: summary,
      summary,
      description: event.DESCRIPTION || "",
      location: event.LOCATION || "",
      start,
      end,
      courseTime: calendarDisplayTime(start),
      deadline: "",
      status: event.STATUS || "",
      url: event.URL || "",
      updatedAt: parseIcsDate(event["LAST-MODIFIED"] || event.DTSTAMP || "")
    };
  }).filter((event) => clean(event.name) || clean(event.start));
}

async function fetchCalendarEvents(request: Request) {
  const url = new URL(request.url);
  const calendarId = clean(url.searchParams.get("calendarId")) || defaultCalendarId;
  const from = url.searchParams.get("from") ? new Date(String(url.searchParams.get("from"))) : null;
  const to = url.searchParams.get("to") ? new Date(String(url.searchParams.get("to"))) : null;
  const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
  const response = await fetch(icsUrl, { headers: { accept: "text/calendar,text/plain,*/*" } });
  const textBody = await response.text().catch(() => "");
  if (!response.ok) return json({ success: false, message: `Google Calendar 讀取失敗：HTTP ${response.status}，請確認日曆已公開。`, calendarId }, 502);
  let events = parseIcsEvents(textBody).sort((a, b) => String(a.start).localeCompare(String(b.start)));
  if (from && !Number.isNaN(from.getTime())) events = events.filter((event) => new Date(event.start).getTime() >= from.getTime());
  if (to && !Number.isNaN(to.getTime())) events = events.filter((event) => new Date(event.start).getTime() <= to.getTime());
  return json({ success: true, calendarId, total: events.length, data: events, icsUrl });
}

async function fetchGoogleMemberSheet(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const response = await fetch(googleMemberSheetCsvUrl, { headers: { accept: "text/csv,text/plain,*/*" } });
  const body = await response.text().catch(() => "");
  if (!response.ok) return json({ success: false, message: `Google 會員資料讀取失敗：HTTP ${response.status}` }, 502);
  return new Response(body, {
    headers: {
      ...headers,
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function lineWebhookStatusApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  const config = await readEffectiveMonthly(env);
  const pages = config.pages || [];
  return json({
    success: true,
    webhookPath: "/line-webhook",
    forwardWebhookConfigured: Boolean(clean(env.FORWARD_WEBHOOK_URL)),
    lineChannelSecretConfigured: Boolean(clean(env.LINE_CHANNEL_SECRET)),
    lineChannelAccessTokenConfigured: Boolean(clean(env.LINE_CHANNEL_ACCESS_TOKEN)),
    monthlyActivity: {
      enabled: config.enabled !== false,
      keyword: fixedKeyword,
      configuredKeyword: config.keyword || fixedKeyword,
      normalizedKeyword: normalizeKeyword(fixedKeyword),
      pageCount: pages.length,
      month: config.month || "",
      hasFlex: pages.length > 0
    }
  });
}

async function readLineWebhookLogs(env: Env) {
  if (!env.ASSETS_BUCKET) return [];
  const object = await env.ASSETS_BUCKET.get(lineWebhookLogKey);
  const data = object ? await object.json().catch(() => []) : [];
  return Array.isArray(data) ? data.slice(0, 50) : [];
}

async function appendLineWebhookLog(env: Env, record: Record<string, unknown>) {
  if (!env.ASSETS_BUCKET) return;
  const rows = await readLineWebhookLogs(env);
  rows.unshift(record);
  await env.ASSETS_BUCKET.put(lineWebhookLogKey, JSON.stringify(rows.slice(0, 50), null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" }
  });
}

async function safeAppendLineWebhookLog(env: Env, record: Record<string, unknown>) {
  try {
    await appendLineWebhookLog(env, record);
  } catch (_) {
    // Logging must never block a LINE reply.
  }
}

async function appendLineWebhookIngressLog(env: Env, request: Request, rawBody: string, ctx?: ExecutionContext) {
  let events: LineEvent[] = [];
  try {
    events = extractLineEvents(JSON.parse(rawBody));
  } catch (_) {}
  const texts = events.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5);
  if (!texts.length) return;
  const task = safeAppendLineWebhookLog(env, {
    at: new Date().toISOString(),
    mode: "webhook-ingress",
    result: "received",
    hasSignature: Boolean(clean(request.headers.get("x-line-signature"))),
    texts,
    lineUserIds: events.map((event) => clean(event.source?.userId)).filter(Boolean).slice(0, 5),
    eventCount: events.length
  });
  if (ctx) ctx.waitUntil(task);
  else await task;
}
async function lineWebhookLogsApi(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;
  return json({ success: true, data: await readLineWebhookLogs(env) });
}

async function replyMonthlyActivityEvents(events: LineEvent[], allEvents: LineEvent[], env: Env, ctx?: ExecutionContext) {
  const config = await readMonthlyReplyConfig(env);
  const pages = config.pages || [];
  const message = config.enabled && pages.length ? buildMonthlyFlex(config) as Record<string, unknown> : { type: "text", text: "TDEA 每月活動尚未啟用，請稍後再試。" };
  const lineReplies = await Promise.all(events.map(async (event) => {
    if (!event.replyToken) return { ok: false, status: 400, message: "Missing replyToken" };
    try {
      const result = await replyToLine(event.replyToken, [message], env) as Record<string, unknown>;
      if (result.ok === false && message.type === "flex") {
        const fallback = { type: "text", text: "TDEA 每月活動已更新，請稍後再試一次。" };
        const fallbackResult = await replyToLine(event.replyToken, [fallback], env) as Record<string, unknown>;
        return { ...result, fallback: fallbackResult };
      }
      return result;
    } catch (error) {
      return { ok: false, status: 599, message: error instanceof Error ? error.message : String(error) };
    }
  }));
  const logTask = appendLineWebhookLog(env, {
    at: new Date().toISOString(),
    mode: "monthly-activity",
    result: "replied",
    hasSignature: true,
    pageCount: pages.length,
    enabled: config.enabled !== false,
    texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
    lineReplies: lineReplies.map((item) => ({
      ok: item.ok,
      status: item.status,
      message: "message" in item ? item.message : undefined,
      body: "body" in item ? String(item.body || "").slice(0, 500) : undefined,
      fallback: "fallback" in item ? item.fallback : undefined
    }))
  });
  if (ctx) ctx.waitUntil(logTask);
  else await logTask;
  return json({ success: true, mode: "monthly-activity", matched: [fixedKeyword], forwarded: false, lineReplies });
}
async function replyVendorCardEvents(events: LineEvent[], allEvents: LineEvent[], env: Env, ctx?: ExecutionContext) {
  const config = await readVendorCardConfig(env);
  const items = config.items || [];
  const message = config.enabled && items.some((item) => item.enabled !== false && clean(item.imageUrl))
    ? buildVendorCardFlex(config) as Record<string, unknown>
    : { type: "text", text: "TDEA 廠商列表目前尚未設定，請稍後再試。" };
  const lineReplies = await Promise.all(events.map((event) => event.replyToken ? replyToLine(event.replyToken, [message], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
  const logTask = appendLineWebhookLog(env, {
    at: new Date().toISOString(),
    mode: "vendor-card-menu",
    result: "replied",
    hasSignature: true,
    enabled: config.enabled !== false,
    itemCount: items.filter((item) => item.enabled !== false && clean(item.imageUrl)).length,
    texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
    lineReplies: lineReplies.map((item) => ({
      ok: item.ok,
      status: item.status,
      message: "message" in item ? item.message : undefined,
      body: "body" in item ? String(item.body || "").slice(0, 500) : undefined
    }))
  });
  if (ctx) ctx.waitUntil(logTask);
  else await logTask;
  return json({ success: true, mode: "vendor-card-menu", matched: [vendorCardKeyword], forwarded: false, lineReplies });
}

async function handleMonthlyWebhook(request: Request, env: Env, rawBody: string, ctx?: ExecutionContext) {
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch (_) { return null; }
  const allEvents = extractLineEvents(payload);
  const childMemberCheckinEnabled = false;
  const hasMemberCheckinTextInPayload = allEvents.some((event) => isMemberCheckinText(extractTriggerText(event)));
  const earlyMemberCheckinEvents = childMemberCheckinEnabled ? allEvents.filter((event) => isMemberCheckinText(extractTriggerText(event))) : [];
  if (earlyMemberCheckinEvents.length) {
    const signature = request.headers.get("x-line-signature");
    const diagnostics = earlyMemberCheckinEvents.map((event) => ({ text: clean(extractTriggerText(event)), normalized: normalizeKeyword(extractTriggerText(event)), hasReplyToken: Boolean(event.replyToken), hasLineUserId: Boolean(clean(event.source?.userId)), lineUserId: clean(event.source?.userId) }));
    await safeAppendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "member-checkin-early",
      result: "matched",
      hasSignature: Boolean(clean(signature)),
      diagnostics,
      eventCount: allEvents.length
    });
    let signatureOk = false;
    try {
      signatureOk = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
    } catch (error) {
      await safeAppendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "member-checkin-early",
        result: "signature-error",
        hasSignature: Boolean(clean(signature)),
        error: error instanceof Error ? error.message : String(error),
        diagnostics,
        eventCount: allEvents.length
      });
      return new Response("Invalid Signature", { status: 403, headers });
    }
    if (!signatureOk) {
      await safeAppendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "member-checkin-early",
        result: "invalid-signature",
        hasSignature: Boolean(clean(signature)),
        diagnostics,
        eventCount: allEvents.length
      });
      return new Response("Invalid Signature", { status: 403, headers });
    }
    try {
      return await handleMemberCheckinEvents(earlyMemberCheckinEvents, env, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await safeAppendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "member-checkin-early",
        result: "handler-error",
        hasSignature: Boolean(clean(signature)),
        diagnostics,
        eventCount: allEvents.length,
        error: message
      });
      const lineReplies = await Promise.all(earlyMemberCheckinEvents.map(async (event) => {
        if (!event.replyToken) return { ok: false, status: 400, message: "Missing replyToken" };
        try {
          return await replyToLine(event.replyToken, [{ type: "text", text: "會員報到流程暫時無法啟動，請稍後再試或聯絡協會後台。" }], env);
        } catch (replyError) {
          return { ok: false, status: 599, message: replyError instanceof Error ? replyError.message : String(replyError) };
        }
      }));
      return json({ success: false, mode: "member-checkin", error: message, lineReplies }, 500);
    }
  }
  const watchedTexts = allEvents.map((event) => clean(extractTriggerText(event))).filter((text) => /TDEA|每月活動|會員|報到/i.test(text));
  if (watchedTexts.length && !allEvents.some((event) => isMonthlyActivityKeyword(extractTriggerText(event)))) {
    await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "incoming-text",
      result: "received",
      hasSignature: Boolean(clean(request.headers.get("x-line-signature"))),
      texts: watchedTexts.slice(0, 5),
      normalizedTexts: watchedTexts.map((text) => normalizeKeyword(text)).slice(0, 5),
      monthlyMatches: watchedTexts.map((text) => isMonthlyActivityKeyword(text)).slice(0, 5),
      codePoints: watchedTexts.map((text) => Array.from(text).map((char) => char.codePointAt(0)?.toString(16) || "").join(" ")).slice(0, 3),
      eventCount: allEvents.length
    });
  }
  const events = allEvents.filter((event) => isMonthlyActivityKeyword(extractTriggerText(event)));
  if (events.length) {
    const signature = request.headers.get("x-line-signature");
    let signatureOk = false;
    try {
      signatureOk = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
    } catch (error) {
      await appendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "monthly-activity",
        result: "signature-error",
        hasSignature: Boolean(clean(signature)),
        error: error instanceof Error ? error.message : String(error),
        texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
        eventCount: allEvents.length
      });
      return new Response("Invalid Signature", { status: 403, headers });
    }
    if (!signatureOk) {
      await appendLineWebhookLog(env, {
        at: new Date().toISOString(),
        mode: "monthly-activity",
        result: "invalid-signature",
        hasSignature: Boolean(clean(signature)),
        texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
        eventCount: allEvents.length
      });
      return new Response("Invalid Signature", { status: 403, headers });
    }
    return replyMonthlyActivityEvents(events, allEvents, env, ctx);
  }

  const onboardingActiveEarly = !hasMemberCheckinTextInPayload && await hasMemberOnboardingSession(allEvents, env);
  if (onboardingActiveEarly) {
    const signature = request.headers.get("x-line-signature");
    if (!await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET)) return new Response("Invalid Signature", { status: 403, headers });
    for (const event of allEvents) {
      const handled = await handleMemberOnboardingEvent(event, env, ctx);
      if (handled) return json({ success: true, mode: "member-onboarding", lineReply: handled });
    }
  }

  const builtInKeywordTexts = new Set([queryKeyword, memberQrKeyword, calendarKeyword, personalMessageKeyword, vendorCardKeyword, marqueeKeyword, ...marqueeLegacyKeywords].map(normalizeKeyword));
  const customKeywordEvents = allEvents.filter((event) => {
    const text = extractTriggerText(event);
    const normalized = normalizeKeyword(text);
    return Boolean(clean(text))
      && !isMonthlyActivityKeyword(text)
      && !isMemberCheckinText(text)
      && !builtInKeywordTexts.has(normalized)
      && !parseUidBindKeyword(text).active
      && !parseMotherPointKeyword(text);
  });
  if (customKeywordEvents.length) {
    const signatureForCustomKeyword = request.headers.get("x-line-signature");
    if (!await verifyLineSignature(rawBody, signatureForCustomKeyword, env.LINE_CHANNEL_SECRET)) return new Response("Invalid Signature", { status: 403, headers });
    const customKeyword = await handleCustomKeywordEvents(customKeywordEvents, env);
    if (customKeyword) return customKeyword;
  }
  const lineActivityMaker = await handleLineActivityMaker(request, env, rawBody, allEvents, ctx);
  if (lineActivityMaker) return lineActivityMaker;
  const queryEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(queryKeyword));
  const memberQrEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(memberQrKeyword));
  const calendarEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(calendarKeyword));
  const personalMessageEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(personalMessageKeyword));
  const uidBindEvents = allEvents.filter((event) => parseUidBindKeyword(extractTriggerText(event)).active);
  const vendorCardEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(vendorCardKeyword));
  const marqueeKeywords = [marqueeKeyword, ...marqueeLegacyKeywords].map(normalizeKeyword);
  const marqueeEvents = allEvents.filter((event) => marqueeKeywords.includes(normalizeKeyword(extractTriggerText(event))));
  const pointEvents = allEvents
    .map((event) => ({ event, query: parseMotherPointKeyword(extractTriggerText(event)) }))
    .filter((match): match is { event: LineEvent; query: { uid: string } } => Boolean(match.query));
  const memberCheckinEvents = childMemberCheckinEnabled ? allEvents.filter((event) => isMemberCheckinText(extractTriggerText(event))) : [];
  const onboardingActive = !hasMemberCheckinTextInPayload && await hasMemberOnboardingSession(allEvents, env);
  if (!queryEvents.length && !memberQrEvents.length && !calendarEvents.length && !personalMessageEvents.length && !uidBindEvents.length && !memberCheckinEvents.length && !vendorCardEvents.length && !marqueeEvents.length && !pointEvents.length && !events.length && !onboardingActive) return null;
  const signature = request.headers.get("x-line-signature");
  const signatureOk = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
  if (!signatureOk) {
    if (events.length) await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "monthly-activity",
      result: "invalid-signature",
      hasSignature: Boolean(clean(signature)),
      texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
      eventCount: allEvents.length
    });
    return new Response("Invalid Signature", { status: 403, headers });
  }
  if (vendorCardEvents.length) return replyVendorCardEvents(vendorCardEvents, allEvents, env, ctx);
  const bareUidBindEvents = uidBindEvents.filter((event) => !parseUidBindKeyword(extractTriggerText(event)).memberNo);
  const gatedEvents = [
    ...queryEvents,
    ...memberQrEvents,
    ...calendarEvents,
    ...personalMessageEvents,
    ...marqueeEvents,
    ...pointEvents.map((item) => item.event),
    ...bareUidBindEvents
  ];
  const closedGate = await handleClosedMemberGate(allEvents, gatedEvents, env, ctx);
  if (closedGate) {
    await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "member-gate",
      result: "handled",
      texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5)
    });
    return json({ success: true, mode: "member-gate", lineReply: closedGate });
  }
  if (events.length) {
    const config = await readEffectiveMonthly(env);
    const pages = config.pages || [];
    const message = config.enabled && pages.length ? buildMonthlyFlex(config) as Record<string, unknown> : { type: "text", text: "TDEA 每月活動尚未啟用，請稍後再試。" };
    await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "monthly-activity",
      result: "matched",
      hasSignature: true,
      pageCount: pages.length,
      enabled: config.enabled !== false,
      messageType: clean(message.type),
      texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5)
    });
    const lineReplies = await Promise.all(events.map(async (event) => {
      if (!event.replyToken) return { ok: false, status: 400, message: "Missing replyToken" };
      let prompt: Record<string, unknown> | null = null;
      try {
        prompt = await monthlyMemberStatusPrompt(event, env);
      } catch (error) {
        console.log("monthly member prompt failed", error);
      }
      const messages = prompt ? [message, prompt] : [message];
      try {
        return await replyToLine(event.replyToken, messages, env);
      } catch (error) {
        return { ok: false, status: 599, message: error instanceof Error ? error.message : String(error) };
      }
    }));
    await appendLineWebhookLog(env, {
      at: new Date().toISOString(),
      mode: "monthly-activity",
      result: "replied",
      hasSignature: true,
      pageCount: pages.length,
      enabled: config.enabled !== false,
      texts: allEvents.map((event) => clean(extractTriggerText(event))).filter(Boolean).slice(0, 5),
      lineReplies: lineReplies.map((item) => ({ ok: item.ok, status: item.status, message: "message" in item ? item.message : undefined }))
    });
    return json({ success: true, mode: "monthly-activity", matched: [fixedKeyword], forwarded: false, lineReplies });
  }
  if (uidBindEvents.length) return bindLineUidEvents(uidBindEvents, env);
  if (pointEvents.length) return handleMotherPointEvents(pointEvents, env);
  if (queryEvents.length) {
    const queryUrl = `${nativeLiffUrl}?query=1`;
    const queryMessage = {
      type: "template",
      altText: "TDEA 活動查詢",
      template: {
        type: "buttons",
        text: "請點下方按鈕查詢或取消活動報名。",
        actions: [{ type: "uri", label: "開啟活動查詢", uri: queryUrl }]
      }
    };
    const lineReplies = await Promise.all(queryEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [queryMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "registration-query", matched: [queryKeyword], forwarded: false, lineReplies });
  }
  if (memberQrEvents.length) {
    const memberQrUrl = `${nativeLiffUrl}?memberQr=1`;
    const memberQrMessage = {
      type: "template",
      altText: "TDEA 會員 QR",
      template: {
        type: "buttons",
        text: "請點下方按鈕開啟會員 QR，供報到或核銷使用。",
        actions: [{ type: "uri", label: "開啟會員 QR", uri: memberQrUrl }]
      }
    };
    const lineReplies = await Promise.all(memberQrEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [memberQrMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "member-qr", matched: [memberQrKeyword], forwarded: false, lineReplies });
  }
  if (calendarEvents.length) {
    const calendarUrl = `${nativeLiffUrl}?calendar=1`;
    const calendarMessage = {
      type: "template",
      altText: "TDEA 行事曆",
      template: {
        type: "buttons",
        title: "TDEA 行事曆",
        text: "請點下方按鈕開啟 TDEA Google 行事曆。",
        actions: [{ type: "uri", label: "開啟行事曆", uri: calendarUrl }]
      }
    };
    const lineReplies = await Promise.all(calendarEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [calendarMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "calendar", matched: [calendarKeyword], forwarded: false, lineReplies });
  }
  if (personalMessageEvents.length) {
    const messageUrl = personalMessagesUrl();
    const personalMessage = {
      type: "template",
      altText: "TDEA 個人訊息",
      template: {
        type: "buttons",
        title: "TDEA 個人訊息",
        text: "請點下方按鈕查看協會傳給你的個人訊息與附件。",
        actions: [{ type: "uri", label: "查看個人訊息", uri: messageUrl }]
      }
    };
    const lineReplies = await Promise.all(personalMessageEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [personalMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "personal-message", matched: [personalMessageKeyword], forwarded: false, lineReplies });
  }
  if (marqueeEvents.length) {
    const marqueeUrl = `${nativeLiffUrl}?marquee=1`;
    const marqueeMessage = {
      type: "template",
      altText: "TDEA 廣告贈點",
      template: {
        type: "buttons",
        title: "TDEA 廣告贈點",
        text: "請點下方按鈕開啟廣告贈點互動頁。",
        actions: [{ type: "uri", label: "開啟廣告贈點", uri: marqueeUrl }]
      }
    };
    const lineReplies = await Promise.all(marqueeEvents.map((event) => event.replyToken ? replyToLine(event.replyToken, [marqueeMessage], env) : Promise.resolve({ ok: false, status: 400, message: "Missing replyToken" })));
    return json({ success: true, mode: "marquee", matched: [marqueeKeyword, ...marqueeLegacyKeywords], forwarded: false, lineReplies });
  }
  return json({ success: true, mode: "monthly-activity", matched: [fixedKeyword], forwarded: false, lineReplies: [] });
}

async function monthlyDetail(env: Env, id: string) {
  const config = await readEffectiveMonthly(env);
  const page = (config.pages || []).find((item) => String(item.id) === id || String(item.activityNo) === id || String(item.activityId) === id);
  if (!page) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const formUrl = registerUrlForPage(page);
  const galleryHtml = monthlySliderHtml(page);
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.detailTitle || "活動詳細說明")}</title><style>body{margin:0;background:#f4f6f8;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}.wrap{max-width:none;margin:0 auto;padding:0}.card{background:transparent;border-radius:0;padding:0;box-shadow:none}img{width:100%;border-radius:0;margin-bottom:16px}.meta{display:inline-flex;margin:0 0 12px;padding:5px 10px;border-radius:999px;background:#eafff1;color:#027a48;font-size:13px;font-weight:800}h1{font-size:24px;margin:0 0 12px}.text{white-space:pre-wrap;line-height:1.7;color:#344054}.btn{display:block;margin-top:18px;padding:13px 16px;border-radius:10px;background:#06c755;color:#fff;text-align:center;text-decoration:none;font-weight:800}.gallery{margin:0 0 18px}.gallery-head{display:flex;align-items:center;justify-content:space-between;margin:0;padding:16px 18px 10px;background:#fff}.gallery-head strong{font-size:16px}.gallery-head span{font-size:12px;color:#667085;font-weight:800}.slider{position:relative;overflow:hidden;border-radius:0;background:#fff;margin-bottom:16px;aspect-ratio:210/297;min-height:0;width:100%}.track{display:flex;transition:transform .35s ease}.slide{min-width:100%;aspect-ratio:210/297;min-height:0;background:#fff}.slide img{display:block;width:100%;height:100%;object-fit:contain;margin:0;border-radius:0;background:#fff}.slider-nav{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.slider-nav button{pointer-events:auto;width:36px;height:36px;border:0;border-radius:999px;background:rgba(15,23,42,.62);color:#fff;font-size:18px;font-weight:900;margin:10px}.dots{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:6px}.dots button{width:8px;height:8px;border:0;border-radius:999px;background:rgba(255,255,255,.55);padding:0}.dots button.active{background:#06c755}@media(max-width:480px){.wrap{padding:0}.card{padding:0}h1,.text,.meta,.btn{margin-left:18px;margin-right:18px}.slider,.slide{min-height:0}}</style></head><body><main class="wrap"><section class="card">${galleryHtml ? `<section class="gallery"><div class="gallery-head"><strong>活動圖集</strong><span>${monthlyPageImages(page).length} 張</span></div>${galleryHtml}</section>` : ""}${page.activityNo ? `<div class="meta">${esc(page.activityNo)}</div>` : ""}<h1>${esc(page.detailTitle || "活動詳細說明")}</h1><div class="text">${esc(page.detailText || "目前沒有詳細說明。")}</div>${formUrl ? `<a class="btn" href="${esc(formUrl)}">前往報名</a>` : ""}</section></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
	    const uploadMatch = url.pathname.match(/^\/api\/uploads\/(.+)$/);
	    if ((request.method === "GET" || request.method === "HEAD") && uploadMatch) return getUploadedFile(env, decodeURIComponent(uploadMatch[1]));
	    if (request.method === "POST" && url.pathname === "/api/uploads") return uploadGenericImageApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/line-activity-drafts") return listLineActivityDrafts(request, env);
	    if ((request.method === "DELETE" || request.method === "POST") && url.pathname === "/api/line-activity-drafts/delete") return deleteLineActivityDraft(request, env);
	    if (request.method === "GET" && url.pathname === "/api/line-activity-debug") return getLineActivityDebug(request, env);
	    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/line-activity-ai-check") return testLineActivityAi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/admin-login/password") return adminPasswordLoginApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/admin-login/line") return adminLineLoginApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/admin-access") return listAdminAccessApi(request, env);
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/admin-access") return updateAdminAccessApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/admin-whitelist") return listAdminWhitelistApi(request, env);
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/admin-whitelist") return updateAdminWhitelistApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/member-applications") return listMemberApplicationsApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/aiwe-members-public") return listAiweMembersPublicApi(request, env);
	    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/aiwe-members/sync") return syncAiweMembersFromMotherApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/aiwe-members/import") return importAiweMembersApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/google-member-sheet") return fetchGoogleMemberSheet(request, env);
	    if (request.method === "GET" && url.pathname === "/api/personal-messages") return listPersonalMessagesApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/personal-messages/admin") return listPersonalMessagesAdminApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/personal-messages") return createPersonalMessageApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/personal-messages/upload") return uploadPersonalMessageFileApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/monthly-activity") return json({ success: true, data: await readMonthlyReplyConfig(env) });
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/monthly-activity") { const guard = await requireAdmin(request, env); if (guard) return guard; if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503); const config = await request.json().catch(() => ({})) as MonthlyConfig; const validation = validateMonthlyConfigForPublish(config); if (validation) return json({ success: false, message: validation }, 400); await writeMonthly(env, config); const effective = await refreshMonthlySnapshot(env); return json({ success: true, data: effective, flex: buildMonthlyFlex(effective) }); }
	    if (request.method === "GET" && url.pathname === "/api/monthly-activity/flex") { const config = await readMonthlyReplyConfig(env); return json({ success: true, flex: buildMonthlyFlex(config), data: config }); }
	    if (request.method === "GET" && url.pathname === "/api/monthly-activity/share") return monthlyActivityShareApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/line-webhook/status") return lineWebhookStatusApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/line-webhook/logs") return lineWebhookLogsApi(request, env);
	    if (url.pathname === "/api/activities" || url.pathname === "/api/activities/archived" || /^\/api\/activities\/[^/]+(?:\/restore)?$/.test(url.pathname)) return activityRecordsApi(request, env, url);
	    if (request.method === "GET" && url.pathname === "/api/manager-data") return json({ success: true, data: await readManagerData(env) });
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/manager-data") {
	      const guard = await requireAdmin(request, env);
	      if (guard) return guard;
	      if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
	      const data = await request.json().catch(() => ({})) as Record<string, unknown>;
	      const saved = await writeManagerData(env, data, activityActorFromRequest(request));
	      if (!saved) return json({ success: false, message: "拒絕空白或無效的名冊資料覆蓋" }, 400);
	      return json({ success: true, data: await readManagerData(env) });
	    }
	    if (request.method === "GET" && url.pathname === "/api/vendor-card-menu") return json({ success: true, data: await readVendorCardConfig(env) });
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/vendor-card-menu") { const guard = await requireAdmin(request, env); if (guard) return guard; if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503); const config = await request.json().catch(() => ({})) as VendorCardConfig; await writeVendorCardConfig(env, config); return json({ success: true, data: await readVendorCardConfig(env), flex: buildVendorCardFlex(config) }); }
	    if (request.method === "GET" && url.pathname === "/api/vendor-card-menu/flex") { const config = await readVendorCardConfig(env); return json({ success: true, flex: buildVendorCardFlex(config), data: config }); }
	    if (request.method === "GET" && url.pathname === "/api/marquee") return json({ success: true, data: await readMarqueeConfig(env), liffUrl: `${nativeLiffUrl}?marquee=1` });
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/marquee") { const guard = await requireAdmin(request, env); if (guard) return guard; if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503); const config = await request.json().catch(() => ({})) as MarqueeConfig; await writeMarqueeConfig(env, config); return json({ success: true, data: await readMarqueeConfig(env), liffUrl: `${nativeLiffUrl}?marquee=1` }); }
	    if (request.method === "POST" && url.pathname === "/api/marquee/upload") return uploadMarqueeImageApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/marquee/reward") return rewardMarqueePoint(request, env);
	    if (request.method === "POST" && url.pathname === "/api/marquee/points") return queryMarqueePoints(request, env);
	    if (request.method === "GET" && url.pathname === "/api/rich-menu") return getRichMenuApi(request, env);
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/rich-menu") return saveRichMenuApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/rich-menu/validate") return validateRichMenuApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/rich-menu/deploy") return deployRichMenuApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-forms/create") return createNativeForm(request, env);
	    const nativeLoginMatch = url.pathname.match(/^\/api\/native-forms\/([^/]+)\/login-register$/);
	    if (nativeLoginMatch && request.method === "POST") return submitNativeLoginRegistration(request, env, decodeURIComponent(nativeLoginMatch[1]));
	    const nativeLoginMemberMatch = url.pathname.match(/^\/api\/native-forms\/([^/]+)\/login-member$/);
	    if (nativeLoginMemberMatch && request.method === "GET") return getNativeLoginMember(request, env, decodeURIComponent(nativeLoginMemberMatch[1]));
	    const nativeFormMatch = url.pathname.match(/^\/api\/native-forms\/([^/]+)$/);
	    if (nativeFormMatch && (request.method === "PUT" || request.method === "PATCH")) return updateNativeForm(request, env, decodeURIComponent(nativeFormMatch[1]));
	    if (nativeFormMatch && request.method === "GET") return getNativeForm(request, env, decodeURIComponent(nativeFormMatch[1]));
	    if (nativeFormMatch && request.method === "POST") return submitNativeForm(request, env, decodeURIComponent(nativeFormMatch[1]));
	    if (request.method === "GET" && url.pathname === "/api/native-registrations/query") return queryNativeRegistration(request, env);
	    if (request.method === "GET" && url.pathname === "/api/native-registrations/me") return queryNativeRegistrationsByLine(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-registrations/update") return updateNativeRegistration(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-registrations/cancel") return cancelNativeRegistration(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-registrations/payment-report") return reportNativeRegistrationPayment(request, env);
	    if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/native-registrations/payment") return updateNativeRegistrationPayment(request, env);
	    if (request.method === "GET" && url.pathname === "/api/native-checkin/verify") return verifyNativeCheckin(request, env);
	    if (request.method === "POST" && url.pathname === "/api/native-checkin/confirm") return confirmNativeCheckin(request, env);
	    if (request.method === "POST" && url.pathname === "/api/redeem/create") return createRedeemRequest(request, env);
	    if (request.method === "GET" && url.pathname === "/api/redeem/list") return listRedeemRequests(request, env);
	    const redeemMatch = url.pathname.match(/^\/api\/redeem\/([^/]+)(?:\/use)?$/);
	    if (redeemMatch && request.method === "GET") return getRedeemRequest(request, env, decodeURIComponent(redeemMatch[1]));
	    if (redeemMatch && request.method === "POST") return confirmRedeemRequest(request, env, decodeURIComponent(redeemMatch[1]));
	    if (request.method === "POST" && url.pathname === "/api/points/adjust") return adjustMemberPointApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/points/ledger") return listPointLedgerApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/member-points/batch") return queryMemberPointBatchApi(request, env);
	    const pointMatch = url.pathname.match(/^\/api\/points\/([^/]+)$/);
	    if (pointMatch && request.method === "GET") return getPointAccountApi(request, env, decodeURIComponent(pointMatch[1]));
	    if (request.method === "GET" && url.pathname === "/api/push/segments") return getPushSegments(request, env);
	    if (request.method === "POST" && url.pathname === "/api/push/resolve") return resolvePushTargetsApi(request, env);
	    if (request.method === "POST" && url.pathname === "/api/push/send") return sendPushApi(request, env);
	    if (request.method === "GET" && url.pathname === "/api/calendar/events") return fetchCalendarEvents(request);
	    if (request.method === "GET" && url.pathname === "/api/opnform/workspaces") return listOpnFormWorkspaces(request, env);
    if (request.method === "POST" && url.pathname === "/api/opnform/create") return createOpnForm(request, env);
    if (request.method === "POST" && url.pathname === "/api/opnform/webhook") return handleOpnFormWebhook(request, env);
    if (request.method === "POST" && url.pathname === "/api/opnform/sync") return syncOpnFormResponses(request, env);
    if (request.method === "POST" && url.pathname === "/api/google-forms/submission") return handleFormSubmission(request, env);
    if (request.method === "POST" && url.pathname === "/api/google-forms/sync") return syncGoogleFormResponses(request, env);
    if (request.method === "GET" && url.pathname === "/api/registrations/summary") return json({ success: true, data: await readRegistrationSummary(env) });
    if (request.method === "GET" && url.pathname === "/api/registrations/list") return listRegistrations(request, env);
    if (request.method === "GET" && url.pathname === "/api/registrations/export") return exportRegistrationsExcel(request, env);
    const detailMatch = url.pathname.match(/^\/monthly-detail\/([^/]+)$/);
    if (request.method === "GET" && detailMatch) return monthlyDetail(env, decodeURIComponent(detailMatch[1]));
    if (request.method === "POST" && url.pathname === "/line-webhook") { const rawBody = await request.text(); await appendLineWebhookIngressLog(env, request, rawBody, ctx); const monthly = await handleMonthlyWebhook(request, env, rawBody, ctx); if (monthly) return monthly; if (clean(env.FORWARD_WEBHOOK_URL)) { ctx.waitUntil(forwardToMotherWebhookWithLog(request, env, rawBody)); return json({ success: true, forwarded: true, async: true }); } return baseEntry.fetch(rebuildRequest(request, rawBody), env, ctx); }
    return baseEntry.fetch(request, env, ctx);
  }
};
