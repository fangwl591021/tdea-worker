(() => {
  const state = {
    enabled: false,
    amount: 0
  };

  const clampAmount = (value) => Math.max(0, Math.min(999999, Math.floor(Number(value) || 0)));

  function pointConfig() {
    return {
      enabled: state.enabled && state.amount > 0,
      amount: state.enabled ? state.amount : 0,
      deductAt: "checkin",
      deductOnRegistration: false
    };
  }

  window.TDEASmartActivityPointConfig = {
    get: () => ({ ...pointConfig() })
  };

  function builderSection() {
    const panel = document.querySelector("[data-smart-activity-root] .smart-builder-panel");
    if (!panel) return null;
    let section = panel.querySelector("[data-smart-point-section]");
    if (section) return section;

    const aiSection = panel.querySelector(".smart-ai-section");
    section = document.createElement("div");
    section.className = "smart-builder-section smart-point-section";
    section.dataset.smartPointSection = "";
    section.innerHTML = `
      <label class="smart-builder-label">4. 簽到是否扣點</label>
      <div class="smart-point-switch">
        <button type="button" data-smart-point-mode="none">不扣點</button>
        <button type="button" data-smart-point-mode="deduct">簽到扣點</button>
      </div>
      <div class="smart-point-input-wrap" data-smart-point-input-wrap>
        <label>每位參加者扣除</label>
        <div class="smart-point-input-line">
          <input type="number" min="1" max="999999" step="1" inputmode="numeric" data-smart-point-amount aria-label="簽到扣除點數">
          <span>點</span>
        </div>
      </div>
      <p class="smart-point-help">報名時不扣點；完成簽到核銷時才扣除。重複掃碼不可重複扣點。</p>
    `;

    if (aiSection) panel.insertBefore(section, aiSection);
    else panel.appendChild(section);

    section.querySelectorAll("[data-smart-point-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.enabled = button.dataset.smartPointMode === "deduct";
        if (state.enabled && state.amount <= 0) state.amount = 100;
        syncBuilder();
        syncPreview();
      });
    });

    const input = section.querySelector("[data-smart-point-amount]");
    input?.addEventListener("input", () => {
      state.amount = clampAmount(input.value);
      syncBuilder();
      syncPreview();
    });

    syncBuilder();
    return section;
  }

  function syncBuilder() {
    const section = document.querySelector("[data-smart-point-section]");
    if (!section) return;
    section.querySelectorAll("[data-smart-point-mode]").forEach((button) => {
      const active = state.enabled ? button.dataset.smartPointMode === "deduct" : button.dataset.smartPointMode === "none";
      button.classList.toggle("active", active);
    });
    const wrap = section.querySelector("[data-smart-point-input-wrap]");
    if (wrap) wrap.hidden = !state.enabled;
    const input = section.querySelector("[data-smart-point-amount]");
    if (input && document.activeElement !== input) input.value = state.amount > 0 ? String(state.amount) : "";
  }

  function ensurePreviewBadge() {
    const content = document.querySelector("[data-smart-activity-root] .smart-preview-content");
    if (!content) return null;
    let badge = content.querySelector("[data-smart-point-preview]");
    if (!badge) {
      badge = document.createElement("div");
      badge.dataset.smartPointPreview = "";
      const pricing = content.querySelector(".smart-preview-price-free, .smart-preview-price-paid, .smart-preview-price-pending");
      if (pricing) pricing.insertAdjacentElement("afterend", badge);
      else {
        const summary = content.querySelector(".smart-preview-summary");
        if (summary) summary.insertAdjacentElement("beforebegin", badge);
        else content.appendChild(badge);
      }
    }
    return badge;
  }

  function syncPreview() {
    const badge = ensurePreviewBadge();
    if (badge) {
      if (state.enabled && state.amount > 0) {
        badge.hidden = false;
        badge.className = "smart-point-preview";
        badge.innerHTML = `<span>簽到扣點</span><strong>${state.amount.toLocaleString("zh-TW")} 點</strong><small>報名不扣，核銷成功時扣除</small>`;
      } else {
        badge.hidden = true;
        badge.textContent = "";
      }
    }

    const sheet = document.querySelector("[data-smart-activity-root] .smart-preview-sheet .smart-sheet-body");
    if (!sheet) return;
    let note = sheet.querySelector("[data-smart-point-sheet-note]");
    if (state.enabled && state.amount > 0) {
      if (!note) {
        note = document.createElement("div");
        note.dataset.smartPointSheetNote = "";
        note.className = "smart-point-sheet-note";
        sheet.prepend(note);
      }
      note.innerHTML = `<strong>本活動需 ${state.amount.toLocaleString("zh-TW")} 點</strong><span>報名時不先扣點；現場完成簽到核銷後才扣除。</span>`;
    } else if (note) {
      note.remove();
    }
  }

  let queued = false;
  function mount() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!document.querySelector("[data-smart-activity-root]")) return;
      builderSection();
      syncBuilder();
      syncPreview();
    });
  }

  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-smart-preview-action]")) setTimeout(mount, 0);
  }, true);
  mount();
})();
