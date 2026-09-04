export type MemberType = "general" | "association" | "vendor";
export type MemberRow = Record<string, unknown>;

export type ResolvedMembership = {
  type: MemberType;
  memberNo: string;
  displayName: string;
  active: boolean;
  loginAllowed: boolean;
  updatedAt: string;
};

export type MemberIdentity = {
  memberId: string;
  lineUserId: string;
  displayName: string;
  active: boolean;
  memberships: ResolvedMembership[];
  source: "manager/state.json";
  identityVersion: 1;
};

export type MemberIdentityResolution =
  | { status: "found"; identity: MemberIdentity }
  | { status: "not_found" }
  | {
      status: "conflict";
      candidates: Array<Pick<ResolvedMembership, "type" | "memberNo" | "displayName">>;
    };

const TYPES = ["general", "association", "vendor"] as const;
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const memberNoOf = (row: MemberRow) => clean(row.memberNo || row.rosterMemberNo || row.member_no, 100).toUpperCase();
const rowIdOf = (row: MemberRow) => clean(row.id || row.rosterId || row.roster_id, 160);
const designUserIdOf = (row: MemberRow) => clean(row.tdeaDesignUserId || row.tdea_design_user_id, 160);
const lineUidOf = (row: MemberRow) => clean(row.lineUserId || row.LINE_user_id || row.uid || row.lineUid || row.line_user_id, 256);

function rowsOf(data: Record<string, unknown>, type: MemberType): MemberRow[] {
  return Array.isArray(data[type])
    ? (data[type] as unknown[]).filter(
        (row): row is MemberRow => Boolean(row) && typeof row === "object" && !Array.isArray(row)
      )
    : [];
}

function timestampOf(row: MemberRow) {
  return clean(row.updatedAt || row.updated_at || row.modifiedAt || row.modified_at || row.createdAt || row.created_at, 80);
}

function timestampValue(row: MemberRow) {
  const parsed = Date.parse(timestampOf(row));
  return Number.isFinite(parsed) ? parsed : 0;
}

function completeness(row: MemberRow): number {
  return Object.values(row).reduce<number>((score, value) => score + (clean(value) ? 1 : 0), 0);
}

function preferRow(current: MemberRow, candidate: MemberRow) {
  const timeDelta = timestampValue(candidate) - timestampValue(current);
  if (timeDelta) return timeDelta > 0 ? candidate : current;
  return completeness(candidate) > completeness(current) ? candidate : current;
}

function displayNameOf(row: MemberRow, type: MemberType) {
  if (type === "vendor") {
    return clean(row.companyName || row.company || row.name || row.rosterName || row.displayName, 240);
  }
  return clean(row.name || row.rosterName || row.memberName || row.displayName, 240);
}

function trueFlag(value: unknown) {
  if (value === true) return true;
  return ["1", "TRUE", "Y", "YES", "ALLOW", "ALLOWED", "ACTIVE", "啟用", "允許"]
    .includes(clean(value, 30).toUpperCase());
}

function loginAllowed(row: MemberRow) {
  return [row.loginAccess, row.loginAllowed, row.allowLogin, row.canLogin, row.adminAccess].some(trueFlag);
}

function membershipActive(row: MemberRow) {
  const qualification = clean(row.qualification || row.memberStatus || row.member_status || row.status, 30).toUpperCase();
  if (!qualification) return true;
  return !["0", "N", "NO", "FALSE", "INACTIVE", "DISABLED", "SUSPENDED", "停用", "失效", "取消"]
    .includes(qualification);
}

function membershipKey(row: MemberRow, type: MemberType) {
  const memberNo = memberNoOf(row);
  if (memberNo) return `${type}:member:${memberNo}`;
  const id = rowIdOf(row) || designUserIdOf(row);
  return id ? `${type}:id:${id}` : "";
}

function stableMemberId(row: MemberRow, type: MemberType) {
  const designUserId = designUserIdOf(row);
  if (designUserId) return designUserId;
  const id = rowIdOf(row);
  if (id) return `tdea:${type}:id:${id}`;
  const memberNo = memberNoOf(row);
  return memberNo ? `tdea:${type}:member:${memberNo}` : "";
}

function explicitPersonKey(row: MemberRow) {
  const designUserId = designUserIdOf(row);
  return designUserId ? `design:${designUserId}` : "";
}

function toMembership(row: MemberRow, type: MemberType): ResolvedMembership {
  return {
    type,
    memberNo: memberNoOf(row),
    displayName: displayNameOf(row, type),
    active: membershipActive(row),
    loginAllowed: loginAllowed(row),
    updatedAt: timestampOf(row)
  };
}

export function resolveMemberIdentity(
  data: Record<string, unknown>,
  requestedLineUserId: string
): MemberIdentityResolution {
  const lineUserId = clean(requestedLineUserId, 256);
  const normalizedUid = lineUserId.toLowerCase();
  if (!normalizedUid) return { status: "not_found" };

  const matches: Array<{ type: MemberType; row: MemberRow }> = [];
  for (const type of TYPES) {
    const deduplicated = new Map<string, MemberRow>();
    for (const row of rowsOf(data, type)) {
      if (lineUidOf(row).toLowerCase() !== normalizedUid) continue;
      const key = membershipKey(row, type);
      if (!key) continue;
      const previous = deduplicated.get(key);
      deduplicated.set(key, previous ? preferRow(previous, row) : row);
    }
    for (const row of deduplicated.values()) matches.push({ type, row });
  }

  if (!matches.length) return { status: "not_found" };

  // Multiple distinct records are merged only when TDEA already assigned the
  // same explicit cross-system person id. A shared LINE UID alone is not proof
  // that the records belong to the same person.
  if (matches.length > 1) {
    const personKeys = new Set(matches.map(({ row }) => explicitPersonKey(row)).filter(Boolean));
    if (personKeys.size !== 1 || matches.some(({ row }) => !explicitPersonKey(row))) {
      return {
        status: "conflict",
        candidates: matches.map(({ type, row }) => {
          const membership = toMembership(row, type);
          return {
            type: membership.type,
            memberNo: membership.memberNo,
            displayName: membership.displayName
          };
        })
      };
    }
  }

  const memberships = matches
    .map(({ type, row }) => toMembership(row, type))
    .sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type));
  const primary = matches[0];
  const memberId = stableMemberId(primary.row, primary.type);

  return {
    status: "found",
    identity: {
      memberId,
      lineUserId,
      displayName: memberships.find((membership) => membership.displayName)?.displayName || "",
      active: memberships.some((membership) => membership.active),
      memberships,
      source: "manager/state.json",
      identityVersion: 1
    }
  };
}
