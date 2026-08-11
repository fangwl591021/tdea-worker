export type TdeaMemberType =
  | "general"
  | "association"
  | "vendor";

export type TdeaIdentityVerificationSource =
  | "self_registration"
  | "association_crm"
  | "vendor_crm";

export type TdeaIdentityProfile = {
  lineUserId: string;
  lineDisplayName: string;
  pictureUrl: string;

  name: string;
  phone: string;
  email: string;

  memberType: TdeaMemberType;
  memberNo: string;

  verified: boolean;
  verifiedSource: TdeaIdentityVerificationSource;

  createdAt: string;
  updatedAt: string;
};

export type TdeaIdentityInput = {
  lineUserId?: string;
  lineDisplayName?: string;
  pictureUrl?: string;

  name?: string;
  phone?: string;
  email?: string;

  memberType?: string;
  memberNo?: string;
};

type IdentityEnv = {
  ASSETS_BUCKET?: R2Bucket;
};

const identityPrefix = "identity/profiles/";

const clean = (value: unknown, max = 500) =>
  String(value ?? "").trim().slice(0, max);

function safeLineUserId(value: string) {
  return clean(value, 200).replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );
}

export function normalizeIdentityPhone(value: unknown) {
  return clean(value, 60)
    .replace(/[^\d+]/g, "")
    .replace(/^\+8860?/, "0");
}

export function normalizeMemberType(
  value: unknown
): TdeaMemberType | "" {
  const type = clean(value, 40).toLowerCase();

  if (type === "general") return "general";
  if (type === "association") return "association";
  if (type === "vendor") return "vendor";

  return "";
}

export function identityProfileKey(
  lineUserId: string
) {
  const uid = safeLineUserId(lineUserId);
  if (!uid) throw new Error("LINE UID is required");

  return `${identityPrefix}${uid}.json`;
}

export function validateIdentityInput(
  input: TdeaIdentityInput
) {
  const lineUserId = clean(input.lineUserId, 200);
  const name = clean(input.name, 120);
  const phone = normalizeIdentityPhone(input.phone);
  const email = clean(input.email, 320).toLowerCase();
  const memberType = normalizeMemberType(
    input.memberType
  );
  const memberNo = clean(
    input.memberNo,
    100
  ).toUpperCase();

  if (!lineUserId) {
    return {
      success: false as const,
      code: "missing_line_user_id",
      message: "缺少 LINE 使用者身份"
    };
  }

  if (!name) {
    return {
      success: false as const,
      code: "missing_name",
      message: "請輸入姓名"
    };
  }

  if (!phone) {
    return {
      success: false as const,
      code: "missing_phone",
      message: "請輸入電話"
    };
  }

  if (!memberType) {
    return {
      success: false as const,
      code: "missing_member_type",
      message: "請選擇會員身分"
    };
  }

  if (
    (memberType === "association" ||
      memberType === "vendor") &&
    !memberNo
  ) {
    return {
      success: false as const,
      code: "missing_member_no",
      message: "此會員身分必須填寫會員編號"
    };
  }

  return {
    success: true as const,
    data: {
      lineUserId,
      lineDisplayName: clean(
        input.lineDisplayName,
        120
      ),
      pictureUrl: clean(
        input.pictureUrl,
        2048
      ),
      name,
      phone,
      email,
      memberType,
      memberNo:
        memberType === "general"
          ? ""
          : memberNo
    }
  };
}

export async function getIdentityProfile(
  env: IdentityEnv,
  lineUserId: string
): Promise<TdeaIdentityProfile | null> {
  if (!env.ASSETS_BUCKET) {
    throw new Error(
      "R2 bucket is not configured"
    );
  }

  const uid = clean(lineUserId, 200);
  if (!uid) return null;

  const object = await env.ASSETS_BUCKET.get(
    identityProfileKey(uid)
  );

  if (!object) return null;

  const profile =
    await object.json<TdeaIdentityProfile>()
      .catch(() => null);

  if (!profile) return null;

  return profile;
}

export async function saveIdentityProfile(
  env: IdentityEnv,
  profile: TdeaIdentityProfile
) {
  if (!env.ASSETS_BUCKET) {
    throw new Error(
      "R2 bucket is not configured"
    );
  }

  if (!profile.lineUserId) {
    throw new Error(
      "LINE UID is required"
    );
  }

  await env.ASSETS_BUCKET.put(
    identityProfileKey(profile.lineUserId),
    JSON.stringify(profile, null, 2),
    {
      httpMetadata: {
        contentType:
          "application/json; charset=utf-8",
        cacheControl: "no-store"
      }
    }
  );

  return profile;
}

export function buildGeneralIdentityProfile(
  input: ReturnType<
    typeof validateIdentityInput
  >
) {
  if (!input.success) {
    throw new Error(input.message);
  }

  if (input.data.memberType !== "general") {
    throw new Error(
      "This helper is only for general members"
    );
  }

  const now = new Date().toISOString();

  return {
    ...input.data,
    memberType: "general" as const,
    memberNo: "",
    verified: true,
    verifiedSource:
      "self_registration" as const,
    createdAt: now,
    updatedAt: now
  } satisfies TdeaIdentityProfile;
}

export type IdentityCrmMember = {
  rosterType: "association" | "vendor";
  memberNo: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  role?: string;
  lineUserId?: string;
  raw?: Record<string, unknown>;
};

export type IdentityCrmVerifyResult =
  | {
      success: true;
      member: IdentityCrmMember;
    }
  | {
      success: false;
      code:
        | "member_not_found"
        | "name_mismatch"
        | "phone_mismatch"
        | "crm_unavailable";
      message: string;
    };

function normalizedCompareText(value: unknown) {
  return clean(value, 200)
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizedComparePhone(value: unknown) {
  return normalizeIdentityPhone(value);
}

export function verifyIdentityAgainstCrmMember(
  input: TdeaIdentityInput,
  crmMember: IdentityCrmMember | null,
  expectedRosterType: "association" | "vendor"
): IdentityCrmVerifyResult {
  if (!crmMember) {
    return {
      success: false,
      code: "member_not_found",
      message: "查無此會員編號"
    };
  }

  if (crmMember.rosterType !== expectedRosterType) {
    return {
      success: false,
      code: "member_not_found",
      message: "會員身分與 CRM 資料不一致"
    };
  }

  const inputMemberNo = clean(
    input.memberNo,
    100
  ).toUpperCase();

  const crmMemberNo = clean(
    crmMember.memberNo,
    100
  ).toUpperCase();

  if (
    !inputMemberNo ||
    inputMemberNo !== crmMemberNo
  ) {
    return {
      success: false,
      code: "member_not_found",
      message: "查無此會員編號"
    };
  }

  const inputName = normalizedCompareText(
    input.name
  );

  const crmName = normalizedCompareText(
    crmMember.name
  );

  if (
    !inputName ||
    !crmName ||
    inputName !== crmName
  ) {
    return {
      success: false,
      code: "name_mismatch",
      message: "姓名與 CRM 資料不一致"
    };
  }

  const inputPhone = normalizedComparePhone(
    input.phone
  );

  const crmPhone = normalizedComparePhone(
    crmMember.phone
  );

  if (
    !inputPhone ||
    !crmPhone ||
    inputPhone !== crmPhone
  ) {
    return {
      success: false,
      code: "phone_mismatch",
      message: "電話與 CRM 資料不一致"
    };
  }

  return {
    success: true,
    member: crmMember
  };
}

export function buildVerifiedCrmIdentityProfile(
  input: TdeaIdentityInput,
  crmMember: IdentityCrmMember
): TdeaIdentityProfile {
  const validated =
    validateIdentityInput(input);

  if (!validated.success) {
    throw new Error(validated.message);
  }

  const expectedType =
    validated.data.memberType;

  if (
    expectedType !== "association" &&
    expectedType !== "vendor"
  ) {
    throw new Error(
      "CRM verification is only for association or vendor members"
    );
  }

  const verified =
    verifyIdentityAgainstCrmMember(
      input,
      crmMember,
      expectedType
    );

  if (!verified.success) {
    throw new Error(verified.message);
  }

  const now = new Date().toISOString();

  return {
    lineUserId: validated.data.lineUserId,
    lineDisplayName:
      validated.data.lineDisplayName,
    pictureUrl:
      validated.data.pictureUrl,

    name: clean(
      crmMember.name || validated.data.name,
      120
    ),

    phone: normalizeIdentityPhone(
      crmMember.phone ||
        validated.data.phone
    ),

    email: clean(
      crmMember.email ||
        validated.data.email,
      320
    ).toLowerCase(),

    memberType: expectedType,

    memberNo: clean(
      crmMember.memberNo,
      100
    ).toUpperCase(),

    verified: true,

    verifiedSource:
      expectedType === "association"
        ? "association_crm"
        : "vendor_crm",

    createdAt: now,
    updatedAt: now
  };
}
