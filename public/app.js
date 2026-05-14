(() => {
  const key = "tdea-manager-v3";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const liffBase = "https://liff.line.me/2005868456-2jmxqyFU";
  const autoSyncKey = "tdea-auto-sync-registrations";
  const labels = {
    dashboard: ["活動總覽", "查看活動狀態、報名與簽到概況。"],
    association: ["協會名冊", "維護協會會員資料與會員資格，可匯入 CSV。"],
    vendor: ["廠商名冊", "維護廠商會員、統編、窗口與備註，可匯入 CSV。"],
    creator: ["創建活動", "建立活動草稿，之後可直接改接 D1。"],
    keywords: ["關鍵字", "整理 LINE OA 觸發關鍵字、用途與回覆行為。"],
    redeem: ["點數折抵", "建立限時店家掃碼工作台，店家掃會員 QR 後執行扣點。"],
    preview: ["用戶預覽", "模擬一般使用者看到的活動報名頁。"]
  };
  const state = { view: "dashboard", drawer: "", data: load(), registrationLists: {} };

  function uid() { return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function esc(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function n(v) { return Number(v || 0).toLocaleString("zh-TW"); }
  function activityTypeLabel(row) { return row?.typeLabel || row?.type || ""; }
  function formTypeLabel(data) {
    const custom = String(data.activityTypeLabel || "").trim();
    const other = String(data.activityTypeLabelOther || "").trim();
    return custom === "__custom" ? (other || data.type) : (custom || data.type);
  }
  function firstUri(value) {
    if (!value) return "";
    if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : "";
    if (Array.isArray(value)) {
      for (const item of value) {
        const uri = firstUri(item);
        if (uri) return uri;
      }
      return "";
    }
    if (typeof value === "object") {
      if (typeof value.uri === "string" && /^https?:\/\//i.test(value.uri)) return value.uri;
      for (const item of Object.values(value)) {
        const uri = firstUri(item);
        if (uri) return uri;
      }
    }
    return "";
  }
  function flexEntryUrl(rule) {
    try { return firstUri(JSON.parse(rule.flexJson || "{}")); } catch (_) { return ""; }
  }
  function entryCell(url) {
    if (!url) return `<span class="muted">無</span>`;
    return `<a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
  }
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
    return [activity?.id, activity?.activityNo, activity?.formId, activity?.nativeFormId, activity?.googleFormId, activity?.opnformFormId, activity?.name]
      .map(value => String(value || "").trim())
      .filter(Boolean);
  }
  function autoSyncEnabled() { return localStorage.getItem(autoSyncKey) !== "N"; }
  function setAutoSyncEnabled(enabled) { localStorage.setItem(autoSyncKey, enabled ? "Y" : "N"); }
  async function syncRegistrations(showMessage = false) {
    if (registrationSyncing || state.view !== "dashboard") return;
    registrationSyncing = true;
    try {
      if (showMessage || autoSyncEnabled()) await pullRemoteResponses(showMessage);
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
      googleFormUrl: activity.googleFormUrl || activity.formUrl || "",
      editUrl: activity.googleFormEditUrl || activity.editUrl || "",
      googleFormEditUrl: activity.googleFormEditUrl || activity.editUrl || ""
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

  async function pullRemoteResponses(showMessage = false) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) {
      if (showMessage) toast("請先登入管理者，才能同步報名。");
      return;
    }
    const activities = (state.data.activities || []).map(activity => ({
      id: activity.id || "",
      activityNo: activity.activityNo || "",
      name: activity.name || "",
      formMode: activity.formMode || "",
      formId: activity.formId || activity.nativeFormId || activity.googleFormId || activity.opnformFormId || "",
      googleFormId: activity.googleFormId || "",
      opnformFormId: activity.opnformFormId || "",
      formUrl: activity.formUrl || activity.nativeFormUrl || activity.googleFormUrl || activity.opnformFormUrl || "",
      googleFormUrl: activity.googleFormUrl || "",
      opnformFormUrl: activity.opnformFormUrl || "",
      editUrl: activity.googleFormEditUrl || activity.editUrl || "",
      googleFormEditUrl: activity.googleFormEditUrl || activity.editUrl || ""
    })).filter(activity => activity.name || activity.formId || activity.formUrl);
    if (!activities.length) return;

    let imported = 0;
    let attempted = false;
    const opnformActivities = activities.filter(activity => activity.opnformFormId || activity.formMode === "opnform");
    if (opnformActivities.length) {
      attempted = true;
      const response = await fetch(api + "/api/opnform/sync", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-email": email },
        body: JSON.stringify({ activities: opnformActivities })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) imported += Number(result.imported || 0);
      else if (result.code !== "opnform_not_configured") throw new Error(result.message || "OpnForm 同步失敗");
    }

    const googleActivities = activities.filter(activity => activity.googleFormId || activity.formMode === "google_form");
    if (googleActivities.length) {
      attempted = true;
      const response = await fetch(api + "/api/google-forms/sync", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-email": email },
        body: JSON.stringify({ activities: googleActivities })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) imported += Number(result.imported || 0);
      else if (response.status !== 503) throw new Error(result.message || "Google 表單同步失敗");
    }
    if (showMessage) toast(attempted ? `同步完成，讀取 ${imported} 筆報名。` : "目前沒有可同步的報名表。");
  }

  function render() {
    const [title, sub] = labels[state.view];
    document.querySelector("#app").innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">TDEA 管理中心</div>
          <nav class="nav">${nav("dashboard", "活動總覽")}${nav("association", "協會名冊")}${nav("vendor", "廠商名冊")}${nav("creator", "創建活動")}${nav("redeem", "點數折抵")}${nav("preview", "用戶預覽")}</nav>
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
    if (state.view === "redeem" && !state.redeemRecords) loadRedeemRecords();
    if (state.view === "redeem" && !state.pointLedger) loadPointLedger();
    window.TDEALineNav?.refresh?.();
  }

  function nav(id, text) { return `<button class="${state.view === id ? "active" : ""}" data-nav="${id}">${text}</button>`; }
  function actions() {
    if (state.view === "association") return `<button class="btn" data-import="association">匯入 CSV</button><button class="btn primary" data-drawer="association:new">新增協會會員</button>`;
    if (state.view === "vendor") return `<button class="btn" data-import="vendor">匯入 CSV</button><button class="btn primary" data-drawer="vendor:new">新增廠商會員</button>`;
    if (state.view === "creator") return `<button class="btn" data-reset>清空表單</button>`;
    if (state.view === "redeem") return `<button class="btn" data-load-redeem>刷新紀錄</button>`;
    if (state.view === "keywords") return `<button class="btn" data-refresh-keywords>刷新列表</button>`;
    if (state.view === "preview") return `<button class="btn" data-copy>複製預覽網址</button>`;
    return `<label class="sync-toggle"><input type="checkbox" data-auto-sync ${autoSyncEnabled() ? "checked" : ""}> 自動同步</label><button class="btn" data-sync-registrations>同步報名</button><button class="btn" data-worker>檢查 Worker</button><button class="btn danger" data-clear-test>清空測試資料</button><button class="btn primary" data-nav="creator">新增活動</button>`;
  }
  function body() {
    if (state.view === "association") return members("association");
    if (state.view === "vendor") return members("vendor");
    if (state.view === "creator") return creator();
    if (state.view === "redeem") return redeem();
    if (state.view === "keywords") return keywords();
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
    return `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>類型</th><th>課程時間</th><th>報名</th><th>簽到</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(activityTypeLabel(x))}</td><td>${esc(x.courseTime || "-")}</td><td>${n(x.reg)}</td><td>${n(x.check)}</td><td><span class="badge ${x.status === "上架" ? "live" : "off"}">${esc(x.status)}</span></td><td><button class="link" data-drawer="activity:${x.id}">編輯</button><span class="muted"> / </span><button class="link" data-registration-list="${x.id}">名單</button><span class="muted"> / </span><button class="link" data-toggle="${x.id}">${x.status === "上架" ? "下架" : "上架"}</button><span class="muted"> / </span><button class="link danger-link" data-delete-activity="${x.id}">刪除</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function members(type) {
    const rows = state.data[type], vendor = type === "vendor";
    if (!rows.length) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><button class="btn" data-import="${type}">匯入 CSV</button></div>${empty(`目前沒有${vendor ? "廠商會員" : "協會會員"}資料`)}</section>`;
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><div class="actions"><button class="btn" data-import="${type}">匯入 CSV</button><button class="btn" data-export>匯出備份</button></div></div><div class="table-wrap"><table><thead><tr><th>會員編號</th><th>${vendor ? "公司名稱" : "姓名"}</th><th>${vendor ? "統編" : "身分"}</th><th>${vendor ? "聯絡窗口" : "性別"}</th><th>資格</th><th>備註</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.memberNo)}</td><td><strong>${esc(vendor ? x.companyName : x.name)}</strong></td><td>${esc(vendor ? x.taxId : x.identity)}</td><td>${esc(vendor ? x.contact : x.gender)}</td><td><span class="badge ${x.qualification === "Y" ? "live" : "off"}">${esc(x.qualification)}</span></td><td>${esc(x.note)}</td><td><button class="link" data-drawer="${type}:${x.id}">編輯</button><span class="muted"> / </span><button class="link danger-link" data-delete-member="${type}:${x.id}">刪除</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function creator() {
    return `<form class="form-card form-grid creator-form-wide" id="activity-form">${field("活動名稱", "name", "", "例如：AI 教學工作坊", true)}${select("活動類型", "type", ["講座類", "教學類", "聯誼類"])}${field("課程時間", "courseTime", "", "YYYY/MM/DD HH:MM")}${field("報名截止", "deadline", "", "YYYY/MM/DD")}${field("人數限制", "capacity", 0, "", false, "number")}${field("簽到贈點", "checkinPoints", 0, "0 表示不贈點", false, "number")}${field("報名扣點/費用扣抵", "feePoints", 0, "0 表示不扣點", false, "number")}${select("狀態", "status", ["下架", "上架"])}<button class="btn primary" type="submit">建立活動</button></form>`;
  }
  function preview() {
    const rows = state.data.activities.filter(x => x.status === "上架");
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">官方活動預約</h2><span class="muted">TDEA 台灣數位教育發展協會</span></div><div style="padding:18px">${rows.length ? `<div class="cards">${rows.map(x => `<article class="activity-card"><span class="badge live">${esc(activityTypeLabel(x))}</span><h3>${esc(x.name)}</h3><div class="info-row"><span>課程時間</span><strong>${esc(x.courseTime || "未定")}</strong></div><div class="info-row"><span>截止</span><strong>${esc(x.deadline || "未定")}</strong></div><div class="info-row"><span>名額</span><strong>${esc(x.capacity || "不限")}</strong></div><div class="info-row"><span>狀況</span><strong>${n(x.reg)} 人報名</strong></div><button class="btn primary" style="width:100%;margin-top:14px" data-register="${x.id}">立即報名</button></article>`).join("")}</div>` : empty("目前暫無開放中的活動")}</div></section>`;
  }

  function keywordRows() {
    const builtIn = [
      { keyword: "TDEA每月活動", aliases: "無", purpose: "推送每月活動橫式多頁 FLEX", reply: "回覆每月活動 carousel，詳細說明走 LIFF，報名按鈕走自建報名表", entry: `${liffBase}?monthlyDetail={活動編號}`, owner: "每月活動", status: "啟用中" },
      { keyword: "TDEA活動查詢", aliases: "無", purpose: "讓會員查詢或取消自己的活動報名", reply: "開啟 LIFF「我的活動報名」，以 LINE Login 查詢", entry: `${liffBase}?query=1`, owner: "報名系統", status: "啟用中" },
      { keyword: "TDEA會員QR", aliases: "無", purpose: "會員開啟自己的扣點 QR，給合作店家掃描", reply: "開啟 LIFF「會員 QR」頁面", entry: `${liffBase}?memberQr=1`, owner: "點數折抵", status: "啟用中" },
      { keyword: "TDEA行事曆", aliases: "TDEA日曆、TDEA年度活動", purpose: "開啟協會 Google 行事曆", reply: "開啟 LIFF 行事曆頁面，嵌入 TDEA Google Calendar", entry: `${liffBase}?calendar=1`, owner: "行事曆", status: "啟用中" },
      { keyword: "TDEA點數", aliases: "TDEA查點、TDEA點數查詢、TDEA紅利", purpose: "查詢發話者自己的母站點數", reply: "以 LINE userId 查母站點數 API，回覆餘額與最近紀錄", entry: "", owner: "母站點數", status: "啟用中" },
      { keyword: "TDEA點數+UID", aliases: "例：TDEA點數+Ub68b9724664b889e790c789ece72f717", purpose: "管理測試或客服查指定 LINE UID 點數", reply: "以指定 UID 查母站點數 API", entry: "", owner: "母站點數", status: "啟用中" },
      { keyword: "TDEA會員專區", aliases: "TDEA會員、TDEA會員中心、TDEA專區", purpose: "顯示會員入口選單", reply: "回覆會員專區 FLEX，含活動與點數入口", entry: liffBase, owner: "內建關鍵字", status: "啟用中" },
      { keyword: "TDEA活動", aliases: "TDEA報名、TDEA課程", purpose: "活動資訊入口", reply: "回覆活動資訊 FLEX；每月活動請用 TDEA每月活動", entry: liffBase, owner: "內建關鍵字", status: "啟用中" },
      { keyword: "TDEA說明", aliases: "TDEAHELP、TDEA幫助", purpose: "查看可用關鍵字說明", reply: "回覆文字版使用說明", entry: "", owner: "內建關鍵字", status: "啟用中" }
    ];
    const flexRules = Array.isArray(state.data.flexRules) ? state.data.flexRules : [];
    const custom = flexRules.map((rule) => ({
      keyword: rule.keyword || "(未命名)",
      aliases: rule.matchMode === "contains" ? "包含關鍵字" : "完全符合",
      purpose: rule.title || "自訂 FLEX 回覆",
      reply: rule.replyType === "text" ? "文字回覆" : "Flex Message",
      entry: rule.replyType === "text" ? "" : flexEntryUrl(rule),
      owner: "FLEX專區",
      status: rule.enabled ? "啟用中" : "停用"
    }));
    return [...builtIn, ...custom];
  }

  function keywords() {
    const rows = keywordRows();
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">LINE 關鍵字清單</h2><span class="muted">${rows.length} 組規則</span></div><div class="table-wrap"><table><thead><tr><th>關鍵字</th><th>別名 / 比對</th><th>用途</th><th>回覆行為</th><th>網址 / 入口</th><th>設定位置</th><th>狀態</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row.keyword)}</strong></td><td>${esc(row.aliases)}</td><td>${esc(row.purpose)}</td><td>${esc(row.reply)}</td><td style="max-width:360px;white-space:normal;word-break:break-all">${entryCell(row.entry)}</td><td>${esc(row.owner)}</td><td><span class="badge ${row.status === "啟用中" ? "live" : "off"}">${esc(row.status)}</span></td></tr>`).join("")}</tbody></table></div></section><section class="panel" style="margin-top:18px"><div class="panel-head"><h2 class="panel-title">使用原則</h2></div><div style="padding:18px;line-height:1.8;color:#344054">所有新版關鍵字都建議以 <strong>TDEA</strong> 開頭，避免和原本 LINE OA 舊系統互相干擾。沒有命中新版關鍵字的訊息會交給舊 webhook 繼續處理。</div></section>`;
  }

  function redeem() {
    const rows = state.redeemRecords || [];
    const latestUrl = state.latestRedeem?.sessionUrl || state.latestRedeem?.redeemUrl || "";
    const qr = latestUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(latestUrl)}` : "";
    const statusLabel = (status) => status === "active" || status === "pending" ? "有效" : status === "closed" ? "已關閉" : status === "expired" ? "已過期" : status === "used" ? "已使用" : status || "-";
    const now = new Date();
    const startValue = localDatetime(now);
    const endValue = localDatetime(new Date(now.getTime() + 60 * 60 * 1000));
    const ledger = state.pointLedger || [];
    return `<div class="split"><section class="panel"><div class="panel-head"><h2 class="panel-title">建立店家限時掃碼網址</h2></div><form class="form-grid" id="redeem-form" style="padding:18px">${field("合作店家", "vendorName", "", "例如：合作店家 A", true)}<div class="grid two">${field("授權開始", "startsAt", startValue, "", true, "datetime-local")}${field("授權結束", "expiresAt", endValue, "", true, "datetime-local")}</div><div class="field"><label>扣點模式</label><select name="mode"><option value="fixed">固定點數</option><option value="manual">店家現場輸入點數</option><option value="rate">依消費金額換算點數</option></select></div><div class="grid two">${field("固定扣抵點數", "points", 0, "固定模式使用；其他模式可留 0", false, "number")}${field("單次扣點上限", "maxPoints", 0, "0 表示不限制", false, "number")}</div><div class="grid two">${field("金額換算比例", "pointRate", 0, "例如 0.1 表示 100 元扣 10 點", false, "number")}${field("參考金額備註", "amount", 0, "非必填，僅供紀錄", false, "number")}</div><div class="field"><label>授權備註</label><textarea name="note" placeholder="例如：展場合作店家、餐飲折抵、活動攤位"></textarea></div><button class="btn primary" type="submit">產生店家掃碼網址</button></form></section><section class="panel"><div class="panel-head"><h2 class="panel-title">最新店家工作台</h2></div><div style="padding:18px">${latestUrl ? `<div class="grid"><img src="${qr}" alt="店家工作台 QR" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:8px"><div class="field"><label>店家掃碼工作台網址</label><input readonly value="${esc(latestUrl)}"></div><button class="btn" data-copy-redeem>複製網址</button><div class="muted">把這個網址或 QR 給店家。店家打開後會出現掃描器，用來掃會員個人 QR 並扣點。</div></div>` : empty("尚未產生店家掃碼網址")}</div></section></div><section class="panel" style="margin-top:18px"><div class="panel-head"><h2 class="panel-title">店家授權紀錄</h2><button class="btn" data-load-redeem>重新載入</button></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>店家</th><th>模式</th><th>固定/上限</th><th>有效期間</th><th>狀態</th><th>已扣次數</th><th>工作台</th></tr></thead><tbody>${rows.map(row => { const url = row.sessionUrl || row.redeemUrl || ""; return `<tr><td>${esc(row.vendorName)}</td><td>${esc(modeLabel(row.mode))}</td><td>${n(row.points)} / ${n(row.maxPoints)}</td><td>${esc(formatTime(row.startsAt || row.createdAt))}<br>${esc(formatTime(row.expiresAt))}</td><td><span class="badge ${row.status === "active" || row.status === "pending" ? "live" : "off"}">${esc(statusLabel(row.status))}</span></td><td>${n(row.usageCount || row.transactions?.length || 0)}</td><td><button class="link" data-copy-redeem-url="${esc(url)}">複製</button></td></tr>`; }).join("")}</tbody></table></div>` : empty("尚未載入店家授權紀錄")}</section><section class="panel" style="margin-top:18px"><div class="panel-head"><h2 class="panel-title">母站點數補登 / 點數流水</h2><button class="btn" data-load-point-ledger>刷新流水</button></div><form class="form-grid" id="legacy-sync-form" style="padding:18px;border-bottom:1px solid #e5e7eb"><div class="field"><label>會員 LINE UID</label><input name="lineUserId" placeholder="貼上會員 UID 後可從母站補登一次餘額"></div><button class="btn" type="submit">補登母站點數</button></form>${ledger.length ? `<div class="table-wrap"><table><thead><tr><th>時間</th><th>UID</th><th>類型</th><th>異動</th><th>餘額</th><th>原因</th></tr></thead><tbody>${ledger.slice(0, 80).map(log => `<tr><td>${esc(formatTime(log.createdAt))}</td><td>${esc(log.lineUserId)}</td><td>${esc(log.type)}</td><td>${n(log.amount)}</td><td>${n(log.balanceAfter)}</td><td>${esc(log.reason)}</td></tr>`).join("")}</tbody></table></div>` : empty("目前沒有點數流水")}</section>`;
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
  function valueText(value) {
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join("、");
    if (value && typeof value === "object") {
      for (const key of ["value", "answer", "label", "name", "text", "display", "display_value", "formatted", "url", "file_name"]) {
        const next = valueText(value[key]);
        if (next) return next;
      }
      return Object.values(value).map(valueText).filter(Boolean).join("、");
    }
    return String(value ?? "");
  }
  function modeLabel(mode) {
    if (mode === "manual") return "現場輸入";
    if (mode === "rate") return "金額換算";
    return "固定點數";
  }
  function localDatetime(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function formatTime(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? String(value || "-") : date.toLocaleString("zh-TW", { hour12: false });
  }
  function activityForm(rowId) {
    const x = state.data.activities.find(r => r.id === rowId) || {};
    return `<form class="form-grid" id="drawer-activity">${hidden("id", x.id)}${field("活動名稱", "name", x.name)}${select("類型", "type", ["講座類", "教學類", "聯誼類"], x.type)}${field("課程時間", "courseTime", x.courseTime)}${field("報名截止", "deadline", x.deadline)}${field("人數限制", "capacity", x.capacity, "", false, "number")}${field("簽到贈點", "checkinPoints", x.checkinPoints || 0, "0 表示不贈點", false, "number")}${field("報名扣點/費用扣抵", "feePoints", x.feePoints || 0, "0 表示不扣點", false, "number")}${field("報名人數", "reg", x.reg, "", false, "number")}${field("簽到人數", "check", x.check, "", false, "number")}${select("狀態", "status", ["上架", "下架"], x.status)}${field("表單連結", "formUrl", x.formUrl)}<button class="btn primary" type="submit">儲存</button></form>`;
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
    const refreshKeywords = document.querySelector("[data-refresh-keywords]"); if (refreshKeywords) refreshKeywords.onclick = () => { render(); toast("關鍵字列表已刷新"); };
    const loadRedeem = document.querySelector("[data-load-redeem]"); if (loadRedeem) loadRedeem.onclick = () => loadRedeemRecords(true);
    const loadPointLedgerButton = document.querySelector("[data-load-point-ledger]"); if (loadPointLedgerButton) loadPointLedgerButton.onclick = () => loadPointLedger(true);
    document.querySelectorAll("[data-copy-redeem-url]").forEach(b => b.onclick = () => { navigator.clipboard.writeText(b.dataset.copyRedeemUrl || ""); toast("折抵連結已複製"); });
    const copyRedeem = document.querySelector("[data-copy-redeem]"); if (copyRedeem) copyRedeem.onclick = () => { navigator.clipboard.writeText(state.latestRedeem?.sessionUrl || state.latestRedeem?.redeemUrl || ""); toast("店家掃碼網址已複製"); };
    const redeemForm = document.querySelector("#redeem-form"); if (redeemForm) redeemForm.onsubmit = createRedeem;
    const legacySyncForm = document.querySelector("#legacy-sync-form"); if (legacySyncForm) legacySyncForm.onsubmit = syncLegacyPoints;
    const syncButton = document.querySelector("[data-sync-registrations]"); if (syncButton) syncButton.onclick = () => syncRegistrations(true);
    const clearTest = document.querySelector("[data-clear-test]"); if (clearTest) clearTest.onclick = clearTestData;
    document.querySelectorAll("[data-register]").forEach(b => b.onclick = () => {
      const x = state.data.activities.find(r => r.id === b.dataset.register);
      const url = x?.formUrl || x?.nativeFormUrl || x?.googleFormUrl || x?.opnformFormUrl || "";
      if (url) location.href = url;
      else toast("這個活動尚未建立報名表，請到編輯活動產生。");
    });
    const af = document.querySelector("#activity-form"); if (af) af.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(af)); state.data.activities.unshift({ id: uid(), name: d.name.trim(), type: d.type, typeLabel: formTypeLabel(d), courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), checkinPoints: Number(d.checkinPoints || 0), feePoints: Number(d.feePoints || 0), reg: 0, check: 0, status: d.status, formUrl: "" }); save(); state.view = "dashboard"; render(); toast("活動已建立"); };
    const ea = document.querySelector("#drawer-activity"); if (ea) ea.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(ea)); const x = state.data.activities.find(r => r.id === d.id); if (x) Object.assign(x, { name: d.name, type: d.type, typeLabel: formTypeLabel(d), courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), checkinPoints: Number(d.checkinPoints || 0), feePoints: Number(d.feePoints || 0), reg: Number(d.reg || 0), check: Number(d.check || 0), status: d.status, formUrl: d.formUrl }); state.drawer = ""; save(); render(); toast("活動已儲存"); };
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

  async function createRedeem(event) {
    event.preventDefault();
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) return toast("請先設定管理者 Email");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch(api + "/api/redeem/create", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "折抵碼建立失敗");
    state.latestRedeem = result.data;
    form.reset();
    await loadRedeemRecords();
    render();
    toast("店家掃碼網址已產生");
  }

  async function loadRedeemRecords(showMessage = false) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) {
      if (showMessage) toast("請先設定管理者 Email");
      return;
    }
    const response = await fetch(api + "/api/redeem/list", { headers: { "x-admin-email": email }, cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      if (showMessage) toast(result.message || "折抵紀錄載入失敗");
      return;
    }
    state.redeemRecords = Array.isArray(result.data) ? result.data : [];
    render();
    if (showMessage) toast("折抵紀錄已更新");
  }

  async function syncLegacyPoints(event) {
    event.preventDefault();
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) return toast("請先設定管理者 Email");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const lineUserId = String(data.lineUserId || "").trim();
    if (!lineUserId) return toast("請輸入會員 LINE UID");
    const response = await fetch(api + "/api/points/sync-legacy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify({ lineUserId, force: Boolean(data.force) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "母站點數補登失敗");
    const payload = result.data || {};
    await loadPointLedger();
    event.currentTarget.reset();
    if (payload.success) toast(`已從母站補登 ${n(payload.imported || 0)} 點`);
    else if (payload.reason === "already_synced") toast("此 UID 已補登過母站點數");
    else if (payload.reason === "no_legacy_points") toast("母站沒有可補登點數");
    else toast(payload.message || "母站補登完成");
  }

  async function loadPointLedger(showMessage = false) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) {
      if (showMessage) toast("請先設定管理者 Email");
      return;
    }
    const response = await fetch(api + "/api/points/ledger?limit=200", {
      headers: { "x-admin-email": email },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      if (showMessage) toast(result.message || "點數流水載入失敗");
      return;
    }
    state.pointLedger = Array.isArray(result.data) ? result.data : [];
    render();
    if (showMessage) toast("點數流水已刷新");
  }

  async function loadRegistrationList(rowId, showMessage = false) {
    const activity = state.data.activities.find(r => r.id === rowId);
    if (!activity) return;
    try {
      const keys = registrationCandidates(activity).map(encodeURIComponent).join(",");
      const res = await fetch(api + "/api/registrations/list?keys=" + keys, { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      state.registrationLists[rowId] = Array.isArray(result.data) ? result.data : [];
      activity.reg = state.registrationLists[rowId].length;
      save();
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
  window.TDEAApp = {
    navigate(id) {
      state.view = id;
      state.drawer = "";
      render();
    },
    isView(id) {
      return state.view === id;
    }
  };
  render();
  loadRosterSeed();
})();
