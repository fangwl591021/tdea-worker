(() => {
  const apiBase = "https://tdeawork.fangwl591021.workers.dev";
  const storageKey = "tdea-manager-v3";
  const tokenKey = "tdea-aiwe-read-token";
  let uidMapPromise = null;
  let lastAppliedAt = 0;

  const normalize = (value) => String(value || "").trim().toUpperCase();
  const clean = (value) => String(value || "").trim();
  const isLineUid = (value) => /^U[0-9a-f]{32}$/i.test(clean(value));
  const isSyntheticAiweEmail = (value) => /^U[0-9a-f]{32}@aiwe\./i.test(clean(value));
  const validLineUid = (value) => {
    const uid = clean(value);
    return isLineUid(uid) ? uid : "";
  };
  const lineUidOf = (item) => validLineUid(item?.lineUserId || item?.uid || item?.LINE_user_id || item?.line_user_id);
  const aiweMemberNoOf = (item) => clean(item?.aiweMemberNo || item?.motherMemberNo || item?.memberNo || item?.member_no);
  const emailOf = (item) => clean(item?.email || item?.mail || item?.userEmail);
  const phoneOf = (item) => clean(item?.phone || item?.mobile || item?.tel);
  const companyOf = (item) => clean(item?.companyName || item?.company || item?.unit);

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
    return validLineUid(row?.lineUserId || row?.lineUid || row?.uid || row?.LINE_user_id || row?.line_user_id);
  }

  function setLineUid(row, uid) {
    if (!row) return;
    row.lineUserId = clean(uid);
    delete row.lineUid;
    delete row.uid;
    delete row.LINE_user_id;
    delete row.line_user_id;
  }

  function bestProfileValue(localValue, remoteValue, field) {
    const local = clean(localValue);
    const remote = clean(remoteValue);
    if (!remote) return local;
    if (field === "email") {
      if (local && !isSyntheticAiweEmail(local)) return local;
      if (isSyntheticAiweEmail(remote) && local) return local;
    } else if (local) {
      return local;
    }
    return remote;
  }

  function mergeProfileFields(row, remote) {
    if (!row || !remote) return 0;
    let count = 0;
    const before = JSON.stringify({
      aiweMemberNo: row.aiweMemberNo,
      email: row.email,
      phone: row.phone,
      company: row.company,
      companyName: row.companyName
    });
    row.aiweMemberNo = bestProfileValue(row.aiweMemberNo, aiweMemberNoOf(remote), "memberNo");
    row.email = bestProfileValue(row.email, emailOf(remote), "email");
    row.phone = bestProfileValue(row.phone, phoneOf(remote), "phone");
    const company = companyOf(remote);
    if (company) {
      if (!clean(row.company)) row.company = company;
      if (!clean(row.companyName)) row.companyName = company;
    }
    if (JSON.stringify({
      aiweMemberNo: row.aiweMemberNo,
      email: row.email,
      phone: row.phone,
      company: row.company,
      companyName: row.companyName
    }) !== before) {
      row.aiweSyncedAt = new Date().toISOString();
      count = 1;
    }
    return count;
  }

  function displayUid(uid) {
    const value = clean(uid);
    if (!value) return "";
    if (value.length <= 24) return value;
    return `${value.slice(0, 10)}...${value.slice(-8)}`;
  }

  function getToken() {
    return sessionStorage.getItem(tokenKey) || "";
  }

  function adminEmail() {
    return sessionStorage.getItem("tdea-admin-email") || localStorage.getItem("tdea-admin-email") || "";
  }

  async function loadUidMap() {
    if (uidMapPromise) return uidMapPromise;
    uidMapPromise = (async () => {
      const token = getToken();
      const email = adminEmail();
      if (!token && !email) return new Map();
      const response = await fetch(`${apiBase}/api/aiwe-members-public`, {
        headers: email ? { "x-admin-email": email } : { "x-aiwe-token": token },
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
        const uid = lineUidOf(item);
        if (!uid) continue;
        const keys = [item.rosterMemberNo, item.memberNo, item.member_no].map(normalize).filter(Boolean);
        for (const key of keys) {
          const current = map.get(key);
          const currentUid = lineUidOf(current);
          if (current && currentUid && currentUid !== uid) {
            map.set(key, { ...current, __uidConflict: true });
            continue;
          }
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

  async function loadAiweRows() {
    const token = getToken();
    const email = adminEmail();
    if (!token && !email) throw new Error("請先以管理者身份進入後台");
    const response = await fetch(`${apiBase}/api/aiwe-members-public`, {
      headers: email ? { "x-admin-email": email } : { "x-aiwe-token": token },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `母站 UID 讀取失敗 HTTP ${response.status}`);
    return Array.isArray(result.data) ? result.data : [];
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

  function ensureSyncButton() {
    const type = activeRosterType();
    if (!type) return;
    const actions = document.querySelector(".page-actions, .actions") || document.querySelector("header .actions");
    const panelHead = Array.from(document.querySelectorAll(".panel-head")).find((node) => node.textContent.includes(type === "vendor" ? "廠商" : "協會"));
    const host = actions || panelHead;
    if (!host || host.querySelector("[data-sync-aiwe-uid]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.dataset.syncAiweUid = type;
    button.textContent = "同步母站 UID";
    host.prepend(button);
  }

  function findLocalRoster(type, memberNo) {
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    return { data, rows, row: rows.find((item) => normalize(item.memberNo) === memberNo) };
  }

  function makeProfileCell(className, value = "") {
    const td = document.createElement("td");
    td.className = className;
    td.textContent = value;
    td.style.fontSize = "12px";
    td.style.whiteSpace = "nowrap";
    td.style.color = "#475569";
    return td;
  }

  function ensureProfileHeaders(table) {
    const headerRow = table.querySelector("thead tr");
    if (!headerRow || headerRow.dataset.aiweProfileHeaders === "1") return;
    const headers = [
      ["LINE UID", "aiwe-uid-head"],
      ["母站帳號", "aiwe-member-head"],
      ["Email", "aiwe-email-head"],
      ["手機", "aiwe-phone-head"]
    ];
    headers.slice().reverse().forEach(([label, className]) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.className = className;
      headerRow.insertBefore(th, headerRow.children[2] || null);
    });
    for (const row of table.querySelectorAll("tbody tr")) {
      [
        makeProfileCell("aiwe-phone-cell"),
        makeProfileCell("aiwe-email-cell"),
        makeProfileCell("aiwe-member-cell"),
        makeProfileCell("aiwe-uid-cell")
      ].forEach((td) => row.insertBefore(td, row.children[2] || null));
    }
    headerRow.dataset.aiweProfileHeaders = "1";
  }

  async function applyUidColumn() {
    const type = activeRosterType();
    const table = findRosterTable();
    if (!type || !table) return;
    if (table.dataset.uidColumnApplying === "1") return;
    table.dataset.uidColumnApplying = "1";
    lastAppliedAt = Date.now();

    ensureProfileHeaders(table);
    const uidMap = await loadUidMap();
    const data = loadData();
    const localRows = Array.isArray(data[type]) ? data[type] : [];
    let changed = false;

    for (const row of table.querySelectorAll("tbody tr")) {
      const memberNo = normalize(row.children[0]?.textContent);
      if (!memberNo) continue;
      const cell = row.querySelector(".aiwe-uid-cell");
      if (!cell) continue;
      const localRow = localRows.find((item) => normalize(item.memberNo) === memberNo);
      const remote = uidMap.get(memberNo);
      const remoteUid = remote?.__uidConflict ? "" : lineUidOf(remote);
      let uid = getLineUid(localRow);
      if (!uid && remoteUid && localRow) {
        uid = remoteUid;
        setLineUid(localRow, uid);
        changed = true;
      }
      if (remote && localRow && !remote.__uidConflict) {
        changed = Boolean(mergeProfileFields(localRow, remote)) || changed;
      }
      cell.textContent = displayUid(uid);
      cell.title = uid || "尚未匹配 LINE UID";
      cell.style.color = uid ? "#0f172a" : "#94a3b8";
      if (uid) row.dataset.lineUid = uid;
      const memberCell = row.querySelector(".aiwe-member-cell");
      const emailCell = row.querySelector(".aiwe-email-cell");
      const phoneCell = row.querySelector(".aiwe-phone-cell");
      if (memberCell) memberCell.textContent = clean(localRow?.aiweMemberNo || aiweMemberNoOf(remote));
      if (emailCell) emailCell.textContent = clean(localRow?.email || emailOf(remote));
      if (phoneCell) phoneCell.textContent = clean(localRow?.phone || phoneOf(remote));
    }

    if (changed) saveData(data);
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

  function mergeUidIntoRoster(rows, aiweRows, type) {
    const byMemberNo = new Map();
    const byName = new Map();
    for (const item of aiweRows) {
      const itemType = clean(item.rosterType) === "vendor" ? "vendor" : "association";
      if (itemType !== type) continue;
      const uid = lineUidOf(item);
      if (!uid) continue;
      const memberNo = normalize(item.rosterMemberNo || item.memberNo || item.member_no);
      const name = normalize(type === "vendor" ? (item.companyName || item.rosterName) : item.rosterName);
      if (memberNo) {
        const current = byMemberNo.get(memberNo);
        const currentUid = lineUidOf(current?.item || current);
        if (current && currentUid && currentUid !== uid) {
          byMemberNo.set(memberNo, { item: current.item || current, conflict: true });
        } else if (!current) {
          byMemberNo.set(memberNo, { item, conflict: false });
        }
      }
      if (name) {
        const current = byName.get(name);
        const currentUid = lineUidOf(current?.item || current);
        if (current && currentUid && currentUid !== uid) {
          byName.set(name, { item: current.item || current, conflict: true });
        } else if (!current) {
          byName.set(name, { item, conflict: false });
        }
      }
    }

    const report = { total: rows.length, matched: 0, written: 0, profileWritten: 0, skipped: 0, conflicts: 0, missing: 0, suspicious: 0 };
    for (const row of rows) {
      const memberNo = normalize(row.memberNo);
      const name = normalize(type === "vendor" ? row.companyName : row.name);
      const currentUid = getLineUid(row);
      const matchedRecord = memberNo ? byMemberNo.get(memberNo) : null;
      if (!matchedRecord && name && byName.has(name)) {
        report.suspicious += 1;
        continue;
      }
      if (!matchedRecord) {
        report.missing += 1;
        continue;
      }
      if (matchedRecord.conflict) {
        report.conflicts += 1;
        continue;
      }
      const matched = matchedRecord.item || matchedRecord;
      const uid = lineUidOf(matched);
      if (!uid) {
        report.missing += 1;
        continue;
      }
      report.matched += 1;
      if (currentUid && currentUid !== uid) {
        report.conflicts += 1;
        continue;
      }
      if (currentUid === uid) {
        report.profileWritten += mergeProfileFields(row, matched);
        report.skipped += 1;
        continue;
      }
      setLineUid(row, uid);
      report.profileWritten += mergeProfileFields(row, matched);
      report.written += 1;
    }
    return report;
  }

  async function syncAiweUid(type) {
    const data = loadData();
    data.association ||= [];
    data.vendor ||= [];
    const aiweRows = await loadAiweRows();
    const targets = type === "all" ? ["association", "vendor"] : [type];
    const reports = {};
    for (const target of targets) {
      reports[target] = mergeUidIntoRoster(data[target] || [], aiweRows, target);
    }
    data.uidSyncLog ||= [];
    data.uidSyncLog.unshift({ at: new Date().toISOString(), reports });
    data.uidSyncLog = data.uidSyncLog.slice(0, 30);
    saveData(data);
    uidMapPromise = null;
    window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
    scheduleApply();
    const lines = targets.map((target) => {
      const r = reports[target];
      return `${target === "vendor" ? "廠商" : "協會"}：匹配 ${r.matched}，UID 寫入 ${r.written}，資料補齊 ${r.profileWritten}，已存在 ${r.skipped}，衝突 ${r.conflicts}，未找到 ${r.missing}，姓名疑似 ${r.suspicious}`;
    });
    alert(`母站資料同步完成\n${lines.join("\n")}`);
  }

  async function applyUidEditor() {
    const form = document.querySelector("#drawer-member");
    if (!form || form.dataset.uidEditorReady === "1") return;
    form.dataset.uidEditorReady = "1";
    const type = form.dataset.type || "";
    const id = clean(form.querySelector('input[name="id"]')?.value);
    const memberNo = normalize(form.querySelector('input[name="memberNo"]')?.value);
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    const current = rows.find((row) => clean(row.id) === id) || rows.find((row) => normalize(row.memberNo) === memberNo) || {};
    let value = getLineUid(current);
    if (!value && memberNo) {
      const uidMap = await loadUidMap();
      const remote = uidMap.get(memberNo);
      value = clean(remote?.lineUserId || remote?.uid || remote?.LINE_user_id);
      if (value && current) {
        setLineUid(current, value);
        saveData(data);
      }
    }
    const memberField = form.querySelector('input[name="memberNo"]')?.closest(".field");
    const wrapper = document.createElement("div");
    wrapper.className = "aiwe-profile-grid";
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    wrapper.style.gap = "14px";
    wrapper.innerHTML = `
      <div class="field"><label>LINE UID</label><input name="lineUserId" value="${escapeHtml(value)}" placeholder="例如：Ub68b9724664b889e790c789ece72f717"></div>
      <div class="field"><label>母站帳號</label><input name="aiweMemberNo" value="${escapeHtml(current.aiweMemberNo || "")}" placeholder="母站會員帳號"></div>
      <div class="field"><label>Email</label><input name="email" value="${escapeHtml(current.email || "")}" placeholder="會員 Email"></div>
      <div class="field"><label>手機</label><input name="phone" value="${escapeHtml(current.phone || "")}" placeholder="手機"></div>`;
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
    const aiweMemberNo = clean(formData.get("aiweMemberNo"));
    const email = clean(formData.get("email"));
    const phone = clean(formData.get("phone"));
    const data = loadData();
    const rows = Array.isArray(data[type]) ? data[type] : [];
    const row = rows.find((item) => clean(item.id) === id) || rows.find((item) => normalize(item.memberNo) === memberNo);
    if (!row) return;
    setLineUid(row, lineUserId);
    row.aiweMemberNo = aiweMemberNo;
    row.email = email;
    row.phone = phone;
    saveData(data);
  }

  function persistEditorUidAfterNativeSave(form) {
    const type = form?.dataset?.type || "";
    const formData = new FormData(form);
    const memberNo = normalize(formData.get("memberNo"));
    const lineUserId = clean(formData.get("lineUserId"));
    const aiweMemberNo = clean(formData.get("aiweMemberNo"));
    const email = clean(formData.get("email"));
    const phone = clean(formData.get("phone"));
    if (!memberNo || (type !== "association" && type !== "vendor")) return;
    setTimeout(() => {
      const data = loadData();
      const rows = Array.isArray(data[type]) ? data[type] : [];
      const row = rows.find((item) => normalize(item.memberNo) === memberNo);
      if (!row) return;
      setLineUid(row, lineUserId);
      row.aiweMemberNo = aiweMemberNo;
      row.email = email;
      row.phone = phone;
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
      ensureSyncButton();
      applyUidColumn();
      applyUidEditor();
    }, 180);
  }
  scheduleApply.timer = 0;

  new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => setTimeout(scheduleApply, 80), true);
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-sync-aiwe-uid]");
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "同步中...";
    syncAiweUid(button.dataset.syncAiweUid || activeRosterType()).catch((error) => {
      alert(error.message || "同步母站 UID 失敗");
    }).finally(() => {
      button.disabled = false;
      button.textContent = oldText;
    });
  }, true);
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
