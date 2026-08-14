(() => {
  const PUBLIC_KEYS = [
    "cardCollection", "register", "query", "memberQr", "calendar", "checkin", "redeem",
    "redeemSession", "monthlyDetail", "monthlyShare", "personalMessages", "close", "marquee",
    "motherRegister", "memberHome", "checkinModule"
  ];

  const params = new URLSearchParams(location.search);
  if (PUBLIC_KEYS.some((key) => params.has(key))) return;

  const state = {
    active: false,
    activityKind: "free",
    billingMode: "free",
    posterDataUrl: "",
    posterName: "",
    text: "",
    analyzing: false,
    analysis: null,
    error: "",
    previewPane: "home"
  };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function storedValue(...keys) {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (String(value).trim()) return String(value).trim();
    }
    return "";
  }

  function adminHeaders(extra = {}) {
    const headers = { ...extra };
    const email = storedValue("tdea-admin-email");
    const memberNo = storedValue("tdea-admin-member-no", "tdea-member-no");
    const lineUserId = storedValue("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId");
    if (email) headers["x-admin-email"] = email;
    if (memberNo) headers["x-admin-member-no"] = memberNo;
    if (lineUserId) headers["x-line-user-id"] = lineUserId;
    return headers;
  }

  function analysis() {
    return state.analysis && typeof state.analysis === "object" ? state.analysis : {};
  }

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav) return false;
    let button = nav.querySelector("[data-smart-activity-nav]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.smartActivityNav = "";
      button.title = "智能活動";
      button.innerHTML = `✨ 智能活動 <span class="smart-nav-new">NEW</span>`;
      const creator = nav.querySelector('[data-nav="creator"]');
      if (creator) creator.insertAdjacentElement("afterend", button);
      else nav.appendChild(button);
      button.addEventListener("click", () => {
        state.active = true;
        state.previewPane = "home";
        renderSmartActivity();
      });
    }
    button.classList.toggle("active", state.active);
    return true;
  }

  function unitLabel(unit) {
    return ({ person: "人", room: "間", item: "份／件", ticket: "張", group: "組", fixed: "固定" })[unit] || "單位";
  }

  function displayMode() {
    if (state.activityKind === "free") return "免費活動";
    return state.billingMode === "advanced_paid" ? "進階付費" : "付費活動";
  }

  function dateTimeText(a) {
    if (!a.date && !a.startTime && !a.endTime) return "日期時間待 AI 辨識";
    return [a.date, [a.startTime, a.endTime].filter(Boolean).join("–")].filter(Boolean).join(" ");
  }

  function locationText(a) {
    return [a.venueName, a.address].filter(Boolean).join(" · ") || "活動地點待 AI 辨識";
  }

  function titleText() {
    const a = analysis();
    return a.title || "活動名稱將由 AI 產生";
  }

  function descriptionText() {
    const a = analysis();
    return a.description || state.text.trim() || "上傳活動海報並補充必要資訊，AI 會重新整理成適合報名頁閱讀的活動內容。";
  }

  function priceRows() {
    const a = analysis();
    return Array.isArray(a.pricing) ? a.pricing : [];
  }

  function pricingSummary() {
    if (state.activityKind === "free") return `<div class="smart-preview-price-free">免費參加</div>`;
    const rows = priceRows();
    if (!rows.length) return `<div class="smart-preview-price-pending">費用待 AI 辨識</div>`;
    const amounts = rows.map((row) => Number(row.amount || 0)).filter((value) => value > 0);
    const min = amounts.length ? Math.min(...amounts) : 0;
    return `<div class="smart-preview-price-paid"><span>活動費用</span><strong>${min ? `$${min.toLocaleString("zh-TW")} 起` : "待確認"}</strong></div>`;
  }

  function pricingDetails() {
    if (state.activityKind === "free") {
      return `<div class="smart-sheet-empty"><strong>免費活動</strong><p>本活動目前設定為免費，不顯示付款與價格項目。</p></div>`;
    }
    const rows = priceRows();
    if (!rows.length) {
      return `<div class="smart-sheet-empty"><strong>尚未辨識到價格</strong><p>可以在左側補充會員價、非會員價、住宿、餐點或其他費用，再重新 AI 生成。</p></div>`;
    }
    return `<div class="smart-sheet-price-list">${rows.map((row) => `
      <div class="smart-sheet-price-row">
        <div><strong>${esc(row.name || "費用項目")}</strong><span>${esc(unitLabel(row.unit))}計價${row.required ? " · 必選" : " · 選配"}</span></div>
        <b>$${Number(row.amount || 0).toLocaleString("zh-TW")} / ${esc(unitLabel(row.unit))}</b>
      </div>`).join("")}</div>`;
  }

  function registrationForm() {
    const a = analysis();
    const fields = Array.isArray(a.registrationFields) && a.registrationFields.length ? a.registrationFields : ["姓名", "手機"];
    return `
      <div class="smart-sheet-form">
        ${fields.slice(0, 8).map((field) => `<label><span>${esc(field)}</span><input type="text" placeholder="請輸入${esc(field)}" disabled></label>`).join("")}
      </div>
      ${state.activityKind === "paid" ? `<div class="smart-sheet-order-summary"><span>應付金額</span><strong>${priceRows().length ? "依選擇方案計算" : "待確認"}</strong></div>` : ""}
      <button class="smart-sheet-submit" type="button" disabled>確認報名（預覽）</button>`;
  }

  function previewSheet() {
    const a = analysis();
    if (state.previewPane === "home") return "";
    let title = "活動內容";
    let body = `
      <div class="smart-sheet-copy">${esc(descriptionText())}</div>
      <div class="smart-sheet-meta">
        <div><span>日期時間</span><strong>${esc(dateTimeText(a))}</strong></div>
        <div><span>活動地點</span><strong>${esc(locationText(a))}</strong></div>
        <div><span>活動名額</span><strong>${a.capacity ? `${Number(a.capacity).toLocaleString("zh-TW")} 人` : "待確認"}</strong></div>
      </div>`;
    if (state.previewPane === "pricing") {
      title = state.activityKind === "free" ? "活動費用" : "費用方案";
      body = pricingDetails();
    }
    if (state.previewPane === "register") {
      title = "報名資料";
      body = registrationForm();
    }
    return `
      <div class="smart-preview-sheet" data-smart-preview-sheet>
        <div class="smart-sheet-head"><strong>${esc(title)}</strong><button type="button" data-smart-preview-close>關閉</button></div>
        <div class="smart-sheet-body">${body}</div>
      </div>`;
  }

  function previewMarkup() {
    const a = analysis();
    const provider = a.providerUsed ? (a.providerUsed === "openai" ? "OpenAI 備援" : "Gemini") : "尚未生成";
    const poster = state.posterDataUrl
      ? `<img src="${esc(state.posterDataUrl)}" alt="活動海報">`
      : `<div class="smart-preview-poster-empty">活動海報預覽</div>`;

    return `
      <div class="smart-preview-stage">
        <div class="smart-preview-stage-head">
          <div><strong>實際預覽</strong><span>右側按鈕可直接操作，查看報名者點下去會看到的內容。</span></div>
          <span class="smart-preview-live">互動預覽</span>
        </div>

        <article class="smart-preview-phone">
          <div class="smart-preview-poster">${poster}</div>
          <div class="smart-preview-content">
            <div class="smart-preview-kicker">${esc(displayMode())}${state.analysis ? ` · ${esc(provider)}` : ""}</div>
            <h2>${esc(titleText())}</h2>
            <div class="smart-preview-meta-line"><span>${esc(dateTimeText(a))}</span></div>
            <div class="smart-preview-meta-line"><span>${esc(locationText(a))}</span></div>
            ${pricingSummary()}
            <p class="smart-preview-summary">${esc(descriptionText())}</p>

            <div class="smart-preview-buttons">
              <button type="button" data-smart-preview-action="details">活動內容</button>
              <button type="button" data-smart-preview-action="pricing">${state.activityKind === "free" ? "活動費用" : "費用方案"}</button>
              <button class="primary" type="button" data-smart-preview-action="register">立即報名</button>
            </div>
          </div>
          ${previewSheet()}
        </article>

        <div class="smart-preview-footnote">
          ${state.analysis ? `AI 已生成 · 信心 ${Math.round((Number(a.confidence) || 0) * 100)}%` : "尚未 AI 生成，目前顯示版型預覽"}
          <span>不會送出正式報名</span>
        </div>
      </div>`;
  }

  function renderSmartActivity() {
    const main = document.querySelector(".main");
    if (!main) return;
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    document.querySelector("[data-smart-activity-nav]")?.classList.add("active");

    main.innerHTML = `
      <div class="topbar smart-topbar">
        <div><h1>智能活動</h1><div class="subtitle">左邊輸入，右邊直接看最後報名頁。</div></div>
        <div class="actions"><span class="smart-activity-version">V2 Split Preview</span></div>
      </div>

      <section class="smart-workbench" data-smart-activity-root>
        <aside class="smart-builder-panel">
          <div class="smart-builder-section">
            <label class="smart-builder-label">1. 先選活動模式</label>
            <div class="smart-kind-switch">
              <button class="${state.activityKind === "free" ? "active" : ""}" type="button" data-smart-kind="free"><strong>免費</strong><span>不收費，直接報名</span></button>
              <button class="${state.activityKind === "paid" ? "active" : ""}" type="button" data-smart-kind="paid"><strong>付費</strong><span>AI 再判斷票價與加購</span></button>
            </div>
          </div>

          <div class="smart-builder-section">
            <label class="smart-builder-label">2. 上傳活動海報</label>
            <div class="smart-upload-box ${state.posterDataUrl ? "has-file" : ""}" data-smart-poster-drop>
              <input type="file" accept="image/*" data-smart-poster-input aria-label="上傳活動海報">
              <strong>${state.posterName ? esc(state.posterName) : "點擊或拖曳活動海報到這裡"}</strong>
              <span>${state.posterName ? "已選擇圖片，可重新上傳替換" : "JPG、PNG、WEBP，建議 6MB 以內"}</span>
            </div>
            ${state.posterDataUrl ? `<button class="smart-text-button" type="button" data-smart-remove-poster>移除海報</button>` : ""}
          </div>

          <div class="smart-builder-section">
            <label class="smart-builder-label" for="smartActivityText">3. 文字補充</label>
            <textarea id="smartActivityText" class="smart-builder-textarea" maxlength="1500" data-smart-text placeholder="補充海報沒有寫清楚的資訊，例如：名額 80 人、會員可攜伴、會員價 500 元、非會員 800 元、採匯款付款。">${esc(state.text)}</textarea>
            <div class="smart-builder-count"><span>AI 會把海報＋這段文字重新整理成報名頁</span><span data-smart-text-count>${state.text.length} / 1500</span></div>
          </div>

          <div class="smart-builder-section smart-ai-section">
            <button class="smart-ai-button" type="button" data-smart-generate ${state.analyzing ? "disabled" : ""}>${state.analyzing ? "AI 生成中…" : "AI 生成活動"}</button>
            <p>Gemini 主引擎；失敗時使用 OpenAI 備援。只更新右側預覽，不寫入原本活動。</p>
            ${state.error ? `<div class="smart-builder-error">${esc(state.error)}</div>` : ""}
            ${state.analysis ? `<div class="smart-builder-success">AI 已完成，可繼續修改左側內容後再次生成。</div>` : ""}
          </div>
        </aside>

        <main class="smart-preview-panel">${previewMarkup()}</main>
      </section>
      <div class="smart-activity-toast" data-smart-toast></div>
    `;

    bindSmartActivity();
  }

  function showToast(message) {
    const toast = document.querySelector("[data-smart-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function setPoster(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("請選擇圖片檔案");
    if (file.size > 6 * 1024 * 1024) return showToast("活動海報請先控制在 6MB 以內");
    const reader = new FileReader();
    reader.onload = () => {
      state.posterDataUrl = String(reader.result || "");
      state.posterName = file.name || "活動海報";
      state.analysis = null;
      state.error = "";
      state.previewPane = "home";
      renderSmartActivity();
    };
    reader.onerror = () => showToast("海報讀取失敗，請重新選擇");
    reader.readAsDataURL(file);
  }

  function modePrompt() {
    return state.activityKind === "free"
      ? "【使用者已先指定：這是免費活動。billingMode 必須為 free，pricing 必須為空陣列，paymentRequired 必須為 false。】"
      : "【使用者已先指定：這是付費活動。billingMode 不可為 free；請依海報判斷 simple_paid 或 advanced_paid，並拆開不同計價項目。】";
  }

  async function analyzeActivity() {
    if (state.analyzing) return;
    if (!state.posterDataUrl && !state.text.trim()) return showToast("請先上傳海報，或輸入文字補充");
    state.analyzing = true;
    state.error = "";
    renderSmartActivity();
    try {
      const response = await fetch("/api/smart-activities/analyze", {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ posterDataUrl: state.posterDataUrl, text: `${modePrompt()}\n${state.text}`.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || `AI 分析失敗 HTTP ${response.status}`);
      const next = result.data || {};
      if (state.activityKind === "free") {
        next.billingMode = "free";
        next.pricing = [];
        next.paymentRequired = false;
      } else if (next.billingMode === "free") {
        next.billingMode = "simple_paid";
      }
      state.analysis = next;
      state.billingMode = next.billingMode || (state.activityKind === "free" ? "free" : "simple_paid");
      state.previewPane = "home";
      state.error = "";
      showToast(`AI 生成完成：${next.providerUsed === "openai" ? "OpenAI 備援" : "Gemini"}`);
    } catch (error) {
      state.error = error?.message || "AI 生成失敗";
    } finally {
      state.analyzing = false;
      renderSmartActivity();
    }
  }

  function bindSmartActivity() {
    document.querySelectorAll("[data-smart-kind]").forEach((button) => button.addEventListener("click", () => {
      state.activityKind = button.dataset.smartKind === "paid" ? "paid" : "free";
      state.billingMode = state.activityKind === "free" ? "free" : "simple_paid";
      state.analysis = null;
      state.error = "";
      state.previewPane = "home";
      renderSmartActivity();
    }));

    const input = document.querySelector("[data-smart-poster-input]");
    const drop = document.querySelector("[data-smart-poster-drop]");
    if (input) input.onchange = () => setPoster(input.files?.[0]);
    if (drop) {
      drop.ondragover = (event) => { event.preventDefault(); drop.classList.add("is-dragging"); };
      drop.ondragleave = () => drop.classList.remove("is-dragging");
      drop.ondrop = (event) => {
        event.preventDefault();
        drop.classList.remove("is-dragging");
        setPoster(event.dataTransfer?.files?.[0]);
      };
    }

    document.querySelector("[data-smart-remove-poster]")?.addEventListener("click", () => {
      state.posterDataUrl = "";
      state.posterName = "";
      state.analysis = null;
      state.error = "";
      state.previewPane = "home";
      renderSmartActivity();
    });

    const textarea = document.querySelector("[data-smart-text]");
    if (textarea) textarea.oninput = () => {
      state.text = textarea.value || "";
      state.analysis = null;
      const count = document.querySelector("[data-smart-text-count]");
      if (count) count.textContent = `${state.text.length} / 1500`;
    };

    document.querySelector("[data-smart-generate]")?.addEventListener("click", analyzeActivity);

    document.querySelectorAll("[data-smart-preview-action]").forEach((button) => button.addEventListener("click", () => {
      state.previewPane = button.dataset.smartPreviewAction || "home";
      renderSmartActivity();
    }));
    document.querySelector("[data-smart-preview-close]")?.addEventListener("click", () => {
      state.previewPane = "home";
      renderSmartActivity();
    });
  }

  document.addEventListener("click", (event) => {
    const legacyNav = event.target.closest?.("[data-nav]");
    if (legacyNav) state.active = false;
  }, true);

  let refreshQueued = false;
  function refreshIntegration() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      if (!ensureNav()) return;
      if (state.active && !document.querySelector("[data-smart-activity-root]")) renderSmartActivity();
    });
  }

  new MutationObserver(refreshIntegration).observe(document.documentElement, { childList: true, subtree: true });
  refreshIntegration();
})();
