(() => {
  const params = new URLSearchParams(location.search);
  const formId = params.get("register");
  if (!formId) return;

  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const clean = (value) => String(value ?? "").trim();
  const normalize = (value) => clean(value).toLowerCase().replace(/[\s_\-()（）【】\[\]：:]/g, "");
  const numberValue = (value) => {
    const match = clean(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  };
  const activityUnitAmount = (activity = {}) => Math.max(0, numberValue(activity.paymentAmount || activity.feeAmount || activity.registrationFee || activity.amount));
  const pricedChoiceAmount = (value) => {
    const text = clean(value).replace(/，/g, ",");
    if (!text) return 0;
    const normalized = text.replace(/,/g, "");
    const patterns = [
      /(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)\s*([0-9]+(?:\.[0-9]+)?)/i,
      /([0-9]+(?:\.[0-9]+)?)\s*(?:元|塊)(?:\s*[/／]?\s*(?:人|位))?/i,
      /(?:每人|每位|單價|費用|價格|價錢)\s*(?:NT\s*\$|NTD\s*\$?|TWD\s*\$?|\$)?\s*([0-9]+(?:\.[0-9]+)?)/i
    ];
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const amount = Number(match[1]);
        if (Number.isFinite(amount) && amount > 0) return amount;
      }
    }
    return 0;
  };
  const headcountNames = [
    "報名人數含本人",
    "報名人數",
    "參加人數",
    "參與人數",
    "同行人數",
    "人數",
    "registrationcount",
    "attendeecount",
    "participantcount",
    "peoplecount",
    "quantity",
    "qty"
  ];
  const pricedFieldKeywords = ["房型", "住宿", "方案", "票種", "票價", "費用", "價格", "價錢", "餐別", "套餐"];

  function fieldMatchesHeadcount(field = {}) {
    const names = [normalize(field.key), normalize(field.label)].filter(Boolean);
    return names.some((name) => headcountNames.some((candidate) => name === candidate || name.includes(candidate)));
  }

  function fieldMatchesPricedChoice(field = {}) {
    const type = normalize(field.type);
    if (type && !["radio", "dropdown", "select"].includes(type)) return false;
    const name = normalize(field.label || field.key);
    return pricedFieldKeywords.some((keyword) => name.includes(keyword));
  }

  function injectStyle() {
    if (document.getElementById("registration-total-preview-style")) return;
    const style = document.createElement("style");
    style.id = "registration-total-preview-style";
    style.textContent = `
      .nf-total-preview{border:2px solid #06c755;background:#f0fdf4;border-radius:12px;padding:16px 18px;display:grid;gap:6px}
      .nf-total-preview-label{font-size:14px;font-weight:800;color:#067647}
      .nf-total-preview-main{font-size:24px;font-weight:900;color:#064e3b}
      .nf-total-preview-detail{font-size:14px;color:#475467}
    `;
    document.head.appendChild(style);
  }

  function findControls(form, field) {
    const keys = [clean(field?.key), clean(field?.label)].filter(Boolean);
    const controls = [];
    for (const key of keys) {
      const byName = form.elements?.[key];
      if (!byName) continue;
      if (typeof byName.length === "number" && !byName.tagName) controls.push(...Array.from(byName));
      else controls.push(byName);
    }
    for (const control of form.querySelectorAll("input,select,textarea")) {
      if (keys.some((key) => normalize(control.name) === normalize(key))) controls.push(control);
    }
    return [...new Set(controls)];
  }

  function readControlValue(controls) {
    if (!controls?.length) return "";
    const checked = controls.find((control) => (control.type === "radio" || control.type === "checkbox") && control.checked);
    if (checked) return checked.value;
    const select = controls.find((control) => control.tagName === "SELECT");
    if (select) return select.value;
    return controls[0]?.value || "";
  }

  function readQuantity(control) {
    if (!control) return 1;
    const value = numberValue(control.value);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  async function boot() {
    let schema;
    try {
      const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(formId)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) return;
      schema = result.data?.form || result.data || {};
    } catch (_) {
      return;
    }

    const fallbackUnitAmount = activityUnitAmount(schema.activity || {});
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    const headcountField = fields.find(fieldMatchesHeadcount);
    const pricedChoiceFields = fields.filter(fieldMatchesPricedChoice);
    if (fallbackUnitAmount <= 0 && !pricedChoiceFields.length) return;

    injectStyle();
    const observer = new MutationObserver(() => attach());
    observer.observe(document.body, { childList: true, subtree: true });
    attach();

    function attach() {
      const form = document.querySelector("form.nf-form, .nf-form form, form[data-native-form], form");
      if (!form || form.dataset.totalPreviewReady === "1") return;
      const headcountControl = headcountField ? findControls(form, headcountField)[0] : null;
      const pricedControls = pricedChoiceFields.flatMap((field) => findControls(form, field));
      if (!headcountControl && !pricedControls.length && fallbackUnitAmount <= 0) return;
      form.dataset.totalPreviewReady = "1";

      const box = document.createElement("div");
      box.className = "nf-total-preview";
      box.setAttribute("data-registration-total-preview", "1");
      const actions = form.querySelector(".nf-actions") || form.querySelector("button[type='submit']")?.parentElement;
      if (actions) actions.insertAdjacentElement("beforebegin", box);
      else form.appendChild(box);

      const render = () => {
        const quantity = readQuantity(headcountControl);
        let unitAmount = 0;
        let sourceLabel = "";
        for (const field of pricedChoiceFields) {
          const value = readControlValue(findControls(form, field));
          const amount = pricedChoiceAmount(value);
          if (amount > 0) {
            unitAmount = amount;
            sourceLabel = clean(field.label || field.key);
            break;
          }
        }
        if (unitAmount <= 0) unitAmount = fallbackUnitAmount;

        if (unitAmount <= 0) {
          box.innerHTML = `
            <div class="nf-total-preview-label">應付總金額</div>
            <div class="nf-total-preview-main">請先選擇計價方案</div>
            <div class="nf-total-preview-detail">選擇房型／票種後，系統會自動計算金額。</div>`;
          return;
        }

        const total = unitAmount * quantity;
        box.innerHTML = `
          <div class="nf-total-preview-label">應付總金額</div>
          <div class="nf-total-preview-main">NT$ ${total.toLocaleString("zh-TW")}</div>
          <div class="nf-total-preview-detail">${sourceLabel ? `${sourceLabel}：` : ""}單價 NT$ ${unitAmount.toLocaleString("zh-TW")} × ${quantity} 人（含本人）</div>`;
      };

      [headcountControl, ...pricedControls].filter(Boolean).forEach((control) => {
        control.addEventListener("change", render);
        control.addEventListener("input", render);
      });
      form.addEventListener("submit", render, true);
      render();
    }
  }

  boot();
})();
