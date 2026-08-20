(() => {
  if (window.__tdeaActivityCanonicalHotfixV2) return;
  window.__tdeaActivityCanonicalHotfixV2 = true;

  const clean = (v) => String(v ?? "").trim();
  const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
  const numericKeys = new Set(["capacity","checkinPoints","feePoints","paymentAmount","reg","check"]);
  const activityKeys = ["templateMode","name","type","courseTime","deadline","capacity","checkinPoints","feePoints","paymentAmount","remittanceInfo","registrationMode","reg","check","status","detailText","formUrl","nativeFormUrl","posterUrl","galleryUrls","youtubeUrl"];

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

  const labelKey = (v) => clean(v).toLowerCase().replace(/\s+/g, " ");

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

  function snapshotCustomFields(form) {
    return [...form.querySelectorAll("[data-custom-field]")].map((row, index) => {
      const label = clean(row.querySelector("[name='customLabel']")?.value);
      if (!label) return null;
      const type = clean(row.querySelector("[name='customType']")?.value || "text");
      const options = [...row.querySelectorAll("[name='customOption'], .custom-option-input")]
        .map((input) => clean(input.value)).filter(Boolean);
      return {
        key: clean(row.dataset.fieldKey) || `custom_${index + 1}`,
        label,
        type,
        required: Boolean(row.querySelector("[name='customRequired']")?.checked),
        ...(options.length ? { options } : {})
      };
    }).filter(Boolean);
  }

  function snapshotSessions(form, fallback = []) {
    const rows = [...form.querySelectorAll("[data-session-row]")];
    if (!rows.length) return fallback;
    return rows.map((row, index) => ({
      ...(fallback[index] || {}),
      id: clean(fallback[index]?.id) || `session_${index + 1}`,
      name: clean(row.querySelector("[name='sessionName']")?.value),
      startTime: clean(row.querySelector("[name='sessionTime']")?.value),
      capacity: Number(row.querySelector("[name='sessionCapacity']")?.value || 0) || 0,
      status: clean(fallback[index]?.status) || "open"
    })).filter((x) => x.name);
  }

  function activityFromForm(form, current) {
    const fd = new FormData(form);
    const next = { ...(current || {}) };
    for (const key of activityKeys) {
      if (!fd.has(key)) continue;
      let value = fd.get(key);
      value = numericKeys.has(key) ? Number(value || 0) : String(value ?? "");
      next[key] = value;
    }
    return next;
  }

  async function getCanonical(id) {
    const response = await fetch(`/api/admin-activities/${encodeURIComponent(id)}/canonical?ts=${Date.now()}`, {
      headers: headers(), cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.form) throw new Error(result.message || "無法讀取正式報名表");
    return result;
  }

  function mergeFields(currentFields, snapshot) {
    const byLabel = new Map((currentFields || []).map((field) => [labelKey(field.label), field]));
    const systemFields = (currentFields || []).filter((field) => systemKeys.has(clean(field.key)));
    const customFields = snapshot.map((field, index) => {
      const previous = byLabel.get(labelKey(field.label));
      return {
        ...field,
        key: clean(previous?.key) || clean(field.key) || `custom_${index + 1}`
      };
    });
    return { fields: [...systemFields, ...customFields], customFields };
  }

  async function save(form, id, snapshot) {
    const current = await getCanonical(id);
    const activity = activityFromForm(form, current.activity || current.form.activity || {});
    const merged = mergeFields(Array.isArray(current.form.fields) ? current.form.fields : [], snapshot);
    const sessions = snapshotSessions(form, Array.isArray(current.form.sessions) ? current.form.sessions : []);
    const settings = {
      ...(current.form.settings || {}),
      registrationMode: clean(form.querySelector("[name='registrationMode']")?.value || activity.registrationMode || current.form.settings?.registrationMode || "form"),
      requireImageUpload: clean(form.querySelector("[name='requireImageUpload']")?.value || current.form.settings?.requireImageUpload || "N"),
      genderField: clean(form.querySelector("[name='genderField']")?.value || current.form.settings?.genderField || "none"),
      memberField: clean(form.querySelector("[name='memberField']")?.value || current.form.settings?.memberField || "none"),
      mealField: clean(form.querySelector("[name='mealField']")?.value || current.form.settings?.mealField || "none"),
      fields: merged.fields,
      customFields: merged.customFields,
      sessions
    };

    const response = await fetch(`/api/admin-activities/${encodeURIComponent(id)}/canonical`, {
      method: "PUT",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ formId: current.formId, activity, settings, fields: merged.fields, sessions })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "活動儲存失敗");

    const verify = await getCanonical(id);
    const savedByLabel = new Map((verify.form.fields || []).map((field) => [labelKey(field.label), field]));
    for (const expected of merged.customFields) {
      const actual = savedByLabel.get(labelKey(expected.label));
      if (!actual) throw new Error(`題目「${expected.label}」未保存`);
      const wanted = Array.isArray(expected.options) ? expected.options.map(clean) : [];
      const got = Array.isArray(actual.options) ? actual.options.map(clean) : [];
      if (wanted.join("\u0001") !== got.join("\u0001")) throw new Error(`題目「${expected.label}」選項未保存`);
    }
    return verify;
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-activity") return;

    // Canonical V2 owns this save completely. Do not allow app.js / fast-save / form-builder to write stale copies afterward.
    event.preventDefault();
    event.stopImmediatePropagation();

    if (form.dataset.canonicalHotfixSaving === "true") return;
    form.dataset.canonicalHotfixSaving = "true";
    const button = form.querySelector("button[type='submit']");
    const oldText = button?.textContent || "儲存";
    if (button) { button.disabled = true; button.textContent = "儲存中..."; }

    try {
      const id = clean(form.querySelector("[name='id']")?.value);
      if (!id) throw new Error("缺少活動 ID");
      const snapshot = snapshotCustomFields(form);
      setStatus(form, `正在儲存活動與報名題目（${snapshot.length} 題）...`);
      const verify = await save(form, id, snapshot);
      setStatus(form, `已儲存並驗證（${verify.form.fields.length} 個欄位）`);
    } catch (error) {
      setStatus(form, error?.message || "儲存失敗", true);
    } finally {
      delete form.dataset.canonicalHotfixSaving;
      if (button) { button.disabled = false; button.textContent = oldText; }
    }
  }, true);
})();
