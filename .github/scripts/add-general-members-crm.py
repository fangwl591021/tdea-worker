from pathlib import Path

# Patch Worker route using byte-level replacement to preserve monthly-entry.ts encoding/line endings.
p = Path('src/monthly-entry.ts')
b = p.read_bytes()
anchor = b'    if (request.method === "GET" && url.pathname === "/api/registrations/summary") return json({ success: true, data: await readRegistrationSummary(env) });'
if anchor not in b:
    raise SystemExit('monthly route anchor not found')
route = '''    if (request.method === "GET" && url.pathname === "/api/general-members") {
      const guard = await requireAdmin(request, env);
      if (guard) return guard;
      if (!env.TDEA_DESIGN || !env.TDEA_INTERNAL_SECRET) return json({ success: false, message: "TDEA-DESIGN member service is not configured" }, 503);
      const upstream = await env.TDEA_DESIGN.fetch("https://tdea-design.internal/internal/tdea/points/members?type=general", {
        method: "GET",
        headers: { "x-tdea-internal-secret": env.TDEA_INTERNAL_SECRET, accept: "application/json" }
      });
      const result = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      if (!upstream.ok || result.success !== true) return json({ success: false, message: clean(result.error) || "一般會員讀取失敗" }, upstream.status || 502);
      return json({ success: true, data: result });
    }
'''.encode('utf-8')
b = b.replace(anchor, route + anchor, 1)
p.write_bytes(b)

# Patch admin UI.
p = Path('public/app.js')
s = p.read_text(encoding='utf-8')

s = s.replace('    association: ["會員 CRM", "維護協會會員檔案、會員資格與點數資料，可匯入 CSV。"],\n    vendor: ["廠商 CRM", "維護廠商會員檔案、統編、窗口與備註，可匯入 CSV。"],',
'''    general: ["一般會員", "查看由 TDEA-DESIGN 正式註冊的一般會員資料與點數。"],
    association: ["協會會員", "維護協會會員檔案、會員資格與點數資料，可匯入 CSV。"],
    vendor: ["廠商會員", "維護廠商會員檔案、統編、窗口與備註，可匯入 CSV。"],''', 1)

old_state = 'const state = { view: "dashboard", drawer: "", keywordEditId: "", data: load(), archivedActivities: [], registrationLists: {}, memberRegistrationLists: {}, memberPointAccounts: {}, memberApplications: null, adminWhitelist: null, adminWhitelistMeta: null, motherRegisterRecords: null, motherRegisterSearch: "", motherRegisterLoading: false, motherRegisterLoadedAt: "", rosterSearch: { association: "", vendor: "" } };'
new_state = 'const state = { view: "dashboard", drawer: "", keywordEditId: "", data: load(), archivedActivities: [], registrationLists: {}, memberRegistrationLists: {}, memberPointAccounts: {}, memberApplications: null, generalMembers: null, generalMembersLoading: false, generalSearch: "", adminWhitelist: null, adminWhitelistMeta: null, motherRegisterRecords: null, motherRegisterSearch: "", motherRegisterLoading: false, motherRegisterLoadedAt: "", rosterSearch: { association: "", vendor: "" } };'
if old_state not in s:
    raise SystemExit('state anchor not found')
s = s.replace(old_state, new_state, 1)

nav_old = '${nav("dashboard", "活動總覽")}${nav("association", "會員 CRM")}${nav("vendor", "廠商 CRM")}${nav("creator", "創建活動")}${nav("redeem", "點數折抵")}'
nav_new = '${nav("dashboard", "活動總覽")}${nav("general", "一般會員")}${nav("association", "協會會員")}${nav("vendor", "廠商會員")}${nav("creator", "創建活動")}${nav("redeem", "點數折抵")}'
if nav_old not in s:
    raise SystemExit('nav anchor not found')
s = s.replace(nav_old, nav_new, 1)

render_anchor = '    if (state.view === "dashboard" && state.memberApplications === null) loadMemberApplications();\n'
if render_anchor not in s:
    raise SystemExit('render load anchor not found')
s = s.replace(render_anchor, render_anchor + '    if (state.view === "general" && state.generalMembers === null && !state.generalMembersLoading) loadGeneralMembers();\n', 1)

action_anchor = '  function actions() {\n'
if action_anchor not in s:
    raise SystemExit('actions anchor not found')
s = s.replace(action_anchor, action_anchor + '    if (state.view === "general") return `<button class="btn" data-refresh-general-members>重新載入</button>`;\n', 1)

body_anchor = '  function body() {\n'
if body_anchor not in s:
    raise SystemExit('body anchor not found')
s = s.replace(body_anchor, body_anchor + '    if (state.view === "general") return generalMembersView();\n', 1)

# Insert general member loader/view before memberApplicationsPanel.
insert_anchor = '  function memberApplicationsPanel() {\n'
if insert_anchor not in s:
    raise SystemExit('memberApplicationsPanel anchor not found')
block = r'''  async function loadGeneralMembers(force = false) {
    if (state.generalMembersLoading) return state.generalMembers || [];
    if (state.generalMembers !== null && !force) return state.generalMembers;
    state.generalMembersLoading = true;
    if (state.view === "general") render();
    try {
      const response = await fetch(api + "/api/general-members", { headers: adminHeaders(), cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || "一般會員讀取失敗");
      state.generalMembers = Array.isArray(result.data?.members) ? result.data.members : [];
    } catch (error) {
      state.generalMembers = [];
      toast(error?.message || "一般會員讀取失敗");
    } finally {
      state.generalMembersLoading = false;
      if (state.view === "general") render();
    }
    return state.generalMembers;
  }

  function generalMemberSearchValue(row) {
    return [row.memberNumber,row.fullName,row.displayName,row.lineUserId,row.phone,row.email,row.gender]
      .map(value => String(value || "").toLowerCase()).join(" ");
  }

  function generalMembersView() {
    if (state.generalMembers === null || state.generalMembersLoading) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">一般會員</h2></div>${empty("正在讀取 TDEA 一般會員...")}</section>`;
    const query = String(state.generalSearch || "").trim().toLowerCase();
    const allRows = Array.isArray(state.generalMembers) ? state.generalMembers : [];
    const rows = query ? allRows.filter(row => generalMemberSearchValue(row).includes(query)) : allRows;
    const search = `<div class="field" style="min-width:280px;max-width:460px;margin-left:auto"><input data-general-search value="${esc(state.generalSearch || "")}" placeholder="搜尋一般會員：編號、姓名、UID、電話、Email"></div>`;
    const table = rows.length ? `<div class="table-wrap"><table><thead><tr><th>會員編號</th><th>姓名</th><th>LINE UID</th><th>點數</th><th>手機</th><th>Email</th><th>註冊完成</th><th>操作</th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(row.memberNumber || "-")}</td><td><strong>${esc(row.fullName || row.displayName || "-")}</strong></td><td>${esc(shortUid(row.lineUserId || ""))}</td><td>${n(row.pointBalance || 0)}</td><td>${esc(row.phone || "-")}</td><td>${esc(row.email || "-")}</td><td>${esc(formatTime(row.profileCompletedAt || ""))}</td><td><button class="link" data-drawer="general:${esc(row.userId)}">CRM 檔案</button></td></tr>`).join("")}</tbody></table></div>` : empty(query ? "沒有符合搜尋條件的一般會員" : "目前沒有已完成註冊的一般會員");
    return `<section class="panel"><div class="panel-head"><div><h2 class="panel-title">一般會員</h2><div class="muted">直接讀取 TDEA-DESIGN D1，不建立第二份會員資料。</div></div><div class="actions">${search}<span class="badge live">${rows.length} / ${allRows.length} 筆</span></div></div>${table}</section>`;
  }

  function generalMemberProfile(userId) {
    const row = (state.generalMembers || []).find(item => item.userId === userId) || {};
    const name = row.fullName || row.displayName || row.memberNumber || "一般會員";
    return `<div class="crm-member-profile-layout"><section class="crm-member-card"><div class="crm-member-section-title">一般會員資料</div><div class="form-grid crm-member-form">
      ${field("系統會員編號", "memberNumber", row.memberNumber || "")}
      ${field("LINE UID", "lineUserId", row.lineUserId || "")}
      ${field("姓名", "fullName", row.fullName || "")}
      ${field("顯示名稱", "displayName", row.displayName || "")}
      ${field("手機", "phone", row.phone || "")}
      ${field("Email", "email", row.email || "", "", false, "email")}
      ${field("性別", "gender", row.gender || "")}
      ${field("生日", "birthday", row.birthday || "")}
      ${field("會員類型", "memberType", "一般會員")}
      ${field("註冊完成時間", "profileCompletedAt", row.profileCompletedAt ? formatTime(row.profileCompletedAt) : "")}
      <div class="muted" style="grid-column:1/-1">一般會員主檔以 TDEA-DESIGN D1 為準；此處目前僅供查看。</div>
      <div class="crm-member-savebar"><button class="btn primary" type="button" data-close>關閉</button></div>
    </div></section><aside class="crm-member-side"><section class="panel member-point-panel"><div class="panel-head"><h3>點數</h3></div><div class="crm-point-summary"><span>可用點數</span><div class="crm-point-number"><strong>${n(row.pointBalance || 0)}</strong><small>點</small></div></div></section></aside></div>`;
  }

'''
s = s.replace(insert_anchor, block + insert_anchor, 1)

# Drawer supports general member read-only profile.
drawer_old = 'const content = type === "activity" ? activityForm(rowId) : type === "registrations" ? registrationList(rowId) : type.startsWith("import-") ? importForm(type.replace("import-", "")) : memberForm(type, rowId);'
drawer_new = 'const content = type === "activity" ? activityForm(rowId) : type === "registrations" ? registrationList(rowId) : type === "general" ? generalMemberProfile(rowId) : type.startsWith("import-") ? importForm(type.replace("import-", "")) : memberForm(type, rowId);'
if drawer_old not in s:
    raise SystemExit('drawer content anchor not found')
s = s.replace(drawer_old, drawer_new, 1)

title_old = 'const title = type === "activity" ? "編輯活動" : type === "registrations" ? "報名名單" : type === "vendor" ? "編輯廠商會員" : type === "association" ? "編輯協會會員" : type === "import-vendor" ? "匯入廠商名冊" : "匯入協會名冊";'
title_new = 'const title = type === "activity" ? "編輯活動" : type === "registrations" ? "報名名單" : type === "general" ? "一般會員 CRM 檔案" : type === "vendor" ? "編輯廠商會員" : type === "association" ? "編輯協會會員" : type === "import-vendor" ? "匯入廠商名冊" : "匯入協會名冊";'
if title_old not in s:
    raise SystemExit('drawer title anchor not found')
s = s.replace(title_old, title_new, 1)

# Bind refresh/search.
bind_anchor = '    document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { state.view = b.dataset.nav; state.drawer = ""; render(); });\n'
if bind_anchor not in s:
    raise SystemExit('bind nav anchor not found')
s = s.replace(bind_anchor, bind_anchor + '''    const generalSearch = document.querySelector("[data-general-search]"); if (generalSearch) generalSearch.oninput = () => { state.generalSearch = generalSearch.value || ""; render(); };
    document.querySelectorAll("[data-refresh-general-members]").forEach(b => b.onclick = async () => { b.disabled = true; await loadGeneralMembers(true); });
''', 1)

p.write_text(s, encoding='utf-8')
