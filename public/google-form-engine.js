(() => {
  const dataKey = "tdea-manager-v3";
  const adminKey = "tdea-admin-email";
  const apiBase = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const engineInactiveMessage = "表單引擎尚未啟用。現在可先貼上既有 Google 表單公開網址，系統仍會自動連動。";

  const trim = (value) => String(value ?? "").trim();
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function load() {
    try { return JSON.parse(localStorage.getItem(dataKey) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    localStorage.setItem(dataKey, JSON.stringify(data));
  }

  function adminEmail() {
    return sessionStorage.getItem(adminKey) || localStorage.getItem(adminKey) || "";
  }

  function latestActivity(data) {
    return Array.isArray(data.activities) ? data.activities[0] : null;
  }

  function currentSettings(form) {
    return {
      formUrl: trim(form.formUrl?.value),
      posterUrl: trim(form.posterUrl?.value),
      youtubeUrl: trim(form.youtubeUrl?.value),
      requireImageUpload: form.requireImageUpload?.value || "N",
      genderField: form.genderField?.value || "required",
      memberField: form.memberField?.value || "required",
      mealField: form.mealField?.value || "required",
      customFields: collectCustomFields(form)
    };
  }

  function collectCustomFields(form) {
    return [...form.querySelectorAll("[data-custom-field]")].map((row, index) => {
      const type = row.querySelector("[name='customType']")?.value || "text";
      return {
        key: "custom_" + (index + 1),
        label: row.querySelector("[name='customLabel']")?.value?.trim() || "",
        type,
        options: String(row.querySelector("[name='customOptions']")?.value || "").split(/\n|,/).map(item => item.trim()).filter(Boolean),
        required: Boolean(row.querySelector("[name='customRequired']")?.checked)
      };
    }).filter(field => field.label);
  }

  function persistFormUrl(form, url) {
    const formUrl = trim(url);
    if (!formUrl) return;
    if (form.formUrl) form.formUrl.value = formUrl;

    const data = load();
    data.formSettings ||= {};
    const activity = latestActivity(data);
    if (!activity) return;

    data.formSettings[activity.id] ||= {};
    Object.assign(data.formSettings[activity.id], currentSettings(form), { formUrl, googleFormUrl: formUrl });
    if (activity.activityNo) {
      data.formSettings[activity.activityNo] ||= {};
      Object.assign(data.formSettings[activity.activityNo], data.formSettings[activity.id]);
    }
    activity.formMode = "google_form";
    activity.formUrl = formUrl;
    activity.googleFormUrl = formUrl;
    save(data);
  }

  function setStatus(form, message, tone = "info") {
    const status = form.querySelector("[data-form-engine-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function payloadFor(form) {
    const data = load();
    const activity = latestActivity(data) || {};
    const settings = currentSettings(form);
    return {
      activity: {
        id: activity.id || "",
        activityNo: activity.activityNo || "",
        name: trim(activity.name) || trim(form.name?.value),
        type: trim(activity.type) || trim(form.type?.value),
        courseTime: trim(activity.courseTime) || trim(form.courseTime?.value),
        deadline: trim(activity.deadline) || trim(form.deadline?.value),
        capacity: Number(activity.capacity || form.capacity?.value || 0),
        detailText: trim(activity.detailText) || trim(form.detailText?.value)
      },
      settings
    };
  }

  async function generateForm(form) {
    const email = adminEmail();
    if (!email) {
      setStatus(form, "尚未登入管理者，之後接 LINE Login 後會自動帶入權限。", "warn");
      return;
    }
    setStatus(form, "正在連接表單引擎...", "info");
    try {
      const response = await fetch(`${apiBase}/api/google-forms/create`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-email": email },
        body: JSON.stringify(payloadFor(form))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        const message = response.status === 404 || result.message === "Not found" ? engineInactiveMessage : (result.message || engineInactiveMessage);
        setStatus(form, message, "warn");
        return;
      }
      const formUrl = result.formUrl || result.responderUri || result.data?.formUrl || result.data?.responderUri;
      if (!formUrl) {
        setStatus(form, "表單已建立，但沒有收到公開報名網址。", "warn");
        return;
      }
      persistFormUrl(form, formUrl);
      setStatus(form, "報名表已產生並寫回活動資料。", "ok");
    } catch (_) {
      setStatus(form, engineInactiveMessage, "warn");
    }
  }

  function enginePanel() {
    return `<div class="form-engine-panel" data-form-engine-panel>
      <div>
        <strong>報名表設定</strong>
        <span>按下按鈕後，系統會依下方欄位設定產生 Google 報名表，並自動把報名網址寫回活動。</span>
      </div>
      <button class="btn" type="button" data-generate-google-form>產生 Google 報名表</button>
      <div class="form-engine-status" data-form-engine-status data-tone="info">API 尚未啟用前，也可以先把既有 Google 表單網址貼到「報名表公開網址」。</div>
    </div>`;
  }

  function enhanceForm(form) {
    if (!form || form.dataset.googleFormEngineReady) return;
    form.dataset.googleFormEngineReady = "true";

    const block = form.querySelector(".form-builder-block");
    if (block) {
      const title = block.querySelector(".form-builder-title");
      if (title) title.textContent = "報名表欄位設定";
    }

    const formUrlInput = form.querySelector("input[name='formUrl']");
    const formUrlField = formUrlInput?.closest(".field");
    if (formUrlField) {
      const label = formUrlField.querySelector("label");
      const hint = formUrlField.querySelector("small");
      if (label) label.textContent = "報名表公開網址";
      if (formUrlInput) formUrlInput.placeholder = "系統產生後會自動回填；也可貼上既有 Google 表單網址";
      if (hint) hint.textContent = "使用者會從 TDEA 活動頁進入報名，不會直接看到後台設定流程。";
      formUrlField.insertAdjacentHTML("beforebegin", enginePanel());
    }

    const submit = form.querySelector("button[type='submit']");
    if (submit && /Google|表單設定/.test(submit.textContent || "")) submit.textContent = "建立活動與報名流程";

    form.querySelector("[data-generate-google-form]")?.addEventListener("click", () => generateForm(form));
  }

  function softenMonthlyWarnings() {
    document.querySelectorAll(".monthly-warning").forEach((warning) => {
      const text = warning.textContent || "";
      if (!text.includes("Google") && !text.includes("表單連結")) return;
      warning.textContent = "此活動尚未完成報名表連動。若已建立表單，請回到活動編輯確認報名表公開網址已寫入。";
    });
    document.querySelectorAll(".monthly-linked-box span").forEach((span) => {
      if ((span.textContent || "").includes("Google 表單網址")) {
        span.textContent = "報名網址：尚未完成報名表連動";
      }
    });
  }

  function ensureStyle() {
    if (document.querySelector("#google-form-engine-style")) return;
    const style = document.createElement("style");
    style.id = "google-form-engine-style";
    style.textContent = `
      .form-engine-panel{display:grid;gap:10px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:14px;color:#064e3b}
      .form-engine-panel strong{display:block;color:#064e3b;margin-bottom:3px}
      .form-engine-panel span{display:block;color:#166534;font-size:13px;line-height:1.5}
      .form-engine-panel .btn{width:max-content}
      .form-engine-status{font-size:13px;line-height:1.5;color:#166534}
      .form-engine-status[data-tone="warn"]{color:#b45309}
      .form-engine-status[data-tone="ok"]{color:#027a48;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function install() {
    ensureStyle();
    document.querySelectorAll("#activity-form").forEach(enhanceForm);
    softenMonthlyWarnings();
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.id === "activity-form") {
      const url = trim(form.formUrl?.value);
      if (url) setTimeout(() => persistFormUrl(form, url), 0);
    }
  }, true);

  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
})();
