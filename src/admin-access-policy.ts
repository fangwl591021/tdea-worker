export type AdminAccessPolicyRecord = {
  memberNo?: unknown;
  lineUserId?: unknown;
  email?: unknown;
  loginAccess?: unknown;
};

const clean = (value: unknown) => String(value ?? "").trim();
const memberNoOf = (value: unknown) => clean(value).toUpperCase();
const lineUserIdOf = (value: unknown) => clean(value).toLowerCase();
const emailOf = (value: unknown) => clean(value).toLowerCase();

export function explicitLoginAccessForRosterRow(
  records: Record<string, AdminAccessPolicyRecord>,
  row: Record<string, unknown>,
): boolean | null {
  const values = Object.values(records || {}).filter((record) => record && typeof record === "object");
  const memberNo = memberNoOf(row.memberNo || row.rosterMemberNo || row.member_no);
  const lineUserId = lineUserIdOf(row.lineUserId || row.lineUid || row.uid || row.LINE_user_id || row.line_user_id);
  const email = emailOf(row.email || row.Email || row.mail || row.user_email);

  let matched: AdminAccessPolicyRecord | undefined;
  if (memberNo) {
    matched = values.find((record) => memberNoOf(record.memberNo) === memberNo);
  }
  if (!matched && lineUserId) {
    matched = values.find((record) => lineUserIdOf(record.lineUserId) === lineUserId);
  }
  if (!matched && email) {
    matched = values.find((record) => emailOf(record.email) === email);
  }
  return matched ? matched.loginAccess === true : null;
}
