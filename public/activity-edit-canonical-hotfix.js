(() => {
  if (window.__tdeaActivityCanonicalHotfix) return;
  window.__tdeaActivityCanonicalHotfix = true;

  const clean = (v) => String(v ?? "").trim();
  const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function storedValue(...keys) {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (clean(value)) return clean(value);
    }
    return "";
  }

  function headers(extra = {}) {
    const email = storedValue("tdea-admin-email").toLowerCase();
    const memberNo = storedValue("tdea-admin-member-no", "tdea-member-no").toUpperCase();
    const lineUserId = storedValue("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId");
    return {
      ...extra,
      ...(email ? { "x-admin-email": email } : {}),
      ...(memberNo ? { "x-admin-member-no": memberNo } : {}),
      ...(lineUserId ? { "x-line-user-id": lineUserId } : {})
    };
  }

  function labelKey(v) {
    return clean(v).toLowerCase().replace(/\s+/g, " ");
  }

  function snapshotCustomFields(form) {
    return [...form.querySelectorAll("[data-custom-field]")].map((row, index) => {
      const label = clean(row.querySelector("[name='customLabel']")?.value);
      if (!label) return null;
      const type = clean(row.querySelector("[name='customType']")?.value || "text");
      const options = [...row.querySelectorAll("[name='customOption'], .custom-option-input")]
        .map((input) => clean(input.value))
        .filter(Boolean);
      return {
        key: clean(row.dataset.fieldKey) || `custom_${index + 1}`,
        label,
        type,
        required: Boolean(row.querySelector("[name='customRequired']")?.checked),
        ...(options.length ? { options } : {})
      };
    }).filter(Boolean);
  }

  async function getCanonical(id) {
    const response = await fetch(`/api/admin-activities/${encodeURIComponent(id)}/canonical?ts=${Date.now()}`, {
      headers: headers(),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.form) throw new Error(result.message || "無法讀取正式報名表");
    return result;
  }

  async function waitForLegacySave(form) {
    const started = Date.now();
    while (Date.now() - started < 12000) {
      if (form.dataset.canonicalSaving !== "true") {
        await sleep(180);
        if (form.dataset.canonicalSaving !== "true") return;
      }
      await sleep(120);
    }
  }

  async function forceCanonical(id, snapshot) {
    const current = await getCanonical(id);
    const currentFields = Array.isArray(current.form.fields) ? current.form.fields : [];
    const currentByLabel = new Map(currentFields.map((field) => [labelKey(field.label), field]));
    const systemFields = currentFields.filter((field) => systemKeys.has(clean(field.key)));
    const customFields = snapshot.map((field, index) => {
      const previous = currentByLabel.get(labelKey(field.label));
      return { ...field, key: clean(previous?.key) || clean(field.key) || `custom_${index + 1}` };
    });
    const fields = [...systemFields, ...customFields];
    const settings = {
      ...(current.form.settings || {}),
      fields,
      customFields,
      sessions: Array.isArray(current.form.sessions) ? current.form.sessions : []
    };

    const response = await fetch(`/api/admin-activities/${encodeURIComponent(id)}/canonical`, {
      method: "PUT",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({
        formId: current.formId,
        activity: current.activity || current.form.activity || {},
        settings,
        fields,
        sessions: settings.sessions
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "報名欄位寫入失敗");

    const verify = await getCanonical(id);
    const saved = new Map((verify.form.fields || []).map((field) => [labelKey(field.label), field]));
    for (const expected of customFields) {
      const actual = saved.get(labelKey(expected.label));
      if (!actual) throw new Error(`題目「${expected.label}」未寫入`);
      const a = Array.isArray(expected.options) ? expected.options.map(clean) : [];
      const b = Array.isArray(actual.options) ? actual.options.map(clean) : [];
      if (a.join("\u0001") !== b.join("\u0001")) throw new Error(`題目「${expected.label}」選項未保存`);
    }
    return verify;
  }

  function setStatus(form, text, error = false) {
    let node = form.querySelector("[data-canonical-hotfix-status]");
    if (!node) {
      node = document.createElement("div");
      node.dataset.canonicalHotfixStatus = "1";
      node.style.cssText = "margin:8px 0;font-size:13px;font-weight:800;";
      form.querySelector("button[type='submit']")?.insertAdjacentElement("beforebegin", node);
    }
    node.textContent = text;
    node.style.color = error ? "#b42318" : "#027a48";
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-activity") return;
    const id = clean(form.querySelector("[name='id']")?.value);
    if (!id) return;
    const snapshot = snapshotCustomFields(form);
    if (!snapshot.length) return;

    (async () => {
      try {
        setStatus(form, "正在同步最新報名題目…");
        await waitForLegacySave(form);
        const verify = await forceCanonical(id, snapshot);
        setStatus(form, `報名題目已同步並驗證（${verify.form.fields.length} 個欄位）`);
      } catch (error) {
        setStatus(form, error?.message || "報名題目同步失敗", true);
      }
    })();
  }, true);
})();
