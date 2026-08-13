from pathlib import Path
import re

p = Path('public/app.js')
s = p.read_text(encoding='utf-8')

# Remove active mother roster cache/fallback state.
s = s.replace('  let motherRosterMapPromise = null;\n', '')

# Remove mother register navigation from active UI.
s = s.replace('${nav("motherRegister", "母站註冊資料")}', '')
s = s.replace('    if (state.view === "motherRegister" && !state.motherRegisterRecords && !state.motherRegisterLoading) loadMotherRegisterRecords();\n', '')
s = re.sub(r'\n    if \(state\.view === "motherRegister"\) return `[^`]*`;','',s)
s = s.replace('    if (state.view === "motherRegister") return motherRegisterRecords();\n', '')

# Remove active mother-register event bindings.
s = re.sub(r'\n    document\.querySelectorAll\("\[data-load-mother-register\]"\).*?;\n', '\n', s)
s = re.sub(r'    document\.querySelectorAll\("\[data-sync-mother-register\]"\).*?;\n', '', s)
s = re.sub(r'    document\.querySelectorAll\("\[data-capture-mother-register\]"\).*?;\n', '', s)
s = re.sub(r'    document\.querySelectorAll\("\[data-download-mother-register\]"\).*?;\n', '', s)

# Eliminate mother roster lookup and make UID resolution local-only.
pattern = re.compile(r'  async function loadMotherRosterMap\(\) \{.*?\n  \}\n  async function resolveMemberLineUidFromMother\(info\) \{.*?\n  \}\n', re.S)
replacement = '''  async function resolveMemberLineUidFromMother(info) {\n    return memberLineUid(info?.row);\n  }\n'''
if not pattern.search(s):
    raise SystemExit('mother roster resolver block not found')
s = pattern.sub(replacement, s, count=1)

# Remove legacy/mother account input from CRM profile.
old_profile = 'const profileFields = `${field("會員編號", "memberNo", x.memberNo)}${field("LINE UID", "lineUserId", memberLineUid(x), "例如：Ub68b9724664b889e790c789ece72f717")}${field("母站帳號", "aiweMemberNo", firstValue(x.aiweMemberNo, x.motherMemberNo, x.motherAccount, x.legacyAccount), "母站會員帳號")}${field("手機", "phone", firstValue(x.phone, x.mobile, x.tel), "手機")}${field("Email", "email", x.email, "會員 Email", false, "email")}`;'
new_profile = 'const profileFields = `${field("會員編號", "memberNo", x.memberNo)}${field("LINE UID", "lineUserId", memberLineUid(x), "例如：Ub68b9724664b889e790c789ece72f717")}${field("手機", "phone", firstValue(x.phone, x.mobile, x.tel), "手機")}${field("Email", "email", x.email, "會員 Email", false, "email")}`;'
if old_profile in s:
    s = s.replace(old_profile, new_profile, 1)
else:
    raise SystemExit('profile fields anchor not found')

# D1-only point history; no mother-synced fallback.
pattern = re.compile(r'    const motherLogs = Array\.isArray\(account\.motherSynced\?\.list\).*?\n    const logs = Array\.isArray\(account\.logs\) && account\.logs\.length \? account\.logs : motherLogs;', re.S)
if pattern.search(s):
    s = pattern.sub('    const logs = Array.isArray(account.logs) ? account.logs : [];', s, count=1)
else:
    raise SystemExit('mother point fallback block not found')

# CRM point lookup/adjustment use only locally stored canonical LINE UID.
s = s.replace('    const lineUserId = info ? await resolveMemberLineUidFromMother(info) : "";', '    const lineUserId = info ? memberLineUid(info.row) : "";', 1)
s = s.replace('    const lineUserId = validLineUid(data.lineUserId) || await resolveMemberLineUidFromMother(info);', '    const lineUserId = validLineUid(data.lineUserId) || memberLineUid(info.row);', 1)

# Disable legacy AIWE roster sync from CRM editor.
pattern = re.compile(r'  async function syncRosterMemberToWorker\(type, item\) \{.*?\n  \}\n', re.S)
if not pattern.search(s):
    raise SystemExit('syncRosterMemberToWorker block not found')
s = pattern.sub('  async function syncRosterMemberToWorker(type, item) { return null; }\n', s, count=1)

# Save member: authoritative manager-data + access only; no legacy roster sync.
old = '''      const managerSave = saveManagerDataRemoteChecked();\n      const rosterSync = syncRosterMemberToWorker(type, item);\n      const accessSync = syncAdminAccessForMember(type, item);\n      state.adminWhitelist = null;\n\n      Promise.allSettled([managerSave, rosterSync, accessSync]).then((results) => {\n        const managerResult = results[0];'''
new = '''      const managerSave = saveManagerDataRemoteChecked();\n      const accessSync = syncAdminAccessForMember(type, item);\n      state.adminWhitelist = null;\n\n      Promise.allSettled([managerSave, accessSync]).then((results) => {\n        const managerResult = results[0];'''
if old not in s:
    raise SystemExit('member save parallel block not found')
s = s.replace(old, new, 1)

# Remove legacy account merging from active manager-data merge.
s = re.sub(r'\n        legacyAccount: firstValue\([^\n]+\),', '', s, count=1)

# Update point panel wording to canonical TDEA terminology.
s = s.replace('正在比對會員 LINE UID...', '正在確認 TDEA LINE UID...')
s = s.replace('會員名冊查無此會員 LINE UID', 'TDEA CRM 尚未綁定此會員 LINE UID')

p.write_text(s, encoding='utf-8', newline='')
