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

  function snapshot(form) {
    const fields = collectFields(form);
    const activityId = clean(form.elements?.id?.value);
    const activityNo = clean(form.elements?.activityNo?.value);
    const nativeUrl = clean(form.elements?.nativeFormUrl?.value || form.elements?.formUrl?.value);
    const formId = formIdFromUrl(nativeUrl) || activityId || activityNo;
    return { fields, activityId, activityNo, formId };
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
    const submit = form.querySelector("button[type='submit']");
    submit?.insertAdjacentElement("beforebegin", node);
    return node;
  }

  function setStatus(form, text, error = false) {
    const node = statusNode(form || currentForm());
    if (!node) return;
    node.textContent = text;
    node.style.color = error ? "#b42318" : "#027a48";
  }

  function sameOptions(expected, actual) {
    const left = (Array.isArray(expected) ? expected : []).map(clean).filter(Boolean);
    const right = (Array.isArray(actual) ? actual : []).map(clean).filter(Boolean);
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  async function verifySaved(data) {
    const verify = await nativeFetch(`/api/native-forms/${encodeURIComponent(data.formId)}?ts=${Date.now()}`, {
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
    for (const field of data.fields) {
      const saved = savedFields.find((item) => clean(item?.label) === field.label);
      if (!saved) {
        missing.push(field);
        continue;
      }
      if (field.options?.length && !sameOptions(field.options, saved.options)) optionMismatch.push(field);
    }
    return { ok: !missing.length && !optionMismatch.length, missing, optionMismatch };
  }

  async function directWrite(data) {
    const response = await nativeFetch(`/api/native-forms/${encodeURIComponent(data.formId)}/direct-fields`, {
      method: "PUT",
      headers: headers({ "content-type":"application/json" }),
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "自訂題目同步失敗");
    return { ...data, formId: clean(result.formId) || data.formId };
  }

  async function waitForLegacySaveToFinish() {
    // 舊流程會先更新 Native Form；等它完成後再做最後一次 authoritative write，避免把新選項洗回舊值。
    await wait(250);
    const started = Date.now();
    while (Date.now() - started < 12000) {
      const form = currentForm();
      const submit = form?.querySelector("button[type='submit']");
      const busy = form?.dataset.uploading === "true" || Boolean(submit?.disabled);
      if (!busy) {
        await wait(250);
        return;
      }
      await wait(150);
    }
  }

  async function syncSnapshot(data, form) {
    if (!data.formId || !data.fields.length) return;
    setStatus(form, "活動內容已儲存；等待報名表既有流程完成後同步最新題目…");
    try {
      await waitForLegacySaveToFinish();
      let authoritative = await directWrite(data);
      let checked = await verifySaved(authoritative);

      // 防止舊流程較晚完成又覆蓋：短時間內再驗證兩次，有異常就自動修復回管理者最後送出的版本。
      for (const delay of [1200, 2500]) {
        await wait(delay);
        checked = await verifySaved(authoritative);
        if (!checked.ok) authoritative = await directWrite(authoritative);
      }
      checked = await verifySaved(authoritative);
      if (checked.missing.length) throw new Error("前台報名表仍缺少：" + checked.missing.map((field) => field.label).join("、"));
      if (checked.optionMismatch.length) throw new Error("前台選項未完整保存：" + checked.optionMismatch.map((field) => field.label).join("、"));
      setStatus(currentForm() || form, `自訂題目已同步完成（${data.fields.length} 題），前台報名表與選項已確認一致。`);
    } catch (error) {
      setStatus(currentForm() || form, error?.message || "自訂題目同步失敗", true);
    }
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-activity") return;
    // 在任何 render / async save 發生前先快照使用者此刻真正輸入的題目與選項。
    const data = snapshot(form);
    if (!data.formId || !data.fields.length) return;
    setTimeout(() => syncSnapshot(data, form), 0);
  }, true);
})();
