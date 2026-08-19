(() => {
  if (window.__tdeaCustomFieldDirectSyncInstalled) return;
  window.__tdeaCustomFieldDirectSyncInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  const clean = (v) => String(v ?? "").trim();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function storedValue(...keys) {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (clean(value)) return clean(value);
    }
    return "";
  }

  function headers(extra = {}) {
    const h = { ...extra };
    const email = storedValue("tdea-admin-email");
    const memberNo = storedValue("tdea-admin-member-no", "tdea-member-no");
    const uid = storedValue("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId");
    if (email) h["x-admin-email"] = email;
    if (memberNo) h["x-admin-member-no"] = memberNo;
    if (uid) h["x-line-user-id"] = uid;
    return h;
  }

  function formIdFromUrl(value) {
    try {
      const url = new URL(value, location.href);
      return clean(url.searchParams.get("register") || url.searchParams.get("formId") || "");
    } catch (_) {
      return "";
    }
  }

  function currentForm() {
    return document.querySelector("#drawer-activity");
  }

  function statusNode(form) {
    if (!form) return null;
    let node = form.querySelector("[data-direct-field-sync-status]");
    if (node) return node;
    node = document.createElement("div");
    node.dataset.directFieldSyncStatus = "";
    node.style.cssText = "margin-top:8px;font-size:13px;font-weight:800;color:#475467";
    form.querySelector("button[type='submit']")?.insertAdjacentElement("beforebegin", node);
    return node;
  }

  function setStatus(form, text, error = false) {
    const node = statusNode(form || currentForm());
    if (!node) return;
    node.textContent = text;
    node.style.color = error ? "#b42318" : "#027a48";
  }

  function normalizeField(field, index) {
    return {
      key: clean(field?.key) || `custom_${index + 1}`,
      label: clean(field?.label),
      type: clean(field?.type) || "text",
      required: field?.required === true,
      options: Array.isArray(field?.options) ? field.options.map(clean).filter(Boolean) : []
    };
  }

  async function waitForRegistrationSettings(form) {
    const started = Date.now();
    while (Date.now() - started < 15000) {
      const settings = form.__tdeaRegistrationSettings;
      const customFields = Array.isArray(settings?.customFields)
        ? settings.customFields.map(normalizeField).filter((field) => field.label)
        : [];
      const submit = form.querySelector("button[type='submit']");
      const busy = form.dataset.uploading === "true" || Boolean(submit?.disabled);
      if (customFields.length && !busy) return customFields;
      await wait(120);
    }
    return [];
  }

  async function directWrite(form, fields) {
    const activityId = clean(form.elements?.id?.value);
    const activityNo = clean(form.elements?.activityNo?.value);
    const nativeUrl = clean(form.elements?.nativeFormUrl?.value || form.elements?.formUrl?.value);
    const formId = formIdFromUrl(nativeUrl) || activityId || activityNo;
    if (!formId) throw new Error("找不到正式報名表 ID");

    const response = await nativeFetch(`/api/native-forms/${encodeURIComponent(formId)}/direct-fields`, {
      method: "PUT",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ activityId, activityNo, formId, fields })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "自訂題目儲存失敗");
    return clean(result.formId) || formId;
  }

  function sameOptions(a, b) {
    const left = (Array.isArray(a) ? a : []).map(clean).filter(Boolean);
    const right = (Array.isArray(b) ? b : []).map(clean).filter(Boolean);
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  async function verify(formId, fields) {
    const response = await nativeFetch(`/api/native-forms/${encodeURIComponent(formId)}?ts=${Date.now()}`, {
      headers: headers(), cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    const saved = Array.isArray(payload?.data?.fields)
      ? payload.data.fields
      : Array.isArray(payload?.data?.form?.fields) ? payload.data.form.fields : [];

    for (const field of fields) {
      const hit = saved.find((item) => clean(item?.label) === field.label);
      if (!hit) throw new Error(`前台缺少題目：${field.label}`);
      if (field.options.length && !sameOptions(field.options, hit.options)) {
        throw new Error(`前台選項未保存：${field.label}`);
      }
    }
  }

  async function sync(form) {
    setStatus(form, "活動內容已儲存；正在寫入報名題目…");
    try {
      const fields = await waitForRegistrationSettings(form);
      if (!fields.length) throw new Error("沒有取得本次儲存的報名題目資料");
      const formId = await directWrite(form, fields);
      await verify(formId, fields);
      setStatus(currentForm() || form, `報名題目已儲存（${fields.length} 題），前台已確認一致。`);
    } catch (error) {
      setStatus(currentForm() || form, error?.message || "報名題目儲存失敗", true);
    }
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-activity") return;
    // 不再自己解析畫面 DOM。只使用 app.js 已組好的 registrationSettings 作為唯一資料來源。
    setTimeout(() => sync(form), 0);
  }, true);
})();