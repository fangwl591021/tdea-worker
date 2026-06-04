(() => {
  if (isPublicLiffMode()) return;

  const key = "tdea-manager-v3";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const liffBase = "https://liff.line.me/2005868456-2jmxqyFU";
  const autoSyncKey = "tdea-auto-sync-registrations";
  const sidebarCollapsedKey = "tdea-sidebar-collapsed";
  const labels = {
    dashboard: ["活動總覽", "查看活動狀態、報名與簽到概況。"],
    association: ["協會名冊", "維護協會會員資料與會員資格，可匯入 CSV。"],
    vendor: ["廠商名冊", "維護廠商會員、統編、窗口與備註，可匯入 CSV。"],
    creator: ["創建活動", "建立活動草稿，之後可直接改接 D1。"],
    keywords: ["關鍵字", "整理 LINE OA 觸發關鍵字、用途與回覆行為。"],
    redeem: ["點數折抵", "建立限時店家掃碼工作台，店家掃會員 QR 後執行扣點。"]
  };
  const state = { view: "dashboard", drawer: "", data: load(), registrationLists: {} };
  let lineDraftAutoImporting = false;
  let lineDraftLastAutoImport = 0;

  function sidebarCollapsed() { return localStorage.getItem(sidebarCollapsedKey) === "Y"; }
  function setSidebarCollapsed(value) { localStorage.setItem(sidebarCollapsedKey, value ? "Y" : "N"); }
  function applySidebarCollapsed(value = sidebarCollapsed()) {
    const shell = document.querySelector(".shell");
    if (shell) shell.classList.toggle("sidebar-collapsed", value);
    const button = document.querySelector("[data-sidebar-toggle]");
    if (button) {
      const label = value ? "展開選單" : "收合選單";
      button.textContent = value ? "›" : "‹";
      button.title = label;
      button.setAttribute("aria-label", label);
    }
  }

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
  function isDefinitelyNonRosterRow(row, type) {
    const memberNo = String(row?.memberNo || "").trim().toUpperCase();
    const name = String(row?.name || row?.companyName || row?.keyword || row?.title || "").trim().toUpperCase();
    const note = String(row?.note || row?.purpose || row?.reply || "").trim();
    if (/^TDEA/.test(memberNo)) return true;
    if (/^TDEA/.test(name) && !/^[A-Z]\d{7}$/.test(memberNo)) return true;
    if (!memberNo && /^TDEA/.test(name)) return true;
    if (/LINE|LIFF|跑馬燈|個人訊息|關鍵字/.test(note) && /^TDEA/.test(memberNo + name)) return true;
    if (type === "association" && memberNo && !/^[A-Z]\d{7}$/.test(memberNo)) return true;
    return false;
  }
  function visibleRosterRows(type) {
    const rows = Array.isArray(state.data[type]) ? state.data[type] : [];
    return rows.filter((row) => !isDefinitelyNonRosterRow(row, type));
  }
  function cleanupRosterData() {
    let changed = false;
    ["association", "vendor"].forEach((type) => {
      const rows = Array.isArray(state.data[type]) ? state.data[type] : [];
      const cleaned = rows.filter((row) => !isDefinitelyNonRosterRow(row, type));
      if (cleaned.length !== rows.length) {
        state.data[type] = cleaned;
        changed = true;
      }
    });
    if (changed) save();
  }
  function adminHeaders(extra = {}) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    return { ...extra, ...(email ? { "x-admin-email": email } : {}) };
  }
  async function syncRosterMemberToWorker(type, item) {
    if (!item || (type !== "association" && type !== "vendor")) return;
    try {
      const member = {
        ...item,
        rosterType: type,
        rosterMemberNo: item.memberNo || item.rosterMemberNo || "",
        rosterName: type === "vendor" ? (item.companyName || item.name || "") : (item.name || item.companyName || ""),
        lineUserId: item.lineUserId || item.LINE_user_id || item.uid || ""
      };
      await fetch(api + "/api/aiwe-members/import", {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ source: "crm-editor", members: [member] })
      });
    } catch (_) {}
  }
  function deletedActivityKeys() {
    if (!Array.isArray(state.data.deletedActivityKeys)) state.data.deletedActivityKeys = [];
    return state.data.deletedActivityKeys;
  }
  function activityDeleteKeys(activity) {
    return [activity?.id, activity?.activityNo, activity?.lineDraftId, activity?.name]
      .map(value => String(value || "").trim())
      .filter(Boolean);
  }
  function isDeletedActivity(activity) {
    const deleted = new Set(deletedActivityKeys());
    return activityDeleteKeys(activity).some(value => deleted.has(value));
  }
  function markActivityDeleted(activity) {
    const keys = new Set(deletedActivityKeys());
    activityDeleteKeys(activity).forEach(value => keys.add(value));
    state.data.deletedActivityKeys = [...keys].slice(-300);
  }
  async function deleteRemoteLineActivityDraft(activity) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) return;
    try {
      await fetch(api + "/api/line-activity-drafts/delete", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-email": email },
        body: JSON.stringify({
          id: activity?.id || "",
          lineDraftId: activity?.lineDraftId || "",
          activityNo: activity?.activityNo || "",
          name: activity?.name || "",
          keys: activityDeleteKeys(activity)
        }),
        keepalive: true
      });
    } catch (_) {}
  }
  function load() {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (_) {}
    return {
      activities: [
        { id: uid(), name: "中秋聯歡活動", type: "聯誼類", courseTime: "2026/09/20 14:00", deadline: "2026/09/10", capacity: 80, reg: 0, check: 0, status: "上架", formUrl: "" },
        { id: uid(), name: "AI 教學工作坊", type: "教學類", courseTime: "2026/06/15 10:00", deadline: "2026/06/08", capacity: 40, reg: 0, check: 0, status: "下架", formUrl: "" }
      ],
      association: [],
      vendor: [],
      deletedActivityKeys: []
    };
  }

  let registrationSyncing = false;
  let monthlyRegistrationMap = null;
  let monthlyRegistrationMapLoadedAt = 0;

  function isPublicLiffMode() {
    const publicKeys = [
      "register",
      "query",
      "memberQr",
      "calendar",
      "checkin",
      "redeem",
      "redeemSession",
      "monthlyDetail",
      "personalMessages",
      "close"
    ];
    const bags = [new URLSearchParams(location.search)];
    const liffState = bags[0].get("liff.state");
    if (liffState) {
      let decoded = liffState;
      try { decoded = decodeURIComponent(liffState); } catch (_) {}
      const query = decoded.startsWith("?")
        ? decoded.slice(1)
        : decoded.includes("?")
          ? decoded.split("?").slice(1).join("?")
          : decoded;
      bags.push(new URLSearchParams(query));
    }
    return bags.some((params) => publicKeys.some((name) => params.has(name)));
  }
  function registrationCandidates(activity) {
    const baseKeys = [activity?.id, activity?.activityNo, activity?.formId, activity?.nativeFormId, activity?.googleFormId, activity?.opnformFormId, activity?.name];
    const extraKeys = monthlyRegistrationKeysFor(activity);
    return [...baseKeys, ...extraKeys]
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index);
  }
  function extractRegisterId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, location.href);
      const direct = url.searchParams.get("register") || "";
      if (direct) return direct.trim();
      const state = url.searchParams.get("liff.state") || "";
      if (state) {
        let decoded = state;
        try { decoded = decodeURIComponent(state); } catch (_) {}
        const query = decoded.startsWith("?") ? decoded.slice(1) : decoded.includes("?") ? decoded.split("?").slice(1).join("?") : decoded;
        return (new URLSearchParams(query).get("register") || "").trim();
      }
    } catch (_) {}
    return "";
  }
  function monthlyRegistrationKeysFor(activity) {
    if (!monthlyRegistrationMap || !activity) return [];
    const candidates = [activity.id, activity.activityNo, activity.name]
      .map(value => String(value || "").trim())
      .filter(Boolean);
    const output = [];
    candidates.forEach(key => {
      const values = monthlyRegistrationMap.get(key) || [];
      values.forEach(value => output.push(value));
    });
    return output;
  }
  async function ensureMonthlyRegistrationMap(force = false) {
    if (!force && monthlyRegistrationMap && Date.now() - monthlyRegistrationMapLoadedAt < 30000) return monthlyRegistrationMap;
    const map = new Map();
    try {
      const res = await fetch(api + "/api/monthly-activity", { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      const pages = Array.isArray(result?.data?.pages) ? result.data.pages : [];
      pages.forEach(page => {
        const keys = [page.id, page.activityNo, page.detailTitle, page.title, page.name]
          .map(value => String(value || "").trim())
          .filter(Boolean);
        const values = [page.id, page.activityNo, page.detailTitle, extractRegisterId(page.formUrl), extractRegisterId(page.detailUrl)]
          .map(value => String(value || "").trim())
          .filter(Boolean);
        keys.forEach(key => {
          const current = map.get(key) || [];
          values.forEach(value => { if (!current.includes(value)) current.push(value); });
          map.set(key, current);
        });
      });
    } catch (_) {}
    monthlyRegistrationMap = map;
    monthlyRegistrationMapLoadedAt = Date.now();
    return map;
  }
  function autoSyncEnabled() { return localStorage.getItem(autoSyncKey) !== "N"; }
  function setAutoSyncEnabled(enabled) { localStorage.setItem(autoSyncKey, enabled ? "Y" : "N"); }
  async function syncRegistrations(showMessage = false) {
    if (registrationSyncing || state.view !== "dashboard") return;
    registrationSyncing = true;
    try {
      if (showMessage || autoSyncEnabled()) await pullRemoteResponses(showMessage);
      await ensureMonthlyRegistrationMap(true);
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

  function defaultActivityDetail(activity) {
    return [
      activity.name || "TDEA 活動",
      "",
      activity.courseTime ? `活動時間：${activity.courseTime}` : "",
      activity.deadline ? `報名截止：${activity.deadline}` : "",
      Number(activity.capacity || 0) ? `名額：${Number(activity.capacity || 0)}` : "",
      "",
      "請補上活動介紹、地點、費用與注意事項。"
    ].filter((line) => line !== "").join("\n");
  }

  function nativeFormSettingsFor(activity) {
    const memberLogin = activity.registrationMode === "member_login";
    const mode1 = activity.templateMode === "mode1_vendor_visit" || activity.type === "企業參訪" || activity.typeLabel === "企業參訪";
    if (mode1) {
      return {
        templateMode: "mode1_vendor_visit",
        registrationMode: activity.registrationMode || "member_login",
        memberField: memberLogin ? "login" : "required",
        genderField: "none",
        mealField: "none",
        requireImageUpload: "N",
        fields: memberLogin
          ? [
              { key: "participantUnit", label: "參加單位名稱", type: "radio", required: true, options: ["社團法人台灣設計菁英協會會員", "其他"] },
              { key: "note", label: "備註", type: "paragraph", required: false }
            ]
          : [
              { key: "name", label: "姓名", type: "text", required: true },
              { key: "phone", label: "電話", type: "text", required: true },
              { key: "participantUnit", label: "參加單位名稱", type: "radio", required: true, options: ["社團法人台灣設計菁英協會會員", "其他"] },
              { key: "note", label: "備註", type: "paragraph", required: false }
            ]
      };
    }
    return {
      registrationMode: activity.registrationMode || "form",
      memberField: memberLogin ? "login" : "required",
      genderField: memberLogin ? "none" : "required",
      mealField: "required",
      requireImageUpload: "N",
      fields: memberLogin
        ? [
            { key: "meal", label: "用餐選項", type: "radio", required: true, options: ["葷", "素"] },
            { key: "note", label: "備註", type: "paragraph", required: false }
          ]
        : [
            { key: "name", label: "姓名", type: "text", required: true },
            { key: "phone", label: "手機", type: "text", required: true },
            { key: "email", label: "Email", type: "email", required: true },
            { key: "company", label: "公司/單位", type: "text", required: false },
            { key: "memberNo", label: "會員編號", type: "text", required: false },
            { key: "gender", label: "性別", type: "radio", required: true, options: ["男", "女"] },
            { key: "isMember", label: "是否為會員", type: "radio", required: true, options: ["是", "否"] },
            { key: "meal", label: "用餐選項", type: "radio", required: true, options: ["葷", "素"] },
            { key: "note", label: "備註", type: "paragraph", required: false }
          ]
    };
  }

  async function ensureNativeFormForActivity(activity, email) {
    if (!email || activity.formUrl || activity.nativeFormUrl) return false;
    const settings = nativeFormSettingsFor(activity);
    const response = await fetch(`${api}/api/native-forms/create`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify({ activity, settings })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return false;
    const formUrl = result.formUrl || result.nativeFormUrl || result.data?.formUrl || result.data?.nativeFormUrl || "";
    if (!formUrl) return false;
    activity.formMode = "native_form";
    activity.formId = result.formId || result.nativeFormId || activity.id;
    activity.nativeFormId = result.nativeFormId || result.formId || activity.formId;
    activity.formUrl = formUrl;
    activity.nativeFormUrl = formUrl;
    state.data.formSettings ||= {};
    state.data.formSettings[activity.id] = { ...settings, templateMode: activity.templateMode || settings.templateMode || "", formMode: "native_form", formId: activity.formId, nativeFormId: activity.nativeFormId, formUrl, nativeFormUrl: formUrl, detailText: activity.detailText || "", posterUrl: activity.posterUrl || activity.imageUrl || "" };
    if (activity.activityNo) state.data.formSettings[activity.activityNo] = state.data.formSettings[activity.id];
    return true;
  }

  async function uploadActivityPoster(file, activityId, email) {
    if (!file || !file.size || !email) return null;
    const form = new FormData();
    form.append("file", file);
    form.append("folder", `activities/${activityId || "poster"}`);
    const response = await fetch(`${api}/api/uploads`, { method: "POST", headers: { "x-admin-email": email }, body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "圖片上傳失敗");
    return { url: result.url?.startsWith("http") ? result.url : api + result.url, key: result.key || "" };
  }

  async function importLineActivityDrafts(showMessage = true) {
    const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    if (!email) {
      if (showMessage) toast("請先設定管理者 Email，才能匯入 LINE 活動草稿");
      return;
    }
    const response = await fetch(api + "/api/line-activity-drafts", {
      headers: { "x-admin-email": email },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      if (showMessage) toast(result.message || "LINE 活動草稿匯入失敗");
      return;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    let added = 0;
    let repaired = 0;
    let formsCreated = 0;
    for (const row of rows) {
      if (row.status !== "completed") continue;
      const activity = row.activity || {};
      const key = activity.lineDraftId || row.id || activity.id;
      if (!key) continue;
      if (isDeletedActivity({ ...activity, lineDraftId: key })) continue;
      const existing = state.data.activities.find(item => item.lineDraftId === key || item.id === activity.id);
      if (existing) {
        if (!existing.detailText) existing.detailText = activity.detailText || defaultActivityDetail(existing);
        if (!existing.posterUrl && activity.posterUrl) existing.posterUrl = activity.posterUrl;
        if (!existing.imageUrl && (activity.imageUrl || existing.posterUrl)) existing.imageUrl = activity.imageUrl || existing.posterUrl;
        if (!existing.formUrl && await ensureNativeFormForActivity(existing, email)) formsCreated += 1;
        repaired += 1;
        continue;
      }
      const item = {
        id: activity.id || uid(),
        activityNo: activity.activityNo || "",
        name: activity.name || "LINE 建立活動",
        type: activity.type || "講座類",
        typeLabel: activity.typeLabel || activity.type || "講座類",
        courseTime: activity.courseTime || "",
        deadline: activity.deadline || "",
        capacity: Number(activity.capacity || 0),
        checkinPoints: Number(activity.checkinPoints || 0),
        feePoints: Number(activity.feePoints || 0),
        registrationMode: activity.registrationMode || "form",
        reg: Number(activity.reg || 0),
        check: Number(activity.check || 0),
        status: activity.status || "下架",
        formUrl: activity.formUrl || "",
        detailText: activity.detailText || defaultActivityDetail(activity),
        posterUrl: activity.posterUrl || activity.imageUrl || "",
        imageUrl: activity.imageUrl || activity.posterUrl || "",
        lineDraftId: key,
        lineCreatedBy: activity.lineCreatedBy || row.lineUserId || ""
      };
      state.data.activities.unshift(item);
      if (await ensureNativeFormForActivity(item, email)) formsCreated += 1;
      added += 1;
    }
    if (added || repaired) {
      save();
      state.view = "dashboard";
      render();
    }
    if (showMessage) toast(added ? `已匯入 ${added} 筆 LINE 活動草稿，產生 ${formsCreated} 個報名頁` : "沒有新的 LINE 活動草稿可匯入");
  }

  function maybeAutoImportLineActivityDrafts() {
    if (state.view !== "dashboard" || lineDraftAutoImporting) return;
    const now = Date.now();
    if (now - lineDraftLastAutoImport < 15000) return;
    lineDraftLastAutoImport = now;
    lineDraftAutoImporting = true;
    setTimeout(() => {
      importLineActivityDrafts(false).catch(() => undefined).finally(() => {
        lineDraftAutoImporting = false;
      });
    }, 0);
  }

  function render() {
    cleanupRosterData();
    const [title, sub] = labels[state.view];
    const collapsed = sidebarCollapsed();
    document.querySelector("#app").innerHTML = `
      <div class="shell ${collapsed ? "sidebar-collapsed" : ""}">
        <aside class="sidebar">
          <div class="brand"><span>TDEA 管理中心</span><button class="sidebar-toggle" type="button" data-sidebar-toggle title="${collapsed ? "展開選單" : "收合選單"}" aria-label="${collapsed ? "展開選單" : "收合選單"}">${collapsed ? "›" : "‹"}</button></div>
          <nav class="nav">${nav("dashboard", "活動總覽")}${nav("association", "協會名冊")}${nav("vendor", "廠商名冊")}${nav("creator", "創建活動")}${nav("redeem", "點數折抵")}</nav>
        </aside>
        <main class="main">
          <div class="topbar"><div><h1>${title}</h1><div class="subtitle">${sub}</div></div><div class="actions">${actions()}</div></div>
          ${body()}
        </main>
      </div>
      ${drawer()}
      <div class="toast" id="toast"></div>`;
    bind();
    maybeAutoImportLineActivityDrafts();
    if (autoSyncEnabled()) syncRegistrations();
    if (state.view === "redeem" && !state.redeemRecords) loadRedeemRecords();
    if (state.view === "redeem" && !state.pointLedger) loadPointLedger();
    window.TDEALineNav?.refresh?.();
  }

  function nav(id, text) { return `<button class="${state.view === id ? "active" : ""}" data-nav="${id}" title="${esc(text)}">${text}</button>`; }
  function actions() {
    if (state.view === "association") return `<button class="btn" data-import="association">匯入 CSV</button><button class="btn primary" data-drawer="association:new">新增協會會員</button>`;
    if (state.view === "vendor") return `<button class="btn" data-import="vendor">匯入 CSV</button><button class="btn primary" data-drawer="vendor:new">新增廠商會員</button>`;
    if (state.view === "creator") return `<button class="btn" data-import-line-drafts>匯入 LINE 草稿</button><button class="btn" data-reset>清空表單</button>`;
    if (state.view === "redeem") return `<button class="btn" data-load-redeem>刷新紀錄</button>`;
    if (state.view === "keywords") return `<button class="btn" data-refresh-keywords>刷新列表</button>`;
    return `<label class="sync-toggle"><input type="checkbox" data-auto-sync ${autoSyncEnabled() ? "checked" : ""}> 自動同步</label><button class="btn" data-sync-registrations>同步報名</button><button class="btn" data-worker>檢查 Worker</button><button class="btn danger" data-clear-test>清空測試資料</button><button class="btn primary" data-nav="creator">新增活動</button>`;
  }
  function body() {
    if (state.view === "association") return members("association");
    if (state.view === "vendor") return members("vendor");
    if (state.view === "creator") return creator();
    if (state.view === "redeem") return redeem();
    if (state.view === "keywords") return keywords();
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
    const rows = visibleRosterRows(type), vendor = type === "vendor";
    if (!rows.length) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><button class="btn" data-import="${type}">匯入 CSV</button></div>${empty(`目前沒有${vendor ? "廠商會員" : "協會會員"}資料`)}</section>`;
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${vendor ? "廠商會員" : "協會會員"}</h2><div class="actions"><button class="btn" data-import="${type}">匯入 CSV</button><button class="btn" data-export>匯出備份</button></div></div><div class="table-wrap"><table><thead><tr><th>會員編號</th><th>${vendor ? "公司名稱" : "姓名"}</th><th>${vendor ? "統編" : "身分"}</th><th>${vendor ? "聯絡窗口" : "性別"}</th><th>資格</th><th>備註</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.memberNo)}</td><td><strong>${esc(vendor ? x.companyName : x.name)}</strong></td><td>${esc(vendor ? x.taxId : x.identity)}</td><td>${esc(vendor ? x.contact : x.gender)}</td><td><span class="badge ${x.qualification === "Y" ? "live" : "off"}">${esc(x.qualification)}</span></td><td>${esc(x.note)}</td><td><button class="link" data-drawer="${type}:${x.id}">編輯</button><span class="muted"> / </span><button class="link danger-link" data-delete-member="${type}:${x.id}">刪除</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function creator() {
    return `<form class="form-card form-grid creator-form-wide" id="activity-form">
      ${select("活動建立模式", "templateMode", [["custom","一般活動"],["mode1_vendor_visit","模式 1：廠商參訪 / 聯合參訪"]], "mode1_vendor_visit")}
      ${field("活動名稱", "name", "", "例如：6月廠商參訪", true)}
      ${select("活動類型", "type", ["企業參訪", "講座類", "教學類", "聯誼類", "年度會議"])}
      ${select("報名方式", "registrationMode", [["member_login","會員/廠商登入報名"],["form","開放填表報名"],["mixed","會員優先，非會員填表"]], "member_login")}
      ${field("課程時間", "courseTime", "", "YYYY/MM/DD HH:MM")}
      ${field("報名截止", "deadline", "", "YYYY/MM/DD")}
      ${field("人數限制", "capacity", 0, "", false, "number")}
      ${field("簽到贈點", "checkinPoints", 0, "0 表示不贈點", false, "number")}
      ${field("報名扣點/費用扣抵", "feePoints", 0, "0 表示不扣點", false, "number")}
      <div class="field"><label>活動說明</label><textarea name="detailText" placeholder="可貼上 Google 表單上方的完整活動文案，系統會帶入詳細說明頁與模式 1 報名頁。"></textarea></div>
      ${select("狀態", "status", ["下架", "上架"])}
      <button class="btn primary" type="submit">建立活動</button>
    </form>`;
  }
  function keywordRows() {
    const builtIn = [
      { keyword: "TDEA建立活動", aliases: "TDEA新增活動、TDEA活動上稿、TDEA製作活動", purpose: "在 LINE 對話中建立活動草稿", reply: "逐步詢問活動名稱、類型、時間、截止、名額、點數、報名方式與狀態；完成後可在後台匯入 LINE 草稿", entry: "", owner: "LINE 對話上稿", status: "啟用中" },
      { keyword: "TDEA每月活動", aliases: "無", purpose: "推送每月活動橫式多頁 FLEX", reply: "回覆每月活動 carousel，詳細說明走 LIFF，報名按鈕走自建報名表", entry: `${liffBase}?monthlyDetail={活動編號}`, owner: "每月活動", status: "啟用中" },
      { keyword: "TDEA廠商列表", aliases: "TDEA廠商名片、TDEA合作廠商", purpose: "推送可點擊的廠商名片 FLEX 選單", reply: "回覆廠商 logo 九宮格；點擊後送出對應廠商名稱", entry: "", owner: "廠商名片", status: "啟用中" },
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
    return `<form class="form-grid" id="drawer-activity">${hidden("id", x.id)}${select("活動建立模式", "templateMode", [["custom","一般活動"],["mode1_vendor_visit","模式 1：廠商參訪 / 聯合參訪"]], x.templateMode || (x.type === "企業參訪" ? "mode1_vendor_visit" : "custom"))}${field("活動名稱", "name", x.name)}${select("類型", "type", ["企業參訪", "講座類", "教學類", "聯誼類", "年度會議"], x.type)}${field("課程時間", "courseTime", x.courseTime)}${field("報名截止", "deadline", x.deadline)}${field("人數限制", "capacity", x.capacity, "", false, "number")}${field("簽到贈點", "checkinPoints", x.checkinPoints || 0, "0 表示不贈點", false, "number")}${field("報名扣點/費用扣抵", "feePoints", x.feePoints || 0, "0 表示不扣點", false, "number")}${select("報名方式", "registrationMode", [["member_login","會員/廠商登入報名"],["form","開放填表報名"],["mixed","會員優先，非會員填表"]], x.registrationMode || "member_login")}${field("報名人數", "reg", x.reg, "", false, "number")}${field("簽到人數", "check", x.check, "", false, "number")}${select("狀態", "status", ["上架", "下架"], x.status)}${field("表單連結", "formUrl", x.formUrl)}<button class="btn primary" type="submit">儲存</button></form>`;
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
  function select(label, name, options, value = "") { return `<div class="field"><label>${label}</label><select name="${name}">${options.map(o => { const optionValue = Array.isArray(o) ? o[0] : o; const optionLabel = Array.isArray(o) ? o[1] : o; return `<option value="${esc(optionValue)}" ${optionValue === value ? "selected" : ""}>${esc(optionLabel)}</option>`; }).join("")}</select></div>`; }
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
    markActivityDeleted(row);
    deleteRemoteLineActivityDraft(row);
    state.data.activities = state.data.activities.filter(x => x.id !== rowId);
    if (state.data.formSettings) {
      delete state.data.formSettings[rowId];
      if (row.activityNo) delete state.data.formSettings[row.activityNo];
    }
    save();
    render();
    toast("活動已刪除");
  }

  function ensureActivityEditorFields() {
    const form = document.querySelector("#drawer-activity");
    if (!form || form.dataset.mediaFieldsReady) return;
    form.dataset.mediaFieldsReady = "true";
    const id = form.querySelector("input[name='id']")?.value || "";
    const activity = state.data.activities.find((item) => item.id === id) || {};
    const insertBefore = form.querySelector("input[name='formUrl']")?.closest(".field") || form.querySelector("button[type='submit']");
    const wrap = document.createElement("div");
    wrap.className = "activity-extra-fields";
    wrap.innerHTML = `
      <div class="field"><label>詳細說明</label><textarea name="detailText" placeholder="活動介紹、地點、費用、注意事項...">${esc(activity.detailText || "")}</textarea></div>
      <div class="field"><label>活動主圖</label><input type="file" accept="image/*" data-activity-poster-file><div class="muted">上傳後會寫入報名頁與每月活動主圖。</div></div>
      <div class="field"><label>圖片網址</label><input name="posterUrl" value="${esc(activity.posterUrl || activity.imageUrl || "")}" placeholder="上傳後自動填入，也可貼圖片網址"></div>
      <div class="field"><label>報名頁網址</label><input name="nativeFormUrl" value="${esc(activity.nativeFormUrl || "")}" placeholder="系統會自動產生"></div>`;
    insertBefore?.insertAdjacentElement("beforebegin", wrap);
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
    const keys = new Set(deletedActivityKeys());
    (state.data.activities || []).forEach(activity => activityDeleteKeys(activity).forEach(value => keys.add(value)));
    state.data = { activities: [], association: [], vendor: [], formSettings: {}, monthlyActivity: null, deletedActivityKeys: [...keys].slice(-300) };
    save();
    state.drawer = "";
    state.view = "dashboard";
    render();
    toast("測試資料已清空");
  }

  function bind() {
    ensureActivityEditorFields();
    const enhancedActivityForm = document.querySelector("#drawer-activity");
    if (enhancedActivityForm && !enhancedActivityForm.dataset.enhancedSubmitReady) {
      enhancedActivityForm.dataset.enhancedSubmitReady = "true";
      enhancedActivityForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const form = event.currentTarget;
        const d = Object.fromEntries(new FormData(form));
        const activity = state.data.activities.find((item) => item.id === d.id);
        if (!activity) return;
        Object.assign(activity, {
          name: d.name,
          type: d.type,
          typeLabel: formTypeLabel(d),
          courseTime: d.courseTime,
          deadline: d.deadline,
          capacity: Number(d.capacity || 0),
          checkinPoints: Number(d.checkinPoints || 0),
          feePoints: Number(d.feePoints || 0),
          registrationMode: d.registrationMode || "form",
          templateMode: d.templateMode || activity.templateMode || "",
          reg: Number(d.reg || 0),
          check: Number(d.check || 0),
          status: d.status,
          formUrl: d.formUrl,
          nativeFormUrl: d.nativeFormUrl || activity.nativeFormUrl || "",
          detailText: d.detailText || activity.detailText || "",
          posterUrl: d.posterUrl || activity.posterUrl || "",
          imageUrl: d.posterUrl || activity.imageUrl || ""
        });
        const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
        const file = form.querySelector("[data-activity-poster-file]")?.files?.[0];
        if (file) {
          try {
            const uploaded = await uploadActivityPoster(file, activity.id, email);
            if (uploaded?.url) {
              activity.posterUrl = uploaded.url;
              activity.imageUrl = uploaded.url;
            }
          } catch (error) {
            toast(error.message || "圖片上傳失敗");
            return;
          }
        }
        await ensureNativeFormForActivity(activity, email);
        state.data.formSettings ||= {};
        state.data.formSettings[activity.id] ||= {};
        Object.assign(state.data.formSettings[activity.id], {
          detailText: activity.detailText || "",
          posterUrl: activity.posterUrl || activity.imageUrl || "",
          imageUrl: activity.imageUrl || activity.posterUrl || "",
          formUrl: activity.formUrl || "",
          nativeFormUrl: activity.nativeFormUrl || "",
          nativeFormId: activity.nativeFormId || "",
          formMode: activity.formMode || ""
        });
        if (activity.activityNo) state.data.formSettings[activity.activityNo] = state.data.formSettings[activity.id];
        state.drawer = "";
        save();
        render();
        toast("活動已儲存");
      }, true);
    }
    const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
    if (sidebarToggle) sidebarToggle.onclick = () => {
      const next = !sidebarCollapsed();
      setSidebarCollapsed(next);
      applySidebarCollapsed(next);
    };
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
    const importLineDrafts = document.querySelector("[data-import-line-drafts]"); if (importLineDrafts) importLineDrafts.onclick = () => importLineActivityDrafts(true);
    document.querySelectorAll("[data-register]").forEach(b => b.onclick = () => {
      const x = state.data.activities.find(r => r.id === b.dataset.register);
      const url = x?.formUrl || x?.nativeFormUrl || x?.googleFormUrl || x?.opnformFormUrl || "";
      if (url) location.href = url;
      else toast("這個活動尚未建立報名表，請到編輯活動產生。");
    });
    const af = document.querySelector("#activity-form"); if (af) af.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(af)); const templateMode = d.templateMode || "custom"; const registrationMode = d.registrationMode || (templateMode === "mode1_vendor_visit" ? "member_login" : "form"); state.data.activities.unshift({ id: uid(), name: d.name.trim(), templateMode, type: d.type, typeLabel: formTypeLabel(d), courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), checkinPoints: Number(d.checkinPoints || 0), feePoints: Number(d.feePoints || 0), registrationMode, detailText: d.detailText || "", reg: 0, check: 0, status: d.status, formUrl: "" }); save(); state.view = "dashboard"; render(); toast("活動已建立"); };
    const ea = document.querySelector("#drawer-activity"); if (ea) ea.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(ea)); const x = state.data.activities.find(r => r.id === d.id); if (x) Object.assign(x, { name: d.name, templateMode: d.templateMode || x.templateMode || "custom", type: d.type, typeLabel: formTypeLabel(d), courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), checkinPoints: Number(d.checkinPoints || 0), feePoints: Number(d.feePoints || 0), registrationMode: d.registrationMode || "form", reg: Number(d.reg || 0), check: Number(d.check || 0), status: d.status, formUrl: d.formUrl }); state.drawer = ""; save(); render(); toast("活動已儲存"); };
    const mf = document.querySelector("#drawer-member"); if (mf) mf.onsubmit = e => { e.preventDefault(); const type = mf.dataset.type; const d = Object.fromEntries(new FormData(mf)); const rows = state.data[type]; const old = rows.find(r => r.id === d.id); const item = { ...d, id: d.id || uid() }; old ? Object.assign(old, item) : rows.unshift(item); state.drawer = ""; save(); syncRosterMemberToWorker(type, item); render(); toast("名冊已儲存"); };
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
      await ensureMonthlyRegistrationMap(true);
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
