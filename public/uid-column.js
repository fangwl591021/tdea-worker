(() => {
  const apiBase = "https://tdeawork.fangwl591021.workers.dev";
  const storageKey = "tdea-manager-v3";
  const tokenKey = "tdea-aiwe-read-token";
  let uidMapPromise = null;
  let lastAppliedAt = 0;

  const normalize = (value) => String(value || "").trim().toUpperCase();
  const clean = (value) => String(value || "").trim();

  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveData(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function getLineUid(row) {
    return clean(row?.lineUserId || row?.lineUid || row?.uid || row?.LINE_user_id || row?.line_user_id);
  }

  function setLineUid(row, uid) {
    if (!row) return;
    row.lineUserId = clean(uid);
    delete row.lineUid;
    delete row.uid;
    delete row.LINE_user_id;
    delete row.line_user_id;
  }

  function displayUid(uid) {
    const value = clean(uid);
    if (!value) return "-";
    if (value.length <= 24) return value;
    return `${value.slice(0, 10)}...${value.slice(-8)}`;
  }

  function getToken() {
    return sessionStorage.getItem(tokenKey) || "";
  }

  async function loadUidMap() {
    if (uidMapPromise) return uidMapPromise;
    uidMapPromise = (async () => {
      const token = getToken();
      if (!token) return new Map();
      const response = await fetch(`${apiBase}/api/aiwe-members-public`, {
        headers: { "x-aiwe-token": token },
        cache: "no-store"
      });
      if (response.status === 401) {
        sessionStorage.removeItem(tokenKey);
        uidMapPromise = null;
        return new Map();
      }
      if (!response.ok) throw new Error(`AIWE UID 讀取失敗 HTTP ${response.status}`);
      const result = await response.json().catch(() => ({}));
      const map = new Map();
      for (const item of result.data || []) {
        const keys = [item.rosterMemberNo, item.memberNo, item.member_no].map(normalize).filter(Boolean);
        for (const key of keys) {
          const current = map.get(key);
          if (!current || item.rosterMemberNo) map.set(key, item);
        }
      }
      return map;
    })().catch((error) => {
      console.warn(error);
      return new Map();
    });
    return uidMapPromise;
  }

  function activeRosterType() {
    const title = document.querySelector("h1")?.textContent || "";
    const active = document.querySelector(".active, [aria-current='page']")?.textContent || "";
    const text = `${title} ${active}`;
    if (text.includes("廠商名冊")) return "vendor";
    if (text.includes("協會名冊")) return "association";
    return "";
  }

  function findRosterTable() {
    const type = activeRosterType();
    if (!type) return null;
    return Array.from(document.querySelectorAll("table")).find((table) => {
      const headerText = table.querySelector("thead")?.textContent || "";
      return headerText.includes("會員編號") && headerText.includes("資格") && headerText.includes("操作");
    }) || null;
  }

  function findLocalRoster(type, memberNo) {
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    return { data, rows, row: rows.find((item) => normalize(item.memberNo) === memberNo) };
  }

  function ensureUidHeader(table) {
    const headerRow = table.querySelector("thead tr");
    if (!headerRow || headerRow.textContent.includes("LINE UID")) return;
    const th = document.createElement("th");
    th.textContent = "LINE UID";
    headerRow.insertBefore(th, headerRow.children[2] || null);
    for (const row of table.querySelectorAll("tbody tr")) {
      const td = document.createElement("td");
      td.className = "aiwe-uid-cell";
      td.textContent = "-";
      td.style.fontFamily = "ui-monospace, SFMono-Regular, Consolas, monospace";
      td.style.fontSize = "12px";
      td.style.whiteSpace = "nowrap";
      td.style.color = "#94a3b8";
      row.insertBefore(td, row.children[2] || null);
    }
  }

  async function applyUidColumn() {
    const type = activeRosterType();
    const table = findRosterTable();
    if (!type || !table) return;
    if (table.dataset.uidColumnApplying === "1") return;
    table.dataset.uidColumnApplying = "1";
    lastAppliedAt = Date.now();

    ensureUidHeader(table);
    const uidMap = await loadUidMap();
    let changed = false;

    for (const row of table.querySelectorAll("tbody tr")) {
      const memberNo = normalize(row.children[0]?.textContent);
      if (!memberNo) continue;
      const cell = row.querySelector(".aiwe-uid-cell");
      if (!cell) continue;
      const local = findLocalRoster(type, memberNo);
      const remote = uidMap.get(memberNo);
      const remoteUid = clean(remote?.lineUserId || remote?.uid || remote?.LINE_user_id);
      let uid = getLineUid(local.row);
      if (!uid && remoteUid && local.row) {
        uid = remoteUid;
        setLineUid(local.row, uid);
        changed = true;
      }
      cell.textContent = displayUid(uid);
      cell.title = uid || "尚未匹配 LINE UID";
      cell.style.color = uid ? "#0f172a" : "#94a3b8";
      if (uid) row.dataset.lineUid = uid;
    }

    if (changed) saveData(loadDataWithMerged(type, table));
    table.dataset.uidColumnApplying = "";
  }

  function loadDataWithMerged(type, table) {
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    for (const tr of table.querySelectorAll("tbody tr")) {
      const memberNo = normalize(tr.children[0]?.textContent);
      const uid = clean(tr.dataset.lineUid);
      const row = rows.find((item) => normalize(item.memberNo) === memberNo);
      if (row && uid) setLineUid(row, uid);
    }
    return data;
  }

  function applyUidEditor() {
    const form = document.querySelector("#drawer-member");
    if (!form || form.dataset.uidEditorReady === "1") return;
    form.dataset.uidEditorReady = "1";
    const type = form.dataset.type || "";
    const id = clean(form.querySelector('input[name="id"]')?.value);
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    const current = rows.find((row) => clean(row.id) === id) || {};
    const value = getLineUid(current);
    const memberField = form.querySelector('input[name="memberNo"]')?.closest(".field");
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    wrapper.innerHTML = `<label>LINE UID</label><input name="lineUserId" value="${escapeHtml(value)}" placeholder="例如：Ub68b9724664b889e790c789ece72f717">`;
    if (memberField?.nextSibling) form.insertBefore(wrapper, memberField.nextSibling);
    else form.insertBefore(wrapper, form.firstChild);
  }

  function persistEditorUid(form) {
    if (!form || form.id !== "drawer-member") return;
    const type = form.dataset.type || "";
    if (type !== "association" && type !== "vendor") return;
    const formData = new FormData(form);
    const id = clean(formData.get("id"));
    const memberNo = normalize(formData.get("memberNo"));
    const lineUserId = clean(formData.get("lineUserId"));
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    const row = rows.find((item) => clean(item.id) === id) || rows.find((item) => normalize(item.memberNo) === memberNo);
    if (!row) return;
    setLineUid(row, lineUserId);
    saveData(data);
  }

  function persistEditorUidAfterNativeSave(form) {
    const type = form?.dataset?.type || "";
    const formData = new FormData(form);
    const memberNo = normalize(formData.get("memberNo"));
    const lineUserId = clean(formData.get("lineUserId"));
    if (!memberNo || (type !== "association" && type !== "vendor")) return;
    setTimeout(() => {
      const data = loadData();
      const rows = Array.isArray(data[type]) ? data[type] : [];
      const row = rows.find((item) => normalize(item.memberNo) === memberNo);
      if (!row) return;
      setLineUid(row, lineUserId);
      saveData(data);
      uidMapPromise = null;
      scheduleApply();
    }, 0);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function scheduleApply() {
    clearTimeout(scheduleApply.timer);
    scheduleApply.timer = setTimeout(() => {
      const table = findRosterTable();
      if (table && table.dataset.uidColumnReady === "1" && Date.now() - lastAppliedAt < 500) return;
      if (table) table.dataset.uidColumnReady = "1";
      applyUidColumn();
      applyUidEditor();
    }, 180);
  }
  scheduleApply.timer = 0;

  new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => setTimeout(scheduleApply, 80), true);
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-member") return;
    persistEditorUid(form);
    persistEditorUidAfterNativeSave(form);
  }, true);
  window.addEventListener("storage", () => {
    uidMapPromise = null;
    scheduleApply();
  });
  scheduleApply();
})();
