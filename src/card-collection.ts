export type CardCollectionSettings = {
  collectionEnabled: boolean;
  rewardEnabled: boolean;
  rewardPoints: number;
  dailyRewardLimit: number;
  updatedAt: string;
  updatedBy: string;
};

export type ContactCardInput = {
  displayName?: string;
  companyName?: string;
  jobTitle?: string;
  mobile?: string;
  email?: string;
  lineUrl?: string;
  websiteUrl?: string;
  address?: string;
  note?: string;
};

export type ContactCardRecord = {
  id: string;
  ownerLineUserId: string;
  displayName: string;
  companyName: string;
  jobTitle: string;
  mobile: string;
  email: string;
  lineUrl: string;
  websiteUrl: string;
  address: string;
  note: string;
  normalizedMobile: string;
  normalizedEmail: string;
  normalizedNameCompany: string;
  sourceType: "manual";
  status: "active" | "archived";
  rewardStatus: "disabled" | "pending" | "completed" | "failed" | "cancelled";
  rewardPoints: number;
  createdAt: string;
  updatedAt: string;
};

type CardCollectionEnv = {
  ASSETS_BUCKET?: R2Bucket;
};

type RewardRecord = {
  cardId: string;
  ownerLineUserId: string;
  points: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  attempts: number;
  lastError: string;
  createdAt: string;
  updatedAt: string;
};

const SETTINGS_KEY = "card-collection/settings.json";
const CARD_PREFIX = "card-collection/users";
const REWARD_QUEUE_KEY = "card-collection/reward-queue.json";

const DEFAULT_SETTINGS: CardCollectionSettings = {
  collectionEnabled: true,
  rewardEnabled: false,
  rewardPoints: 10,
  dailyRewardLimit: 0,
  updatedAt: "",
  updatedBy: ""
};

const clean = (value: unknown, max = 1000) =>
  String(value ?? "").trim().slice(0, max);

const nowIso = () => new Date().toISOString();

function safeOwnerId(value: string) {
  return clean(value, 160).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizePhone(value: unknown) {
  return clean(value, 60)
    .replace(/[^0-9+]/g, "")
    .replace(/^\+8860?/, "0");
}

function normalizeEmail(value: unknown) {
  return clean(value, 320).toLowerCase();
}

function normalizeNameCompany(name: unknown, company: unknown) {
  return `${clean(name, 120)}|${clean(company, 180)}`
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

async function readJson<T>(
  env: CardCollectionEnv,
  key: string,
  fallback: T
): Promise<T> {
  if (!env.ASSETS_BUCKET) return fallback;

  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return fallback;

  return object.json<T>().catch(() => fallback);
}

async function writeJson(
  env: CardCollectionEnv,
  key: string,
  value: unknown
) {
  if (!env.ASSETS_BUCKET) {
    throw new Error("R2 bucket is not configured");
  }

  await env.ASSETS_BUCKET.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store"
    }
  });
}

function settingsFrom(value: Partial<CardCollectionSettings>) {
  const points = Math.max(0, Math.min(100000, Number(value.rewardPoints) || 0));
  const dailyLimit = Math.max(
    0,
    Math.min(1000, Number(value.dailyRewardLimit) || 0)
  );

  return {
    collectionEnabled: value.collectionEnabled !== false,
    rewardEnabled: value.rewardEnabled === true,
    rewardPoints: Math.trunc(points),
    dailyRewardLimit: Math.trunc(dailyLimit),
    updatedAt: clean(value.updatedAt, 80),
    updatedBy: clean(value.updatedBy, 160)
  } satisfies CardCollectionSettings;
}

function ownerIndexKey(ownerLineUserId: string) {
  return `${CARD_PREFIX}/${safeOwnerId(ownerLineUserId)}/index.json`;
}

function cardKey(ownerLineUserId: string, cardId: string) {
  return `${CARD_PREFIX}/${safeOwnerId(ownerLineUserId)}/cards/${cardId}.json`;
}

function ownerRewardKey(ownerLineUserId: string) {
  return `${CARD_PREFIX}/${safeOwnerId(ownerLineUserId)}/rewards.json`;
}

export async function getCardCollectionSettings(
  env: CardCollectionEnv
): Promise<CardCollectionSettings> {
  const stored = await readJson<Partial<CardCollectionSettings>>(
    env,
    SETTINGS_KEY,
    DEFAULT_SETTINGS
  );

  return settingsFrom({ ...DEFAULT_SETTINGS, ...stored });
}

export async function updateCardCollectionSettings(
  env: CardCollectionEnv,
  patch: Partial<CardCollectionSettings>,
  updatedBy: string
) {
  const current = await getCardCollectionSettings(env);
  const next = settingsFrom({
    ...current,
    ...patch,
    updatedAt: nowIso(),
    updatedBy
  });

  await writeJson(env, SETTINGS_KEY, next);

  let cancelledRewards = 0;

  if (current.rewardEnabled && !next.rewardEnabled) {
    const queue = await readJson<RewardRecord[]>(env, REWARD_QUEUE_KEY, []);
    const updatedQueue = queue.map((record) => {
      if (record.status !== "pending") return record;
      cancelledRewards += 1;
      return {
        ...record,
        status: "cancelled" as const,
        lastError: "業主已關閉收藏贈點",
        updatedAt: nowIso()
      };
    });

    await writeJson(env, REWARD_QUEUE_KEY, updatedQueue);
  }

  return { settings: next, cancelledRewards };
}

export async function listContactCards(
  env: CardCollectionEnv,
  ownerLineUserId: string
) {
  const ids = await readJson<string[]>(
    env,
    ownerIndexKey(ownerLineUserId),
    []
  );

  const cards = await Promise.all(
    ids.slice(0, 500).map((id) =>
      readJson<ContactCardRecord | null>(
        env,
        cardKey(ownerLineUserId, id),
        null
      )
    )
  );

  return cards
    .filter(
      (card): card is ContactCardRecord =>
        Boolean(card && card.status === "active")
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function duplicateMatch(
  existing: ContactCardRecord,
  normalizedMobile: string,
  normalizedEmail: string,
  normalizedNameCompany: string
) {
  return Boolean(
    (normalizedMobile && existing.normalizedMobile === normalizedMobile) ||
      (normalizedEmail && existing.normalizedEmail === normalizedEmail) ||
      (normalizedNameCompany &&
        existing.normalizedNameCompany === normalizedNameCompany)
  );
}

export async function createManualContactCard(
  env: CardCollectionEnv,
  ownerLineUserId: string,
  input: ContactCardInput
) {
  const settings = await getCardCollectionSettings(env);

  if (!settings.collectionEnabled) {
    const error = new Error("業主目前已關閉名片收藏功能");
    (error as Error & { code?: string }).code = "collection_disabled";
    throw error;
  }

  const displayName = clean(input.displayName, 120);
  if (!displayName) throw new Error("請輸入名片姓名");

  const companyName = clean(input.companyName, 180);
  const normalizedMobile = normalizePhone(input.mobile);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedNameCompany = normalizeNameCompany(
    displayName,
    companyName
  );

  const existing = await listContactCards(env, ownerLineUserId);
  const duplicate = existing.find((card) =>
    duplicateMatch(
      card,
      normalizedMobile,
      normalizedEmail,
      normalizedNameCompany
    )
  );

  if (duplicate) {
    return {
      created: false,
      duplicate: true,
      card: duplicate,
      settings
    };
  }

  const cardId = `contact-${crypto.randomUUID()}`;
  const timestamp = nowIso();

  const card: ContactCardRecord = {
    id: cardId,
    ownerLineUserId,
    displayName,
    companyName,
    jobTitle: clean(input.jobTitle, 120),
    mobile: clean(input.mobile, 60),
    email: clean(input.email, 320),
    lineUrl: clean(input.lineUrl, 2048),
    websiteUrl: clean(input.websiteUrl, 2048),
    address: clean(input.address, 300),
    note: clean(input.note, 1000),
    normalizedMobile,
    normalizedEmail,
    normalizedNameCompany,
    sourceType: "manual",
    status: "active",
    rewardStatus:
      settings.rewardEnabled && settings.rewardPoints > 0
        ? "pending"
        : "disabled",
    rewardPoints:
      settings.rewardEnabled && settings.rewardPoints > 0
        ? settings.rewardPoints
        : 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const indexKey = ownerIndexKey(ownerLineUserId);
  const ids = await readJson<string[]>(env, indexKey, []);

  await writeJson(env, cardKey(ownerLineUserId, cardId), card);
  await writeJson(env, indexKey, [cardId, ...ids.filter((id) => id !== cardId)]);

  return {
    created: true,
    duplicate: false,
    card,
    settings
  };
}

export async function archiveContactCard(
  env: CardCollectionEnv,
  ownerLineUserId: string,
  cardId: string
) {
  const key = cardKey(ownerLineUserId, cardId);
  const card = await readJson<ContactCardRecord | null>(env, key, null);

  if (!card || card.ownerLineUserId !== ownerLineUserId) {
    throw new Error("找不到收藏名片");
  }

  const next = {
    ...card,
    status: "archived" as const,
    updatedAt: nowIso()
  };

  await writeJson(env, key, next);
  return next;
}

export async function prepareCardCollectionReward(
  env: CardCollectionEnv,
  card: ContactCardRecord
) {
  const settings = await getCardCollectionSettings(env);

  if (!settings.rewardEnabled || settings.rewardPoints <= 0) {
    return {
      eligible: false,
      reason: "reward_disabled",
      points: 0
    };
  }

  const rewards = await readJson<RewardRecord[]>(
    env,
    ownerRewardKey(card.ownerLineUserId),
    []
  );

  const previous = rewards.find((record) => record.cardId === card.id);
  if (previous) {
    return {
      eligible: false,
      reason: "already_recorded",
      points: previous.points,
      record: previous
    };
  }

  if (settings.dailyRewardLimit > 0) {
    const today = nowIso().slice(0, 10);
    const todayCount = rewards.filter(
      (record) =>
        record.createdAt.slice(0, 10) === today &&
        record.status !== "cancelled"
    ).length;

    if (todayCount >= settings.dailyRewardLimit) {
      return {
        eligible: false,
        reason: "daily_limit_reached",
        points: 0
      };
    }
  }

  const record: RewardRecord = {
    cardId: card.id,
    ownerLineUserId: card.ownerLineUserId,
    points: settings.rewardPoints,
    status: "pending",
    attempts: 0,
    lastError: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await writeJson(
    env,
    ownerRewardKey(card.ownerLineUserId),
    [record, ...rewards]
  );

  const queue = await readJson<RewardRecord[]>(env, REWARD_QUEUE_KEY, []);
  await writeJson(env, REWARD_QUEUE_KEY, [
    record,
    ...queue.filter(
      (item) =>
        !(
          item.cardId === card.id &&
          item.ownerLineUserId === card.ownerLineUserId
        )
    )
  ]);

  return {
    eligible: true,
    reason: "pending",
    points: record.points,
    record
  };
}

export async function finishCardCollectionReward(
  env: CardCollectionEnv,
  ownerLineUserId: string,
  cardId: string,
  success: boolean,
  errorMessage = ""
) {
  const rewardKey = ownerRewardKey(ownerLineUserId);
  const rewards = await readJson<RewardRecord[]>(env, rewardKey, []);
  const timestamp = nowIso();

  const nextRewards = rewards.map((record) =>
    record.cardId === cardId
      ? {
          ...record,
          status: success ? ("completed" as const) : ("failed" as const),
          attempts: record.attempts + 1,
          lastError: success ? "" : clean(errorMessage, 300),
          updatedAt: timestamp
        }
      : record
  );

  await writeJson(env, rewardKey, nextRewards);

  const queue = await readJson<RewardRecord[]>(env, REWARD_QUEUE_KEY, []);
  const nextQueue = queue.map((record) =>
    record.cardId === cardId &&
    record.ownerLineUserId === ownerLineUserId
      ? {
          ...record,
          status: success ? ("completed" as const) : ("failed" as const),
          attempts: record.attempts + 1,
          lastError: success ? "" : clean(errorMessage, 300),
          updatedAt: timestamp
        }
      : record
  );

  await writeJson(env, REWARD_QUEUE_KEY, nextQueue);

  const key = cardKey(ownerLineUserId, cardId);
  const card = await readJson<ContactCardRecord | null>(env, key, null);

  if (card) {
    await writeJson(env, key, {
      ...card,
      rewardStatus: success ? "completed" : "failed",
      updatedAt: timestamp
    });
  }
}
