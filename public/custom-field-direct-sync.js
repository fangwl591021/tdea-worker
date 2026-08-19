(() => {
  if (window.__tdeaCustomFieldDirectSyncInstalled) return;
  window.__tdeaCustomFieldDirectSyncInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  const clean = (v) => String(v ?? "").trim();

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

  function collectOptions(card) {
    const nodes = [
      ...card.querySelectorAll("[name='customOption']"),
      ...card.querySelectorAll("[data-custom-option] input"),
      ...card.querySelectorAll(".custom-option-row input")
    ];
    return [...new Set(nodes.map((node) => clean(node.value)).filter(Boolean))];
  }

  function collectFields(form) {
    const cards = [...form.querySelectorAll("[data-custom-field], .custom-question-card")];
    return cards.map((card, index) => {
      const label = clean(card.querySelector("[name='customLabel'], .custom-question-title")?.value);
      const type = clean(card.querySelector("[name='customType'], .custom-question-type")?.value || "text");
      const required = Boolean(card.querySelector("[name='customRequired']")?.checked);
      const existingKey = clean(
        card.dataset.fieldKey ||
        card.querySelector("[name='customKey'], [name='fieldKey'], input[type='hidden'][data-field-key]")?.value
      );
      return {
        key: existingKey || `custom_${index + 1}`,
        label,
        type,
        required,
        options: collectOptions(card)
      };
    }).filter((field) => field.label);
  }

  function statusNode(form) {
    let node = form.querySelector("[data-direct-field-sync-status]");
    if (node) return node;
    node = document.createElement("div");
    node.dataset.directFieldSyncStatus = "";
    node.style.cssText = "margin-top:8px;font-size:13px;font-weight:800;color:#475467";
    const submit = form.querySelector("button[type='submit']");
    submit?.insertAdjacentElement("beforebegin", node);
    return node;
  }

  function setStatus(form, text, error = false) {
    const node = statusNode(form);
    if (!node) return;
    node.textContent = text;
    node.style.color = error ? "#b42318" : "#027a48";
  }

  function sameOptions(expected, actual) {
    const left = (Array.isArray(expected) ? expected : []).map(clean).filter(Boolean);
    const right = (Array.isArray(actual) ? actual : []).map(clean).filter(Boolean);
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  async function sync(form) {
    if (!form || form.id !== "drawer-activity") return;
    const fields = collectFields(form);
    const activityId = clean(form.elements?.id?.value);
    const activityNo = clean(form.elements?.activityNo?.value);
    const nativeUrl = clean(form.elements?.nativeFormUrl?.value || form.elements?.formUrl?.value);
    const formId = formIdFromUrl(nativeUrl) || activityId || activityNo;
    if (!formId || !fields.length) return;

    setStatus(form, "活動內容已儲存；正在同步自訂題目到正式報名表…");
    try {
      const response = await nativeFetch(`/api/native-forms/${encodeURIComponent(formId)}/direct-fields`, {
        method: "PUT",
        headers: headers({ "content-type":"application/json" }),
        body: JSON.stringify({ activityId, activityNo, formId, fields })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "自訂題目同步失敗");

      const verify = await nativeFetch(`/api/native-forms/${encodeURIComponent(result.formId || formId)}?ts=${Date.now()}`, {
        headers: headers(),
        cache: "no-store"
      });
      const verified = await verify.json().catch(() => ({}));
      const savedFields = Array.isArray(verified?.data?.fields)
        ? verified.data.fields
        : Array.isArray(verified?.data?.form?.fields)
          ? verified.data.form.fields
          : [];
      const missing = [];
      const optionMismatch = [];
      for (const field of fields) {
        const saved = savedFields.find((item) => clean(item?.label) === field.label);
        if (!saved) {
          missing.push(field);
          continue;
        }
        if (field.options?.length && !sameOptions(field.options, saved.options)) optionMismatch.push(field);
      }
      if (missing.length) throw new Error("前台報名表仍缺少：" + missing.map((field) => field.label).join("、"));
      if (optionMismatch.length) throw new Error("前台選項未完整保存：" + optionMismatch.map((field) => field.label).join("、"));
      setStatus(form, `自訂題目已同步完成（${fields.length} 題），前台報名表與選項已更新。`);
    } catch (error) {
      setStatus(form, error?.message || "自訂題目同步失敗", true);
    }
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-activity") return;
    setTimeout(() => sync(form), 150);
  }, true);
})();
