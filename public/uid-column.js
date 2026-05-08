(() => {
  const apiBase = "https://tdeawork.fangwl591021.workers.dev";
  const tokenKey = "tdea-aiwe-read-token";
  let uidMapPromise = null;
  let lastAppliedAt = 0;

  const normalize = (value) => String(value || "").trim().toUpperCase();
  const isAssociationView = () => {
    const title = document.querySelector("h1")?.textContent || "";
    const active = document.querySelector(".active, [aria-current='page']")?.textContent || "";
    return title.includes("協會名冊") || active.includes("協會名冊");
  };

  function displayUid(uid) {
    const value = String(uid || "").trim();
    if (!value) return "-";
    if (value.length <= 22) return value;
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
      if (!response.ok) throw new Error(`AIWE UID 讀取失敗：HTTP ${response.status}`);
      const result = await response.json();
      const map = new Map();
      for (const item of result.data || []) {
        const keys = [item.rosterMemberNo, item.memberNo].map(normalize).filter(Boolean);
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

  function findRosterTable() {
    if (!isAssociationView()) return null;
    return Array.from(document.querySelectorAll("table")).find((table) => {
      const headerText = table.querySelector("thead")?.textContent || "";
      return headerText.includes("會員編號") && headerText.includes("姓名") && headerText.includes("資格");
    }) || null;
  }

  async function applyUidColumn() {
    const table = findRosterTable();
    if (!table || table.dataset.uidColumnReady === "1") return;
    const headerRow = table.querySelector("thead tr");
    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
    if (!headerRow || !bodyRows.length) return;

    table.dataset.uidColumnReady = "1";
    lastAppliedAt = Date.now();

    const th = document.createElement("th");
    th.textContent = "LINE UID";
    headerRow.insertBefore(th, headerRow.children[2] || null);

    for (const row of bodyRows) {
      const td = document.createElement("td");
      td.className = "aiwe-uid-cell";
      td.textContent = "-";
      td.style.fontFamily = "ui-monospace, SFMono-Regular, Consolas, monospace";
      td.style.fontSize = "12px";
      td.style.whiteSpace = "nowrap";
      td.style.color = "#94a3b8";
      row.insertBefore(td, row.children[2] || null);
    }

    const uidMap = await loadUidMap();
    for (const row of bodyRows) {
      const memberNo = normalize(row.children[0]?.textContent);
      const item = uidMap.get(memberNo);
      const uid = item?.lineUserId || "";
      const cell = row.querySelector(".aiwe-uid-cell");
      if (!cell) continue;
      cell.textContent = displayUid(uid);
      cell.title = uid || "登入後顯示 UID";
      cell.style.color = uid ? "#0f172a" : "#94a3b8";
      if (uid) row.dataset.lineUid = uid;
    }
  }

  function scheduleApply() {
    clearTimeout(scheduleApply.timer);
    scheduleApply.timer = setTimeout(() => {
      const table = findRosterTable();
      if (table && table.dataset.uidColumnReady === "1" && Date.now() - lastAppliedAt < 500) return;
      applyUidColumn();
    }, 180);
  }
  scheduleApply.timer = 0;

  new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => setTimeout(scheduleApply, 80), true);
  scheduleApply();
})();
