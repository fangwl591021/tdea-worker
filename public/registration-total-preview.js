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

  function fieldMatchesHeadcount(field = {}) {
    const names = [normalize(field.key), normalize(field.label)].filter(Boolean);
    return names.some((name) => headcountNames.some((candidate) => name === candidate || name.includes(candidate)));
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

  function findControl(form, field) {
    const keys = [clean(field?.key), clean(field?.label)].filter(Boolean);
    for (const key of keys) {
      const byName = form.elements?.[key];
      if (byName) return byName;
    }
    for (const control of form.querySelectorAll("input,select,textarea")) {
      if (keys.some((key) => normalize(control.name) === normalize(key))) return control;
    }
    return null;
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

    const unitAmount = activityUnitAmount(schema.activity || {});
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    const headcountField = fields.find(fieldMatchesHeadcount);
    if (unitAmount <= 0 || !headcountField) return;

    injectStyle();
    const observer = new MutationObserver(() => attach());
    observer.observe(document.body, { childList: true, subtree: true });
    attach();

    function attach() {
      const form = document.querySelector("form.nf-form, .nf-form form, form[data-native-form], form");
      if (!form || form.dataset.totalPreviewReady === "1") return;
      const control = findControl(form, headcountField);
      if (!control) return;
      form.dataset.totalPreviewReady = "1";

      const box = document.createElement("div");
      box.className = "nf-total-preview";
      box.setAttribute("data-registration-total-preview", "1");
      const actions = form.querySelector(".nf-actions") || form.querySelector("button[type='submit']")?.parentElement;
      if (actions) actions.insertAdjacentElement("beforebegin", box);
      else form.appendChild(box);

      const render = () => {
        const quantity = readQuantity(control);
        const total = unitAmount * quantity;
        box.innerHTML = `
          <div class="nf-total-preview-label">應付總金額</div>
          <div class="nf-total-preview-main">NT$ ${total.toLocaleString("zh-TW")}</div>
          <div class="nf-total-preview-detail">單價 NT$ ${unitAmount.toLocaleString("zh-TW")} × ${quantity} 人（含本人）</div>`;
      };

      control.addEventListener("change", render);
      control.addEventListener("input", render);
      form.addEventListener("submit", render, true);
      render();
    }
  }

  boot();
})();
