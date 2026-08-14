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
    billingMode: "free"
  };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function guessTitle(text) {
    const cleaned = String(text || "").trim();
    if (!cleaned) return "活動名稱（V1-B 由 AI 辨識）";
    const firstLine = cleaned.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || cleaned;
    return firstLine.length > 34 ? firstLine.slice(0, 34) + "…" : firstLine;
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
    const smartNav = document.querySelector("[data-smart-activity-nav]");
    smartNav?.classList.add("active");

    main.innerHTML = `
      <div class="topbar">
        <div>
          <h1>✨ 智能活動</h1>
          <div class="subtitle">上傳海報或補充文字，先產生活動報名頁預覽。</div>
        </div>
        <div class="actions"><span class="smart-activity-version">V1-A 介面骨架</span></div>
      </div>

      <section class="smart-activity-shell" data-smart-activity-root>
        <div class="smart-activity-notice">
          <div>
            <strong>目前只驗證操作流程，不會寫入正式活動。</strong>
            <span>這個頁面不會呼叫 /api/activities，也不會修改既有「創建活動」、報名、付款或 QR 核銷機制。</span>
          </div>
          <span class="smart-activity-version">SAFE MODE</span>
        </div>

        <div class="smart-activity-input-grid">
          <section class="smart-activity-panel">
            <div class="smart-activity-panel-head">
              <span class="smart-activity-step">1</span><h2>上傳活動海報</h2>
              <p>海報會成為未來報名頁的主視覺；V1-B 再接 AI 辨識日期、地點、費用與活動內容。</p>
            </div>
            <div class="smart-activity-panel-body">
              <div class="smart-poster-drop ${state.posterDataUrl ? "has-image" : ""}" data-smart-poster-drop>
                <input type="file" accept="image/*" data-smart-poster-input aria-label="上傳活動海報">
                <div class="smart-poster-placeholder">
                  <div class="smart-poster-icon">↑</div>
                  <strong>拖曳或點擊上傳海報</strong>
                  <span>JPG、PNG、WEBP，建議 8MB 以內</span>
                </div>
                ${posterHtml("smart-poster-preview")}
              </div>
              <div class="smart-poster-actions">
                <div class="smart-poster-file-name" data-smart-poster-name>${esc(state.posterName || "尚未選擇圖片")}</div>
                <button class="smart-mini-button danger" type="button" data-smart-remove-poster ${state.posterDataUrl ? "" : "disabled"}>移除</button>
              </div>
            </div>
          </section>

          <section class="smart-activity-panel">
            <div class="smart-activity-panel-head">
              <span class="smart-activity-step">2</span><h2>文字敘述</h2>
              <p>不用填表格，直接補充海報沒寫的資訊；文字內容未來會優先於 AI 推測。</p>
            </div>
            <div class="smart-activity-panel-body">
              <textarea class="smart-activity-textarea" maxlength="1500" data-smart-text placeholder="例如：名額 80 人，會員可以攜伴，每人最多代報 3 位，採匯款付款，活動前一天要 LINE 提醒。">${esc(state.text)}</textarea>
              <div class="smart-text-meta">
                <span>自然語言即可，不需要照格式。</span>
                <span data-smart-text-count>${state.text.length} / 1500</span>
              </div>
              <div class="smart-text-examples">
                <strong>可補充：</strong> 名額、會員／非會員價格、付款方式、攜伴人數、住宿、餐點、報名截止日、提醒方式。
              </div>
            </div>
          </section>
        </div>

        <div class="smart-generate-wrap">
          <button class="smart-generate-button" type="button" data-smart-generate>✨ 生成活動預覽</button>
          <div class="smart-generate-hint">V1-A 使用介面模擬資料；尚未呼叫 Gemini / OpenAI。</div>
        </div>

        <section class="smart-preview-section ${state.previewVisible ? "is-visible" : ""}" data-smart-preview-section>
          ${previewMarkup()}
        </section>
      </section>

      <div class="smart-activity-toast" data-smart-toast></div>
    `;

    bindSmartActivity();
  }

  function pricingMarkup() {
    if (state.billingMode === "free") {
      return `<div class="smart-free-price"><span>本活動</span><strong>免費報名</strong></div>`;
    }
    if (state.billingMode === "simple_paid") {
      return `
        <div class="smart-price-row"><div><b>會員</b><small>人數計價</small></div><strong>$500 / 人</strong></div>
        <div class="smart-price-row"><div><b>非會員</b><small>人數計價</small></div><strong>$800 / 人</strong></div>
        <div class="smart-total"><span>示意總額</span><strong>$500</strong></div>`;
    }
    return `
      <div class="smart-price-row"><div><b>活動費</b><small>人數計價</small></div><strong>$800 / 人</strong></div>
      <div class="smart-price-row"><div><b>雙人房</b><small>房間計價</small></div><strong>$2,400 / 間</strong></div>
      <div class="smart-price-row"><div><b>晚宴</b><small>人數計價</small></div><strong>$600 / 人</strong></div>
      <div class="smart-total"><span>示意總額</span><strong>$3,800</strong></div>`;
  }

  function modeLabel() {
    if (state.billingMode === "simple_paid") return "簡單付費";
    if (state.billingMode === "advanced_paid") return "進階付費";
    return "免費活動";
  }

  function previewMarkup() {
    const title = guessTitle(state.text);
    const description = state.text.trim() || "這裡會顯示 AI 根據活動海報整理後的活動介紹與報名說明。";
    return `
      <div class="smart-preview-heading">
        <div>
          <h2>活動預覽</h2>
          <p>先看最終報名者會看到的樣子，再決定是否需要修改。</p>
        </div>
        <div class="smart-mode-switch" aria-label="V1-A 收費模式預覽">
          <button class="smart-mode-chip ${state.billingMode === "free" ? "is-active" : ""}" type="button" data-smart-mode="free">免費</button>
          <button class="smart-mode-chip ${state.billingMode === "simple_paid" ? "is-active" : ""}" type="button" data-smart-mode="simple_paid">簡單付費</button>
          <button class="smart-mode-chip ${state.billingMode === "advanced_paid" ? "is-active" : ""}" type="button" data-smart-mode="advanced_paid">進階付費</button>
        </div>
      </div>

      <div class="smart-preview-grid">
        <article class="smart-registration-preview">
          <div class="smart-registration-hero">
            ${state.posterDataUrl ? posterHtml("") : '<div class="smart-registration-hero-placeholder">活動海報將顯示在這裡</div>'}
          </div>
          <div class="smart-registration-body">
            <span class="smart-preview-badge">${esc(modeLabel())} · V1-A 模擬</span>
            <h3 class="smart-registration-title">${esc(title)}</h3>
            <p class="smart-registration-desc">${esc(description)}</p>

            <div class="smart-info-grid">
              <div class="smart-info-item"><b>日期時間</b><span>AI 將於 V1-B 辨識</span></div>
              <div class="smart-info-item"><b>活動地點</b><span>AI 將於 V1-B 辨識</span></div>
            </div>

            <div class="smart-block">
              <h4>${state.billingMode === "free" ? "活動費用" : "選擇方案"}</h4>
              ${pricingMarkup()}
            </div>

            <div class="smart-block">
              <h4>報名資料（AI 建議示意）</h4>
              <div class="smart-form-demo">
                <label>姓名<input disabled value="王小明"></label>
                <label>手機<input disabled value="09xx-xxx-xxx"></label>
                <label>公司<input disabled value="公司名稱"></label>
                <label>職稱<input disabled value="職稱"></label>
              </div>
            </div>
            <button class="smart-demo-submit" type="button" disabled>模擬報名（V1-A 不送出）</button>
          </div>
        </article>

        <aside>
          <div class="smart-analysis-card">
            <h3>生成狀態</h3>
            <div class="smart-analysis-list">
              <div class="smart-analysis-row ${state.posterDataUrl ? "ready" : "pending"}"><span class="smart-analysis-dot">${state.posterDataUrl ? "✓" : "!"}</span><div><b>活動海報</b><br>${state.posterDataUrl ? "已上傳，可作為報名頁主圖。" : "尚未上傳，可只用文字進行測試。"}</div></div>
              <div class="smart-analysis-row ${state.text.trim() ? "ready" : "pending"}"><span class="smart-analysis-dot">${state.text.trim() ? "✓" : "!"}</span><div><b>文字補充</b><br>${state.text.trim() ? "已收到補充內容。" : "尚未輸入補充內容。"}</div></div>
              <div class="smart-analysis-row pending"><span class="smart-analysis-dot">AI</span><div><b>活動解析</b><br>V1-B 才會接 Gemini / OpenAI 產生 Activity Blueprint。</div></div>
              <div class="smart-analysis-row ready"><span class="smart-analysis-dot">✓</span><div><b>舊活動隔離</b><br>目前不會寫入 /api/activities。</div></div>
            </div>
            <div class="smart-preview-actions">
              <button class="smart-action-primary" type="button" data-smart-back-edit>回到上方修改輸入</button>
              <button class="smart-action-secondary" type="button" data-smart-regenerate>重新生成預覽</button>
              <button class="smart-action-disabled" type="button" disabled>儲存智能草稿（V1-C）</button>
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
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function setPoster(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("請選擇圖片檔案");
    if (file.size > 8 * 1024 * 1024) return showToast("V1-A 海報請先控制在 8MB 以內");
    const reader = new FileReader();
    reader.onload = () => {
      state.posterDataUrl = String(reader.result || "");
      state.posterName = file.name || "活動海報";
      renderSmartActivity();
    };
    reader.onerror = () => showToast("海報讀取失敗，請重新選擇");
    reader.readAsDataURL(file);
  }

  function autoDemoBillingMode() {
    const text = state.text;
    const hasMoney = /(?:[$＄]\s*\d)|(?:\d[\d,]*\s*元)|費用|票價|會員價|非會員價|報名費/.test(text);
    const hasAdvanced = /住宿|房型|房間|雙人房|單人房|晚宴|餐點|接駁|加購|停車|攤位/.test(text);
    if (hasMoney && hasAdvanced) return "advanced_paid";
    if (hasMoney) return "simple_paid";
    return "free";
  }

  function generatePreview() {
    if (!state.posterDataUrl && !state.text.trim()) {
      showToast("請先上傳海報，或輸入活動文字敘述");
      return;
    }
    state.billingMode = autoDemoBillingMode();
    state.previewVisible = true;
    renderSmartActivity();
    setTimeout(() => document.querySelector("[data-smart-preview-section]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function bindSmartActivity() {
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

    const textarea = document.querySelector("[data-smart-text]");
    if (textarea) textarea.oninput = () => {
      state.text = textarea.value || "";
      const count = document.querySelector("[data-smart-text-count]");
      if (count) count.textContent = `${state.text.length} / 1500`;
    };

    document.querySelector("[data-smart-remove-poster]")?.addEventListener("click", () => {
      state.posterDataUrl = "";
      state.posterName = "";
      renderSmartActivity();
    });
    document.querySelector("[data-smart-generate]")?.addEventListener("click", generatePreview);
    document.querySelector("[data-smart-regenerate]")?.addEventListener("click", generatePreview);
    document.querySelector("[data-smart-back-edit]")?.addEventListener("click", () => {
      document.querySelector("[data-smart-activity-root]")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.querySelector("[data-smart-text]")?.focus(), 350);
    });
    document.querySelectorAll("[data-smart-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.billingMode = button.dataset.smartMode || "free";
        state.previewVisible = true;
        renderSmartActivity();
        setTimeout(() => document.querySelector("[data-smart-preview-section]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
      });
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
