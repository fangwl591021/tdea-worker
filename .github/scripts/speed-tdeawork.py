from pathlib import Path
import re

# monthly-entry.ts has legacy/mixed line endings: byte-level targeted replacements only.
p = Path('src/monthly-entry.ts')
b = p.read_bytes()

old_url = b'https://tdea-design.internal/internal/tdea/points/adjust'
new_url = b'https://tdea-design.internal/internal/tdea/points/adjust?compact=1'
if old_url in b:
    b = b.replace(old_url, new_url, 1)
elif new_url not in b:
    raise SystemExit('compact point adjustment URL anchor missing')

old_balance = b'const balanceAfter = numberValue(wallet.balance || entry.balanceAfter || entry.balance_after);'
new_balance = b'const balanceAfter = numberValue(result.balance ?? wallet.balance ?? entry.balanceAfter ?? entry.balance_after);'
if old_balance in b:
    b = b.replace(old_balance, new_balance, 1)
elif new_balance not in b:
    raise SystemExit('balance parser anchor missing')

start = b.find(b'async function resolveTdeaRegisteredIdentity(env: Env, lineUserId: string) {')
end_marker = b'async function syncCheckinPoints(env: Env, entry: RegistrationEntry) {'
end = b.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('registered identity function boundary missing')
new_func = '''async function resolveTdeaRegisteredIdentity(env: Env, lineUserId: string) {
  if (!lineUserId) return { success: false, registered: false, message: "缺少 LINE UID" };
  if (!env.TDEA_DESIGN || !env.TDEA_INTERNAL_SECRET) return { success: false, registered: false, message: "TDEA 會員服務尚未設定" };
  const response = await env.TDEA_DESIGN.fetch(`https://tdea-design.internal/internal/tdea/member/${encodeURIComponent(lineUserId)}`, {
    method: "GET",
    headers: { "x-tdea-internal-secret": env.TDEA_INTERNAL_SECRET, accept: "application/json" }
  });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || result.success !== true) return { success: false, registered: false, message: clean(result.error) || "TDEA 會員服務讀取失敗" };
  const member = asRecord(result.member);
  if (result.registered !== true || !clean(member.profileCompletedAt)) return { success: true, registered: false, member };
  return { success: true, registered: true, member, identity: registrationIdentityFromTdeaMember(member, lineUserId) };
}

'''.encode('utf-8')
b = b[:start] + new_func + b[end:]
p.write_bytes(b)

# Frontend: form payload and LIFF login load concurrently.
p = Path('public/native-form.js')
s = p.read_text(encoding='utf-8')
old = '''    renderLoading("載入報名表...");
    const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "找不到報名表");
    const form = result.data || {};
    const activity = form.activity || {};
    const sessions = Array.isArray(form.sessions) ? form.sessions : [];
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const activityFields = fields.filter((field) => !isRegistrationProfileField(field));
    const image = activity.posterUrl || activity.imageUrl || "";

    renderLoading("確認 TDEA 會員註冊狀態...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE 開啟活動報名頁並完成登入。");'''
new = '''    renderLoading("正在開啟活動報名...");
    const formPromise = fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json().catch(() => ({})) }));
    const uidPromise = loadLiff({ login: true });
    const [{ response, result }, uid] = await Promise.all([formPromise, uidPromise]);
    if (!response.ok || !result.success) return renderError(result.message || "找不到報名表");
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE 開啟活動報名頁並完成登入。");
    const form = result.data || {};
    const activity = form.activity || {};
    const sessions = Array.isArray(form.sessions) ? form.sessions : [];
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const activityFields = fields.filter((field) => !isRegistrationProfileField(field));
    const image = activity.posterUrl || activity.imageUrl || "";'''
if old in s:
    s = s.replace(old, new, 1)
elif 'const formPromise = fetch(' not in s:
    raise SystemExit('showRegister parallel-load anchor missing')
p.write_text(s, encoding='utf-8', newline='')
