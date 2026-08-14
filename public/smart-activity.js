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
    posterDataUrl: "",
    posterName: "",
    text: "",
    previewVisible: false,
    billingMode: "free",
    analyzing: false,
    analysis: null,
    error: ""
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

  function posterHtml(className = "") {
    if (!state.posterDataUrl) return "";
    return `<img class="${className}" src="${esc(state.posterDataUrl)}" alt="活動海報預覽">`;
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
        renderSmartActivity();
      });
    }
    button.classList.toggle("active", state.active);
    return true;
  }

  function renderSmartActivity() {
    const main = document.querySelector(".main");
    if (!main) return;
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    document.querySelector("[data-smart-activity-nav]")?.classList.add("active");

    main.innerHTML = `
      <div class="topbar">
        <div>
          <h1>✨ 智能活動</h1>
          <div class="subtitle">上傳海報或補充文字，AI 自動分析並產生活動報名頁預覽。</div>
        </div>
        <div class="actions"><span class="smart-activity-version">V1-B AI 分析</span></div>
      </div>

      <section class="smart-activity-shell" data-smart-activity-root>
        <div class="smart-activity-notice">
          <div>
            <strong>AI 只產生智能活動預覽，不會寫入原本活動。</strong>
            <span>分析走獨立 /api/smart-activities/analyze；目前仍不呼叫 /api/activities，不影響既有創建活動、報名、付款或 QR 核銷。</span>
          </div>
          <span class="smart-activity-version">SAFE MODE</span>
        </div>

        <div class="smart-activity-input-grid">
          <section class="smart-activity-panel">
            <div class="smart-activity-panel-head">
              <span class="smart-activity-step">1</span><h2>上傳活動海報</h2>
              <p>上傳後可直接按「AI 分析海報」，系統會辨識活動名稱、日期、地點、費用與計價模式。</p>
            </div>
            <div class="smart-activity-panel-body">
              <div class="smart-poster-drop ${state.posterDataUrl ? "has-image" : ""}" data-smart-poster-drop>
                <input type="file" accept="image/*" data-smart-poster-input aria-label="上傳活動海報">
                <div class="smart-poster-placeholder">
                  <div class="smart-poster-icon">↑</div>
                  <strong>拖曳或點擊上傳海報</strong>
                  <span>JPG、PNG、WEBP，建議 6MB 以內</span>
                </div>
                ${posterHtml("smart-poster-preview")}
              </div>
              <div class="smart-poster-actions">
                <div class="smart-poster-file-name">${esc(state.posterName || "尚未選擇圖片")}</div>
                <button class="smart-mini-button danger" type="button" data-smart-remove-poster ${state.posterDataUrl ? "" : "disabled"}>移除</button>
              </div>
              <button class="smart-generate-button" style="min-width:0;width:100%;margin-top:12px" type="button" data-smart-analyze-poster ${state.posterDataUrl && !state.analyzing ? "" : "disabled"}>
                ${state.analyzing ? "AI 分析中…" : "🤖 AI 分析海報"}
              </button>
            </div>
          </section>

          <section class="smart-activity-panel">
            <div class="smart-activity-panel-head">
              <span class="smart-activity-step">2</span><h2>文字敘述</h2>
              <p>可補充海報沒寫的資訊；文字內容優先於海報辨識結果。</p>
            </div>
            <div class="smart-activity-panel-body">
              <textarea class="smart-activity-textarea" maxlength="1500" data-smart-text placeholder="例如：名額 80 人，會員可以攜伴，每人最多代報 3 位，採匯款付款，活動前一天要 LINE 提醒。">${esc(state.text)}</textarea>
              <div class="smart-text-meta">
                <span>自然語言即可，不需要照格式。</span>
                <span data-smart-text-count>${state.text.length} / 1500</span>
              </div>
              <div class="smart-text-examples"><strong>可補充：</strong> 名額、會員／非會員價格、付款方式、攜伴人數、住宿、餐點、報名截止日、提醒方式。</div>
            </div>
          </section>
        </div>

        <div class="smart-generate-wrap">
          <button class="smart-generate-button" type="button" data-smart-generate ${state.analyzing ? "disabled" : ""}>
            ${state.analyzing ? "🤖 AI 正在分析活動…" : "✨ AI 分析並生成活動預覽"}
          </button>
          <div class="smart-generate-hint">Gemini 主引擎；失敗時自動改用 OpenAI 備援。</div>
        </div>

        ${state.error ? `<div class="smart-activity-notice" style="border-color:#fecaca;background:#fff1f2;color:#991b1b"><div><strong>AI 分析失敗</strong><span>${esc(state.error)}</span></div></div>` : ""}

        <section class="smart-preview-section ${state.previewVisible ? "is-visible" : ""}" data-smart-preview-section>
          ${previewMarkup()}
        </section>
      </section>

      <div class="smart-activity-toast" data-smart-toast></div>
    `;

    bindSmartActivity();
  }

  function analysis() {
    return state.analysis && typeof state.analysis === "object" ? state.analysis : {};
  }

  function unitLabel(unit) {
    return ({ person: "人", room: "間", item: "份／件", ticket: "張", group: "組", fixed: "固定" })[unit] || "單位";
  }

  function pricingMarkup() {
    const a = analysis();
    const rows = Array.isArray(a.pricing) ? a.pricing : [];
    if (state.billingMode === "free") return `<div class="smart-free-price"><span>本活動</span><strong>免費報名</strong></div>`;
    if (!rows.length) return `<div class="smart-price-row"><div><b>待確認價格</b><small>AI 尚未辨識到明確費用</small></div><strong>—</strong></div>`;
    return rows.map((row) => `
      <div class="smart-price-row">
        <div><b>${esc(row.name || "費用項目")}</b><small>${esc(unitLabel(row.unit))}計價${row.required ? " · 必選" : " · 選配"}</small></div>
        <strong>$${Number(row.amount || 0).toLocaleString("zh-TW")} / ${esc(unitLabel(row.unit))}</strong>
      </div>`).join("");
  }

  function modeLabel() {
    if (state.billingMode === "simple_paid") return "簡單付費";
    if (state.billingMode === "advanced_paid") return "進階付費";
    return "免費活動";
  }

  function dateTimeText(a) {
    if (!a.date && !a.startTime && !a.endTime) return "待確認";
    return [a.date, [a.startTime, a.endTime].filter(Boolean).join("–")].filter(Boolean).join(" ");
  }

  function registrationFieldsMarkup(a) {
    const fields = Array.isArray(a.registrationFields) && a.registrationFields.length ? a.registrationFields : ["姓名", "手機"];
    return `<div class="smart-form-demo">${fields.slice(0, 8).map((field) => `<label>${esc(field)}<input disabled placeholder="${esc(field)}"></label>`).join("")}</div>`;
  }

  function previewMarkup() {
    const a = analysis();
    const title = a.title || "等待 AI 分析活動海報";
    const description = a.description || state.text.trim() || "上傳海報並按「AI 分析海報」，系統會在這裡產生活動介紹。";
    const provider = a.providerUsed ? `${a.providerUsed === "gemini" ? "Gemini" : "OpenAI"}${a.fallbackUsed ? "（備援）" : ""}` : "尚未分析";
    const missing = Array.isArray(a.missingFields) ? a.missingFields : [];
    const confidence = Math.round((Number(a.confidence) || 0) * 100);

    return `
      <div class="smart-preview-heading">
        <div><h2>活動預覽</h2><p>AI 分析後直接用報名者視角預覽。</p></div>
        <div class="smart-mode-switch">
          <button class="smart-mode-chip ${state.billingMode === "free" ? "is-active" : ""}" type="button" data-smart-mode="free">免費</button>
          <button class="smart-mode-chip ${state.billingMode === "simple_paid" ? "is-active" : ""}" type="button" data-smart-mode="simple_paid">簡單付費</button>
          <button class="smart-mode-chip ${state.billingMode === "advanced_paid" ? "is-active" : ""}" type="button" data-smart-mode="advanced_paid">進階付費</button>
        </div>
      </div>

      <div class="smart-preview-grid">
        <article class="smart-registration-preview">
          <div class="smart-registration-hero">${state.posterDataUrl ? posterHtml("") : '<div class="smart-registration-hero-placeholder">活動海報將顯示在這裡</div>'}</div>
          <div class="smart-registration-body">
            <span class="smart-preview-badge">${esc(modeLabel())} · AI ${esc(provider)}</span>
            <h3 class="smart-registration-title">${esc(title)}</h3>
            <p class="smart-registration-desc">${esc(description)}</p>

            <div class="smart-info-grid">
              <div class="smart-info-item"><b>日期時間</b><span>${esc(dateTimeText(a))}</span></div>
              <div class="smart-info-item"><b>活動地點</b><span>${esc([a.venueName, a.address].filter(Boolean).join(" · ") || "待確認")}</span></div>
              <div class="smart-info-item"><b>活動名額</b><span>${a.capacity ? `${Number(a.capacity).toLocaleString("zh-TW")} 人` : "待確認"}</span></div>
              <div class="smart-info-item"><b>活動類型</b><span>${esc(a.category || "待確認")}</span></div>
            </div>

            <div class="smart-block"><h4>${state.billingMode === "free" ? "活動費用" : "選擇方案"}</h4>${pricingMarkup()}</div>
            <div class="smart-block"><h4>報名資料（AI 建議）</h4>${registrationFieldsMarkup(a)}</div>
            <button class="smart-demo-submit" type="button" disabled>模擬報名（目前不送出）</button>
          </div>
        </article>

        <aside>
          <div class="smart-analysis-card">
            <h3>AI 分析結果</h3>
            <div class="smart-analysis-list">
              <div class="smart-analysis-row ${state.posterDataUrl ? "ready" : "pending"}"><span class="smart-analysis-dot">${state.posterDataUrl ? "✓" : "!"}</span><div><b>活動海報</b><br>${state.posterDataUrl ? "已上傳並可送 AI 分析。" : "目前只有文字輸入。"}</div></div>
              <div class="smart-analysis-row ${state.analysis ? "ready" : "pending"}"><span class="smart-analysis-dot">AI</span><div><b>分析引擎</b><br>${esc(provider)}${state.analysis ? ` · 信心 ${confidence}%` : ""}</div></div>
              <div class="smart-analysis-row ${missing.length ? "pending" : state.analysis ? "ready" : "pending"}"><span class="smart-analysis-dot">${missing.length ? "!" : "✓"}</span><div><b>待確認資料</b><br>${esc(missing.length ? missing.join("、") : state.analysis ? "AI 未標出其他缺漏。" : "尚未分析。")}</div></div>
              <div class="smart-analysis-row ready"><span class="smart-analysis-dot">✓</span><div><b>舊活動隔離</b><br>分析結果不會寫入 /api/activities。</div></div>
            </div>
            <div class="smart-preview-actions">
              <button class="smart-action-primary" type="button" data-smart-back-edit>回到上方修改輸入</button>
              <button class="smart-action-secondary" type="button" data-smart-regenerate>重新 AI 分析</button>
              <button class="smart-action-disabled" type="button" disabled>儲存智能草稿（下一階段）</button>
            </div>
          </div>
        </aside>
      </div>`;
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
      state.previewVisible = false;
      state.error = "";
      renderSmartActivity();
    };
    reader.onerror = () => showToast("海報讀取失敗，請重新選擇");
    reader.readAsDataURL(file);
  }

  async function analyzeActivity() {
    if (state.analyzing) return;
    if (!state.posterDataUrl && !state.text.trim()) return showToast("請先上傳海報，或輸入活動文字敘述");
    state.analyzing = true;
    state.error = "";
    renderSmartActivity();
    try {
      const response = await fetch("/api/smart-activities/analyze", {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ posterDataUrl: state.posterDataUrl, text: state.text })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || `AI 分析失敗 HTTP ${response.status}`);
      state.analysis = result.data || {};
      state.billingMode = state.analysis.billingMode || "free";
      state.previewVisible = true;
      state.error = "";
      showToast(`AI 分析完成：${state.analysis.providerUsed === "openai" ? "OpenAI 備援" : "Gemini"}`);
    } catch (error) {
      state.error = error?.message || "AI 分析失敗";
      state.previewVisible = false;
    } finally {
      state.analyzing = false;
      renderSmartActivity();
      if (state.previewVisible) setTimeout(() => document.querySelector("[data-smart-preview-section]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    }
  }

  function bindSmartActivity() {
    const input = document.querySelector("[data-smart-poster-input]");
    const drop = document.querySelector("[data-smart-poster-drop]");
    if (input) input.onchange = () => setPoster(input.files?.[0]);
    if (drop) {
      drop.ondragover = (event) => { event.preventDefault(); drop.classList.add("is-dragging"); };
      drop.ondragleave = () => drop.classList.remove("is-dragging");
      drop.ondrop = (event) => { event.preventDefault(); drop.classList.remove("is-dragging"); setPoster(event.dataTransfer?.files?.[0]); };
    }
    const textarea = document.querySelector("[data-smart-text]");
    if (textarea) textarea.oninput = () => {
      state.text = textarea.value || "";
      state.analysis = null;
      const count = document.querySelector("[data-smart-text-count]");
      if (count) count.textContent = `${state.text.length} / 1500`;
    };
    document.querySelector("[data-smart-remove-poster]")?.addEventListener("click", () => {
      state.posterDataUrl = ""; state.posterName = ""; state.analysis = null; state.previewVisible = false; state.error = ""; renderSmartActivity();
    });
    document.querySelector("[data-smart-analyze-poster]")?.addEventListener("click", analyzeActivity);
    document.querySelector("[data-smart-generate]")?.addEventListener("click", analyzeActivity);
    document.querySelector("[data-smart-regenerate]")?.addEventListener("click", analyzeActivity);
    document.querySelector("[data-smart-back-edit]")?.addEventListener("click", () => {
      document.querySelector("[data-smart-activity-root]")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.querySelector("[data-smart-text]")?.focus(), 350);
    });
    document.querySelectorAll("[data-smart-mode]").forEach((button) => button.addEventListener("click", () => {
      state.billingMode = button.dataset.smartMode || "free";
      state.previewVisible = true;
      renderSmartActivity();
    }));
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
