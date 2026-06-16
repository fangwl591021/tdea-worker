(() => {
  if (isPublicLiffMode()) return;

  const key = "tdea-manager-v3";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const liffBase = "https://liff.line.me/2005868456-2jmxqyFU";
  const nativeLiffBase = "https://liff.line.me/2005868456-cfANNVou";
  const autoSyncKey = "tdea-auto-sync-registrations";
  const sidebarCollapsedKey = "tdea-sidebar-collapsed";
  const labels = {
    dashboard: ["活動總覽", "查看活動狀態、報名與簽到概況。"],
    association: ["會員 CRM", "維護協會會員檔案、會員資格與點數資料，可匯入 CSV。"],
    vendor: ["廠商 CRM", "維護廠商會員檔案、統編、窗口與備註，可匯入 CSV。"],
    creator: ["創建活動", "建立活動草稿，之後可直接改接 D1。"],
    keywords: ["關鍵字", "整理 LINE OA 觸發關鍵字、用途與回覆行為。"],
    adminWhitelist: ["白名單", "管理後台、核銷與 LINE 工具使用權限。"],
    redeem: ["點數折抵", "建立限時店家掃碼工作台，店家掃會員 QR 後執行扣點。"]
  };
  purgeLegacyManagerCache();
  const state = { view: "dashboard", drawer: "", data: load(), archivedActivities: [], registrationLists: {}, memberRegistrationLists: {}, memberPointAccounts: {}, memberApplications: null, adminWhitelist: null, adminWhitelistMeta: null, rosterSearch: { association: "", vendor: "" } };
  let motherRosterMapPromise = null;
  let managerDataSaveTimer = null;
  let managerDataLoading = false;
  let lineDraftAutoImporting = false;
  let lineDraftLastAutoImport = 0;
  let rosterCleanupApplied = false;

  function sidebarCollapsed() { return localStorage.getItem(sidebarCollapsedKey) === "Y"; }
  function setSidebarCollapsed(value) { localStorage.setItem(sidebarCollapsedKey, value ? "Y" : "N"); }
  function purgeLegacyManagerCache() {
    try {
      ["tdea-manager-v3", "tdea-manager-v2", "tdea-manager"].forEach((name) => {
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
      });
    } catch (_) {}
  }
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
  function cleanValue(v) { return String(v ?? "").trim(); }
  function firstValue(...values) { return values.map(cleanValue).find(Boolean) || ""; }
  function cleanUrlList(value) {
    const seen = new Set();
    const flatten = (input) => Array.isArray(input) ? input.flatMap(flatten) : String(input || "").split(/[\n,]+/);
    return flatten(value)
      .map(item => String(item || "").trim())
      .filter(item => /^https?:\/\//i.test(item))
      .filter(item => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  }
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
  function save() {
    persistLocalSnapshot();
    queueManagerDataSave();
  }
  function persistLocalSnapshot() {
    try {
      localStorage.setItem(key, JSON.stringify(state.data || emptyManagerData()));
    } catch (_) {}
  }
  function managerDataHasContent(data) {
    const formSettings = data?.formSettings;
    const hasFormSettings = formSettings && typeof formSettings === "object" && !Array.isArray(formSettings) && Object.keys(formSettings).length > 0;
    return Boolean(data && (
      (Array.isArray(data.activities) && data.activities.length) ||
      (Array.isArray(data.association) && data.association.length) ||
      (Array.isArray(data.vendor) && data.vendor.length) ||
      data.monthlyActivity ||
      hasFormSettings
    ));
  }
  function storedValue(...keys) {
    for (const key of keys) {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key) || "";
      if (String(value).trim()) return String(value).trim();
    }
    return "";
  }
  function firstParam(params, names) {
    for (const name of names) {
      const value = params.get(name);
      if (String(value || "").trim()) return String(value).trim();
    }
    return "";
  }
  function rememberAdminIdentityFromUrl() {
    const searchSets = [new URLSearchParams(location.search)];
    const liffState = searchSets[0].get("liff.state");
    if (liffState) {
      try { searchSets.push(new URLSearchParams(decodeURIComponent(liffState).replace(/^\?/, ""))); } catch (_) {}
    }
    for (const params of searchSets) {
      const email = firstParam(params, ["adminEmail", "email"]);
      const memberNo = firstParam(params, ["adminMemberNo", "memberNo", "rosterMemberNo"]);
      const lineUserId = firstParam(params, ["adminLineUserId", "lineUserId", "lineUid", "uid"]);
      if (email) sessionStorage.setItem("tdea-admin-email", email.toLowerCase());
      if (memberNo) sessionStorage.setItem("tdea-admin-member-no", memberNo.toUpperCase());
      if (lineUserId) sessionStorage.setItem("tdea-admin-line-user-id", lineUserId);
    }
  }
  rememberAdminIdentityFromUrl();
  function adminIdentity() {
    return {
      email: storedValue("tdea-admin-email").toLowerCase(),
      memberNo: storedValue("tdea-admin-member-no", "tdea-member-no").toUpperCase(),
      lineUserId: storedValue("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId"),
      displayName: storedValue("tdea-admin-display-name"),
      pictureUrl: storedValue("tdea-admin-picture-url")
    };
  }
  function hasAdminIdentity() {
    const identity = adminIdentity();
    return Boolean(identity.email || identity.memberNo || identity.lineUserId);
  }
  function loginAccessEnabled(value) {
    if (value === true) return true;
    const text = String(value ?? "").trim().toLowerCase();
    return ["1", "true", "y", "yes", "allow", "allowed", "允許", "啟用"].includes(text);
  }
  function memberLoginAllowed(row) {
    return [
      row?.loginAccess,
      row?.loginAllowed,
      row?.allowLogin,
      row?.canLogin,
      row?.adminAccess,
      row?.["登入權限"]
    ].some(loginAccessEnabled);
  }
  function rosterMatchKey(row) {
    return String(row?.memberNo || row?.rosterMemberNo || "").trim().toUpperCase();
  }
  function mergeRosterRows(localRows = [], remoteRows = []) {
    if (!Array.isArray(remoteRows)) return Array.isArray(localRows) ? localRows : [];
    const localByNo = new Map((Array.isArray(localRows) ? localRows : [])
      .map((row) => [rosterMatchKey(row), row])
      .filter(([key]) => key));
    return remoteRows.map((remoteRow) => {
      const localRow = localByNo.get(rosterMatchKey(remoteRow));
      const loginAccess = memberLoginAllowed(remoteRow) || memberLoginAllowed(localRow);
      return {
        ...(localRow || {}),
        ...remoteRow,
        lineUserId: memberLineUid(remoteRow) || memberLineUid(localRow),
        legacyAccount: firstValue(remoteRow?.legacyAccount, remoteRow?.aiweMemberNo, remoteRow?.motherAccount, localRow?.legacyAccount, localRow?.aiweMemberNo, localRow?.motherAccount),
        phone: firstValue(remoteRow?.phone, remoteRow?.mobile, remoteRow?.tel, localRow?.phone, localRow?.mobile, localRow?.tel),
        email: firstValue(remoteRow?.email, remoteRow?.mail, localRow?.email, localRow?.mail),
        jobTitle: firstValue(remoteRow?.jobTitle, remoteRow?.title, remoteRow?.position, localRow?.jobTitle, localRow?.title, localRow?.position),
        company: firstValue(remoteRow?.company, remoteRow?.companyName, remoteRow?.unit, localRow?.company, localRow?.companyName, localRow?.unit),
        loginAccess,
        allowLogin: loginAccess,
        canLogin: loginAccess
      };
    });
  }
  function mergeManagerData(localData, remoteData) {
    const merged = { ...localData, ...remoteData };
    merged.association = mergeRosterRows(localData?.association, remoteData?.association);
    merged.vendor = mergeRosterRows(localData?.vendor, remoteData?.vendor);
    return merged;
  }
  function queueManagerDataSave() {
    if (managerDataLoading) return;
    clearTimeout(managerDataSaveTimer);
    managerDataSaveTimer = setTimeout(saveManagerDataRemote, 700);
  }
  async function saveManagerDataRemote() {
    if (!hasAdminIdentity()) return;
    if (!managerDataHasContent(state.data)) return;
    const payload = { ...state.data };
    delete payload.activities;
    ["association", "vendor"].forEach((name) => {
      if (Array.isArray(payload[name]) && payload[name].length === 0) delete payload[name];
    });
    try {
      await fetch(api + "/api/manager-data", {
        method: "PUT",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (_) {}
  }
  async function loadActivitiesRemote() {
    const response = await fetch(api + "/api/activities", { headers: adminHeaders(), cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    const activities = Array.isArray(result?.data?.activities) ? result.data.activities : Array.isArray(result?.activities) ? result.activities : [];
    if (result.success) {
      state.data.activities = activities;
      persistLocalSnapshot();
    }
    return state.data.activities;
  }
  async function loadArchivedActivitiesRemote() {
    const response = await fetch(api + "/api/activities/archived", { headers: adminHeaders(), cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    const activities = Array.isArray(result?.data?.activities) ? result.data.activities : Array.isArray(result?.activities) ? result.activities : [];
    if (result.success) state.archivedActivities = activities;
    return state.archivedActivities;
  }
  async function saveActivityRemote(activity) {
    if (!hasAdminIdentity()) return activity;
    const id = String(activity?.id || "").trim();
    const response = await fetch(api + (id ? "/api/activities/" + encodeURIComponent(id) : "/api/activities"), {
      method: id ? "PUT" : "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(activity)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "活動儲存失敗");
    return result.data || activity;
  }
  async function deleteActivityRemote(id) {
    if (!hasAdminIdentity()) return false;
    const response = await fetch(api + "/api/activities/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: adminHeaders()
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "活動封存失敗");
    return true;
  }
  async function restoreActivityRemote(id) {
    if (!hasAdminIdentity()) return null;
    const response = await fetch(api + "/api/activities/" + encodeURIComponent(id) + "/restore", {
      method: "POST",
      headers: adminHeaders()
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "活動恢復失敗");
    return result.data || null;
  }
  async function loadManagerDataRemote() {
    if (managerDataLoading) return;
    managerDataLoading = true;
    try {
      const response = await fetch(api + "/api/manager-data", { headers: adminHeaders(), cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        state.data = mergeManagerData(emptyManagerData(), result.data || {});
        await loadActivitiesRemote();
        await loadArchivedActivitiesRemote();
        persistLocalSnapshot();
        await loadAdminAccessIntoRoster();
        render();
      }
    } catch (_) {
    } finally {
      managerDataLoading = false;
    }
  }
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
  function rosterSearchValue(row, vendor) {
    const values = [
      row.memberNo,
      memberLineUid(row),
      row.lineUserId,
      row.uid,
      row.email,
      row.phone,
      row.mobile,
      row.note,
      row.qualification,
      vendor ? row.companyName : row.name,
      vendor ? row.taxId : row.identity,
      vendor ? row.owner : row.gender,
      vendor ? row.contact : ""
    ];
    return values.map((value) => String(value || "").toLowerCase()).join(" ");
  }
  function rosterSearchQuery(type) {
    return String(state.rosterSearch?.[type] || "").trim().toLowerCase();
  }
  function filterRosterRows(type, rows) {
    const query = rosterSearchQuery(type);
    if (!query) return rows;
    const vendor = type === "vendor";
    return rows.filter((row) => rosterSearchValue(row, vendor).includes(query));
  }
  function cleanupRosterData() {
    if (rosterCleanupApplied) return;
    rosterCleanupApplied = true;
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
    const identity = adminIdentity();
    return {
      ...extra,
      ...(identity.email ? { "x-admin-email": identity.email } : {}),
      ...(identity.memberNo ? { "x-admin-member-no": identity.memberNo } : {}),
      ...(identity.lineUserId ? { "x-line-user-id": identity.lineUserId } : {})
    };
  }
  async function loadAdminAccessIntoRoster() {
    if (!hasAdminIdentity()) return;
    try {
      const response = await fetch(api + "/api/admin-access", { headers: adminHeaders(), cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      const records = result?.data && typeof result.data === "object" ? result.data : {};
      let changed = false;
      ["association", "vendor"].forEach((type) => {
        (state.data[type] || []).forEach((row) => {
          const memberNo = rosterMatchKey(row);
          const access = records[memberNo];
          if (!access) return;
          const enabled = access.loginAccess === true;
          if (row.loginAccess !== enabled || row.allowLogin !== enabled || row.canLogin !== enabled || (access.lineUserId && !memberLineUid(row))) {
            row.loginAccess = enabled;
            row.allowLogin = enabled;
            row.canLogin = enabled;
            if (access.lineUserId && !memberLineUid(row)) row.lineUserId = access.lineUserId;
            changed = true;
          }
        });
      });
      // Manager data is server-owned. Do not write roster/activity data to browser storage.
    } catch (_) {}
  }
  async function syncAdminAccessForMember(type, item) {
    if (!item || (type !== "association" && type !== "vendor")) return;
    const memberNo = rosterMatchKey(item);
    if (!memberNo) return;
    try {
      await fetch(api + "/api/admin-access", {
        method: "PUT",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          memberNo,
          name: item.name || item.companyName || "",
          email: item.email || "",
          lineUserId: memberLineUid(item),
          loginAccess: memberLoginAllowed(item)
        })
      });
    } catch (_) {}
  }
  async function loadMemberApplications(force = false) {
    if (state.memberApplications && !force) return state.memberApplications;
    try {
      const r = await fetch(api + "/api/member-applications?status=pending", { headers: adminHeaders() });
      const j = await r.json();
      state.memberApplications = j.success && Array.isArray(j.data) ? j.data : [];
    } catch (_) {
      state.memberApplications = [];
    }
    render();
    return state.memberApplications;
  }

  async function loadAdminWhitelist(force = false) {
    if (state.adminWhitelist && !force) return state.adminWhitelist;
    try {
      const r = await fetch(api + "/api/admin-whitelist", { headers: adminHeaders(), cache: "no-store" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "load failed");
      state.adminWhitelist = Array.isArray(j.data) ? j.data : [];
      state.adminWhitelistMeta = j;
    } catch (err) {
      state.adminWhitelist = [];
      state.adminWhitelistMeta = { error: err?.message || "白名單讀取失敗" };
    }
    return state.adminWhitelist;
  }

  function legacyAccessToWhitelistRows() {
    const legacy = state.adminWhitelistMeta?.legacyAccess || {};
    return Object.values(legacy).filter(row => row && row.loginAccess === true).map(row => ({
      id: row.memberNo || uid(),
      enabled: true,
      label: row.name || row.memberNo || row.email || row.lineUserId || "",
      memberNo: row.memberNo || "",
      email: row.email || "",
      lineUserId: row.lineUserId || "",
      role: "admin",
      note: "由舊允許名單帶入"
    }));
  }

  function associationRosterToWhitelistRows() {
    return visibleRosterRows("association")
      .filter(row => memberLoginAllowed(row))
      .map(row => ({
        id: rosterMatchKey(row) || memberLineUid(row) || uid(),
        enabled: true,
        label: row.name || row.rosterName || row.memberName || row.memberNo || "",
        memberNo: row.memberNo || row.rosterMemberNo || "",
        email: row.email || "",
        lineUserId: memberLineUid(row),
        role: "admin",
        note: "from association roster"
      }))
      .filter(row => row.label || row.memberNo || row.lineUserId || row.email);
  }

  function whitelistRowsFromForm() {
    return Array.from(document.querySelectorAll("[data-whitelist-row]")).map(row => ({
      id: row.dataset.id || uid(),
      enabled: row.querySelector("[name='enabled']")?.checked !== false,
      label: row.querySelector("[name='label']")?.value.trim() || "",
      memberNo: row.querySelector("[name='memberNo']")?.value.trim() || "",
      lineUserId: row.querySelector("[name='lineUserId']")?.value.trim() || "",
      email: row.querySelector("[name='email']")?.value.trim() || "",
      role: row.querySelector("[name='role']")?.value.trim() || "admin",
      note: row.querySelector("[name='note']")?.value.trim() || ""
    })).filter(row => row.label || row.memberNo || row.lineUserId || row.email);
  }

  async function saveAdminWhitelist() {
    const rows = whitelistRowsFromForm();
    const r = await fetch(api + "/api/admin-whitelist", {
      method: "PUT",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ records: rows })
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.message || "白名單儲存失敗");
    state.adminWhitelist = Array.isArray(j.data) ? j.data : rows;
    state.adminWhitelistMeta = { ...(state.adminWhitelistMeta || {}), ...j };
    return state.adminWhitelist;
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
    if (!hasAdminIdentity()) return;
    try {
      await fetch(api + "/api/line-activity-drafts/delete", {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
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
    return emptyManagerData();
  }
  function emptyManagerData() {
    return {
      activities: [],
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
    if (!hasAdminIdentity()) {
      if (showMessage) toast("缺少管理者身份，無法向 GAS 拉取表單回覆");
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
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ activities })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Google 表單同步失敗");
    if (showMessage) toast(`已同步 ${Number(result.imported || 0)} 筆表單回覆`);
  }

  async function pullRemoteResponses(showMessage = false) {
    if (!hasAdminIdentity()) {
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
        headers: adminHeaders({ "content-type": "application/json" }),
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
        headers: adminHeaders({ "content-type": "application/json" }),
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
    if (!hasAdminIdentity() || activity.formUrl || activity.nativeFormUrl) return false;
    const settings = nativeFormSettingsFor(activity);
    const response = await fetch(`${api}/api/native-forms/create`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
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
    state.data.formSettings[activity.id] = { ...settings, templateMode: activity.templateMode || settings.templateMode || "", formMode: "native_form", formId: activity.formId, nativeFormId: activity.nativeFormId, formUrl, nativeFormUrl: formUrl, detailText: activity.detailText || "", posterUrl: activity.posterUrl || activity.imageUrl || "", galleryUrls: cleanUrlList(activity.galleryUrls) };
    if (activity.activityNo) state.data.formSettings[activity.activityNo] = state.data.formSettings[activity.id];
    return true;
  }

  async function uploadActivityPoster(file, activityId, email) {
    if (!file || !file.size || !hasAdminIdentity()) return null;
    const form = new FormData();
    form.append("file", file);
    form.append("folder", `activities/${activityId || "poster"}`);
    const response = await fetch(`${api}/api/uploads`, { method: "POST", headers: adminHeaders(), body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "圖片上傳失敗");
    return { url: result.url?.startsWith("http") ? result.url : api + result.url, key: result.key || "" };
  }

  async function importLineActivityDrafts(showMessage = true) {
    if (!hasAdminIdentity()) {
      if (showMessage) toast("請先登入管理者，才能匯入 LINE 活動草稿");
      return;
    }
    const response = await fetch(api + "/api/line-activity-drafts", {
      headers: adminHeaders(),
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
        try {
          const saved = await saveActivityRemote(existing);
          Object.assign(existing, saved || {});
        } catch (err) {
          if (showMessage) toast(err?.message || "活動同步失敗");
        }
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
      try {
        const saved = await saveActivityRemote(item);
        Object.assign(item, saved || {});
      } catch (err) {
        if (showMessage) toast(err?.message || "活動同步失敗");
        continue;
      }
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

  function adminProfileHtml() {
    const identity = adminIdentity();
    const label = identity.displayName || identity.email || identity.memberNo || shortUid(identity.lineUserId) || "未登入";
    const detail = identity.lineUserId ? shortUid(identity.lineUserId) : identity.memberNo || identity.email || "請重新登入";
    const fallback = (identity.displayName || identity.email || identity.memberNo || identity.lineUserId || "?").slice(0, 2).toUpperCase();
    const avatar = identity.pictureUrl
      ? `<img src="${esc(identity.pictureUrl)}" alt="${esc(label)}" referrerpolicy="no-referrer">`
      : `<span>${esc(fallback)}</span>`;
    return `<div class="admin-profile" title="${esc(label)}"><div class="admin-avatar">${avatar}</div><div class="admin-profile-text"><strong>${esc(label)}</strong><small>${esc(detail)}</small></div></div>`;
  }

  function ensureCrmMemberStyles() {
    if (document.getElementById("tdea-crm-member-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-crm-member-style";
    style.textContent = `
      .drawer-panel:has(.crm-member-profile-layout){background:#f5f7fb;padding:0;display:flex;flex-direction:column}
      .drawer-panel:has(.crm-member-profile-layout) .drawer-title{height:72px;margin:0;padding:14px 22px;background:#fff;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(15,23,42,.06)}
      .crm-member-title{margin:0;font-size:22px;font-weight:900;color:#172033;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
      .crm-member-title small{font-size:13px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#667085;background:#f1f5f9;border:1px solid #dbe3ee;border-radius:8px;padding:7px 12px}
      .crm-member-profile-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,360px);gap:20px;align-items:start;padding:32px 20px 96px;min-height:calc(100vh - 72px);max-width:100%;overflow:hidden}
      .crm-member-card,.member-point-panel,.member-registration-history{background:#fff;border:1px solid #dfe5ee;border-radius:16px;box-shadow:none;overflow:hidden}
      .crm-member-card{grid-column:1;grid-row:1}
      .crm-member-section-title{display:flex;align-items:center;gap:10px;padding:28px 30px 18px;font-size:20px;font-weight:900;color:#172033;border-bottom:1px solid #e5e7eb}
      .crm-member-section-title:before{content:"";width:22px;height:22px;border-radius:7px;background:#635bff;display:inline-block}
      .drawer-panel .crm-member-form.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 22px;padding:22px 26px 26px;align-items:start}
      .drawer-panel .crm-member-form .field:has(textarea){grid-column:1/-1}
      .drawer-panel .crm-member-form .sync-toggle{grid-column:1/-1;min-height:52px;border-color:#dfe5ee;background:#fff}
      .crm-member-savebar{position:fixed;right:0;left:270px;bottom:0;height:72px;background:#fff;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;align-items:center;gap:18px;padding:12px 28px;z-index:25}
      .crm-member-savebar .btn.primary{min-width:260px;min-height:52px;border-radius:8px;font-size:18px}
      .crm-member-savebar .btn:not(.primary){border:0;background:#fff;color:#667085;font-size:18px}
      .crm-member-side{grid-column:2;grid-row:1;display:grid;gap:20px;align-content:start;min-width:0}
      .crm-member-side .member-point-panel{border-radius:16px}
      .member-point-panel{border-radius:16px}
      .member-registration-wide{grid-column:1/-1;align-self:stretch}.member-registration-wide .member-registration-history{width:100%;border-radius:16px}.member-registration-wide .member-registration-history .table-wrap{max-height:360px;overflow:auto}
      .crm-point-summary{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px 24px 12px}
      .crm-point-summary span{color:#8a98ad;font-weight:900}
      .crm-point-summary .crm-point-number{display:flex;align-items:baseline;justify-content:center;gap:8px}
      .crm-point-summary strong{font-size:44px;line-height:1;color:#dc2626;font-weight:900}
      .crm-point-summary small{color:#8a98ad;font-weight:900}
      .crm-point-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 22px 22px;border-bottom:1px solid #e5e7eb}
      .crm-point-actions .field{grid-column:1/-1}
      .crm-point-actions .actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .crm-point-actions .btn{min-height:58px;font-size:17px;font-weight:900;border-radius:12px}
      .crm-point-actions .btn.primary{background:#ecfdf3;color:#079455;border-color:#abefc6}
      .crm-point-actions .btn.danger{background:#fff1f3;color:#d92d20;border-color:#fecdca}
      .crm-point-history h3{margin:0;padding:16px 20px 8px;font-size:16px;color:#344054}
      .member-point-panel .table-wrap{max-width:100%;overflow:auto}
      .member-point-panel table{min-width:520px}
      .crm-point-history .empty{border:0;border-radius:0;background:#fff;color:#667085}
      @media(max-width:1100px){.crm-member-profile-layout{grid-template-columns:1fr;padding:24px 18px 96px}.crm-member-side{grid-column:auto;grid-row:auto}.member-point-panel{grid-column:auto;grid-row:auto}.crm-member-savebar{left:0}.drawer-panel .crm-member-form.form-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    ensureCrmMemberStyles();
    const [title, sub] = labels[state.view] || labels.dashboard;
    const collapsed = sidebarCollapsed();
    document.querySelector("#app").innerHTML = `
      <div class="shell ${collapsed ? "sidebar-collapsed" : ""}">
        <aside class="sidebar">
          <div class="brand"><span>TDEA 管理中心</span><button class="sidebar-toggle" type="button" data-sidebar-toggle title="${collapsed ? "展開選單" : "收合選單"}" aria-label="${collapsed ? "展開選單" : "收合選單"}">${collapsed ? "›" : "‹"}</button></div>
          ${adminProfileHtml()}
          <nav class="nav">${nav("dashboard", "活動總覽")}${nav("association", "會員 CRM")}${nav("vendor", "廠商 CRM")}${nav("creator", "創建活動")}${nav("redeem", "點數折抵")}</nav>
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
    if (state.view === "dashboard" && state.memberApplications === null) loadMemberApplications();
    if (state.view === "adminWhitelist" && !state.adminWhitelist) loadAdminWhitelist().then(() => render()).catch(() => undefined);
    window.TDEALineNav?.refresh?.();
  }

  function nav(id, text) { return `<button class="${state.view === id ? "active" : ""}" data-nav="${id}" title="${esc(text)}">${text}</button>`; }
  function actions() {
    if (state.view === "association") return `<button class="btn" data-import="association">匯入 CSV</button><button class="btn primary" data-drawer="association:new">新增協會會員</button>`;
    if (state.view === "vendor") return `<button class="btn" data-import="vendor">匯入 CSV</button><button class="btn primary" data-drawer="vendor:new">新增廠商會員</button>`;
    if (state.view === "creator") return `<button class="btn" data-import-line-drafts>匯入 LINE 草稿</button><button class="btn" data-reset>清空表單</button>`;
    if (state.view === "redeem") return `<button class="btn" data-load-redeem>刷新紀錄</button>`;
    if (state.view === "keywords") return `<button class="btn" data-refresh-keywords>刷新列表</button>`;
    if (state.view === "adminWhitelist") return `<button class="btn" data-load-whitelist>重新載入</button><button class="btn primary" data-save-whitelist>儲存白名單</button>`;
    return `<label class="sync-toggle"><input type="checkbox" data-auto-sync ${autoSyncEnabled() ? "checked" : ""}> 自動同步</label><button class="btn" data-sync-registrations>同步報名</button><button class="btn" data-worker>檢查 Worker</button><button class="btn danger" data-clear-test>清空測試資料</button><button class="btn primary" data-nav="creator">新增活動</button>`;
  }
  function body() {
    if (state.view === "association") return members("association");
    if (state.view === "vendor") return members("vendor");
    if (state.view === "creator") return creator();
    if (state.view === "redeem") return redeem();
    if (state.view === "keywords") return keywords();
    if (state.view === "adminWhitelist") return adminWhitelistClean();
    return memberApplicationsPanel() + dashboard();
  }

  function memberApplicationsPanel() {
    if (state.view !== "dashboard") return "";
    const rows = Array.isArray(state.memberApplications) ? state.memberApplications : [];
    if (!rows.length) return `<section class="panel" style="margin-bottom:18px"><div class="panel-head"><h2 class="panel-title">新會員申請通知</h2><button class="btn" data-load-member-applications>刷新</button></div>${empty("目前沒有待處理申請")}</section>`;
    return `<section class="panel" style="margin-bottom:18px"><div class="panel-head"><h2 class="panel-title">新會員申請通知</h2><div class="actions"><span class="badge live">${rows.length} 件待處理</span><button class="btn" data-load-member-applications>刷新</button></div></div><div class="table-wrap"><table><thead><tr><th>時間</th><th>姓名</th><th>手機</th><th>LINE UID</th><th>來源關鍵字</th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(formatTime(row.createdAt || row.updatedAt))}</td><td><strong>${esc(row.name || "-")}</strong></td><td>${esc(row.phone || "-")}</td><td>${esc(row.lineUserId || "-")}</td><td>${esc(row.triggerText || "-")}</td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function dashboard() {
    const a = state.data.activities;
    const live = a.filter(x => x.status === "上架").length;
    const reg = a.reduce((s, x) => s + Number(x.reg || 0), 0);
    const chk = a.reduce((s, x) => s + Number(x.check || 0), 0);
    return `<div class="grid stats">${stat("活動數", a.length, "total")}${stat("上架中", live, "live")}${stat("報名人數", reg, "registration")}${stat("簽到人數", chk, "checkin")}</div><section class="panel"><div class="panel-head"><h2 class="panel-title">活動清單</h2><button class="btn" data-load-roster>載入名冊</button></div>${a.length ? activityTable(a) : empty("目前沒有活動")}</section>${archivedActivityPanel()}`;
  }
  function stat(label, value, tone = "") { return `<div class="stat ${tone ? `stat-${tone}` : ""}"><span>${label}</span><strong>${n(value)}</strong></div>`; }
  function activityTable(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>類型</th><th>課程時間</th><th>報名</th><th>簽到</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(activityTypeLabel(x))}</td><td>${esc(x.courseTime || "-")}</td><td>${n(x.reg)}</td><td>${n(x.check)}</td><td><span class="badge ${x.status === "上架" ? "live" : "off"}">${esc(x.status)}</span></td><td><button class="link" data-drawer="activity:${x.id}">編輯</button><span class="muted"> / </span><button class="link" data-registration-list="${x.id}">名單</button><span class="muted"> / </span><button class="link" data-toggle="${x.id}">${x.status === "上架" ? "下架" : "上架"}</button><span class="muted"> / </span><button class="link danger-link" data-delete-activity="${x.id}">封存</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function archivedActivityPanel() {
    const rows = Array.isArray(state.archivedActivities) ? state.archivedActivities : [];
    const body = rows.length ? archivedActivityTable(rows) : empty("封存活動資料夾目前沒有活動");
    return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2 class="panel-title">封存活動資料夾</h2><div class="muted">活動封存後會從活動清單隱藏，但報名、簽到、抽獎與表單設定仍保留。</div></div><div class="actions"><span class="badge off">${rows.length} 筆</span><button class="btn" data-load-archived-activities>重新整理</button></div></div>${body}</section>`;
  }

  function archivedActivityTable(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>類型</th><th>課程時間</th><th>封存時間</th><th>封存者</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows.map(x => `<tr><td><strong>${esc(x.name || x.activityNo || x.id)}</strong></td><td>${esc(activityTypeLabel(x))}</td><td>${esc(x.courseTime || "-")}</td><td>${esc(formatTime(x.deletedAt || x.updatedAt || ""))}</td><td>${esc(x.deletedBy || "-")}</td><td><span class="badge off">${esc(x.status || "已封存")}</span></td><td><button class="link" data-restore-activity="${esc(x.id)}">恢復</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function members(type) {
    const allRows = visibleRosterRows(type), vendor = type === "vendor";
    const rows = filterRosterRows(type, allRows);
    const title = vendor ? "廠商會員" : "協會會員";
    const query = state.rosterSearch?.[type] || "";
    const search = `<div class="field" style="min-width:280px;max-width:460px;margin-left:auto"><input data-roster-search="${type}" value="${esc(query)}" placeholder="搜尋${title}：編號、名稱、UID、電話、Email"></div>`;
    const count = `<span class="muted" data-roster-count="${type}">${rows.length} / ${allRows.length} 筆</span>`;
    if (!allRows.length) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${title}</h2><button class="btn" data-import="${type}">匯入 CSV</button></div>${empty(`目前沒有${title}資料`)}</section>`;
    const body = `<div class="table-wrap"><table><thead><tr><th>會員編號</th><th>${vendor ? "公司名稱" : "姓名"}</th><th>LINE UID</th><th>點數</th><th>${vendor ? "統編" : "身分"}</th><th>${vendor ? "聯絡窗口" : "性別"}</th><th>資格</th><th>舊允許</th><th>備註</th><th>操作</th></tr></thead><tbody>${allRows.map(x => {
      const searchText = rosterSearchValue(x, vendor);
      const hidden = rosterSearchQuery(type) && !searchText.includes(rosterSearchQuery(type));
      return `<tr data-roster-row="${type}" data-roster-search-text="${esc(searchText)}" ${hidden ? `style="display:none"` : ""}><td>${esc(x.memberNo)}</td><td><strong>${esc(vendor ? x.companyName : x.name)}</strong></td><td>${esc(shortUid(memberLineUid(x)))}</td><td>${esc(x.pointBalance ?? x.points ?? "")}</td><td>${esc(vendor ? x.taxId : x.identity)}</td><td>${esc(vendor ? x.contact : x.gender)}</td><td><span class="badge ${x.qualification === "Y" ? "live" : "off"}">${esc(x.qualification)}</span></td><td><label class="sync-toggle"><input type="checkbox" data-member-login-toggle="${type}:${x.id}" ${memberLoginAllowed(x) ? "checked" : ""}> 舊資料</label></td><td>${esc(x.note)}</td><td><button class="link" data-drawer="${type}:${x.id}">CRM 檔案</button><span class="muted"> / </span><button class="link danger-link" data-delete-member="${type}:${x.id}">刪除</button></td></tr>`;
    }).join("")}</tbody></table></div>`;
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${title}</h2><div class="actions">${search}${count}<button class="btn" data-import="${type}">匯入 CSV</button><button class="btn" data-export>匯出備份</button></div></div>${body}</section>`;
  }

  function adminWhitelist() {
    const rows = state.adminWhitelist || [];
    const meta = state.adminWhitelistMeta || {};
    const status = meta.whitelistActive ? `<span class="badge live">白名單已啟用</span>` : `<span class="badge off">尚未建立白名單，暫用舊允許名單</span>`;
    const staticAdmins = Array.isArray(meta.staticAdmins) && meta.staticAdmins.length ? `<div class="muted">固定管理者 Email：${meta.staticAdmins.map(esc).join("、")}</div>` : "";
    const error = meta.error ? `<div class="alert danger">${esc(meta.error)}</div>` : "";
    const bodyRows = rows.length ? rows.map(whitelistRow).join("") : `<tr><td colspan="8">${empty("目前沒有白名單。可新增一筆，或從舊允許名單帶入。")}</td></tr>`;
    return `<section class="panel"><div class="panel-head"><div><h2 class="panel-title">系統白名單</h2><div class="muted">此處是後台、核銷與 LINE 工具的正式授權來源；可從協會名冊中已勾選「允許」的會員同步產生。</div></div><div class="actions">${status}<button class="btn" data-load-whitelist>重新載入</button></div></div>${error}${staticAdmins}<div class="table-wrap"><table><thead><tr><th>啟用</th><th>名稱</th><th>會員編號</th><th>LINE UID</th><th>Email</th><th>角色</th><th>備註</th><th>操作</th></tr></thead><tbody id="whitelist-body">${bodyRows}</tbody></table></div><div class="panel-actions"><button class="btn" data-import-association-whitelist>從協會名冊同步</button><button class="btn" data-add-whitelist-row>新增白名單</button><button class="btn" data-import-legacy-access>從舊允許名單帶入</button><button class="btn" data-check-whitelist>檢查目前身份</button><button class="btn primary" data-save-whitelist>儲存白名單</button></div></section>`;
  }

  function whitelistRow(row = {}) {
    const id = row.id || uid();
    return `<tr data-whitelist-row data-id="${esc(id)}"><td><input type="checkbox" name="enabled" ${row.enabled === false ? "" : "checked"}></td><td><input name="label" value="${esc(row.label || "")}" placeholder="例：秘書"></td><td><input name="memberNo" value="${esc(row.memberNo || "")}" placeholder="Z1160215"></td><td><input name="lineUserId" value="${esc(row.lineUserId || "")}" placeholder="U..."></td><td><input name="email" value="${esc(row.email || "")}" placeholder="name@example.com"></td><td><select name="role"><option value="admin" ${(row.role || "admin") === "admin" ? "selected" : ""}>管理者</option><option value="checkin" ${row.role === "checkin" ? "selected" : ""}>核銷</option><option value="editor" ${row.role === "editor" ? "selected" : ""}>編輯</option></select></td><td><input name="note" value="${esc(row.note || "")}"></td><td><button class="link danger-link" data-remove-whitelist-row>刪除</button></td></tr>`;
  }

  function adminWhitelistClean() {
    const rows = state.adminWhitelist || [];
    const meta = state.adminWhitelistMeta || {};
    const rosterRows = Array.isArray(meta.rosterWhitelist) ? meta.rosterWhitelist : [];
    const status = meta.whitelistActive ? `<span class="badge live">白名單已啟用</span>` : `<span class="badge off">尚未建立白名單，暫用舊允許名單</span>`;
    const staticAdmins = Array.isArray(meta.staticAdmins) && meta.staticAdmins.length ? `<div class="muted">環境變數 ADMIN_EMAILS 仍可進入：${meta.staticAdmins.map(esc).join("、")}</div>` : "";
    const error = meta.error ? `<div class="alert danger">${esc(meta.error)}</div>` : "";
    const bodyRows = rows.length ? rows.map(whitelistRowClean).join("") : `<tr><td colspan="8">${empty("目前沒有手動白名單。可新增一筆，或從協會名冊同步。")}</td></tr>`;
    const rosterBody = rosterRows.length ? rosterRows.map(row => `<tr><td>${esc(row.label || "")}</td><td>${esc(row.memberNo || "")}</td><td>${esc(shortUid(row.lineUserId || ""))}</td><td>${esc(row.email || "")}</td><td>${esc(row.note || "from association roster")}</td></tr>`).join("") : `<tr><td colspan="5">${empty("協會名冊目前沒有勾選允許的授權者。")}</td></tr>`;
    return `<section class="panel"><div class="panel-head"><div><h2 class="panel-title">系統白名單</h2><div class="muted">正式授權來源包含：下方手動白名單，以及協會名冊中已勾選「允許」的會員。</div></div><div class="actions">${status}<button class="btn" data-load-whitelist>重新載入</button></div></div>${error}${staticAdmins}<div class="table-wrap"><table><thead><tr><th>啟用</th><th>名稱</th><th>會員編號</th><th>LINE UID</th><th>Email</th><th>角色</th><th>備註</th><th>操作</th></tr></thead><tbody id="whitelist-body">${bodyRows}</tbody></table></div><div class="panel-actions"><button class="btn" data-import-association-whitelist>從協會名冊同步</button><button class="btn" data-add-whitelist-row>新增白名單</button><button class="btn" data-import-legacy-access>從舊允許名單帶入</button><button class="btn" data-check-whitelist>檢查目前身份</button><button class="btn primary" data-save-whitelist>儲存白名單</button></div></section><section class="panel"><div class="panel-head"><div><h2 class="panel-title">協會名冊自動授權</h2><div class="muted">這裡直接從協會名冊讀取，名冊勾選「允許」後即納入後台與核銷授權判斷。</div></div><span class="badge live">${rosterRows.length} 筆</span></div><div class="table-wrap"><table><thead><tr><th>名稱</th><th>會員編號</th><th>LINE UID</th><th>Email</th><th>來源</th></tr></thead><tbody>${rosterBody}</tbody></table></div></section>`;
  }

  function whitelistRowClean(row = {}) {
    const id = row.id || uid();
    return `<tr data-whitelist-row data-id="${esc(id)}"><td><input type="checkbox" name="enabled" ${row.enabled === false ? "" : "checked"}></td><td><input name="label" value="${esc(row.label || "")}" placeholder="名稱"></td><td><input name="memberNo" value="${esc(row.memberNo || "")}" placeholder="Z1160215"></td><td><input name="lineUserId" value="${esc(row.lineUserId || "")}" placeholder="U..."></td><td><input name="email" value="${esc(row.email || "")}" placeholder="name@example.com"></td><td><select name="role"><option value="admin" ${(row.role || "admin") === "admin" ? "selected" : ""}>管理員</option><option value="checkin" ${row.role === "checkin" ? "selected" : ""}>核銷</option><option value="editor" ${row.role === "editor" ? "selected" : ""}>編輯</option></select></td><td><input name="note" value="${esc(row.note || "")}"></td><td><button class="link danger-link" data-remove-whitelist-row>刪除</button></td></tr>`;
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
      ${field("報名費 NT$", "paymentAmount", 0, "0 表示免付款", false, "number")}
      <div class="field"><label>匯款資訊</label><textarea name="remittanceInfo" placeholder="例：銀行、分行、帳號、戶名。會顯示在報名查詢頁，供報名者匯款後回報末五碼。"></textarea></div>
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
      { keyword: "TDEA活動查詢", aliases: "無", purpose: "讓會員查詢或取消自己的活動報名", reply: "開啟 LIFF「我的活動報名」，以 LINE Login 查詢", entry: `${nativeLiffBase}?query=1`, owner: "報名系統", status: "啟用中" },
      { keyword: "TDEA會員QR", aliases: "無", purpose: "會員開啟自己的扣點 QR，給合作店家掃描", reply: "開啟 LIFF「會員 QR」頁面", entry: `${nativeLiffBase}?memberQr=1`, owner: "點數折抵", status: "啟用中" },
      { keyword: "TDEA行事曆", aliases: "TDEA日曆、TDEA年度活動", purpose: "開啟協會 Google 行事曆", reply: "開啟 LIFF 行事曆頁面，嵌入 TDEA Google Calendar", entry: `${nativeLiffBase}?calendar=1`, owner: "行事曆", status: "啟用中" },
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
    return `<div class="split"><section class="panel"><div class="panel-head"><h2 class="panel-title">建立店家限時掃碼網址</h2></div><form class="form-grid" id="redeem-form" style="padding:18px">${field("合作店家", "vendorName", "", "例如：合作店家 A", true)}<div class="grid two">${field("授權開始", "startsAt", startValue, "", true, "datetime-local")}${field("授權結束", "expiresAt", endValue, "", true, "datetime-local")}</div><div class="field"><label>扣點模式</label><select name="mode"><option value="fixed">固定點數</option><option value="manual">店家現場輸入點數</option><option value="rate">依消費金額換算點數</option></select></div><div class="grid two">${field("固定扣抵點數", "points", 0, "固定模式使用；其他模式可留 0", false, "number")}${field("單次扣點上限", "maxPoints", 0, "0 表示不限制", false, "number")}</div><div class="grid two">${field("金額換算比例", "pointRate", 0, "例如 0.1 表示 100 元扣 10 點", false, "number")}${field("參考金額備註", "amount", 0, "非必填，僅供紀錄", false, "number")}</div><div class="field"><label>授權備註</label><textarea name="note" placeholder="例如：展場合作店家、餐飲折抵、活動攤位"></textarea></div><button class="btn primary" type="submit">產生店家掃碼網址</button></form></section><section class="panel"><div class="panel-head"><h2 class="panel-title">最新店家工作台</h2></div><div style="padding:18px">${latestUrl ? `<div class="grid"><img src="${qr}" alt="店家工作台 QR" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:8px"><div class="field"><label>店家掃碼工作台網址</label><input readonly value="${esc(latestUrl)}"></div><button class="btn" data-copy-redeem>複製網址</button><div class="muted">把這個網址或 QR 給店家。店家打開後會出現掃描器，用來掃會員個人 QR 並扣點。</div></div>` : empty("尚未產生店家掃碼網址")}</div></section></div><section class="panel" style="margin-top:18px"><div class="panel-head"><h2 class="panel-title">店家授權紀錄</h2><button class="btn" data-load-redeem>重新載入</button></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>店家</th><th>模式</th><th>固定/上限</th><th>有效期間</th><th>狀態</th><th>已扣次數</th><th>工作台</th></tr></thead><tbody>${rows.map(row => { const url = row.sessionUrl || row.redeemUrl || ""; return `<tr><td>${esc(row.vendorName)}</td><td>${esc(modeLabel(row.mode))}</td><td>${n(row.points)} / ${n(row.maxPoints)}</td><td>${esc(formatTime(row.startsAt || row.createdAt))}<br>${esc(formatTime(row.expiresAt))}</td><td><span class="badge ${row.status === "active" || row.status === "pending" ? "live" : "off"}">${esc(statusLabel(row.status))}</span></td><td>${n(row.usageCount || row.transactions?.length || 0)}</td><td><button class="link" data-copy-redeem-url="${esc(url)}">複製</button></td></tr>`; }).join("")}</tbody></table></div>` : empty("尚未載入店家授權紀錄")}</section><section class="panel" style="margin-top:18px"><div class="panel-head"><h2 class="panel-title">母站點數流水</h2><button class="btn" data-load-point-ledger>刷新流水</button></div><div class="muted" style="padding:14px 18px;border-bottom:1px solid #e5e7eb">點數以母站為準；此處只即時讀取母站流水，不再補登或寫入本地點數帳。</div>${ledger.length ? `<div class="table-wrap"><table><thead><tr><th>時間</th><th>UID</th><th>類型</th><th>異動</th><th>餘額</th><th>原因</th></tr></thead><tbody>${ledger.slice(0, 80).map(log => `<tr><td>${esc(formatTime(log.createdAt))}</td><td>${esc(log.lineUserId)}</td><td>${esc(log.type)}</td><td>${n(log.amount)}</td><td>${n(log.balanceAfter)}</td><td>${esc(log.reason)}</td></tr>`).join("")}</tbody></table></div>` : empty("目前母站沒有點數流水")}</section>`;
  }

  function drawer() {
    if (!state.drawer) return `<div class="drawer" id="drawer"></div>`;
    const [type, rowId] = state.drawer.split(":");
    const title = type === "activity" ? "編輯活動" : type === "registrations" ? "報名名單" : type === "vendor" ? "編輯廠商會員" : type === "association" ? "編輯協會會員" : type === "import-vendor" ? "匯入廠商名冊" : "匯入協會名冊";
    const content = type === "activity" ? activityForm(rowId) : type === "registrations" ? registrationList(rowId) : type.startsWith("import-") ? importForm(type.replace("import-", "")) : memberForm(type, rowId);
    const memberTitle = memberDrawerTitle(type, rowId);
    return `<div class="drawer open" id="drawer"><div class="drawer-backdrop" data-close></div><div class="drawer-panel"><div class="drawer-title">${memberTitle || `<h2>${title}</h2>`}<button class="btn icon" data-close>×</button></div>${content}</div></div>`;
  }
  function memberDrawerTitle(type, rowId) {
    if (!["association", "vendor"].includes(type)) return "";
    if (!rowId || rowId === "new") return `<h2>${type === "vendor" ? "新增廠商 CRM 檔案" : "新增會員 CRM 檔案"}</h2>`;
    const row = state.data[type]?.find(item => item.id === rowId) || {};
    const name = type === "vendor" ? firstValue(row.companyName, row.name, row.memberNo) : firstValue(row.name, row.memberNo);
    const uid = memberLineUid(row);
    return `<h2 class="crm-member-title"><span>會員檔案：${esc(name || "未命名")}</span>${uid ? `<small>UID: ${esc(uid)}</small>` : ""}</h2>`;
  }
  function registrationList(rowId) {
    const activity = state.data.activities.find(r => r.id === rowId) || {};
    const rows = state.registrationLists[rowId];
    if (!rows) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${esc(activity.name || "活動")} 報名名單</h2><button class="btn" data-refresh-registration-list="${esc(rowId)}">重新載入</button></div>${empty("正在載入報名名單...")}</section>`;
    if (!rows.length) return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${esc(activity.name || "活動")} 報名名單</h2><button class="btn" data-refresh-registration-list="${esc(rowId)}">重新載入</button></div>${empty("目前 Worker 沒有收到這個活動的報名資料")}</section>`;
    const systemFields = new Set(["LINE_user_id", "lineUserId", "line_user_id", "uid", "UID", "memberName", "registrationSource"]);
    const baseFields = [
      ["送出時間", row => formatTime(row.submittedAt)],
      ["姓名", row => answerPick(row.answers, ["name", "姓名", "memberName", "memberName"])],
      ["會員編號", row => answerPick(row.answers, ["memberNo", "會員編號"])],
      ["電話", row => answerPick(row.answers, ["phone", "mobile", "手機", "電話"])],
      ["Email", row => cleanFakeEmail(answerPick(row.answers, ["email", "Email", "電子郵件"]))],
      ["會員類型", row => answerPick(row.answers, ["memberType", "isMember", "是否為會員"])],
      ["來源", row => sourceLabel(answerPick(row.answers, ["registrationSource"]))],
      ["簽到狀態", row => row.checkinStatusText || (row.checkedInAt ? "已完成簽到" : "尚未簽到")],
      ["簽到時間", row => row.checkedInAt ? formatTime(row.checkedInAt) : ""]
    ];
    const paymentLabel = (payment = {}) => {
      const amount = Number(payment.amount || 0);
      if (amount <= 0 || payment.status === "free") return "免付款";
      if (payment.status === "paid") return "已收款";
      if (payment.status === "reported") return "已回報待核對";
      if (payment.status === "cancelled") return "付款取消";
      if (payment.status === "refunded") return "已退款";
      return "待付款";
    };
    const paymentActionCell = (row) => {
      const payment = row.payment || {};
      const amount = Number(payment.amount || 0);
      if (!amount) return "-";
      const paid = payment.status === "paid";
      return `<button class="link" data-payment-registration="${esc(row.id)}" data-payment-status="${paid ? "reported" : "paid"}">${paid ? "改回待核對" : "確認收款"}</button>`;
    };
    const paymentCells = row => {
      const payment = row.payment || {};
      const amount = Number(payment.amount || 0);
      return `<td>${esc(paymentLabel(payment))}</td><td>${esc(amount ? amount.toLocaleString() : "")}</td><td>${esc(payment.remittanceLast5 || "")}</td><td>${paymentActionCell(row)}</td>`;
    };
    const customHeaders = [...new Set(rows.flatMap(row => Object.keys(row.answers || {})))]
      .filter(key => !systemFields.has(key) && !baseFields.some(([label]) => label === key) && !["name", "姓名", "memberNo", "會員編號", "phone", "mobile", "手機", "電話", "email", "Email", "電子郵件", "memberType", "isMember", "是否為會員"].includes(key));
    return `<section class="panel"><div class="panel-head"><h2 class="panel-title">${esc(activity.name || "活動")} 報名名單</h2><button class="btn" data-refresh-registration-list="${esc(rowId)}">重新載入</button></div><div class="table-wrap"><table><thead><tr>${baseFields.map(([label]) => `<th>${esc(label)}</th>`).join("")}<th>付款狀態</th><th>金額</th><th>末五碼</th><th>帳務操作</th>${customHeaders.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${baseFields.map(([, getter]) => `<td>${esc(getter(row))}</td>`).join("")}${paymentCells(row)}${customHeaders.map(h => `<td>${esc(valueText(row.answers?.[h]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  }
  function answerPick(answers, keys) {
    const source = answers || {};
    for (const key of keys) {
      const value = valueText(source[key]);
      if (value) return value;
    }
    return "";
  }
  function cleanFakeEmail(value) {
    const text = String(value || "").trim();
    return /^U[a-f0-9]{32}@aiwe\.cc$/i.test(text) ? "" : text;
  }
  function sourceLabel(value) {
    if (value === "line_login" || value === "line_member_claim") return "LINE 登入";
    if (value === "form") return "填表";
    return value || "";
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
    return `<form class="form-grid" id="drawer-activity">${hidden("id", x.id)}${select("活動建立模式", "templateMode", [["custom","一般活動"],["mode1_vendor_visit","模式 1：廠商參訪 / 聯合參訪"]], x.templateMode || (x.type === "企業參訪" ? "mode1_vendor_visit" : "custom"))}${field("活動名稱", "name", x.name)}${select("類型", "type", ["企業參訪", "講座類", "教學類", "聯誼類", "年度會議"], x.type)}${field("課程時間", "courseTime", x.courseTime)}${field("報名截止", "deadline", x.deadline)}${field("人數限制", "capacity", x.capacity, "", false, "number")}${field("簽到贈點", "checkinPoints", x.checkinPoints || 0, "0 表示不贈點", false, "number")}${field("報名扣點/費用扣抵", "feePoints", x.feePoints || 0, "0 表示不扣點", false, "number")}${field("報名費 NT$", "paymentAmount", x.paymentAmount || 0, "0 表示免付款", false, "number")}<div class="field"><label>匯款資訊</label><textarea name="remittanceInfo" placeholder="例：銀行、分行、帳號、戶名。會顯示在報名查詢頁，供報名者匯款後回報末五碼。">${esc(x.remittanceInfo || "")}</textarea></div>${select("報名方式", "registrationMode", [["member_login","會員/廠商登入報名"],["form","開放填表報名"],["mixed","會員優先，非會員填表"]], x.registrationMode || "member_login")}${field("報名人數", "reg", x.reg, "", false, "number")}${field("簽到人數", "check", x.check, "", false, "number")}${select("狀態", "status", ["上架", "下架"], x.status)}${field("表單連結", "formUrl", x.formUrl)}<button class="btn primary" type="submit">儲存</button></form>`;
  }
  function memberForm(type, rowId) {
    const x = state.data[type].find(r => r.id === rowId) || {}, vendor = type === "vendor";
    const profileFields = `${field("會員編號", "memberNo", x.memberNo)}${field("LINE UID", "lineUserId", memberLineUid(x), "例如：Ub68b9724664b889e790c789ece72f717")}${field("母站帳號", "aiweMemberNo", firstValue(x.aiweMemberNo, x.motherMemberNo, x.motherAccount, x.legacyAccount), "母站會員帳號")}${field("手機", "phone", firstValue(x.phone, x.mobile, x.tel), "手機")}${field("Email", "email", x.email, "會員 Email", false, "email")}`;
    const vendorFields = `${field("公司名稱", "companyName", x.companyName)}${field("統一編號", "taxId", x.taxId)}${field("負責人", "owner", x.owner)}${field("聯絡窗口", "contact", x.contact)}`;
    const memberFields = `${field("身分", "identity", x.identity)}${field("姓名", "name", x.name)}${select("性別", "gender", ["", "男", "女"], x.gender)}${field("本職", "jobTitle", firstValue(x.jobTitle, x.title, x.position), "本職")}${field("公司/單位", "company", firstValue(x.company, x.companyName, x.unit), "公司/單位")}`;
    return `<div class="crm-member-profile-layout"><section class="crm-member-card"><div class="crm-member-section-title">基本資料</div><form class="form-grid crm-member-form" id="drawer-member" data-type="${type}">${hidden("id", x.id)}${profileFields}${vendor ? vendorFields : memberFields}${select("會員資格", "qualification", ["Y", "N"], x.qualification || "Y")}<label class="sync-toggle"><input type="checkbox" name="loginAccess" value="Y" ${memberLoginAllowed(x) ? "checked" : ""}> 舊允許資料（正式權限請到 LINE 專區 / 白名單設定）</label><div class="field"><label>備註</label><textarea name="note">${esc(x.note)}</textarea></div><div class="crm-member-savebar"><button class="btn" type="button" data-close>取消</button><button class="btn primary" type="submit">儲存檔案變更</button></div></form></section><aside class="crm-member-side" data-member-side><div data-member-point-slot></div></aside><section class="member-registration-wide" data-member-registration-slot></section></div>`;
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

  async function deleteActivity(rowId) {
    const row = state.data.activities.find(x => x.id === rowId);
    if (!row || !confirm(`確定封存活動「${row.name || rowId}」？\n\n活動會從清單隱藏，但報名、簽到、抽獎與表單設定會保留。`)) return;
    markActivityDeleted(row);
    try {
      await deleteActivityRemote(rowId);
      deleteRemoteLineActivityDraft(row);
    } catch (err) {
      toast(err?.message || "活動封存失敗");
      return;
    }
    state.data.activities = state.data.activities.filter(x => x.id !== rowId);
    save();
    render();
    toast("活動已封存，可保留既有報名資料");
  }

  async function restoreActivity(rowId) {
    const row = state.archivedActivities.find(x => x.id === rowId);
    if (!row || !confirm(`確定恢復活動「${row.name || rowId}」？\n\n恢復後會回到活動清單，狀態先設為「下架」，不會自動公開。`)) return;
    try {
      await restoreActivityRemote(rowId);
      await loadActivitiesRemote();
      await loadArchivedActivitiesRemote();
    } catch (err) {
      toast(err?.message || "活動恢復失敗");
      return;
    }
    save();
    render();
    toast("活動已恢復，狀態為下架");
  }

  function ensureActivityMediaStyles() {
    if (document.getElementById("activity-media-style")) return;
    const style = document.createElement("style");
    style.id = "activity-media-style";
    style.textContent = `
      .activity-extra-fields{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:4px 0 10px}
      .activity-extra-fields>.field{grid-column:1/-1}
      .activity-media-card{border:1px solid #dbe7f5;border-radius:10px;padding:16px;background:#f8fbff;display:grid;gap:12px;align-content:start}
      .activity-media-card .field{margin:0}
      .activity-media-card input,.activity-media-card textarea{background:#fff}
      .activity-media-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(37,99,235,.14);padding-bottom:10px}
      .activity-media-head strong{display:block;color:#0f172a;font-size:15px}
      .activity-media-head span{display:block;margin-top:3px;color:#64748b;font-size:12px;line-height:1.45}
      .activity-media-chip{flex:0 0 auto;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900}
      .activity-media-poster{background:#eff6ff;border-color:#bfdbfe}
      .activity-media-poster .activity-media-chip{background:#dbeafe;color:#1d4ed8}
      .activity-media-gallery{background:#ecfdf5;border-color:#bbf7d0}
      .activity-media-gallery .activity-media-chip{background:#dcfce7;color:#047857}
      .activity-upload-status{margin-top:8px;font-weight:800;color:#047857}
      @media(max-width:920px){.activity-extra-fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function makeActivityMediaCard(kind, title, description, chip, fields) {
    const card = document.createElement("section");
    card.className = `activity-media-card activity-media-${kind}`;
    card.innerHTML = `<div class="activity-media-head"><div><strong>${esc(title)}</strong><span>${esc(description)}</span></div><div class="activity-media-chip">${esc(chip)}</div></div>`;
    fields.filter(Boolean).forEach(field => card.appendChild(field));
    return card;
  }

  function groupActivityMediaFields(wrap) {
    if (!wrap || wrap.dataset.mediaGrouped) return;
    const posterFileField = wrap.querySelector("[data-activity-poster-file]")?.closest(".field");
    const posterUrlField = wrap.querySelector("[name='posterUrl']")?.closest(".field");
    const galleryFileField = wrap.querySelector("[data-activity-gallery-file]")?.closest(".field");
    const galleryUrlField = wrap.querySelector("[name='galleryUrls']")?.closest(".field");
    const nativeFormField = wrap.querySelector("[name='nativeFormUrl']")?.closest(".field");
    if (!posterFileField && !galleryFileField) return;
    const posterCard = makeActivityMediaCard("poster", "活動主圖", "用於報名頁、每月活動卡片與說明頁第一張圖。", "主圖", [posterFileField, posterUrlField]);
    const galleryCard = makeActivityMediaCard("gallery", "活動圖集 / 說明頁輪播圖", "可一次上傳多張；說明頁會輪播，月活動會自動帶入張數。", "輪播", [galleryFileField, galleryUrlField]);
    nativeFormField?.insertAdjacentElement("beforebegin", galleryCard);
    galleryCard.insertAdjacentElement("beforebegin", posterCard);
    wrap.dataset.mediaGrouped = "true";
  }

  function ensureActivityEditorFields() {
    const form = document.querySelector("#drawer-activity");
    if (!form || form.dataset.mediaFieldsReady) return;
    form.dataset.mediaFieldsReady = "true";
    ensureActivityMediaStyles();
    const id = form.querySelector("input[name='id']")?.value || "";
    const activity = state.data.activities.find((item) => item.id === id) || {};
    const insertBefore = form.querySelector("input[name='formUrl']")?.closest(".field") || form.querySelector("button[type='submit']");
    const wrap = document.createElement("div");
    wrap.className = "activity-extra-fields";
    wrap.innerHTML = `
      <div class="field"><label>詳細說明</label><textarea name="detailText" placeholder="活動介紹、地點、費用、注意事項...">${esc(activity.detailText || "")}</textarea></div>
      <div class="field"><label>活動主圖</label><input type="file" accept="image/*" data-activity-poster-file><div class="muted">上傳後會寫入報名頁與每月活動主圖。</div></div>
      <div class="field"><label>圖片網址</label><input name="posterUrl" value="${esc(activity.posterUrl || activity.imageUrl || "")}" placeholder="上傳後自動填入，也可貼圖片網址"></div>
      <div class="field"><label>活動圖集 / 說明頁輪播圖</label><input type="file" accept="image/*" multiple data-activity-gallery-file><div class="muted">可一次選多張；活動說明頁會用這些圖片做輪播，每月活動會自動帶入張數。</div></div>
      <div class="field"><label>圖集網址</label><textarea name="galleryUrls" placeholder="每行一張圖片網址；也可直接貼上既有圖片 URL">${esc(cleanUrlList(activity.galleryUrls).join("\n"))}</textarea></div>
      <div class="field"><label>報名頁網址</label><input name="nativeFormUrl" value="${esc(activity.nativeFormUrl || "")}" placeholder="系統會自動產生"></div>`;
    insertBefore?.insertAdjacentElement("beforebegin", wrap);
    groupActivityMediaFields(wrap);
    const galleryFileInput = wrap.querySelector("[data-activity-gallery-file]");
    if (galleryFileInput && !wrap.querySelector("[data-activity-gallery-status]")) {
      const status = document.createElement("div");
      status.className = "muted activity-upload-status";
      status.dataset.activityGalleryStatus = "";
      status.setAttribute("aria-live", "polite");
      galleryFileInput.insertAdjacentElement("afterend", status);
      galleryFileInput.addEventListener("change", () => {
        const count = galleryFileInput.files?.length || 0;
        status.textContent = count ? `已選擇 ${count} 張圖片，按下儲存後會開始上傳。` : "";
      });
    }
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

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  function setSubmitState(form, text, disabled = true) {
    const button = form?.querySelector("button[type='submit']");
    if (!button) return null;
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent || "儲存";
    button.disabled = disabled;
    button.textContent = text || button.dataset.defaultText;
    return button;
  }
  function resetSubmitState(form) {
    const button = form?.querySelector("button[type='submit']");
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.defaultText || "儲存";
  }
  function setActivityUploadStatus(form, text) {
    const status = form?.querySelector("[data-activity-gallery-status]");
    if (status) status.textContent = text || "";
  }
  function setActivityUploadBusy(form, busy) {
    if (!form) return;
    form.querySelectorAll("[data-activity-poster-file], [data-activity-gallery-file]").forEach(input => {
      input.disabled = Boolean(busy);
    });
    if (busy) form.dataset.uploading = "true";
    else delete form.dataset.uploading;
  }
  function resetActivityUploadState(form) {
    setActivityUploadBusy(form, false);
    setActivityUploadStatus(form, "");
    resetSubmitState(form);
  }
  async function finishSubmitState(form, text = "已完成") {
    setSubmitState(form, text, true);
    await wait(1200);
    setActivityUploadBusy(form, false);
    setActivityUploadStatus(form, "");
    resetSubmitState(form);
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
        if (form.dataset.uploading === "true") return;
        const d = Object.fromEntries(new FormData(form));
        const activity = state.data.activities.find((item) => item.id === d.id);
        if (!activity) {
          resetSubmitState(form);
          return;
        }
        const posterFileInput = form.querySelector("[data-activity-poster-file]");
        const galleryFileInput = form.querySelector("[data-activity-gallery-file]");
        const file = posterFileInput?.files?.[0];
        const galleryFiles = [...(galleryFileInput?.files || [])];
        const hasUploadFiles = Boolean(file) || galleryFiles.length > 0;
        setActivityUploadBusy(form, true);
        setSubmitState(form, hasUploadFiles ? "上傳中..." : "儲存中...");
        if (galleryFiles.length) setActivityUploadStatus(form, `上傳中：0 / ${galleryFiles.length} 張`);
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
          imageUrl: d.posterUrl || activity.imageUrl || "",
          galleryUrls: cleanUrlList(d.galleryUrls || activity.galleryUrls)
        });
        const email = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
        if (file) {
          try {
            setActivityUploadStatus(form, "主圖上傳中...");
            const uploaded = await uploadActivityPoster(file, activity.id, email);
            if (uploaded?.url) {
              activity.posterUrl = uploaded.url;
              activity.imageUrl = uploaded.url;
            }
          } catch (error) {
            toast(error.message || "圖片上傳失敗");
            resetActivityUploadState(form);
            return;
          }
        }
        if (galleryFiles.length) {
          try {
            const uploadedUrls = [];
            for (const [index, galleryFile] of galleryFiles.entries()) {
              setActivityUploadStatus(form, `上傳中：${index + 1} / ${galleryFiles.length} 張`);
              const uploaded = await uploadActivityPoster(galleryFile, activity.id || d.id, email);
              if (uploaded?.url) uploadedUrls.push(uploaded.url);
            }
            setActivityUploadStatus(form, `上傳完成：${uploadedUrls.length} 張`);
            activity.galleryUrls = cleanUrlList([activity.galleryUrls, uploadedUrls]);
            const galleryInput = form.querySelector("[name='galleryUrls']");
            if (galleryInput) galleryInput.value = activity.galleryUrls.join("\n");
          } catch (error) {
            toast(error.message || "圖集上傳失敗");
            resetActivityUploadState(form);
            return;
          }
        }
        try {
          await ensureNativeFormForActivity(activity, email);
        } catch (error) {
          toast(error?.message || "報名表處理失敗");
          resetActivityUploadState(form);
          return;
        }
        state.data.formSettings ||= {};
        state.data.formSettings[activity.id] ||= {};
        Object.assign(state.data.formSettings[activity.id], {
          detailText: activity.detailText || "",
          posterUrl: activity.posterUrl || activity.imageUrl || "",
          imageUrl: activity.imageUrl || activity.posterUrl || "",
          galleryUrls: cleanUrlList(activity.galleryUrls),
          formUrl: activity.formUrl || "",
          nativeFormUrl: activity.nativeFormUrl || "",
          nativeFormId: activity.nativeFormId || "",
          formMode: activity.formMode || ""
        });
        if (activity.activityNo) state.data.formSettings[activity.activityNo] = state.data.formSettings[activity.id];
        try {
          const saved = await saveActivityRemote(activity);
          Object.assign(activity, saved || {});
        } catch (error) {
          toast(error?.message || "活動儲存失敗");
          resetActivityUploadState(form);
          return;
        }
        save();
        await finishSubmitState(form);
      }, true);
    }
    const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
    if (sidebarToggle) sidebarToggle.onclick = () => {
      const next = !sidebarCollapsed();
      setSidebarCollapsed(next);
      applySidebarCollapsed(next);
    };
    document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { state.view = b.dataset.nav; state.drawer = ""; render(); });
    document.querySelectorAll("[data-roster-search]").forEach(input => {
      input.oninput = () => {
        const type = input.dataset.rosterSearch;
        const query = String(input.value || "").trim().toLowerCase();
        state.rosterSearch[type] = input.value || "";
        const rows = Array.from(document.querySelectorAll(`[data-roster-row="${type}"]`));
        let visible = 0;
        rows.forEach((row) => {
          const matched = !query || String(row.dataset.rosterSearchText || "").includes(query);
          row.style.display = matched ? "" : "none";
          if (matched) visible += 1;
        });
        const count = document.querySelector(`[data-roster-count="${type}"]`);
        if (count) count.textContent = `${visible} / ${rows.length} 筆`;
      };
    });
    document.querySelectorAll("[data-load-whitelist]").forEach(b => b.onclick = async () => { b.disabled = true; await loadAdminWhitelist(true); b.disabled = false; render(); });
    document.querySelectorAll("[data-add-whitelist-row]").forEach(b => b.onclick = () => { state.adminWhitelist = [...(state.adminWhitelist || []), { id: uid(), enabled: true, role: "admin" }]; render(); });
    document.querySelectorAll("[data-remove-whitelist-row]").forEach(b => b.onclick = () => { const row = b.closest("[data-whitelist-row]"); if (row) row.remove(); });
    document.querySelectorAll("[data-import-association-whitelist]").forEach(b => b.onclick = async () => {
      await loadAdminWhitelist(true);
      const imported = associationRosterToWhitelistRows();
      const current = state.adminWhitelist || [];
      const keyOf = (row) => [row.memberNo, row.lineUserId, row.email].filter(Boolean).join("|").toLowerCase();
      const exists = new Set(current.map(keyOf).filter(Boolean));
      const fresh = imported.filter(row => {
        const key = keyOf(row);
        return key && !exists.has(key);
      });
      state.adminWhitelist = [...current, ...fresh];
      render();
      toast(`已從協會名冊帶入 ${fresh.length} 筆，請確認後儲存白名單`);
    });
    document.querySelectorAll("[data-import-legacy-access]").forEach(b => b.onclick = async () => {
      await loadAdminWhitelist(true);
      const imported = legacyAccessToWhitelistRows();
      const exists = new Set((state.adminWhitelist || []).map(row => [row.memberNo, row.lineUserId, row.email].filter(Boolean).join("|")));
      state.adminWhitelist = [...(state.adminWhitelist || []), ...imported.filter(row => !exists.has([row.memberNo, row.lineUserId, row.email].filter(Boolean).join("|")))];
      render();
      toast(`已帶入 ${imported.length} 筆舊允許名單，請檢查後儲存`);
    });
    document.querySelectorAll("[data-check-whitelist]").forEach(b => b.onclick = () => {
      const identity = adminIdentity();
      alert(`目前送出的身份\nEmail：${identity.email || "-"}\n會員編號：${identity.memberNo || "-"}\nLINE UID：${identity.lineUserId || "-"}`);
    });
    document.querySelectorAll("[data-save-whitelist]").forEach(b => b.onclick = async () => {
      try {
        b.disabled = true;
        await saveAdminWhitelist();
        toast("白名單已儲存");
        render();
      } catch (err) {
        alert(err?.message || "白名單儲存失敗");
      } finally {
        b.disabled = false;
      }
    });
    document.querySelectorAll("[data-drawer]").forEach(b => b.onclick = () => { state.drawer = b.dataset.drawer; render(); });
    mountMemberPointPanel();
    mountMemberRegistrationPanel();
    document.querySelectorAll("[data-refresh-member-registrations]").forEach(b => b.onclick = () => loadMemberRegistrationList(b.dataset.memberType, b.dataset.memberId, true));
    document.querySelectorAll("[data-refresh-member-points]").forEach(b => b.onclick = () => loadMemberPointAccount(b.dataset.memberType, b.dataset.memberId, true));
    document.querySelectorAll("[data-member-point-form]").forEach(form => form.onsubmit = submitMemberPointAdjust);
    document.querySelectorAll("[data-import]").forEach(b => b.onclick = () => { state.drawer = "import-" + b.dataset.import + ":new"; render(); });
    document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { state.drawer = ""; render(); });
    document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = async () => {
      const x = state.data.activities.find(r => r.id === b.dataset.toggle);
      if (!x) return;
      const previous = x.status;
      x.status = x.status === "上架" ? "下架" : "上架";
      b.disabled = true;
      try {
        const saved = await saveActivityRemote(x);
        Object.assign(x, saved || {});
      } catch (err) {
        x.status = previous;
        toast(err?.message || "活動狀態儲存失敗");
      } finally {
        b.disabled = false;
        render();
      }
    });
    document.querySelectorAll("[data-delete-activity]").forEach(b => b.onclick = () => deleteActivity(b.dataset.deleteActivity));
    document.querySelectorAll("[data-restore-activity]").forEach(b => b.onclick = () => restoreActivity(b.dataset.restoreActivity));
    document.querySelectorAll("[data-load-archived-activities]").forEach(b => b.onclick = async () => { await loadArchivedActivitiesRemote(); render(); toast("封存活動資料夾已更新"); });
    document.querySelectorAll("[data-delete-member]").forEach(b => b.onclick = () => deleteMember(b.dataset.deleteMember));
    document.querySelectorAll("[data-member-login-toggle]").forEach(input => input.onchange = () => {
      const [type, rowId] = String(input.dataset.memberLoginToggle || "").split(":");
      const row = state.data[type]?.find(item => item.id === rowId);
      if (!row) return;
      row.loginAccess = input.checked;
      row.allowLogin = input.checked;
      row.canLogin = input.checked;
      save();
      syncAdminAccessForMember(type, row);
      toast(input.checked ? "已允許登入權限" : "已取消登入權限");
    });
    document.querySelectorAll("[data-registration-list]").forEach(b => b.onclick = () => openRegistrationList(b.dataset.registrationList));
    document.querySelectorAll("[data-refresh-registration-list]").forEach(b => b.onclick = () => loadRegistrationList(b.dataset.refreshRegistrationList, true));
    document.querySelectorAll("[data-payment-registration]").forEach(b => b.onclick = () => updateRegistrationPayment(b.dataset.paymentRegistration, b.dataset.paymentStatus));
    document.querySelectorAll("[data-load-member-applications]").forEach(b => b.onclick = () => loadMemberApplications(true));
    const autoSync = document.querySelector("[data-auto-sync]"); if (autoSync) autoSync.onchange = () => { setAutoSyncEnabled(autoSync.checked); toast(autoSync.checked ? "已開啟自動同步" : "已關閉自動同步"); };
    const refreshKeywords = document.querySelector("[data-refresh-keywords]"); if (refreshKeywords) refreshKeywords.onclick = () => { render(); toast("關鍵字列表已刷新"); };
    const loadRedeem = document.querySelector("[data-load-redeem]"); if (loadRedeem) loadRedeem.onclick = () => loadRedeemRecords(true);
    const loadPointLedgerButton = document.querySelector("[data-load-point-ledger]"); if (loadPointLedgerButton) loadPointLedgerButton.onclick = () => loadPointLedger(true);
    document.querySelectorAll("[data-copy-redeem-url]").forEach(b => b.onclick = () => { navigator.clipboard.writeText(b.dataset.copyRedeemUrl || ""); toast("工作台網址已複製"); });
    const copyRedeem = document.querySelector("[data-copy-redeem]"); if (copyRedeem) copyRedeem.onclick = () => { navigator.clipboard.writeText(state.latestRedeem?.sessionUrl || state.latestRedeem?.redeemUrl || ""); toast("店家掃碼網址已複製"); };
    const redeemForm = document.querySelector("#redeem-form"); if (redeemForm) redeemForm.onsubmit = createRedeem;
    const syncButton = document.querySelector("[data-sync-registrations]"); if (syncButton) syncButton.onclick = () => syncRegistrations(true);
    const clearTest = document.querySelector("[data-clear-test]"); if (clearTest) clearTest.onclick = clearTestData;
    const importLineDrafts = document.querySelector("[data-import-line-drafts]"); if (importLineDrafts) importLineDrafts.onclick = () => importLineActivityDrafts(true);
    document.querySelectorAll("[data-register]").forEach(b => b.onclick = () => {
      const x = state.data.activities.find(r => r.id === b.dataset.register);
      const url = x?.formUrl || x?.nativeFormUrl || x?.googleFormUrl || x?.opnformFormUrl || "";
      if (url) location.href = url;
      else toast("這個活動尚未建立報名表，請到編輯活動產生。");
    });
    const af = document.querySelector("#activity-form"); if (af) af.onsubmit = async e => { e.preventDefault(); setSubmitState(af, "儲存中..."); const d = Object.fromEntries(new FormData(af)); const templateMode = d.templateMode || "custom"; const registrationMode = d.registrationMode || (templateMode === "mode1_vendor_visit" ? "member_login" : "form"); const item = { id: uid(), name: d.name.trim(), templateMode, type: d.type, typeLabel: formTypeLabel(d), courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), checkinPoints: Number(d.checkinPoints || 0), feePoints: Number(d.feePoints || 0), paymentAmount: Number(d.paymentAmount || 0), remittanceInfo: d.remittanceInfo || "", registrationMode, detailText: d.detailText || "", galleryUrls: cleanUrlList(d.galleryUrls || ""), reg: 0, check: 0, status: d.status, formUrl: "" }; try { const saved = await saveActivityRemote(item); state.data.activities.unshift(saved || item); save(); await finishSubmitState(af); } catch (err) { toast(err?.message || "活動建立失敗"); resetSubmitState(af); } };
    const ea = document.querySelector("#drawer-activity"); if (ea) ea.onsubmit = async e => { e.preventDefault(); setSubmitState(ea, "儲存中..."); const d = Object.fromEntries(new FormData(ea)); const x = state.data.activities.find(r => r.id === d.id); if (x) { Object.assign(x, { name: d.name, templateMode: d.templateMode || x.templateMode || "custom", type: d.type, typeLabel: formTypeLabel(d), courseTime: d.courseTime, deadline: d.deadline, capacity: Number(d.capacity || 0), checkinPoints: Number(d.checkinPoints || 0), feePoints: Number(d.feePoints || 0), paymentAmount: Number(d.paymentAmount || 0), remittanceInfo: d.remittanceInfo || "", registrationMode: d.registrationMode || "form", reg: Number(d.reg || 0), check: Number(d.check || 0), status: d.status, formUrl: d.formUrl, galleryUrls: cleanUrlList(d.galleryUrls || x.galleryUrls) }); try { const saved = await saveActivityRemote(x); Object.assign(x, saved || {}); } catch (err) { toast(err?.message || "活動儲存失敗"); resetSubmitState(ea); return; } } save(); await finishSubmitState(ea); };
    const mf = document.querySelector("#drawer-member"); if (mf) mf.onsubmit = e => { e.preventDefault(); const type = mf.dataset.type; const d = Object.fromEntries(new FormData(mf)); const rows = state.data[type]; const old = rows.find(r => r.id === d.id); const loginAccess = d.loginAccess === "Y"; const item = { ...d, id: d.id || uid(), loginAccess, allowLogin: loginAccess, canLogin: loginAccess }; old ? Object.assign(old, item) : rows.unshift(item); state.drawer = ""; save(); syncRosterMemberToWorker(type, item); syncAdminAccessForMember(type, item); render(); toast("名冊已儲存"); };
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

  function memberLineUid(row) {
    return validLineUid(row?.lineUserId || row?.lineUid || row?.uid || row?.LINE_user_id || row?.line_user_id);
  }
  function validLineUid(value) {
    const match = String(value || "").trim().match(/^U[0-9a-f]{32}$/i);
    return match ? match[0] : "";
  }
  function rosterMemberKey(row) {
    return String(row?.memberNo || row?.rosterMemberNo || row?.member_no || row?.aiweMemberNo || "").trim().toUpperCase();
  }
  async function loadMotherRosterMap() {
    if (motherRosterMapPromise) return motherRosterMapPromise;
    motherRosterMapPromise = (async () => {
      const response = await fetch(api + "/api/aiwe-members-public", { headers: adminHeaders(), cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "母站綁定名冊讀取失敗");
      const map = new Map();
      for (const item of result.data || []) {
        const uid = validLineUid(item.lineUserId || item.LINE_user_id || item.uid);
        if (!uid) continue;
        [item.rosterMemberNo, item.memberNo, item.member_no, item.aiweMemberNo].forEach((value) => {
          const key = String(value || "").trim().toUpperCase();
          if (key && !map.has(key)) map.set(key, { ...item, lineUserId: uid });
        });
      }
      return map;
    })().catch((error) => {
      console.warn(error);
      return new Map();
    });
    return motherRosterMapPromise;
  }
  async function resolveMemberLineUidFromMother(info) {
    const current = memberLineUid(info?.row);
    if (current) return current;
    const key = rosterMemberKey(info?.row);
    if (!key) return "";
    const map = await loadMotherRosterMap();
    const remote = map.get(key);
    const uid = validLineUid(remote?.lineUserId || remote?.LINE_user_id || remote?.uid);
    if (uid && info?.row) {
      info.row.lineUserId = uid;
      if (!info.row.LINE_user_id) info.row.LINE_user_id = uid;
      if (!info.row.uid) info.row.uid = uid;
      queueManagerDataSave();
    }
    return uid;
  }
  function shortUid(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.length > 18 ? `${text.slice(0, 10)}...${text.slice(-8)}` : text;
  }

  function currentMemberDrawer() {
    const [type, rowId] = String(state.drawer || "").split(":");
    if (!["association", "vendor"].includes(type) || !rowId || rowId === "new") return null;
    const row = state.data[type]?.find(item => item.id === rowId);
    return row ? { type, rowId, row } : null;
  }


  function memberPointRowsHtml(logs) {
    if (!logs?.length) return `<div class="empty">目前沒有點數異動紀錄。</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>時間</th><th>類型</th><th>異動</th><th>餘額</th><th>原因</th></tr></thead><tbody>${logs.slice(0, 8).map(log => `<tr><td>${esc(formatTime(log.createdAt))}</td><td>${esc(log.type || "")}</td><td>${Number(log.amount || 0) >= 0 ? "+" : ""}${n(log.amount)}</td><td>${n(log.balanceAfter)}</td><td>${esc(log.reason || log.event_name || "")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function memberPointPanelHtml(info, account) {
    const lineUserId = memberLineUid(info.row);
    if (!lineUserId && account?.resolving) return `<div class="empty">正在比對母站綁定名冊...</div>`;
    if (!lineUserId) return `<div class="empty">本地名冊沒有 LINE UID，且母站綁定名冊尚未回補成功。</div>`;
    if (!account) return `<div class="empty">正在讀取母站點數...</div>`;
    if (account.success === false) return `<div class="empty">${esc(account.message || "母站點數讀取失敗")}</div>`;
    const balance = Number(account.balance || 0);
    const motherLogs = Array.isArray(account.motherSynced?.list) ? account.motherSynced.list.map(item => ({
      createdAt: item.created_at,
      type: Number(item.get_point || 0) >= 0 ? "EARN" : "SPEND",
      amount: Number(item.get_point || 0),
      balanceAfter: item.point_balance,
      reason: item.event_name || item.event_content || ""
    })) : [];
    const logs = Array.isArray(account.logs) && account.logs.length ? account.logs : motherLogs;
    return `<div class="crm-point-summary"><span>可用點數</span><div class="crm-point-number"><strong>${esc(balance.toLocaleString())}</strong><small>點</small></div></div><form class="crm-point-actions" data-member-point-form><input type="hidden" name="lineUserId" value="${esc(lineUserId)}"><input type="hidden" name="memberNo" value="${esc(info.row.memberNo || "")}"><div class="field"><label>異動點數</label><input name="amount" type="number" placeholder="正數贈點，負數扣點" required></div><div class="field"><label>原因</label><input name="note" placeholder="例：活動補點、人工扣點" required></div><div class="actions"><button class="btn primary" type="submit" data-point-action="add">贈點</button><button class="btn danger" type="submit" data-point-action="spend">扣點</button></div></form><div class="crm-point-history"><h3>點數歷史紀錄</h3>${memberPointRowsHtml(logs)}</div>`;
  }

  function mountMemberPointPanel() {
    const form = document.querySelector("#drawer-member");
    const info = currentMemberDrawer();
    if (!form || !info || document.querySelector("[data-member-point-panel]")) return;
    const key = `${info.type}:${info.rowId}`;
    const account = state.memberPointAccounts[key];
    const panel = document.createElement("section");
    panel.className = "panel member-point-panel";
    panel.dataset.memberPointPanel = "1";
    panel.innerHTML = `<div class="panel-head"><h3>點數贈扣區</h3><button class="btn" type="button" data-refresh-member-points data-member-type="${esc(info.type)}" data-member-id="${esc(info.rowId)}">重新載入</button></div>${memberPointPanelHtml(info, account)}`;
    const slot = document.querySelector("[data-member-point-slot]");
    if (slot) slot.replaceChildren(panel);
    else form.insertAdjacentElement("afterend", panel);
    if (!account) loadMemberPointAccount(info.type, info.rowId);
  }

  async function loadMemberPointAccount(type, rowId, showMessage = false) {
    const row = state.data[type]?.find(item => item.id === rowId);
    const key = `${type}:${rowId}`;
    const info = row ? { type, rowId, row } : null;
    state.memberPointAccounts[key] = { resolving: true };
    if (!showMessage) render();
    const lineUserId = info ? await resolveMemberLineUidFromMother(info) : "";
    if (!lineUserId) {
      state.memberPointAccounts[key] = { success: false, message: "母站綁定名冊查無此會員 LINE UID" };
      if (showMessage) toast("母站綁定名冊查無此會員 LINE UID");
      render();
      return;
    }
    try {
      const res = await fetch(api + "/api/points/" + encodeURIComponent(lineUserId), { headers: adminHeaders(), cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      state.memberPointAccounts[key] = result.data || { success: false, message: result.message || "點數讀取失敗" };
      if (showMessage) toast("點數已更新");
    } catch (error) {
      state.memberPointAccounts[key] = { success: false, message: error?.message || "點數讀取失敗" };
      if (showMessage) toast("點數讀取失敗");
    }
    render();
  }

  async function submitMemberPointAdjust(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const info = currentMemberDrawer();
    if (!info) return;
    const submitter = event.submitter;
    const data = Object.fromEntries(new FormData(form));
    let amount = Number(data.amount || 0);
    if (!amount) return toast("請輸入點數");
    if (submitter?.dataset.pointAction === "spend") amount = -Math.abs(amount);
    if (submitter?.dataset.pointAction === "add") amount = Math.abs(amount);
    const lineUserId = validLineUid(data.lineUserId) || await resolveMemberLineUidFromMother(info);
    if (!lineUserId) return toast("母站綁定名冊查無此會員 LINE UID");
    const actionName = amount >= 0 ? "贈點" : "扣點";
    if (!confirm(`確認${actionName} ${Math.abs(amount).toLocaleString()} 點？\n\n此操作會寫入母站點數。`)) return;
    const response = await fetch(api + "/api/points/adjust", {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ lineUserId, memberNo: data.memberNo, amount, note: data.note })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "點數異動失敗");
    form.reset();
    await loadMemberPointAccount(info.type, info.rowId);
    await loadPointLedger(false);
    toast(actionName + "完成");
  }
  function memberRegistrationRowsHtml(rows) {
    if (!rows?.length) return `<div class="empty">目前沒有報名活動記錄。</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>活動名稱</th><th>報名時間</th><th>簽到狀態</th><th>簽到時間</th></tr></thead><tbody>${rows.map(item => `<tr><td>${esc(item.activity?.name || item.activityName || item.eventName || "-")}</td><td>${esc(formatTime(item.submittedAt || item.createdAt || item.timestamp))}</td><td>${esc(item.checkinStatusText || (item.checkedInAt ? "已完成簽到" : "尚未簽到"))}</td><td>${esc(item.checkedInAt ? formatTime(item.checkedInAt) : "-")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function mountMemberRegistrationPanel() {
    const form = document.querySelector("#drawer-member");
    const info = currentMemberDrawer();
    if (!form || !info || document.querySelector("[data-member-registration-panel]")) return;
    const key = `${info.type}:${info.rowId}`;
    const lineUserId = memberLineUid(info.row);
    const rows = state.memberRegistrationLists[key];
    const panel = document.createElement("section");
    panel.className = "panel member-registration-history";
    panel.dataset.memberRegistrationPanel = "1";
    panel.innerHTML = `<div class="panel-head"><h3>報名活動記錄</h3><button class="btn" type="button" data-refresh-member-registrations data-member-type="${esc(info.type)}" data-member-id="${esc(info.rowId)}">重新載入</button></div>${!lineUserId ? `<div class="empty">此會員尚未綁定 LINE UID，無法查詢報名活動記錄。</div>` : rows ? memberRegistrationRowsHtml(rows) : `<div class="empty">正在載入報名活動記錄...</div>`}`;
    const slot = document.querySelector("[data-member-registration-slot]");
    if (slot) slot.replaceChildren(panel);
    else (document.querySelector("[data-member-point-panel]") || form).insertAdjacentElement("afterend", panel);
    if (lineUserId && !rows) loadMemberRegistrationList(info.type, info.rowId);
  }

  async function loadMemberRegistrationList(type, rowId, showMessage = false) {
    const row = state.data[type]?.find(item => item.id === rowId);
    const key = `${type}:${rowId}`;
    const lineUserId = memberLineUid(row);
    if (!lineUserId) {
      state.memberRegistrationLists[key] = [];
      if (showMessage) toast("此會員尚未綁定 LINE UID");
      render();
      return;
    }
    try {
      const res = await fetch(api + "/api/native-registrations/me?lineUserId=" + encodeURIComponent(lineUserId), { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      state.memberRegistrationLists[key] = Array.isArray(result.data) ? result.data : [];
      if (showMessage) toast("報名活動記錄已更新");
    } catch (_) {
      state.memberRegistrationLists[key] = [];
      if (showMessage) toast("報名活動記錄載入失敗");
    }
    render();
  }

  async function createRedeem(event) {
    event.preventDefault();
    if (!hasAdminIdentity()) return toast("請先登入管理者");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch(api + "/api/redeem/create", {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
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
    if (!hasAdminIdentity()) {
      if (showMessage) toast("請先登入管理者");
      return;
    }
    const response = await fetch(api + "/api/redeem/list", { headers: adminHeaders(), cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      if (showMessage) toast(result.message || "折抵紀錄載入失敗");
      return;
    }
    state.redeemRecords = Array.isArray(result.data) ? result.data : [];
    render();
    if (showMessage) toast("折抵紀錄已更新");
  }

  async function loadPointLedger(showMessage = false) {
    if (!hasAdminIdentity()) {
      if (showMessage) toast("請先登入管理者");
      return;
    }
    const response = await fetch(api + "/api/points/ledger?limit=200", {
      headers: adminHeaders(),
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
  async function updateRegistrationPayment(registrationId, status) {
    if (!hasAdminIdentity()) return toast("請先登入管理中心");
    try {
      const response = await fetch(api + "/api/native-registrations/payment", {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ registrationId, status })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "付款狀態更新失敗");
      const activityId = state.drawer?.startsWith("registrations:") ? state.drawer.split(":")[1] : "";
      if (activityId) await loadRegistrationList(activityId);
      else render();
      toast(status === "paid" ? "已確認收款" : "已改回待核對");
    } catch (err) {
      toast(err?.message || "付款狀態更新失敗");
    }
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
  loadManagerDataRemote();
  setTimeout(() => {
    cleanupRosterData();
    if (state.view === "association" || state.view === "vendor") render();
  }, 0);
})();
