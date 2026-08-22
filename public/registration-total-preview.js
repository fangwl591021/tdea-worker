(() => {
  const params = new URLSearchParams(location.search);

  const state = params.get("liff.state");
  if (state) {
    try {
      const nested = new URLSearchParams(
        decodeURIComponent(state).replace(/^\?/, "")
      );
      nested.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    } catch (_) {}
  }

  const formId = params.get("register");
  if (!formId) return;

  const api = location.hostname.endsWith("github.io")
    ? "https://tdeawork.fangwl591021.workers.dev"
    : "";

  const clean = (v) => String(v ?? "").trim();

  const numberValue = (v) => {
    const m = clean(v).replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : 0;
  };

  const isZeroChoice = (v) => {
    const text = clean(v).toLowerCase();
    if (!text) return true;

    return (
      text.startsWith("\u4e0d") ||
      text.startsWith("\u7121") ||
      text === "none" ||
      text === "no" ||
      text === "0"
    );
  };

  const quantityValue = (v) => {
    if (isZeroChoice(v)) return 0;

    const qty = Math.floor(numberValue(v));
    return Number.isFinite(qty) && qty > 0 ? qty : 0;
  };

  const escapeHtml = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function injectStyle() {
    if (document.getElementById("registration-total-preview-style")) return;

    const style = document.createElement("style");
    style.id = "registration-total-preview-style";

    style.textContent = `
      .nf-total-preview {
        margin: 18px 0;
        border: 2px solid #06c755;
        background: #f0fdf4;
        border-radius: 14px;
        padding: 16px 18px;
        box-sizing: border-box;
      }

      .nf-total-preview-title {
        font-size: 15px;
        font-weight: 900;
        color: #067647;
        margin-bottom: 10px;
      }

      .nf-total-preview-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        padding: 5px 0;
        font-size: 15px;
      }

      .nf-total-preview-line strong {
        white-space: nowrap;
      }

      .nf-total-preview-divider {
        border-top: 1px solid #a6f4c5;
        margin: 10px 0;
      }

      .nf-total-preview-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        font-weight: 900;
      }

      .nf-total-preview-total-label {
        color: #067647;
        font-size: 17px;
      }

      .nf-total-preview-total-value {
        color: #064e3b;
        font-size: 28px;
        white-space: nowrap;
      }

      .nf-total-preview-empty {
        color: #667085;
        font-size: 14px;
      }
    `;

    document.head.appendChild(style);
  }

  function controlsForKey(form, key) {
    const target = clean(key);
    if (!target) return [];

    const found = [];

    const named = form.elements?.[target];

    if (named) {
      if (typeof named.length === "number" && !named.tagName) {
        found.push(...Array.from(named));
      } else {
        found.push(named);
      }
    }

    form.querySelectorAll("input,select,textarea").forEach((control) => {
      if (clean(control.name) === target) {
        found.push(control);
      }
    });

    return [...new Set(found)];
  }

  function selectedValue(controls) {
    if (!controls.length) return "";

    const checked = controls.find(
      (control) =>
        (control.type === "radio" || control.type === "checkbox") &&
        control.checked
    );

    if (checked) return checked.value;

    const select = controls.find(
      (control) => control.tagName === "SELECT"
    );

    if (select) return select.value;

    return controls[0]?.value || "";
  }

  function findRemittanceContainer(form) {
    const fields = form.querySelectorAll(
      ".field,.nf-field,.form-field,.nf-form-field"
    );

    for (const field of fields) {
      const text = clean(field.textContent);

      if (
        text.includes("\u532f\u6b3e\u672b5\u78bc") ||
        text.includes("\u532f\u6b3e\u672b\u4e94\u78bc") ||
        text.includes("\u532f\u6b3e\u5f8c5\u78bc") ||
        text.includes("\u532f\u6b3e\u5f8c\u4e94\u78bc")
      ) {
        return field;
      }
    }

    return null;
  }

  async function boot() {
    let schema = {};

    try {
      const response = await fetch(
        `${api}/api/native-forms/${encodeURIComponent(formId)}`,
        { cache: "no-store" }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) return;

      schema = result.data?.form || result.data || {};
    } catch (_) {
      return;
    }

    const activity =
      schema.activity && typeof schema.activity === "object"
        ? schema.activity
        : {};

    const settings =
      schema.settings && typeof schema.settings === "object"
        ? schema.settings
        : {};

    const sourcePricing =
      Array.isArray(activity.pricing) && activity.pricing.length
        ? activity.pricing
        : Array.isArray(settings.pricing)
          ? settings.pricing
          : [];

    const pricing = sourcePricing
      .filter((item) => {
        if (!item || typeof item !== "object") return false;

        const timing = clean(item.paymentTiming || "registration");

        return (
          timing === "registration" &&
          numberValue(item.amount) > 0 &&
          clean(item.quantityKey)
        );
      })
      .map((item) => ({
        name: clean(item.name || item.label) || "\u8a08\u50f9\u9805\u76ee",
        amount: Math.max(0, numberValue(item.amount)),
        quantityKey: clean(item.quantityKey)
      }));

    if (!pricing.length) return;

    injectStyle();

    function attach() {
      const form = document.querySelector(
        "form.nf-form, .nf-form form, form[data-native-form], form"
      );

      if (!form) return;

      // Wait until the actual pricing controls exist.
      // Do not mark the form ready while Native Form is still rendering.
      const hasPricingControls = pricing.some(
        item => controlsForKey(form, item.quantityKey).length > 0
      );

      if (!hasPricingControls) return;

      // Prevent MutationObserver -> render -> mutation infinite loop
      if (form.dataset.totalPreviewBound === "1") return;

      let box = form.querySelector(
        "[data-registration-total-preview]"
      );

      if (!box) {
        box = document.createElement("div");
        box.className = "nf-total-preview";
        box.setAttribute("data-registration-total-preview", "1");

        const remittance = findRemittanceContainer(form);

        if (remittance) {
          remittance.insertAdjacentElement("beforebegin", box);
        } else {
          const actions =
            form.querySelector(".nf-actions") ||
            form.querySelector("button[type='submit']")?.parentElement;

          if (actions) {
            actions.insertAdjacentElement("beforebegin", box);
          } else {
            form.appendChild(box);
          }
        }
      }

      function render() {
        let total = 0;
        const lines = [];

        pricing.forEach((item) => {
          const controls = controlsForKey(form, item.quantityKey);
          const raw = selectedValue(controls);
          const qty = quantityValue(raw);
          const subtotal = item.amount * qty;

          total += subtotal;

          if (qty > 0) {
            lines.push(`
              <div class="nf-total-preview-line">
                <span>
                  ${escapeHtml(item.name)}
                  &nbsp;${qty} x NT$
                  ${item.amount.toLocaleString("zh-TW")}
                </span>
                <strong>
                  NT$ ${subtotal.toLocaleString("zh-TW")}
                </strong>
              </div>
            `);
          }
        });

        box.innerHTML = `
          <div class="nf-total-preview-title">
            \u4ed8\u6b3e\u660e\u7d30
          </div>

          ${
            lines.length
              ? lines.join("")
              : `<div class="nf-total-preview-empty">
                   \u8acb\u5148\u9078\u64c7\u4e0a\u65b9\u8a08\u50f9\u9805\u76ee
                 </div>`
          }

          <div class="nf-total-preview-divider"></div>

          <div class="nf-total-preview-total">
            <span class="nf-total-preview-total-label">
              \u672c\u6b21\u61c9\u4ed8
            </span>

            <span class="nf-total-preview-total-value">
              NT$ ${total.toLocaleString("zh-TW")}
            </span>
          </div>
        `;

        box.dataset.totalAmount = String(total);
      }

      if (form.dataset.totalPreviewBound !== "1") {
        form.dataset.totalPreviewBound = "1";

        form.addEventListener("change", render, true);
        form.addEventListener("input", render, true);
      }

      render();
    }

    attach();

    new MutationObserver(attach).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  boot();
})();
