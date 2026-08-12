export type CardCollectionEnv = { ASSETS_BUCKET?: R2Bucket };

export type IndustryValue = { primary: string; secondary: string[] };
export type ContactCardInput = {
  displayName?: string; englishName?: string; companyName?: string; jobTitle?: string;
  department?: string; mobile?: string; companyPhone?: string; email?: string;
  websiteUrl?: string; lineUrl?: string; address?: string; serviceDescription?: string;
  note?: string; industry?: Partial<IndustryValue>;
};
export type CardOcrFields = ContactCardInput & { confidence: number; language: string };
export type CardImportRecord = {
  id: string; ownerLineUserId: string; status: "received" | "recognized" | "confirmed" | "failed";
  frontKey: string; backKey: string; frontContentType: string; ocr: CardOcrFields | null;
  createdAt: string; updatedAt: string;
};
export type ContactCardRecord = {
  id: string; ownerLineUserId: string; sourceEventId: string; displayName: string;
  englishName: string; companyName: string; jobTitle: string; department: string;
  mobile: string; companyPhone: string; email: string; websiteUrl: string; lineUrl: string;
  address: string; serviceDescription: string; note: string; normalizedMobile: string;
  normalizedEmail: string; normalizedNameCompany: string; industry: IndustryValue;
  frontKey: string; frontContentType: string; status: "active" | "archived";
  rewardPoints: number; rewardStatus: "pending" | "completed" | "reversed" | "disabled"; rewardUpdatedAt: string;
  createdAt: string; updatedAt: string;
};

export class CardCollectionError extends Error {
  status: number; code: string; data?: unknown;
  constructor(message: string, status = 400, code = "card_collection_error", data?: unknown) {
    super(message); this.name = "CardCollectionError"; this.status = status; this.code = code; this.data = data;
  }
}

const ROOT = "card-collection";
const clean = (value: unknown, max = 2048) => String(value ?? "").trim().slice(0, max);
const nowIso = () => new Date().toISOString();
const safePart = (value: string) => clean(value, 180).replace(/[^a-zA-Z0-9_-]/g, "_");
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function normalizePhone(value: unknown) { return clean(value, 80).replace(/[^0-9+]/g, "").replace(/^\+8860?/, "0"); }
export function normalizeEmail(value: unknown) { return clean(value, 320).toLowerCase(); }
export function normalizeNameCompany(name: unknown, company: unknown) {
  return `${clean(name, 160)}|${clean(company, 240)}`.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}
function bucket(env: CardCollectionEnv) {
  if (!env.ASSETS_BUCKET) throw new CardCollectionError("R2 bucket is not configured", 500, "r2_unavailable");
  return env.ASSETS_BUCKET;
}
async function readJson<T>(env: CardCollectionEnv, key: string): Promise<T | null> {
  const object = await bucket(env).get(key); return object ? object.json<T>().catch(() => null) : null;
}
async function writeJson(env: CardCollectionEnv, key: string, value: unknown) {
  await bucket(env).put(key, JSON.stringify(value), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "no-store" } });
}
const ownerRoot = (owner: string) => `${ROOT}/users/${safePart(owner)}`;
const importRoot = (owner: string, id: string) => `${ROOT}/imports/${safePart(owner)}/${safePart(id)}`;
const importKey = (owner: string, id: string) => `${ROOT}/imports/${safePart(owner)}/${safePart(id)}.json`;
const cardKey = (owner: string, id: string) => `${ownerRoot(owner)}/cards/${safePart(id)}.json`;
const cardFrontKey = (owner: string, id: string) => `${ownerRoot(owner)}/cards/${safePart(id)}/front.webp`;
const indexKey = (owner: string) => `${ownerRoot(owner)}/index.json`;
function normalizeIndustry(value: ContactCardInput["industry"]): IndustryValue {
  const primary = clean(value?.primary, 80);
  const secondary = Array.isArray(value?.secondary) ? value.secondary.map((item) => clean(item, 80)).filter((item, i, all) => item && item !== primary && all.indexOf(item) === i).slice(0, 2) : [];
  return { primary, secondary };
}
function cardValues(input: ContactCardInput) {
  const displayName = clean(input.displayName, 160), companyName = clean(input.companyName, 240);
  const mobile = clean(input.mobile, 80), email = clean(input.email, 320);
  return {
    displayName, englishName: clean(input.englishName, 160), companyName,
    jobTitle: clean(input.jobTitle, 160), department: clean(input.department, 160), mobile,
    companyPhone: clean(input.companyPhone, 80), email, websiteUrl: clean(input.websiteUrl, 2048),
    lineUrl: clean(input.lineUrl, 2048), address: clean(input.address, 500),
    serviceDescription: clean(input.serviceDescription, 3000), note: clean(input.note, 3000),
    normalizedMobile: normalizePhone(mobile), normalizedEmail: normalizeEmail(email),
    normalizedNameCompany: normalizeNameCompany(displayName, companyName), industry: normalizeIndustry(input.industry)
  };
}
async function ownerIndex(env: CardCollectionEnv, owner: string) { return (await readJson<string[]>(env, indexKey(owner))) || []; }
async function writeOwnerIndex(env: CardCollectionEnv, owner: string, ids: string[]) { await writeJson(env, indexKey(owner), Array.from(new Set(ids.map(safePart).filter(Boolean)))); }

export async function createCardImport(env: CardCollectionEnv, owner: string, front: { bytes: ArrayBuffer; contentType: string }, back?: { bytes: ArrayBuffer; contentType: string }) {
  const id = makeId("imp"), root = importRoot(owner, id), frontKey = `${root}/front.webp`, backKey = back ? `${root}/back.webp` : "";
  await bucket(env).put(frontKey, front.bytes, { httpMetadata: { contentType: front.contentType, cacheControl: "private, no-store" } });
  if (back && backKey) await bucket(env).put(backKey, back.bytes, { httpMetadata: { contentType: back.contentType, cacheControl: "private, no-store" } });
  const stamp = nowIso();
  const record: CardImportRecord = { id, ownerLineUserId: owner, status: "received", frontKey, backKey, frontContentType: front.contentType, ocr: null, createdAt: stamp, updatedAt: stamp };
  await writeJson(env, importKey(owner, id), record); return record;
}
export async function getCardImport(env: CardCollectionEnv, owner: string, eventId: string) {
  const record = await readJson<CardImportRecord>(env, importKey(owner, eventId));
  if (!record || record.ownerLineUserId !== owner) throw new CardCollectionError("找不到名片匯入資料", 404, "import_not_found");
  return record;
}
export async function getCardImportImages(env: CardCollectionEnv, owner: string, eventId: string) {
  const record = await getCardImport(env, owner, eventId), front = await bucket(env).get(record.frontKey);
  if (!front) throw new CardCollectionError("找不到名片正面圖片", 404, "front_image_not_found");
  return { record, front, back: record.backKey ? await bucket(env).get(record.backKey) : null };
}
export async function saveCardImportOcr(env: CardCollectionEnv, owner: string, eventId: string, ocr: CardOcrFields) {
  const record = await getCardImport(env, owner, eventId), next: CardImportRecord = { ...record, status: "recognized", ocr, updatedAt: nowIso() };
  await writeJson(env, importKey(owner, eventId), next); return next;
}
export async function failCardImport(env: CardCollectionEnv, owner: string, eventId: string) {
  const record = await getCardImport(env, owner, eventId);
  await writeJson(env, importKey(owner, eventId), { ...record, status: "failed", updatedAt: nowIso() });
}
export async function getContactCard(env: CardCollectionEnv, owner: string, cardId: string, includeArchived = false) {
  const card = await readJson<ContactCardRecord>(env, cardKey(owner, cardId));
  if (!card || card.ownerLineUserId !== owner || (!includeArchived && card.status !== "active")) throw new CardCollectionError("找不到收藏名片", 404, "card_not_found");
  return card;
}
export async function listContactCards(env: CardCollectionEnv, owner: string, search = "", industry = "") {
  const cards = (await Promise.all((await ownerIndex(env, owner)).map((id) => readJson<ContactCardRecord>(env, cardKey(owner, id)))))
    .filter((card): card is ContactCardRecord => Boolean(card && card.ownerLineUserId === owner && card.status === "active"));
  const needle = clean(search, 240).toLowerCase(), industryNeedle = clean(industry, 80);
  return cards.filter((card) => (!needle || [card.displayName, card.companyName, card.jobTitle, card.mobile, card.companyPhone, card.email].some((value) => value.toLowerCase().includes(needle))) && (!industryNeedle || card.industry.primary === industryNeedle || card.industry.secondary.includes(industryNeedle))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function findDuplicateCard(env: CardCollectionEnv, owner: string, input: ContactCardInput) {
  const normalized = cardValues(input), cards = await listContactCards(env, owner);
  return cards.find((card) => Boolean(normalized.normalizedMobile && card.normalizedMobile === normalized.normalizedMobile) || Boolean(normalized.normalizedEmail && card.normalizedEmail === normalized.normalizedEmail) || Boolean(normalized.normalizedNameCompany && card.normalizedNameCompany === normalized.normalizedNameCompany)) || null;
}
async function copyImportFront(env: CardCollectionEnv, record: CardImportRecord, targetKey: string) {
  const source = await bucket(env).get(record.frontKey);
  if (!source) throw new CardCollectionError("找不到名片正面圖片", 404, "front_image_not_found");
  await bucket(env).put(targetKey, await source.arrayBuffer(), { httpMetadata: { contentType: record.frontContentType || "image/webp", cacheControl: "private, no-store" } });
}
export async function confirmCardImport(env: CardCollectionEnv, owner: string, eventId: string, input: ContactCardInput, duplicateAction = "") {
  const imported = await getCardImport(env, owner, eventId);
  if (imported.status !== "recognized") throw new CardCollectionError("請先完成名片辨識", 409, "import_not_recognized");
  const duplicate = await findDuplicateCard(env, owner, input);
  if (duplicate && duplicateAction !== "update") throw new CardCollectionError("這張名片已在收藏名單中", 409, "duplicate_contact", duplicate);
  const stamp = nowIso(); let card: ContactCardRecord; let updated = false;
  if (duplicate) {
    const frontKey = cardFrontKey(owner, duplicate.id); await copyImportFront(env, imported, frontKey);
    card = { ...duplicate, ...cardValues(input), sourceEventId: eventId, frontKey, frontContentType: imported.frontContentType, updatedAt: stamp };
    await writeJson(env, cardKey(owner, duplicate.id), card); updated = true;
  } else {
    const id = makeId("card"), frontKey = cardFrontKey(owner, id); await copyImportFront(env, imported, frontKey);
    card = { id, ownerLineUserId: owner, sourceEventId: eventId, ...cardValues(input), frontKey, frontContentType: imported.frontContentType, status: "active", rewardPoints: 10, rewardStatus: "pending", rewardUpdatedAt: stamp, createdAt: stamp, updatedAt: stamp };
    await writeJson(env, cardKey(owner, id), card); await writeOwnerIndex(env, owner, [...await ownerIndex(env, owner), id]);
  }
  await bucket(env).delete([imported.frontKey, imported.backKey].filter(Boolean));
  await writeJson(env, importKey(owner, eventId), { ...imported, status: "confirmed", updatedAt: stamp });
  return { card, updated };
}
export async function updateContactCardReward(env: CardCollectionEnv, owner: string, cardId: string, rewardStatus: ContactCardRecord["rewardStatus"], rewardPoints = 10) {
  const current = await getContactCard(env, owner, cardId, true), stamp = nowIso();
  const next: ContactCardRecord = { ...current, rewardPoints, rewardStatus, rewardUpdatedAt: stamp, updatedAt: stamp };
  await writeJson(env, cardKey(owner, cardId), next); return next;
}
export async function updateContactCard(env: CardCollectionEnv, owner: string, cardId: string, patch: ContactCardInput) {
  const current = await getContactCard(env, owner, cardId), next: ContactCardRecord = { ...current, ...cardValues({ ...current, ...patch }), updatedAt: nowIso() };
  await writeJson(env, cardKey(owner, cardId), next); return next;
}
export async function getContactCardImage(env: CardCollectionEnv, owner: string, cardId: string) {
  const card = await getContactCard(env, owner, cardId); return card.frontKey ? bucket(env).get(card.frontKey) : null;
}
export async function archiveContactCard(env: CardCollectionEnv, owner: string, cardId: string) {
  const current = await getContactCard(env, owner, cardId); if (current.frontKey) await bucket(env).delete(current.frontKey);
  const next: ContactCardRecord = { ...current, frontKey: "", status: "archived", updatedAt: nowIso() };
  await writeJson(env, cardKey(owner, cardId), next); return next;
}
