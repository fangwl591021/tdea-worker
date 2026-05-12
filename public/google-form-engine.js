(() => {
  const dataKey = "tdea-manager-v3";
  const adminKey = "tdea-admin-email";
  const apiBase = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const engineInactiveMessage = "Google 表單引擎目前尚未啟用，請稍後再試，或先貼上既有報名表網址。";

  const trim = (value) => String(value ?? "").trim();

  function load() {
    try { return JSON.parse(localStorage.getItem(dataKey) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    localStorage.setItem(dataKey, JSON.stringify(data));
  }

  function adminEmail() {
    return sessionStorage.getItem(adminKey) || localStorage.getItem(adminKey) || "";
  }

  function formRowId(form) {
    return trim(form.elements?.id?.value);
  }

  function targetActivity(data, form) {
    const id = formRowId(form);
    if (id && Array.isArray(data.activities)) {
      return data.activities.find((activity) => String(activity.id) === id) || null;
    }
    return Array.isArray(data.activities) ? data.activities[0] : null;
  }

  function currentSettings(form) {
    const settings = {
      formUrl: trim(form.formUrl?.value),
      posterUrl: trim(form.posterUrl?.value),
      youtubeUrl: trim(form.youtubeUrl?.value),
      requireImageUpload: form.requireImageUpload?.value || "N",
      genderField: form.genderField?.value || "required",
      memberField: form.memberField?.value || "required",
      mealField: form.mealField?.value || "required",
      sessions: collectSessions(form),
      customFields: collectCustomFields(form)
    };
    settings.fields = buildFields(settings);
    return settings;
  }

  function buildFields(settings) {
    const fields = [
      { key: "name", label: "姓名", type: "text", required: true },
      { key: "phone", label: "手機", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "company", label: "公司/單位", type: "text", required: false },
      { key: "memberNo", label: "會員編號", type: "text", required: false }
    ];
    if (settings.genderField !== "none") {
      fields.push({ key: "gender", label: "性別", type: "radio", options: ["男", "女", "不透露"], required: settings.genderField === "required" });
    }
    if (settings.memberField !== "login" && settings.memberField !== "none") {
      fields.push({ key: "isMember", label: "是否為會員", type: "radio", options: ["是", "否", "不確定"], required: settings.memberField === "required" });
    }
    if (settings.mealField !== "none") {
      fields.push({ key: "meal", label: "用餐選項", type: "radio", options: ["葷", "素"], required: settings.mealField === "required" });
    }
    if (settings.requireImageUpload === "Y") {
      fields.push({ key: "imageUpload", label: "圖片/附件上傳", type: "file", required: false });
    }
    fields.push({ key: "note", label: "備註", type: "paragraph", required: false });
    fields.push(...(settings.customFields || []));
    return fields;
  }

  function collectCustomFields(form) {
    return [...form.querySelectorAll("[data-custom-field]")].map((row, index) => {
      const type = row.querySelector("[name='customType']")?.value || "text";
      const optionInputs = [...row.querySelectorAll("[name='customOption']")]
        .map((input) => input.value.trim())
        .filter(Boolean);
      const legacyOptions = String(row.querySelector("[name='customOptions']")?.value || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        key: "custom_" + (index + 1),
        label: row.querySelector("[name='customLabel']")?.value?.trim() || "",
        type,
        options: optionInputs.length ? optionInputs : legacyOptions,
        required: Boolean(row.querySelector("[name='customRequired']")?.checked)
      };
    }).filter((field) => field.label);
  }

  function collectSessions(form) {
    return [...form.querySelectorAll("[data-session-row]")].map((row, index) => {
      const name = row.querySelector("[name='sessionName']")?.value?.trim() || "";
      const time = row.querySelector("[name='sessionTime']")?.value?.trim() || "";
      const capacity = Number(row.querySelector("[name='sessionCapacity']")?.value || 0) || 0;
      return { id: "session_" + (index + 1), name, startTime: time, capacity, status: "open" };
    }).filter((session) => session.name);
  }

  function activityTypeLabelValue(form) {
    const value = trim(form.activityTypeLabel?.value);
    if (value === "__custom") return trim(form.activityTypeLabelOther?.value);
    return value;
  }

  function providerMeta(meta = {}) {
    const data = meta.data || {};
    const provider = meta.provider || data.provider || "native_form";
    const formId = meta.formId || meta.nativeFormId || meta.opnformFormId || data.formId || data.nativeFormId || data.opnformFormId || "";
    const formUrl = meta.formUrl || meta.nativeFormUrl || meta.opnformFormUrl || meta.responderUri || data.formUrl || data.nativeFormUrl || data.opnformFormUrl || data.responderUri || "";
    return {
      provider,
      formId,
      formUrl,
      editUrl: meta.editUrl || data.editUrl || "",
      sheetUrl: meta.sheetUrl || data.sheetUrl || "",
      nativeFormId: meta.nativeFormId || (provider === "native_form" ? formId : ""),
      nativeFormUrl: meta.nativeFormUrl || (provider === "native_form" ? formUrl : ""),
      opnformFormId: provider === "opnform" ? (meta.opnformFormId || formId) : "",
      opnformFormUrl: provider === "opnform" ? (meta.opnformFormUrl || formUrl) : "",
      googleFormId: meta.googleFormId || (provider === "google_form" ? formId : ""),
      googleFormUrl: meta.googleFormUrl || (provider === "google_form" ? formUrl : "")
    };
  }

  function persistFormUrl(form, url, meta = {}) {
    const formUrl = trim(url);
    if (!formUrl) return null;
    if (form.formUrl) form.formUrl.value = formUrl;
    const normalized = providerMeta({ ...meta, formUrl });

    const data = load();
    data.formSettings ||= {};
    const activity = targetActivity(data, form);
    if (!activity) return null;

    data.formSettings[activity.id] ||= {};
    Object.assign(data.formSettings[activity.id], currentSettings(form), {
      formUrl,
      formMode: normalized.provider,
      formId: normalized.formId,
      nativeFormId: normalized.nativeFormId,
      nativeFormUrl: normalized.nativeFormUrl,
      editUrl: normalized.editUrl,
      sheetUrl: normalized.sheetUrl,
      googleFormUrl: normalized.googleFormUrl,
      googleFormId: normalized.googleFormId,
      opnformFormUrl: normalized.opnformFormUrl,
      opnformFormId: normalized.opnformFormId
    });
    if (activity.activityNo) {
      data.formSettings[activity.activityNo] ||= {};
      Object.assign(data.formSettings[activity.activityNo], data.formSettings[activity.id]);
    }
    activity.formMode = normalized.provider;
    activity.formUrl = formUrl;
    activity.formId = normalized.formId || activity.formId || "";
    activity.nativeFormId = normalized.nativeFormId || activity.nativeFormId || "";
    activity.nativeFormUrl = normalized.nativeFormUrl || activity.nativeFormUrl || "";
    activity.editUrl = normalized.editUrl || activity.editUrl || "";
    activity.googleFormUrl = normalized.googleFormUrl || activity.googleFormUrl || "";
    activity.googleFormId = normalized.googleFormId || activity.googleFormId || "";
    activity.googleFormEditUrl = normalized.provider === "google_form" ? (normalized.editUrl || activity.googleFormEditUrl || "") : (activity.googleFormEditUrl || "");
    activity.googleSheetUrl = normalized.sheetUrl || activity.googleSheetUrl || "";
    activity.opnformFormUrl = normalized.opnformFormUrl || activity.opnformFormUrl || "";
    activity.opnformFormId = normalized.opnformFormId || activity.opnformFormId || "";
    save(data);
    return activity;
  }

  function setStatus(form, message, tone = "info") {
    const status = form.querySelector("[data-form-engine-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function payloadFor(form) {
    const data = load();
    const activity = targetActivity(data, form) || {};
    const settings = currentSettings(form);
    return {
      activity: {
        id: activity.id || formRowId(form) || "",
        activityNo: activity.activityNo || "",
        name: trim(activity.name) || trim(form.name?.value),
        type: trim(activity.typeLabel) || trim(activity.type) || activityTypeLabelValue(form) || trim(form.type?.value),
        courseTime: trim(activity.courseTime) || trim(form.courseTime?.value),
        deadline: trim(activity.deadline) || trim(form.deadline?.value),
        capacity: Number(activity.capacity || form.capacity?.value || 0),
        detailText: trim(activity.detailText) || trim(form.detailText?.value),
        posterUrl: trim(activity.posterUrl) || trim(settings.posterUrl) || trim(form.posterUrl?.value),
        imageUrl: trim(activity.imageUrl) || trim(activity.posterUrl) || trim(settings.posterUrl) || trim(form.posterUrl?.value),
        youtubeUrl: trim(activity.youtubeUrl) || trim(settings.youtubeUrl) || trim(form.youtubeUrl?.value)
      },
      settings
    };
  }

  async function generateForm(form, options = {}) {
    const email = adminEmail();
    if (!email) {
      setStatus(form, "尚未取得管理者權限，之後接 LINE Login 後會自動帶入。", "warn");
      return null;
    }

    setStatus(form, "正在產生 Google 報名表...", "info");
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
        return null;
      }

      const formUrl = result.formUrl || result.responderUri || result.data?.formUrl || result.data?.responderUri;
      if (!formUrl) {
        setStatus(form, "表單已建立，但沒有收到公開報名網址。", "warn");
        return null;
      }

      persistFormUrl(form, formUrl, result);
      setStatus(form, options.auto ? "活動已建立，報名表已自動產生。" : "報名表已產生並寫回活動資料。", "ok");
      return formUrl;
    } catch (_) {
      setStatus(form, engineInactiveMessage, "warn");
      return null;
    }
  }

  async function createManagedForm(form, email) {
    const payload = payloadFor(form);
    const native = await fetch(`${apiBase}/api/native-forms/create`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(payload)
    });
    const nativeResult = await native.json().catch(() => ({}));
    if (!native.ok || !nativeResult.success) {
      const message = nativeResult.message || "自建報名表產生失敗";
      throw new Error(message);
    }
    return { ...nativeResult, provider: "native_form" };
  }

  async function generateForm(form, options = {}) {
    const email = adminEmail();
    if (!email) {
      setStatus(form, "請先登入管理者，才能產生報名表。", "warn");
      return null;
    }

    setStatus(form, "正在產生報名表...", "info");
    try {
      const result = await createManagedForm(form, email);
      const formUrl = result.formUrl || result.nativeFormUrl || result.opnformFormUrl || result.responderUri || result.data?.formUrl || result.data?.nativeFormUrl || result.data?.opnformFormUrl || result.data?.responderUri;
      if (!formUrl) {
        setStatus(form, "報名表已建立，但沒有取得公開網址。", "warn");
        return null;
      }

      persistFormUrl(form, formUrl, result);
      const providerName = result.provider === "native_form" ? "自建" : (result.provider === "opnform" ? "OpnForm" : "Google");
      setStatus(form, options.auto ? `活動已建立，${providerName} 報名表已產生。` : `${providerName} 報名表已產生並寫入活動。`, "ok");
      return formUrl;
    } catch (error) {
      setStatus(form, error?.message || engineInactiveMessage, "warn");
      return null;
    }
  }

  function createPanel() {
    return `<div class="form-engine-panel" data-form-engine-panel>
      <strong>報名表會自動建立</strong>
      <span>請先填完活動資料與下方題目設定，最後按「建立活動與產生報名表」。系統會建立活動、產生 Google 報名表，並把報名網址寫回活動。</span>
      <div class="form-engine-status" data-form-engine-status data-tone="info">不需要手填網址；若已有既有表單，可在備援欄位貼上。</div>
    </div>`;
  }

  function editPanel() {
    return `<div class="form-engine-panel" data-form-engine-panel>
      <strong>報名表</strong>
      <span>這個活動若還沒有報名表，按下方按鈕產生即可。既有 Google 表單只在特殊情況才需要貼網址。</span>
      <div class="form-engine-actions">
        <button class="btn" type="button" data-generate-google-form>產生 / 重新產生報名表</button>
        <button class="btn" type="button" data-toggle-form-url>貼上既有網址</button>
      </div>
      <div class="form-engine-status" data-form-engine-status data-tone="info">產生後會自動寫回活動資料。</div>
    </div>`;
  }

  function enhanceCreateForm(form) {
    const submit = form.querySelector("button[type='submit']");
    const formUrlField = form.querySelector("input[name='formUrl']")?.closest(".field");
    if (formUrlField) {
      formUrlField.classList.add("form-url-backup");
      formUrlField.hidden = true;
    }
    if (submit && !form.querySelector("[data-form-engine-panel]")) {
      submit.insertAdjacentHTML("beforebegin", createPanel());
    }
    if (submit) submit.textContent = "建立活動與產生報名表";
  }

  function enhanceEditForm(form) {
    const formUrlInput = form.querySelector("input[name='formUrl']");
    const formUrlField = formUrlInput?.closest(".field");
    if (!formUrlField || form.querySelector("[data-form-engine-panel]")) return;

    const label = formUrlField.querySelector("label");
    if (label) label.textContent = "既有報名表網址（選填）";
    if (formUrlInput) formUrlInput.placeholder = "已有 Google 表單時貼這裡；沒有就按上方產生";
    formUrlField.hidden = true;
    formUrlField.insertAdjacentHTML("beforebegin", editPanel());
    form.querySelector("[data-generate-google-form]")?.addEventListener("click", () => generateForm(form));
    form.querySelector("[data-toggle-form-url]")?.addEventListener("click", () => {
      formUrlField.hidden = !formUrlField.hidden;
      if (!formUrlField.hidden) formUrlInput?.focus();
    });
  }

  function enhanceForm(form) {
    if (!form || form.dataset.googleFormEngineReady) return;
    form.dataset.googleFormEngineReady = "true";
    if (form.id === "activity-form") enhanceCreateForm(form);
    if (form.id === "drawer-activity") enhanceEditForm(form);
  }

  function ensureStyle() {
    if (document.querySelector("#google-form-engine-style")) return;
    const style = document.createElement("style");
    style.id = "google-form-engine-style";
    style.textContent = `
      .form-engine-panel{display:grid;gap:8px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:14px;color:#064e3b}
      .form-engine-panel strong{display:block;color:#064e3b}
      .form-engine-panel span{display:block;color:#166534;font-size:13px;line-height:1.5}
      .form-engine-panel .btn{width:max-content}
      .form-engine-actions{display:flex;flex-wrap:wrap;gap:8px}
      .form-engine-status{font-size:13px;line-height:1.5;color:#166534}
      .form-engine-status[data-tone="warn"]{color:#b45309}
      .form-engine-status[data-tone="ok"]{color:#027a48;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function install() {
    ensureStyle();
    document.querySelectorAll("#activity-form,#drawer-activity").forEach(enhanceForm);
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === "activity-form") {
      const url = trim(form.formUrl?.value);
      setTimeout(() => {
        if (url) persistFormUrl(form, url);
        else generateForm(form, { auto: true });
      }, 80);
    }

    if (form.id === "drawer-activity") {
      const url = trim(form.formUrl?.value);
      if (url) setTimeout(() => persistFormUrl(form, url), 0);
    }
  }, true);

  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
})();
