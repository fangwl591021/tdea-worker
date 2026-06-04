(() => {
  const storageKey = "tdea-manager-v3";
  const adminKey = "tdea-admin-email";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  let lastAppliedAt = 0;
  let accessMap = null;
  let accessLoadedAt = 0;

  const normalize = (value) => String(value || "").trim().toUpperCase();
  const clean = (value) => String(value || "").trim();
  const isNonRosterDomRow = (row) => {
    const first = normalize(row?.children?.[0]?.textContent);
    const second = normalize(row?.children?.[1]?.textContent);
    const text = clean(row?.textContent);
    if (/^TDEA/.test(first) || /^TDEA/.test(second)) return true;
    if (/TDEA/.test(first + second) && /LIFF|LINE|跑馬燈|個人訊息|關鍵字/.test(text)) return true;
    return false;
  };

  function adminEmail() {
    return sessionStorage.getItem(adminKey) || localStorage.getItem(adminKey) || "";
  }

  function toast(message) {
    if (typeof window.toast === "function") return window.toast(message);
    alert(message);
  }

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

  async function loadAccess(force = false) {
    const now = Date.now();
    if (!force && accessMap && now - accessLoadedAt < 30000) return accessMap;
    accessMap = new Map();
    accessLoadedAt = now;
    const email = adminEmail();
    if (!email) return accessMap;

    const response = await fetch(`${api}/api/admin-access`, {
      headers: { "x-admin-email": email },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "登入權限載入失敗");

    const records = result.data && typeof result.data === "object" ? result.data : {};
    Object.values(records).forEach((record) => {
      const memberNo = normalize(record?.memberNo);
      if (memberNo) accessMap.set(memberNo, record);
    });
    return accessMap;
  }

  async function updateAccess(member, memberNo, loginAccess) {
    const email = adminEmail();
    if (!email) throw new Error("Missing current admin email");
    const targetEmail = clean(member?.email || member?.Email || member?.mail || member?.user_email);
    const targetLineUserId = clean(member?.lineUserId || member?.lineUid || member?.uid || member?.LINE_user_id || member?.line_user_id);

    const response = await fetch(`${api}/api/admin-access`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify({
        memberNo,
        email: targetEmail,
        lineUserId: targetLineUserId,
        name: clean(member?.name || member?.displayName || member?.memberName),
        loginAccess
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Failed to update login access");
    accessMap = null;
    await loadAccess(true);
    return result.data;
  }

  function findAssociationTable() {
    const title = document.querySelector("h1")?.textContent || "";
    const active = document.querySelector(".active, [aria-current='page']")?.textContent || "";
    if (!title.includes("協會名冊") && !active.includes("協會名冊")) return null;
    return Array.from(document.querySelectorAll("table")).find((table) => {
      const headerText = table.querySelector("thead")?.textContent || "";
      return headerText.includes("會員編號") && headerText.includes("姓名") && headerText.includes("資格");
    }) || null;
  }

  function findInsertIndex(headerCells) {
    const qualificationIndex = headerCells.findIndex((cell) => cell.textContent.includes("資格"));
    return qualificationIndex >= 0 ? qualificationIndex + 1 : Math.min(5, headerCells.length);
  }

  function findMember(data, memberNo) {
    const rows = Array.isArray(data.association) ? data.association : [];
    return rows.find((row) => normalize(row.memberNo) === memberNo);
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-login-access-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-login-access-style";
    style.textContent = `
      .tdea-login-access-cell label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        white-space: nowrap;
      }
      .tdea-login-access-cell input {
        width: 18px;
        height: 18px;
        accent-color: #06c755;
      }
    `;
    document.head.appendChild(style);
  }

  async function applyLoginAccessColumn() {
    const table = findAssociationTable();
    if (!table || table.dataset.loginAccessReady === "1") return;
    const headerRow = table.querySelector("thead tr");
    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
    if (!headerRow || !bodyRows.length) return;

    ensureStyles();
    table.dataset.loginAccessReady = "1";
    lastAppliedAt = Date.now();

    const headerCells = Array.from(headerRow.children);
    const insertIndex = findInsertIndex(headerCells);
    const th = document.createElement("th");
    th.textContent = "登入權限";
    headerRow.insertBefore(th, headerRow.children[insertIndex] || null);

    const data = loadData();
    data.association ||= [];
    let remoteAccess = new Map();
    try {
      remoteAccess = await loadAccess();
    } catch (error) {
      console.warn(error);
      toast(error.message || "登入權限載入失敗");
    }

    for (const row of bodyRows) {
      if (isNonRosterDomRow(row)) {
        row.remove();
        continue;
      }
      const memberNo = normalize(row.children[0]?.textContent);
      const member = findMember(data, memberNo);
      const remote = remoteAccess.get(memberNo);
      const checked = remote ? remote.loginAccess === true : member?.loginAccess === true;
      const td = document.createElement("td");
      td.className = "tdea-login-access-cell";
      td.innerHTML = `<label><input type="checkbox" ${checked ? "checked" : ""}><span>允許</span></label>`;
      const input = td.querySelector("input");
      input.addEventListener("change", async () => {
        const previous = !input.checked;
        input.disabled = true;
        try {
          const fresh = loadData();
          fresh.association ||= [];
          const target = findMember(fresh, memberNo) || member || { memberNo };
          const record = await updateAccess(target, memberNo, input.checked);
          target.loginAccess = input.checked;
          if (record?.email) target.email = record.email;
          if (!findMember(fresh, memberNo)) fresh.association.push(target);
          saveData(fresh);
          window.dispatchEvent(new CustomEvent("tdea:login-access-change", { detail: { memberNo, loginAccess: input.checked } }));
          toast(input.checked ? "已授予後台登入權限" : "已取消後台登入權限");
        } catch (error) {
          input.checked = previous;
          toast(error.message || "登入權限更新失敗");
        } finally {
          input.disabled = false;
        }
      });
      row.insertBefore(td, row.children[insertIndex] || null);
    }
  }

  function scheduleApply() {
    clearTimeout(scheduleApply.timer);
    scheduleApply.timer = setTimeout(() => {
      const table = findAssociationTable();
      if (table && table.dataset.loginAccessReady === "1" && Date.now() - lastAppliedAt < 500) return;
      applyLoginAccessColumn();
    }, 160);
  }
  scheduleApply.timer = 0;

  new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => setTimeout(scheduleApply, 80), true);
  window.addEventListener("storage", () => {
    accessMap = null;
    scheduleApply();
  });
  scheduleApply();
})();
