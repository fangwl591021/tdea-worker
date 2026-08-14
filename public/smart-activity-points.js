(() => {
  const PUBLIC_KEYS = [
    "cardCollection", "register", "query", "memberQr", "calendar", "checkin", "redeem",
    "redeemSession", "monthlyDetail", "monthlyShare", "personalMessages", "close", "marquee",
    "motherRegister", "memberHome", "checkinModule"
  ];
  const params = new URLSearchParams(location.search);
  if (PUBLIC_KEYS.some((key) => params.has(key))) return;

  const state = { enabled: false, amount: 0 };
  let queued = false;

  const clampAmount = (value) => Math.max(0, Math.min(999999, Math.floor(Number(value) || 0)));

  function pointConfig() {
    const enabled = state.enabled === true && state.amount > 0;
    return {
      enabled,
      amount: enabled ? state.amount : 0,
      deductAt: "checkin",
      deductOnRegistration: false,
      insufficientPoints: "reject_checkin",
      allowNegativeBalance: false,
      idempotencyScope: "activity_member"
    };
  }

  function publishConfig() {
    const value = pointConfig();
    window.TDEASmartActivityPointConfig = {
      get: () => ({ ...value })
    };
    window.tdeaSmartActivityExtensions = window.tdeaSmartActivityExtensions || {};
    window.tdeaSmartActivityExtensions.checkinPoints = { ...value };
    window.dispatchEvent(new CustomEvent("tdea:smart-activity-point-policy", { detail: { ...value } }));
  }

  function builderSection() {
    const panel = document.querySelector("[data-smart-activity-root] .smart-builder-panel");
    if (!panel) return null;
    let section = panel.querySelector("[data-smart-point-section]");
    const docsSection = panel.querySelector("[data-smart-doc-section]");
    const textSection = panel.querySelector("[data-smart-text]")?.closest(".smart-builder-section");
    const textLabel = textSection?.querySelector(".smart-builder-label");
    if (textLabel) textLabel.textContent = docsSection ? "4. 文字補充" : "3. 文字補充";

    if (!section) {
      const aiSection = panel.querySelector(".smart-ai-section");
      section = document.createElement("div");
      section.className = "smart-builder-section smart-point-section";
      section.dataset.smartPointSection = "";
      section.innerHTML = `
        <label class="smart-builder-label" data-smart-point-label></label>
        <div class="smart-point-switch">
          <button type="button" data-smart-point-mode="none"><strong>不扣點</strong><span>報名與簽到都不扣點</span></button>
          <button type="button" data-smart-point-mode="deduct"><strong>簽到扣點</strong><span>報名先不扣，完成核銷才扣</span></button>
        </div>
        <div class="smart-point-input-wrap" data-smart-point-input-wrap>
          <label>每位參加者扣除</label>
          <div class="smart-point-input-line">
            <input type="number" min="1" max="999999" step="1" inputmode="numeric" data-smart-point-amount aria-label="簽到扣除點數">
            <span>點</span>
          </div>
          <p>點數不足時不完成核銷；同一會員同一活動只可扣一次。</p>
        </div>`;
      if (aiSection) panel.insertBefore(section, aiSection);
      else panel.appendChild(section);

      section.querySelectorAll("[data-smart-point-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          state.enabled = button.dataset.smartPointMode === "deduct";
          if (state.enabled && state.amount <= 0) state.amount = 100;
          if (!state.enabled) state.amount = 0;
          publishConfig();
          syncBuilder();
          syncPreview();
        });
      });

      const input = section.querySelector("[data-smart-point-amount]");
      input?.addEventListener("input", () => {
        state.enabled = true;
        state.amount = clampAmount(input.value);
        publishConfig();
        syncBuilder();
        syncPreview();
      });
      input?.addEventListener("change", () => {
        if (state.enabled && state.amount < 1) state.amount = 1;
        publishConfig();
        syncBuilder();
        syncPreview();
      });
    }

    const label = section.querySelector("[data-smart-point-label]");
    if (label) label.textContent = `${docsSection ? 5 : 4}. 簽到是否扣點`;
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

  function ensurePreviewRuleButton() {
    const buttons = document.querySelector("[data-smart-activity-root] .smart-preview-buttons");
    if (!buttons) return null;
    let button = buttons.querySelector("[data-smart-point-rule-button]");
    if (!state.enabled || state.amount <= 0) {
      button?.remove();
      return null;
    }
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.smartPointRuleButton = "";
      const register = buttons.querySelector('[data-smart-preview-action="register"]');
      if (register) register.insertAdjacentElement("beforebegin", button);
      else buttons.appendChild(button);
      button.addEventListener("click", openRuleSheet);
    }
    button.textContent = `點數規則（${state.amount.toLocaleString("zh-TW")}）`;
    return button;
  }

  function ruleSheetHtml() {
    return `
      <div class="smart-point-rule-card"><span>簽到核銷時扣除</span><strong>${state.amount.toLocaleString("zh-TW")} 點</strong></div>
      <div class="smart-point-rule-list">
        <div><b>報名時</b><span>不扣點</span></div>
        <div><b>現場核銷</b><span>成功簽到後才扣點</span></div>
        <div><b>點數不足</b><span>不完成核銷，也不扣成負數</span></div>
        <div><b>重複掃碼</b><span>同一會員同一活動只扣一次</span></div>
      </div>`;
  }

  function openRuleSheet() {
    const phone = document.querySelector("[data-smart-activity-root] .smart-preview-phone");
    if (!phone) return;
    phone.querySelector("[data-smart-point-rule-sheet]")?.remove();
    const sheet = document.createElement("div");
    sheet.className = "smart-preview-sheet";
    sheet.dataset.smartPointRuleSheet = "";
    sheet.innerHTML = `<div class="smart-sheet-head"><strong>點數規則</strong><button type="button" data-smart-point-rule-close>關閉</button></div><div class="smart-sheet-body">${ruleSheetHtml()}</div>`;
    phone.appendChild(sheet);
    sheet.querySelector("[data-smart-point-rule-close]")?.addEventListener("click", () => sheet.remove());
  }

  function syncRegistrationSheet() {
    const sheets = Array.from(document.querySelectorAll("[data-smart-activity-root] .smart-preview-sheet"));
    const sheet = sheets.find((node) => /報名/.test(node.querySelector(".smart-sheet-head strong")?.textContent || ""));
    if (!sheet) return;
    const body = sheet.querySelector(".smart-sheet-body");
    if (!body) return;
    let note = body.querySelector("[data-smart-point-sheet-note]");
    if (state.enabled && state.amount > 0) {
      if (!note) {
        note = document.createElement("div");
        note.dataset.smartPointSheetNote = "";
        note.className = "smart-point-sheet-note";
        body.prepend(note);
      }
      note.innerHTML = `<strong>報名不會扣點</strong><span>活動當天完成簽到核銷後，才會扣除 ${state.amount.toLocaleString("zh-TW")} 點。</span>`;
    } else if (note) {
      note.remove();
    }
  }

  function syncPreview() {
    const badge = ensurePreviewBadge();
    if (badge) {
      if (state.enabled && state.amount > 0) {
        badge.hidden = false;
        badge.className = "smart-point-preview";
        badge.innerHTML = `<span>點數規則</span><strong>簽到扣 ${state.amount.toLocaleString("zh-TW")} 點</strong><small>報名不扣，核銷成功時扣除</small>`;
      } else {
        badge.hidden = true;
        badge.textContent = "";
      }
    }
    ensurePreviewRuleButton();
    syncRegistrationSheet();
  }

  function mount() {
    if (!document.querySelector("[data-smart-activity-root]")) return;
    builderSection();
    syncBuilder();
    syncPreview();
  }

  function queueMount() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      mount();
    });
  }

  publishConfig();
  new MutationObserver(queueMount).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-smart-preview-action]")) setTimeout(queueMount, 0);
  }, true);
  queueMount();
})();
