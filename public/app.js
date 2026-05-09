(() => {
  const key = "tdea-manager-v3";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const autoSyncKey = "tdea-auto-sync-registrations";
  const labels = {
    dashboard: ["活動總覽", "查看活動狀態、報名與簽到概況。"],
    association: ["協會名冊", "維護協會會員資料與會員資格，可匯入 CSV。"],
    vendor: ["廠商名冊", "維護廠商會員、統編、窗口與備註，可匯入 CSV。"],
    creator: ["創建活動", "建立活動草稿，之後可直接改接 D1。"],
    preview: ["用戶預覽", "模擬一般使用者看到的活動報名頁。"]
  };
  const state = { view: "dashboard", drawer: "", data: load(), registrationLists: {} };

  function uid() { return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function esc(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function n(v) { return Number(v || 0).toLocaleString("zh-TW"); }
  function save() { localStorage.setItem(key, JSON.stringify(state.data)); }
  function load() {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (_) {}
    return {
      activities: [
        { id: uid(), name: "中秋聯歡活動", type: "聯誼類", courseTime: "2026/09/20 14:00", deadline: "2026/09/10", capacity: 80, reg: 0, check: 0, status: "上架", formUrl: "" },
        { id: uid(), name: "AI 教學工作坊", type: "教學類", courseTime: "2026/06/15 10:00", deadline: "2026/06/08", capacity: 40, reg: 0, check: 0, status: "下架", formUrl: "" }
      ],
      association: [],
      vendor: []
    };
  }

  let registrationSyncing = false;
  function registrationCandidates(activity) {
    return [activity?.id, activity?.activityNo, activity?.name, activity?.formId, activity?.googleFormId]
      .map(value => String(value || "").trim())
      .filter(Boolean);
  }
  function autoSyncEnabled() { return localStorage.getItem(autoSyncKey) !== "N"; }
  function setAutoSyncEnabled(enabled) { localStorage.setItem(autoSyncKey, enabled ? "Y" : "N"); }
  async function syncRegistrations(showMessage = false) {
    if (registrationSyncing || state.view !== "dashboard") return;
    registrationSyncing = true;
    try {
      if (showMessage || autoSyncEnabled()) await pullGoogleResponses(showMessage);
      const res = await fetch(api + "/api/registrations/summary", { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      const records = result?.data?.activities || {};
      let changed = false;
      (state.data.activities || []).forEach(activity => {
        const record = registrationCandidates(activity).map(key => records[key]).find(Boolean);
        if (!record) return;
        const nextCount = Number(record.count || 0);
        if (Number(activity.reg || 0) !== nextCount) {
          activity.reg = nextCount;
          changed = true;
        }
      });
      if (changed) {
        save();
        render();
      } else if (showMessage) {
        toast("目前沒有新的報名同步資料");
      }
    } catch (_) {
      if (showMessage) toast("同步失敗，請稍後再試");
      // Dashboard remains usable when the Worker summary is temporarily unavailable.
    } finally {
      registrationSyncing = false;
    }
  }

  async function pullGoogleResponses(showMessage = false) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) {
      if (showMessage) toast("缺少管理者 Email，無法向 GAS 拉取表單回覆");
      return;
    }
    const activities = (state.data.activities || []).map(activity => ({
      id: activity.id || "",
      activityNo: activity.activityNo || "",
      name: activity.name || "",
      formId: activity.formId || activity.googleFormId || "",
      googleFormId: activity.googleFormId || activity.formId || "",
      formUrl: activity.formUrl || activity.googleFormUrl || "",
      googleFormUrl: activity.googleFormUrl || activity.formUrl || ""
    })).filter(activity => activity.name || activity.formId || activity.formUrl);
    if (!activities.length) return;
    const response = await fetch(api + "/api/google-forms/sync", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify({ activities })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Google 表單同步失敗");
    if (showMessage) toast(`已同步 ${Number(result.imported || 0)} 筆表單回覆`);
  }

  function render() {
    const [title, sub] = labels[state.view];
    document.querySelector("#app").innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">TDEA 管理中心</div>
          <nav class="nav">${nav("dashboard", "活動總覽")}${nav("association", "協會名冊")}${nav("vendor", "廠商名冊")}${nav("creator", "創建活動")}${nav("preview", "用戶預覽")}</nav>
        </aside>
        <main class="main">
          <div class="topbar"><div><h1>${title}</h1><div class="subtitle">${sub}</div></div><div class="actions">${actions()}</div></div>
          ${body()}
        </main>
      </div>
      ${drawer()}
      <div class="toast" id="toast"></div>`;
    bind();
    if (autoSyncEnabled()) syncRegistrations();
  }

  function nav(id, text) { return `<button class="${state.view === id ? "active" : ""}" data-nav="${id}">${text}</button>`; }
  function actions() {
    if (state.view === "association") return `<button class="btn" data-import="association">匯入 CSV</button><button class="btn primary" data-drawer="association:new">新增協會會員</button>`;
    if (state.view === "vendor") return `<button class="btn" data-import="vendor">匯入 CSV</button><button class="btn primary" data-drawer="vendor:new">新增廠商會員</button>`;
    if (state.view === "creator") return `<button class="btn" data-reset>清空表單</button>`;
    if (state.view === "preview") return `<button class="btn" data-copy>複製預覽網址</button>`;
    return `<label class="sync-toggle"><input type="checkbox" data-auto-sync ${autoSyncEnabled() ? "checked" : ""}> 自動同步</label><button class="btn" data-sync-registrations>同步報名</button><button class="btn" data-worker>檢查 Worker</button><button class="btn danger" data-clear-test>清空測試資料</button><button class="btn primary" data-nav="creator">新增活動</button>`;
  }
  function body() {
    if (state.view === "association") return members("association");
    if (state.view === "vendor") return members("vendor");
    if (state.view === "creator") return creator();
    if (state.view === "preview") return preview();
    return dashboard();
  }

  function dashboard() {
    const a = state.data.activities;
    const live = a.filter(x => x.status === "上架").length;
    const reg = a.reduce((s, x) => s + Number(x.reg || 0), 0);
    const chk = a.reduce((s, x) => s + Number(x.check || 0), 0);
    return `<div class="grid stats">${stat("活動數", a.length)}${stat("上架中", live)}${stat("報名人數", reg)}${stat("簽到人數", chk)}</div><section class="panel"><div class="panel-head"><h2 class="panel-title">活動清單</h2><button class="btn" data-load-roster>載入名冊</button></div>${a.length ? activityTable(a) : empty("目前沒有活動")}</section>`;
  }
  function stat(label, value) { return `<div class="stat"><span>${label}</span><strong>${n(value)}</strong></div>`; }
  function activityTable(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>類型</th><th>課程時間</th><th>報名</th><th>簽到</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.type)}</td><td>${esc(x.courseTime || "-")}</td><td>${n(x.reg)}</td><td>${n(x.check)}</td><td><span class="badge ${x.status === "上架" ? "live" : "off"}">${esc(x.status)}</span></td><td><button class="link" data-drawer="activity:${x.id}">編輯</button><span class="muted"> / </span><button class="link" data-registration-list="${x.id}">名單</button><span class="muted"> / </span><button class="link" data-toggle="${x.id}">${x.status === "上架" ? "下架" : "上架"}</button><span class="muted"> / </span><button class="link danger-link" data-delete-activity="${x.id}">刪除</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function members(type) {
    const rows = state.data[type], vendor = type === "vendor";
    if (!rows.length) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><button class="btn" data-import="${type}">匯入 CSV</button></div>${empty(`目前沒有${vendor ? "廠商會員" : "協會會員"}資料`)}</section>`;
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><div class="actions"><button class="btn" data-import="${type}">匯入 CSV</button><button class="btn" data-export>匯出備份</button></div></div><div class="table-wrap"><table><thead><tr><th>會員編號</th><th>${vendor ? "公司名稱" : "姓名"}</th><th>${vendor ? "統編" : "身分"}</th><th>${vendor ? "聯絡窗口" : "性別"}</th><th>資格</th><th>備註</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.memberNo)}</td><td><strong>${esc(vendor ? x.companyName : x.name)}</strong></td><td>${esc(vendor ? x.taxId : x.identity)}</td><td>${esc(vendor ? x.contact : x.gender)}</td><td><span class="badge ${x.qualification === "Y" ? "live" : "off"}">${esc(x.qualification)}</span></td><td>${esc(x.note)}</td><td><button class="link" data-drawer="${type}:${x.id}">編輯</button><span class="muted"> / </span><button class="link danger-link" data-delete-member="${type}:${x.id}">刪除</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function creator() {
    return `<form class="form-card form-grid creator-form-wide" id="activity-form">${field("活動名稱", "name", "", "例如：AI 教學工作坊", true)}${select("活動類型", "type", ["講座類", "教學類", "聯誼類"])}${field("課程時間", "courseTime", "", "YYYY/MM/DD HH:MM")}${field("報名截止", "deadline", "", "YYYY/MM/DD")}${field("人數限制", "capacity", 0, "", false, "number")}${select("狀態", "status", ["下架", "上架"])}<button class="btn primary" type="submit">建立活動</button></form>`;
  }
  function preview() {
    const rows = state.data.activities.filter(x => x.status === "上架");
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">官方活動預約</h2><span class="muted">TDEA 台灣數位教育發展協會</span></div><div style="padding:18px">${rows.length ? `<div class="cards">${rows.map(x => `<article class="activity-card"><span class="badge live">${esc(x.type)}</span><h3>${esc(x.name)}</h3><div class="info-row"><span>課程時間</span><strong>${esc(x.courseTime || "未定")}</strong></div><div class="info-row"><span>截止</span><strong>${esc(x.deadline || "未定")}</strong></div><div class="info-row"><span>名額</span><strong>${esc(x.capacity || "不限")}</strong></div><div class="info-row"><span>狀況</span><strong>${n(x.reg)} 人報名</strong></div><button class="btn primary" style="width:100%;margin-top:14px" data-register="${x.id}">立即報名</button></article>`).join("")}</div>` : empty("目前暫無開放中的活動")}</div></section>`;
  }

  function drawer() {
    if (!state.drawer) return `<div class="drawer" id="drawer"></div>`;
    const [type, rowId] = state.drawer.split(":");
    const title = type === "activity" ? "編輯活動" : type === "registrations" ? "報名名單" : type === "vendor" ? "編輯廠商會員" : type === "association" ? "編輯協會會員" : type === "import-vendor" ? "匯入廠商名冊" : "匯入協會名冊";
    const content = type === "activity" ? activityForm(rowId) : type === "registrations" ? registrationList(rowId) : type.startsWith("import-") ? importForm(type.replace("import-", "")) : memberForm(type, rowId);
    return `<div class="drawer open" id="drawer"><div class="drawer-backdrop" data-close></div><div class="drawer-panel"><div class="drawer-title"><h2>${title}</h2><button class="btn icon" data-close>×</button></div>${content}</div></div>`;
  }
  function registrationList(rowId) {
    const activity = state.data.activities.find(r => r.id === rowId) || {};
    const rows = state.registrationLists[rowId];
    if (!rows) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${esc(activity.name || "活動")} 報名名單</h2><button class="btn" data-refresh-registration-list="${esc(rowId)}">重新載入</button></div>${empty("正在載入報名名單...")}</section>`;
    if (!rows.length) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${esc(activity.name || "活動")} 報名名單</h2><button class="btn" data-refresh-registration-list="${esc(rowId)}">重新載入</button></div>${empty("目前 Worker 沒有收到這個活動的報名資料")}</section>`;
    const headers = [...new Set(rows.flatMap(row => Object.keys(row.answers || {})))];
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${esc(activity.name || "活動")} 報名名單</h2><button class="btn" data-refresh-registration-list="${esc(rowId)}">重新載入</button></div><div class="table-wrap"><table><thead><tr><th>送出時間</th>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr><td>${esc(formatTime(row.submittedAt))}</td>${headers.map(h => `<td>${esc(valueText(row.answers?.[h]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  }
  function valueText(value) { return Array.isArray(value) ? value.join("、") : String(value ?? ""); }
  function formatTime(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? String(value || "-") : date.toLocaleString("zh-TW", { hour12: false });
  }
  function activityForm(rowId) {
    const x = state.data.activities.find(r => r.id === rowId) || {};
    return `<form class="form-grid" id="drawer-activity">${hidden("id", x.id)}${field("活動名稱", "name", x.name)}${select("類型", "type", ["講座類", "教學類", "聯誼類"], x.type)}${field("課程時間", "courseTime", x.courseTime)}${field("報名截止", "deadline", x.deadline)}${field("人數限制", "capacity", x.capacity, "", false, "number")}${field("報名人數", "reg", x.reg, "", false, "number")}${field("簽到人數", "check", x.check, "", false, "number")}${select("狀態", "status", ["上架", "下架"], x.status)}${field("表單連結", "formUrl", x.formUrl)}<button class="btn primary" type="submit">儲存</button></form>`;
  }
  function memberForm(type, rowId) {
    const x = state.data[type].find(r => r.id === rowId) || {}, vendor = type === "vendor";
    return `<form class="form-grid" id="drawer-member" data-type="${type}">${hidden("id", x.id)}${field("會員編號", "memberNo", x.memberNo)}${vendor ? `${field("公司名稱", "companyName", x.companyName)}${field("統一編號", "taxId", x.taxId)}${field("負責人", "owner", x.owner)}${field("聯絡窗口", "contact", x.contact)}` : `${field("身分", "identity", x.identity)}${field("姓名", "name", x.name)}${select("性別", "gender", ["", "男", "女"], x.gender)}`}${select("會員資格", "qualification", ["Y", "N"], x.qualification || "Y")}<div class="field"><label>備註</label><textarea name="note">${esc(x.note)}</textarea></div><button class="btn primary" type="submit">儲存</button></form>`;
  }
  function importForm(type) {
    const vendor = type === "vendor";
    const sample = vendor ? "會員編號,公司名稱,統編,負責人,聯絡窗口,會員資格,備註" : "會員編號,身分,姓名,性別,會員資格,備註";
    return `<form class="form-grid" id="import-form" data-type="${type}"><div class="field"><label>CSV 內容</label><textarea name="csv" placeholder="${sample}"></textarea></div><div class="muted">可從 Google Sheets 複製含標題列的資料貼上；沒有標題列時會依提示順序導入。</div><button class="btn primary" type="submit">導入名冊</button></form>`;
  }

  function field(label, name, value = "", placeholder = "", required = false, type = "text") { return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? "required" : ""}></div>`; }
  function select(label, name, options, value = "") { return `<div class="field"><label>${label}</label><select name="${name}">${options.map(o => `<option ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`; }
  function hidden(name, value = "") { return `<input type="hidden" name="${name}" value="${esc(value)}">`; }
  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", quote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quote && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quote = !quote; continue; }
      if (ch === "," && !quote) { row.push(cell.trim()); cell = ""; continue; }
      if ((ch === "\n" || ch === "\r") && !quote) { if (ch === "\r" && next === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; continue; }
      cell += ch;
    }
    row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
  }
  function importRows(type, text) {
    const rows = parseCsv(text); if (!rows.length) return 0;
    const head = rows[0].map(x => x.toLowerCase());
    const hasHead = head.some(x => x.includes("會員") || x.includes("姓名") || x.includes("公司") || x.includes("member"));
    const data = hasHead ? rows.slice(1) : rows;
    const idx = (names, fallback) => hasHead ? Math.max(head.findIndex(h => names.some(n => h.includes(n))), fallback) : fallback;
    const vendor = type === "vendor";
    const mapped = data.map(c => vendor ? { id: uid(), memberNo: c[idx(["會員編號", "member"], 0)] || "", companyName: c[idx(["公司", "company"], 1)] || "", taxId: c[idx(["統編", "tax"], 2)] || "", owner: c[idx(["負責人", "owner"], 3)] || "", contact: c[idx(["窗口", "contact"], 4)] || "", qualification: c[idx(["資格"], 5)] || "Y", note: c[idx(["備註", "note"], 6)] || "" } : { id: uid(), memberNo: c[idx(["會員編號", "member"], 0)] || "", identity: c[idx(["身分", "identity"], 1)] || "", name: c[idx(["姓名", "name"], 2)] || "", gender: c[idx(["性別", "gender"], 3)] || "", qualification: c[idx(["資格"], 4)] || "Y", note: c[idx(["備註", "note"], 5)] || "" }).filter(x => vendor ? x.companyName || x.memberNo : x.name || x.memberNo);
    state.data[type] = mapped.concat(state.data[type]); save(); return mapped.length;
  }

  function deleteActivity(rowId) {
    const row = state.data.activities.find(x => x.id === rowId);
    if (!row || !confirm(`確定刪除活動「${row.name || rowId}」？`)) return;
    state.data.activities = state.data.activities.filter(x => x.id !== rowId);
    if (state.data.formSettings) {
      delete state.data.formSettings[rowId];
      if (row.activityNo) delete state.data.formSettings[row.activityNo];
    }
    save();
    render();
    toast("活動已刪除");
  }

  function deleteMember(token) {
    const [type, rowId] = String(token || "").split(":");
    const rows = state.data[type];
    if (!Array.isArray(rows)) return;
    const row = rows.find(x => x.id === rowId);
    const label = type === "vendor" ? (row?.companyName || row?.memberNo || rowId) : (row?.name || row?.memberNo || rowId);
    if (!row || !confirm(`確定刪除「${label}」？`)) return;
    state.data[type] = rows.filter(x => x.id !== rowId);
    save();
    render();
    toast("資料已刪除");
  }

  function clearTestData() {
    if (!confirm("確定清空目前測試資料？\n\n會刪除：活動、協會名冊、廠商名冊、表單設定與每月活動設定。")) return;
    state.data = { activities: [], association: [], vendor: [], formSettings: {}, monthlyActivity: null };
    save();
    state.drawer = "";
    state.view = "dashboard";
    render();
    toast("測試資料已清空");
  }

  function bind() {
    document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { state.view = b.dataset.nav; state.drawer = ""; render(); });
    document.querySelectorAll("[data-drawer]").forEach(b => b.onclick = () => { state.drawer = b.dataset.drawer; render(); });
    document.querySelectorAll("[data-import]").forEach(b => b.onclick = () => { state.drawer = "import-" + b.dataset.import + ":new"; render(); });
    document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { state.drawer = ""; render(); });
    document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => { const x = state.data.activities.find(r => r.id === b.dataset.toggle); if (x) x.status = x.status === "上架" ? "下架" : "上架"; save(); render(); });
    document.querySelectorAll("[data-delete-activity]").forEach(b => b.onclick = () => deleteActivity(b.dataset.deleteActivity));
    document.querySelectorAll("[data-delete-member]").forEach(b => b.onclick = () => deleteMember(b.dataset.deleteMember));
    document.querySelectorAll("[data-registration-list]").forEach(b => b.onclick = () => openRegistrationList(b.dataset.registrationList));
    document.querySelectorAll("[data-refresh-registration-list]").forEach(b => b.onclick = () => loadRegistrationList(b.dataset.refreshRegistrationList, true));
    const autoSync = document.querySelector("[data-auto-sync]"); if (autoSync) autoSync.onchange = () => { setAutoSyncEnabled(autoSync.checked); toast(autoSync.checked ? "已開啟自動同步" : "已關閉自動同步"); };
    const syncButton = document.querySelector("[data-sync-registrations]"); if (syncButton) syncButton.onclick = () => syncRegistrations(true);
    const clearTest = document.querySelector("[data-clear-test]"); if (clearTest) clearTest.onclick = clearTestData;
    document.querySelectorAll("[data-register]").forEach(b => b.onclick = () => { const x = state.data.activities.find(r => r.id === b.dataset.register); if (x) x.reg = Number(x.reg || 0) + 1; save(); toast("已模擬新增一筆報名"); render(); });
    const af = document.querySelector("#activity-form"); if (af) af.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(af)); state.data.activities.unshift({ id: uid(), name: d.name.trim(), type: d.type, courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), reg: 0, check: 0, status: d.status, formUrl: "" }); save(); state.view = "dashboard"; render(); toast("活動已建立"); };
    const ea = document.querySelector("#drawer-activity"); if (ea) ea.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(ea)); const x = state.data.activities.find(r => r.id === d.id); if (x) Object.assign(x, { name: d.name, type: d.type, courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), reg: Number(d.reg || 0), check: Number(d.check || 0), status: d.status, formUrl: d.formUrl }); state.drawer = ""; save(); render(); toast("活動已儲存"); };
    const mf = document.querySelector("#drawer-member"); if (mf) mf.onsubmit = e => { e.preventDefault(); const type = mf.dataset.type; const d = Object.fromEntries(new FormData(mf)); const rows = state.data[type]; const old = rows.find(r => r.id === d.id); const item = { ...d, id: d.id || uid() }; old ? Object.assign(old, item) : rows.unshift(item); state.drawer = ""; save(); render(); toast("名冊已儲存"); };
    const im = document.querySelector("#import-form"); if (im) im.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(im)); const count = importRows(im.dataset.type, d.csv || ""); state.drawer = ""; render(); toast(`已導入 ${count} 筆資料`); };
    const loadRoster = document.querySelector("[data-load-roster]"); if (loadRoster) loadRoster.onclick = () => loadRosterSeed(true);
    const worker = document.querySelector("[data-worker]"); if (worker) worker.onclick = async () => { try { const r = await fetch(api + "/api/activities"); const j = await r.json(); toast(j.success ? "Worker API 連線正常" : "Worker API 回應異常"); } catch (_) { toast("Worker API 無法連線"); } };
    const exp = document.querySelector("[data-export]"); if (exp) exp.onclick = () => { navigator.clipboard.writeText(JSON.stringify(state.data, null, 2)); toast("備份 JSON 已複製"); };
    const copy = document.querySelector("[data-copy]"); if (copy) copy.onclick = () => { navigator.clipboard.writeText(location.href); toast("預覽網址已複製"); };
    const reset = document.querySelector("[data-reset]"); if (reset) reset.onclick = () => { const f = document.querySelector("#activity-form"); if (f) f.reset(); };
  }
  function openRegistrationList(rowId) {
    state.drawer = "registrations:" + rowId;
    render();
    loadRegistrationList(rowId);
  }
  async function loadRegistrationList(rowId, showMessage = false) {
    const activity = state.data.activities.find(r => r.id === rowId);
    if (!activity) return;
    try {
      const keys = registrationCandidates(activity).map(encodeURIComponent).join(",");
      const res = await fetch(api + "/api/registrations/list?keys=" + keys, { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      state.registrationLists[rowId] = Array.isArray(result.data) ? result.data : [];
      if (showMessage) toast("名單已同步");
    } catch (_) {
      state.registrationLists[rowId] = [];
      if (showMessage) toast("名單載入失敗");
    }
    render();
  }
  async function loadRosterSeed(force = false) {
    if (!force && (state.data.association.length || state.data.vendor.length)) return;
    try {
      let res = null;
      for (const url of ["roster.json", "public/roster.json"]) {
        res = await fetch(url, { cache: "no-store" });
        if (res.ok) break;
      }
      if (!res || !res.ok) return;
      const seed = await res.json();
      const association = Array.isArray(seed.association) ? seed.association : (seed.a || []).map(x => ({ id: "association-" + x[0], memberNo: x[0] || "", identity: x[1] || "", name: x[2] || "", gender: x[3] || "", qualification: x[4] || "Y", note: x[5] || "" }));
      const vendor = Array.isArray(seed.vendor) ? seed.vendor : (seed.v || []).map(x => ({ id: "vendor-" + x[0], memberNo: x[0] || "", companyName: x[1] || "", taxId: x[2] || "", owner: x[3] || "", contact: x[4] || "", qualification: x[5] || "Y", note: x[6] || "" }));
      if (!association.length && !vendor.length) return;
      state.data.association = association;
      state.data.vendor = vendor;
      save();
      render();
      toast(`已載入名冊 ${association.length + vendor.length} 筆`);
    } catch (_) {}
  }
  function toast(text) { const el = document.querySelector("#toast"); if (!el) return; el.textContent = text; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }
  render();
  loadRosterSeed();
})();
