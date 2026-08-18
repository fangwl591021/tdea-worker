(() => {
  const api = location.hostname.endsWith("github.io")
    ? "https://tdeawork.fangwl591021.workers.dev"
    : "";

  const clean = (value) => String(value ?? "").trim();
  const esc = (value) => clean(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[ch]));
  const normalize = (value) => clean(value).toLowerCase().replace(/\s+/g, "");

  function mergedParams() {
    const output = new URLSearchParams(location.search);
    const rawState = output.get("liff.state");
    if (rawState) {
      try {
        new URLSearchParams(decodeURIComponent(rawState).replace(/^\?/, "")).forEach((value, key) => {
          if (!output.has(key)) output.set(key, value);
        });
      } catch (_) {}
    }
    return output;
  }

  if (!mergedParams().has("checkinModule")) return;

  let rosterPromise = null;
  let debounceTimer = 0;

  async function loadRoster() {
    if (rosterPromise) return rosterPromise;
    rosterPromise = fetch(`${api}/api/roster/live`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || "會員名單讀取失敗");
        return data || {};
      })
      .catch((error) => {
        rosterPromise = null;
        throw error;
      });
    return rosterPromise;
  }

  function associationRecord(row) {
    const list = Array.isArray(row) ? row : [];
    return {
      memberType: "association",
      memberNo: clean(list[0]),
      role: clean(list[1]) || "協會會員",
      name: clean(list[2]),
      gender: clean(list[3]),
      phone: clean(list[6]),
      email: clean(list[7]),
      jobTitle: clean(list[8]),
      company: clean(list[9])
    };
  }

  function vendorRecord(row) {
    const list = Array.isArray(row) ? row : [];
    return {
      memberType: "vendor",
      memberNo: clean(list[0]),
      company: clean(list[1]),
      owner: clean(list[3]),
      name: clean(list[4]) || clean(list[1]),
      role: "廠商會員",
      phone: clean(list[7]),
      email: "",
      jobTitle: ""
    };
  }

  function recordsFor(data, memberType) {
    if (memberType === "vendor") {
      return (Array.isArray(data.v) ? data.v : []).map(vendorRecord).filter((row) => row.memberNo && row.name);
    }
    return (Array.isArray(data.a) ? data.a : []).map(associationRecord).filter((row) => row.memberNo && row.name);
  }

  function searchableText(row) {
    return normalize([
      row.name,
      row.memberNo,
      row.company,
      row.owner,
      row.role,
      row.phone,
      row.email,
      row.jobTitle
    ].filter(Boolean).join(" "));
  }

  function copyText(row) {
    return [
      `姓名：${row.name || ""}`,
      `會員編號：${row.memberNo || ""}`,
      row.phone ? `電話：${row.phone}` : "",
      row.email ? `Email：${row.email}` : "",
      row.company ? `公司：${row.company}` : "",
      row.jobTitle ? `職稱：${row.jobTitle}` : ""
    ].filter(Boolean).join("\n");
  }

  async function copyRecord(row, button) {
    const text = copyText(row);
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    if (button) {
      const previous = button.textContent;
      button.textContent = "已複製";
      setTimeout(() => { button.textContent = previous; }, 1000);
    }
  }

  function installStyle() {
    if (document.getElementById("tdea-member-name-search-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-member-name-search-style";
    style.textContent = `
      .ci-name-search{display:grid;gap:9px;margin-top:3px}
      .ci-name-search-actions{display:grid;grid-template-columns:1fr auto;gap:8px}
      .ci-name-search-btn{min-height:44px;border:0;border-radius:9px;padding:9px 15px;background:#07883f;color:#fff;font-weight:900;cursor:pointer}
      .ci-name-search-status{font-size:13px;color:#667085;line-height:1.5}
      .ci-name-results{display:grid;gap:9px}
      .ci-name-result{border:1px solid #d6e9dd;border-radius:10px;background:#f8fdf9;padding:12px;display:grid;gap:8px}
      .ci-name-result-main{display:grid;gap:3px}
      .ci-name-result-name{font-size:17px;font-weight:900;color:#064e3b}
      .ci-name-result-meta{font-size:13px;color:#475467;line-height:1.55}
      .ci-name-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .ci-name-result-actions button{min-height:40px;border-radius:8px;font-weight:900;cursor:pointer}
      .ci-name-select{border:0;background:#06c755;color:#fff}
      .ci-name-copy{border:1px solid #b9d8c5;background:#fff;color:#067647}
      @media(max-width:560px){.ci-name-search-actions{grid-template-columns:1fr}.ci-name-result-actions{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function selectedMemberType(form) {
    return clean(form?.elements?.memberType?.value).toLowerCase();
  }

  function selectRecord(form, row, resultRoot) {
    const memberNo = form?.elements?.memberNo;
    const name = form?.elements?.name;
    const phone = form?.elements?.phone;
    const email = form?.elements?.email;
    if (memberNo) memberNo.value = row.memberNo || "";
    if (name && row.name) name.value = row.name;
    if (phone && row.phone) phone.value = row.phone;
    if (email && row.email && !clean(email.value)) email.value = row.email;
    resultRoot.dataset.selectedMemberNo = row.memberNo || "";
    resultRoot.querySelectorAll(".ci-name-result").forEach((card) => {
      card.style.outline = card.dataset.memberNo === row.memberNo ? "2px solid #06c755" : "";
    });
    const status = resultRoot.closest(".ci-name-search")?.querySelector("[data-roster-name-status]");
    if (status) status.textContent = `已選擇 ${row.name}（${row.memberNo}），會員編號與電話已自動帶入。`;
  }

  function renderResults(form, root, rows, query) {
    root.innerHTML = "";
    root.dataset.selectedMemberNo = "";
    const status = root.closest(".ci-name-search")?.querySelector("[data-roster-name-status]");
    if (!rows.length) {
      if (status) status.textContent = `找不到「${query}」的會員資料，請確認姓名或改用完整姓名搜尋。`;
      return;
    }
    if (status) status.textContent = `找到 ${rows.length} 筆，請選擇正確會員。`;

    rows.slice(0, 20).forEach((row) => {
      const card = document.createElement("div");
      card.className = "ci-name-result";
      card.dataset.memberNo = row.memberNo;
      card.innerHTML = `
        <div class="ci-name-result-main">
          <div class="ci-name-result-name">${esc(row.name)}</div>
          <div class="ci-name-result-meta">
            會員編號：${esc(row.memberNo)}
            ${row.phone ? `<br>電話：${esc(row.phone)}` : ""}
            ${row.company ? `<br>公司：${esc(row.company)}` : ""}
            ${row.jobTitle ? `<br>職稱：${esc(row.jobTitle)}` : ""}
          </div>
        </div>
        <div class="ci-name-result-actions">
          <button type="button" class="ci-name-select">選擇</button>
          <button type="button" class="ci-name-copy">複製</button>
        </div>`;
      card.querySelector(".ci-name-select")?.addEventListener("click", () => selectRecord(form, row, root));
      card.querySelector(".ci-name-copy")?.addEventListener("click", (event) => copyRecord(row, event.currentTarget));
      root.appendChild(card);
    });
  }

  async function searchRoster(form, searchBox) {
    const memberType = selectedMemberType(form);
    if (memberType !== "association" && memberType !== "vendor") return;
    const query = clean(form.elements.name?.value);
    const status = searchBox.querySelector("[data-roster-name-status]");
    const root = searchBox.querySelector("[data-roster-name-results]");
    if (!query) {
      if (status) status.textContent = "請先輸入姓名。";
      if (root) root.innerHTML = "";
      return;
    }
    if (status) status.textContent = "正在讀取現有會員名單...";
    try {
      const data = await loadRoster();
      const needle = normalize(query);
      const all = recordsFor(data, memberType);
      const exact = all.filter((row) => normalize(row.name) === needle);
      const rows = exact.length ? exact : all.filter((row) => searchableText(row).includes(needle));
      renderResults(form, root, rows, query);
      if (rows.length === 1) selectRecord(form, rows[0], root);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      if (root) root.innerHTML = "";
    }
  }

  function mount(form) {
    if (!form || form.dataset.rosterNameSearchMounted === "1") return;
    form.dataset.rosterNameSearchMounted = "1";
    installStyle();

    const nameInput = form.elements?.name;
    const memberNoInput = form.elements?.memberNo;
    const memberNoField = memberNoInput?.closest?.("[data-member-no-field]") || memberNoInput?.closest?.(".ci-field");
    const nameField = nameInput?.closest?.(".ci-field");
    if (!nameInput || !nameField || !memberNoInput) return;

    const searchBox = document.createElement("div");
    searchBox.className = "ci-name-search";
    searchBox.hidden = true;
    searchBox.innerHTML = `
      <div class="ci-name-search-actions">
        <div class="ci-name-search-status" data-roster-name-status>輸入姓名後會直接搜尋現有會員名單。</div>
        <button class="ci-name-search-btn" type="button" data-roster-name-search>搜尋姓名</button>
      </div>
      <div class="ci-name-results" data-roster-name-results></div>`;
    nameField.appendChild(searchBox);

    function syncMode() {
      const type = selectedMemberType(form);
      const enabled = type === "association" || type === "vendor";
      searchBox.hidden = !enabled;
      if (memberNoField) memberNoField.hidden = true;
      memberNoInput.required = false;
      if (!enabled) {
        memberNoInput.value = "";
        searchBox.querySelector("[data-roster-name-results]").innerHTML = "";
        searchBox.querySelector("[data-roster-name-status]").textContent = "輸入姓名後會直接搜尋現有會員名單。";
      } else if (clean(nameInput.value)) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => searchRoster(form, searchBox), 120);
      }
    }

    form.querySelectorAll('input[name="memberType"]').forEach((radio) => {
      radio.addEventListener("change", syncMode);
    });

    nameInput.addEventListener("input", () => {
      if (selectedMemberType(form) !== "association" && selectedMemberType(form) !== "vendor") return;
      memberNoInput.value = "";
      clearTimeout(debounceTimer);
      if (clean(nameInput.value).length < 2) return;
      debounceTimer = setTimeout(() => searchRoster(form, searchBox), 350);
    });

    searchBox.querySelector("[data-roster-name-search]")?.addEventListener("click", () => searchRoster(form, searchBox));

    form.addEventListener("submit", (event) => {
      const type = selectedMemberType(form);
      if ((type === "association" || type === "vendor") && !clean(memberNoInput.value)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const status = searchBox.querySelector("[data-roster-name-status]");
        if (status) status.textContent = "請先從姓名搜尋結果選擇正確會員。";
        searchRoster(form, searchBox);
      }
    }, true);

    syncMode();
  }

  const observer = new MutationObserver(() => {
    const form = document.querySelector("[data-identity-form]");
    if (form) mount(form);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  mount(document.querySelector("[data-identity-form]"));
})();
