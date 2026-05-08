(() => {
  const storageKey = "tdea-manager-v3";
  let lastAppliedAt = 0;

  const normalize = (value) => String(value || "").trim().toUpperCase();

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

  function applyLoginAccessColumn() {
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

    for (const row of bodyRows) {
      const memberNo = normalize(row.children[0]?.textContent);
      const member = findMember(data, memberNo);
      const td = document.createElement("td");
      td.className = "tdea-login-access-cell";
      td.innerHTML = `<label><input type="checkbox" ${member?.loginAccess ? "checked" : ""}><span>允許</span></label>`;
      const input = td.querySelector("input");
      input.addEventListener("change", () => {
        const fresh = loadData();
        fresh.association ||= [];
        const target = findMember(fresh, memberNo);
        if (target) {
          target.loginAccess = input.checked;
          saveData(fresh);
          window.dispatchEvent(new CustomEvent("tdea:login-access-change", { detail: { memberNo, loginAccess: input.checked } }));
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
  scheduleApply();
})();
