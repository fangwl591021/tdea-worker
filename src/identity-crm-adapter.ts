import type { IdentityCrmMember } from "./identity-profile";

type IdentityCrmAdapterEnv = {
  ASSETS_BUCKET?: R2Bucket;
};

const managerDataKey = "manager/state.json";

const clean = (value: unknown, max = 500) =>
  String(value ?? "").trim().slice(0, max);

function firstClean(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function normalizeMemberNo(value: unknown) {
  return clean(value, 100).toUpperCase();
}

function normalizePhone(value: unknown) {
  return clean(value, 60)
    .replace(/[^\d+]/g, "")
    .replace(/^\+8860?/, "0");
}

function rowMemberNo(row: Record<string, unknown>) {
  return normalizeMemberNo(
    firstClean(
      row.memberNo,
      row.rosterMemberNo,
      row.member_no
    )
  );
}

function rowPhone(row: Record<string, unknown>) {
  return firstClean(
    row.phone,
    row.mobile,
    row.tel,
    row.telephone,
    row.contactPhone,
    row["手機"],
    row["手機號碼"],
    row["行動電話"],
    row["電話"]
  );
}

function rowLineUserId(row: Record<string, unknown>) {
  return firstClean(
    row.lineUserId,
    row.lineUid,
    row.line_uid,
    row.LINE_user_id,
    row.line_user_id,
    row.uid,
    row.UID
  );
}

function rowName(
  row: Record<string, unknown>,
  rosterType: "association" | "vendor"
) {
  return rosterType === "vendor"
    ? firstClean(
        row.companyName,
        row.rosterName,
        row.name,
        row.displayName,
        row.display_name
      )
    : firstClean(
        row.name,
        row.rosterName,
        row.memberName,
        row.displayName,
        row.display_name
      );
}

function toIdentityCrmMember(
  row: Record<string, unknown>,
  rosterType: "association" | "vendor"
): IdentityCrmMember {
  const name = rowName(row, rosterType);

  return {
    rosterType,
    memberNo: rowMemberNo(row),
    name,
    phone: rowPhone(row),
    email: firstClean(row.email, row.mail),
    company:
      rosterType === "vendor"
        ? firstClean(
            row.companyName,
            row.company,
            row.organization,
            row.unit,
            name
          )
        : firstClean(
            row.company,
            row.companyName,
            row.organization,
            row.unit
          ),
    role:
      rosterType === "vendor"
        ? "廠商會員"
        : "協會會員",
    lineUserId: rowLineUserId(row),
    raw: row
  };
}

async function readManagerData(
  env: IdentityCrmAdapterEnv
): Promise<Record<string, unknown> | null> {
  if (!env.ASSETS_BUCKET) return null;
  const object = await env.ASSETS_BUCKET.get(managerDataKey);
  if (!object) return null;
  const data = await object.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
}

export async function findIdentityCrmMemberByMemberNo(
  env: IdentityCrmAdapterEnv,
  rosterType: "association" | "vendor",
  memberNoInput: unknown
): Promise<IdentityCrmMember | null> {
  const memberNo = normalizeMemberNo(memberNoInput);
  if (!memberNo) return null;

  const managerData = await readManagerData(env);
  const rows = managerData && Array.isArray(managerData[rosterType])
    ? managerData[rosterType] as Array<Record<string, unknown>>
    : [];

  const match = rows.find((row) => rowMemberNo(row) === memberNo);
  return match ? toIdentityCrmMember(match, rosterType) : null;
}

export function crmPhoneMatches(
  inputPhone: unknown,
  crmPhone: unknown
) {
  const left = normalizePhone(inputPhone);
  const right = normalizePhone(crmPhone);

  return Boolean(
    left &&
    right &&
    left === right
  );
}
