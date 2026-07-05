export type KeywordLineEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; id?: string; text?: string };
  postback?: { data?: string };
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
};

export type MotherPointQuery = { uid: string };
export type UidBindQuery = { active: boolean; memberNo: string };
export type MemberCheckinQuery = { active: boolean; memberNo: string; name: string };

export const fixedKeyword = "TDEA每月活動";
export const monthlyActivityAliases = ["活動報名", "TDEA活動", "TDEA報名", "TDEA課程"];
export const vendorCardKeyword = "TDEA廠商列表";
export const marqueeKeyword = "TDEA廣告贈點";
export const queryKeyword = "TDEA活動查詢";
export const marqueeLegacyKeywords = ["TDEA跑馬燈"];
export const memberQrKeyword = "TDEA會員QR";
export const memberQrAliases = ["會員QR"];
export const calendarKeyword = "TDEA行事曆";
export const personalMessageKeyword = "TDEA個人訊息";
export const uidBindKeyword = "UID";
export const motherPointAliases = ["TDEA點數", "TDEA點數查詢", "TDEA查點", "TDEA紅利"];
export const memberCheckinKeyword = "會員報到";
export const memberCheckinAliases = [memberCheckinKeyword, "會員簽到"];
export const lineActivityCreateKeyword = "TDEA建立活動";
export const motherReservedKeywords = ["會員打卡", "會員查詢", "會員專區", "TDEA會員"];
export const lineActivityCreateAliases = ["TDEA新增活動", "TDEA活動上稿", "TDEA製作活動"];

export type BuiltInKeywordKind =
  | "monthlyActivity"
  | "registrationQuery"
  | "memberQr"
  | "calendar"
  | "personalMessage"
  | "uidBind"
  | "vendorCard"
  | "marquee"
  | "motherPoint"
  | "memberCheckin"
  | "lineActivityCreate";

export type KeywordMatch =
  | { kind: "monthlyActivity"; keyword: string }
  | { kind: "registrationQuery"; keyword: string }
  | { kind: "memberQr"; keyword: string }
  | { kind: "calendar"; keyword: string }
  | { kind: "personalMessage"; keyword: string }
  | { kind: "uidBind"; keyword: string; parsed: UidBindQuery }
  | { kind: "vendorCard"; keyword: string }
  | { kind: "marquee"; keyword: string }
  | { kind: "motherPoint"; keyword: string; parsed: MotherPointQuery }
  | { kind: "memberCheckin"; keyword: string; parsed: MemberCheckinQuery }
  | { kind: "lineActivityCreate"; keyword: string };

export type ClassifiedKeywordEvents = {
  allEvents: KeywordLineEvent[];
  monthlyActivityEvents: KeywordLineEvent[];
  queryEvents: KeywordLineEvent[];
  memberQrEvents: KeywordLineEvent[];
  calendarEvents: KeywordLineEvent[];
  personalMessageEvents: KeywordLineEvent[];
  uidBindEvents: KeywordLineEvent[];
  vendorCardEvents: KeywordLineEvent[];
  marqueeEvents: KeywordLineEvent[];
  pointEvents: Array<{ event: KeywordLineEvent; query: MotherPointQuery }>;
  memberCheckinEvents: KeywordLineEvent[];
  lineActivityCreateEvents: KeywordLineEvent[];
  customKeywordEvents: KeywordLineEvent[];
  builtInKeywordTexts: Set<string>;
  hasBuiltInKeywordEvents: boolean;
  hasMemberCheckinTextInPayload: boolean;
};

const clean = (value: unknown) => String(value ?? "").trim();

export const normalizeKeyword = (value: string) => clean(value).replace(/[\s\u200B-\u200D\uFEFF]+/g, "").toUpperCase();

export function extractTriggerText(event: KeywordLineEvent) {
  if (event.message?.type === "text" && event.message.text) return event.message.text;
  if (event.postback?.data) return event.postback.data;
  return "";
}

export function isMonthlyActivityKeyword(value: string) {
  const normalized = normalizeKeyword(value);
  return normalized === normalizeKeyword(fixedKeyword)
    || monthlyActivityAliases.some((keyword) => normalized === normalizeKeyword(keyword))
    || (normalized.includes("TDEA") && normalized.includes("每月活動"));
}

export function parseMotherPointKeyword(text: string): MotherPointQuery | null {
  const raw = clean(text);
  const compact = raw.replace(/\s+/g, "");
  if (!compact) return null;
  const aliases = motherPointAliases;
  if (aliases.some((alias) => normalizeKeyword(compact) === normalizeKeyword(alias))) return { uid: "" };
  for (const alias of ["TDEA點數", "TDEA點數查詢"]) {
    const prefix = normalizeKeyword(alias);
    const normalized = normalizeKeyword(compact);
    if (normalized.startsWith(prefix + "+") || normalized.startsWith(prefix + "：") || normalized.startsWith(prefix + ":") || normalized.startsWith(prefix + "，")) {
      return { uid: compact.slice(alias.length + 1).trim() };
    }
  }
  return null;
}

export function parseUidBindKeyword(text: string): UidBindQuery {
  const raw = clean(text);
  const normalized = normalizeKeyword(raw);
  if (normalized === uidBindKeyword) return { active: true, memberNo: "" };
  if (!normalized.startsWith(uidBindKeyword)) return { active: false, memberNo: "" };
  const suffix = raw.replace(/^UID\s*[+＋:：]?\s*/i, "").trim();
  return suffix ? { active: true, memberNo: clean(suffix).toUpperCase() } : { active: false, memberNo: "" };
}

export function isMemberCheckinText(text: string) {
  const normalized = normalizeKeyword(text);
  const keywords = memberCheckinAliases.map(normalizeKeyword);
  return keywords.some((keyword) => normalized === keyword || normalized.startsWith(keyword))
    || (normalized.includes("會員") && (normalized.includes("報到") || normalized.includes("簽到")));
}

export function parseMemberCheckinKeyword(text: string): MemberCheckinQuery {
  const raw = clean(text);
  const normalized = normalizeKeyword(raw);
  const keyword = memberCheckinAliases.map(normalizeKeyword).find((item) => normalized === item || normalized.startsWith(item));
  if (!keyword) return { active: false, memberNo: "", name: "" };
  if (normalized === keyword) return { active: true, memberNo: "", name: "" };
  const suffix = raw.replace(/^(會員報到|會員簽到)\s*[+＋:：,，]?\s*/i, "").trim();
  const parts = suffix.split(/[\s,，、]+/).map(clean).filter(Boolean);
  return { active: true, memberNo: clean(parts[0]).toUpperCase(), name: clean(parts.slice(1).join(" ")) };
}

export function isMotherReservedKeyword(text: string) {
  const normalized = normalizeKeyword(text);
  return motherReservedKeywords.some((keyword) => normalized === normalizeKeyword(keyword));
}

export function isLineActivityStart(text: string) {
  const normalized = normalizeKeyword(text);
  return [lineActivityCreateKeyword, ...lineActivityCreateAliases].some((keyword) => normalized === normalizeKeyword(keyword));
}

export function classifyKeywordText(text: string): KeywordMatch | null {
  const normalized = normalizeKeyword(text);
  if (isMonthlyActivityKeyword(text)) return { kind: "monthlyActivity", keyword: fixedKeyword };
  if (normalized === normalizeKeyword(queryKeyword)) return { kind: "registrationQuery", keyword: queryKeyword };
  if ([memberQrKeyword, ...memberQrAliases].map(normalizeKeyword).includes(normalized)) return { kind: "memberQr", keyword: memberQrKeyword };
  if (normalized === normalizeKeyword(calendarKeyword)) return { kind: "calendar", keyword: calendarKeyword };
  if (normalized === normalizeKeyword(personalMessageKeyword)) return { kind: "personalMessage", keyword: personalMessageKeyword };
  const uidBind = parseUidBindKeyword(text);
  if (uidBind.active) return { kind: "uidBind", keyword: uidBindKeyword, parsed: uidBind };
  if (normalized === normalizeKeyword(vendorCardKeyword)) return { kind: "vendorCard", keyword: vendorCardKeyword };
  if ([marqueeKeyword, ...marqueeLegacyKeywords].map(normalizeKeyword).includes(normalized)) return { kind: "marquee", keyword: marqueeKeyword };
  const motherPoint = parseMotherPointKeyword(text);
  if (motherPoint) return { kind: "motherPoint", keyword: "TDEA點數", parsed: motherPoint };
  const memberCheckin = parseMemberCheckinKeyword(text);
  if (memberCheckin.active) return { kind: "memberCheckin", keyword: memberCheckinKeyword, parsed: memberCheckin };
  if (isLineActivityStart(text)) return { kind: "lineActivityCreate", keyword: lineActivityCreateKeyword };
  return null;
}

export function effectiveLineKeywords() {
  return [
    { kind: "monthlyActivity", keyword: fixedKeyword, aliases: monthlyActivityAliases },
    { kind: "vendorCard", keyword: vendorCardKeyword, aliases: [] },
    { kind: "marquee", keyword: marqueeKeyword, aliases: marqueeLegacyKeywords },
    { kind: "registrationQuery", keyword: queryKeyword, aliases: [] },
    { kind: "memberQr", keyword: memberQrKeyword, aliases: memberQrAliases },
    { kind: "calendar", keyword: calendarKeyword, aliases: [] },
    { kind: "personalMessage", keyword: personalMessageKeyword, aliases: [] },
    { kind: "uidBind", keyword: uidBindKeyword, aliases: [] },
    { kind: "motherPoint", keyword: "TDEA點數", aliases: ["TDEA點數查詢", "TDEA點數+UID", "TDEA查點", "TDEA紅利"] },
    { kind: "memberCheckin", keyword: memberCheckinKeyword, aliases: memberCheckinAliases.filter((item) => item !== memberCheckinKeyword) },
    { kind: "lineActivityCreate", keyword: lineActivityCreateKeyword, aliases: lineActivityCreateAliases }
  ];
}

export function builtInKeywordTextSet() {
  return new Set(effectiveLineKeywords().flatMap((item) => [item.keyword, ...item.aliases]).map(normalizeKeyword));
}

export function classifyLineEvents(allEvents: KeywordLineEvent[]): ClassifiedKeywordEvents {
  const builtInKeywordTexts = builtInKeywordTextSet();
  const monthlyActivityEvents = allEvents.filter((event) => isMonthlyActivityKeyword(extractTriggerText(event)));
  const queryEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(queryKeyword));
  const memberQrKeywords = [memberQrKeyword, ...memberQrAliases].map(normalizeKeyword);
  const memberQrEvents = allEvents.filter((event) => memberQrKeywords.includes(normalizeKeyword(extractTriggerText(event))));
  const calendarEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(calendarKeyword));
  const personalMessageEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(personalMessageKeyword));
  const uidBindEvents = allEvents.filter((event) => parseUidBindKeyword(extractTriggerText(event)).active);
  const vendorCardEvents = allEvents.filter((event) => normalizeKeyword(extractTriggerText(event)) === normalizeKeyword(vendorCardKeyword));
  const marqueeKeywords = [marqueeKeyword, ...marqueeLegacyKeywords].map(normalizeKeyword);
  const marqueeEvents = allEvents.filter((event) => marqueeKeywords.includes(normalizeKeyword(extractTriggerText(event))));
  const pointEvents = allEvents
    .map((event) => ({ event, query: parseMotherPointKeyword(extractTriggerText(event)) }))
    .filter((match): match is { event: KeywordLineEvent; query: MotherPointQuery } => Boolean(match.query));
  const memberCheckinEvents = allEvents.filter((event) => isMemberCheckinText(extractTriggerText(event)));
  const lineActivityCreateEvents = allEvents.filter((event) => isLineActivityStart(extractTriggerText(event)));
  const hasBuiltInKeywordEvents = Boolean(
    monthlyActivityEvents.length
    || queryEvents.length
    || memberQrEvents.length
    || calendarEvents.length
    || personalMessageEvents.length
    || uidBindEvents.length
    || vendorCardEvents.length
    || marqueeEvents.length
    || pointEvents.length
    || memberCheckinEvents.length
    || lineActivityCreateEvents.length
  );
  const customKeywordEvents = allEvents.filter((event) => {
    const text = extractTriggerText(event);
    return Boolean(clean(text)) && !classifyKeywordText(text) && !builtInKeywordTexts.has(normalizeKeyword(text));
  });
  return {
    allEvents,
    monthlyActivityEvents,
    queryEvents,
    memberQrEvents,
    calendarEvents,
    personalMessageEvents,
    uidBindEvents,
    vendorCardEvents,
    marqueeEvents,
    pointEvents,
    memberCheckinEvents,
    lineActivityCreateEvents,
    customKeywordEvents,
    builtInKeywordTexts,
    hasBuiltInKeywordEvents,
    hasMemberCheckinTextInPayload: memberCheckinEvents.length > 0
  };
}
