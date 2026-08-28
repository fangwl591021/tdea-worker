(() => {
  // 此腳本是既有活動編輯表單唯一的儲存擁有者。app.js 的舊流程僅在
  // canonical 編輯器未載入時作為備援，避免兩條路徑互相覆寫欄位。
  window.__tdeaCanonicalActivitySaveOwner = true;
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const numericKeys = new Set(["capacity","checkinPoints","feePoints","paymentAmount","reg","check"]);
  const systemFieldKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
  const configurableSystemFieldKeys = new Set(["gender","isMember","meal","imageUpload"]);
  const activityKeys = [
    "id","templateMode","name","type","courseTime","deadline","capacity","checkinPoints","feePoints","paymentAmount",
    "remittanceInfo","registrationMode","reg","check","status","formUrl","detailText","posterUrl","galleryUrls","nativeFormUrl","youtubeUrl"
  ];

  function storedValue(...keys) {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (String(value).trim()) return String(value).trim();
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

  function cleanUrlList(value) {
    const seen = new Set();
    const flatten = (input) => Array.isArray(input) ? input.flatMap(flatten) : String(input || "").split(/[\n,]+/);
    return flatten(value).map((x) => String(x || "").trim()).filter((x) => /^https?:\/\//i.test(x)).filter((x) => {
      if (seen.has(x)) return false;
      seen.add(x);
      return true;
    });
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function isActivityForm(form) {
    // HTMLFormElement exposes named controls as properties. Because this form
    // contains <input name="id">, form.id resolves to that input instead of
    // the form's id attribute in real browsers.
    return form instanceof HTMLFormElement && form.getAttribute("id") === "drawer-activity";
  }

  function fieldLabelKey(field) {
    return cleanText(field?.label).toLowerCase().replace(/\s+/g, " ");
  }

  function deletedFieldIdentities(form) {
    return Array.isArray(form.__tdeaDeletedCustomFields) ? form.__tdeaDeletedCustomFields : [];
  }

  function rememberDeletedField(form, row) {
    const key = cleanText(row?.dataset?.fieldKey);
    const label = cleanText(row?.querySelector("[name='customLabel']")?.value);
    const identity = { key, label };
    if (!key && !label) return;
    const deleted = deletedFieldIdentities(form);
    if (!deleted.some((item) => cleanText(item.key) === key && fieldLabelKey(item) === fieldLabelKey(identity))) {
      deleted.push(identity);
    }
    form.__tdeaDeletedCustomFields = deleted;
    const live = form.__tdeaRegistrationSettings;
    if (live && typeof live === "object") {
      const keep = (field) => !(key && cleanText(field?.key) === key) && !(label && fieldLabelKey(field) === fieldLabelKey(identity));
      if (Array.isArray(live.fields)) live.fields = live.fields.filter(keep);
      if (Array.isArray(live.customFields)) live.customFields = live.customFields.filter(keep);
    }
  }

  function deletedOptionRecords(form) {
    return Array.isArray(form.__tdeaDeletedCustomOptions) ? form.__tdeaDeletedCustomOptions : [];
  }

  function rememberDeletedOption(form, row, optionRow) {
    const option = cleanText(optionRow?.querySelector("[name='customOption']")?.value);
    if (!option) return;
    const record = {
      fieldKey:cleanText(row?.dataset?.fieldKey),
      fieldLabel:cleanText(row?.querySelector("[name='customLabel']")?.value),
      option
    };
    const deleted = deletedOptionRecords(form);
    if (!deleted.some((item) =>
      cleanText(item.fieldKey) === record.fieldKey &&
      fieldLabelKey({ label:item.fieldLabel }) === fieldLabelKey({ label:record.fieldLabel }) &&
      cleanText(item.option) === record.option
    )) deleted.push(record);
    form.__tdeaDeletedCustomOptions = deleted;
    const live = form.__tdeaRegistrationSettings;
    if (live && typeof live === "object") {
      const update = (field) => {
        const matches = (record.fieldKey && cleanText(field?.key) === record.fieldKey) ||
          (record.fieldLabel && fieldLabelKey(field) === fieldLabelKey({ label:record.fieldLabel }));
        if (!matches || !Array.isArray(field.options)) return field;
        return { ...field, options:field.options.filter((value) => cleanText(value) !== record.option) };
      };
      if (Array.isArray(live.fields)) live.fields = live.fields.map(update);
      if (Array.isArray(live.customFields)) live.customFields = live.customFields.map(update);
    }
  }

  async function uploadFile(file, activityId) {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", `activities/${activityId || "poster"}`);
    const response = await fetch(`${api}/api/uploads`, { method:"POST", headers:headers(), body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "圖片上傳失敗");
    const url = cleanText(result.url || result.data?.url);
    if (!url) throw new Error("圖片已上傳，但伺服器未回傳圖片網址");
    return url;
  }

  function setStatus(form, text, error = false) {
    let node = form.querySelector("[data-canonical-save-status]");
    if (!node) {
      node = document.createElement("div");
      node.dataset.canonicalSaveStatus = "1";
      node.style.cssText = "margin-top:10px;font-weight:800;font-size:14px;";
      form.querySelector("button[type='submit']")?.insertAdjacentElement("afterend", node);
    }
    node.textContent = text || "";
    node.style.color = error ? "#b42318" : "#067647";
  }

  async function currentCanonical(id) {
    const response = await fetch(`${api}/api/admin-activities/${encodeURIComponent(id)}/canonical`, { headers:headers(), cache:"no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "無法讀取正式活動資料");
    return result;
  }

  function activityFromForm(form, base = {}) {
    const fd = new FormData(form);
    const next = { ...base };
    activityKeys.forEach((key) => {
      if (!fd.has(key)) return;
      let value = fd.get(key);
      if (numericKeys.has(key)) value = Number(value || 0);
      else value = String(value ?? "");
      next[key] = value;
    });
    next.id = String(fd.get("id") || base.id || "").trim();
    next.galleryUrls = cleanUrlList(fd.has("galleryUrls") ? fd.get("galleryUrls") : (base.galleryUrls || ""));
    if (next.posterUrl) next.imageUrl = next.posterUrl;
    return next;
  }

  function preserveFieldKey(label, canonicalFields, fallback) {
    const wanted = cleanText(label).toLowerCase().replace(/\s+/g, " ");
    const found = canonicalFields.find((field) => fieldLabelKey(field) === wanted);
    return cleanText(found?.key) || fallback;
  }

  function collectStructuredCustomFields(form, canonicalFields) {
    const rows = [...form.querySelectorAll("[data-custom-field]")];
    if (!rows.length) return null;
    return rows.map((row, index) => {
      const label = cleanText(row.querySelector("[name='customLabel']")?.value);
      if (!label) return null;
      const type = cleanText(row.querySelector("[name='customType']")?.value || "text");
      const options = [...row.querySelectorAll("[name='customOption']")]
        .map((input) => cleanText(input.value))
        .filter(Boolean);
      return {
        key: preserveFieldKey(label, canonicalFields, `custom_${index + 1}`),
        label,
        type,
        required: Boolean(row.querySelector("[name='customRequired']")?.checked),
        ...(options.length ? { options } : {})
      };
    }).filter(Boolean);
  }

  function collectSessionsFromDom(form, canonicalSessions) {
    const rows = [...form.querySelectorAll("[data-session-row]")];
    if (!rows.length) return null;
    return rows.map((row, index) => {
      const name = cleanText(row.querySelector("[name='sessionName']")?.value);
      const startTime = cleanText(row.querySelector("[name='sessionTime']")?.value);
      const capacity = Number(row.querySelector("[name='sessionCapacity']")?.value || 0) || 0;
      const previous = canonicalSessions[index] || {};
      return {
        ...previous,
        id: cleanText(previous.id) || `session_${index + 1}`,
        name,
        startTime,
        capacity,
        status: cleanText(previous.status) || "open"
      };
    }).filter((session) => session.name);
  }

  function dedupeByLabelPreferLast(fields) {
    const seen = new Set();
    const out = [];
    for (let i = fields.length - 1; i >= 0; i -= 1) {
      const field = fields[i];
      const identity = fieldLabelKey(field) || cleanText(field?.key);
      if (!identity || seen.has(identity)) continue;
      seen.add(identity);
      out.push(field);
    }
    return out.reverse();
  }

  function settingsFromForm(form, canonical) {
    const live = form.__tdeaRegistrationSettings && typeof form.__tdeaRegistrationSettings === "object"
      ? form.__tdeaRegistrationSettings
      : {};
    const previous = canonical?.form?.settings && typeof canonical.form.settings === "object" ? canonical.form.settings : {};
    const canonicalFields = Array.isArray(canonical?.form?.fields) ? canonical.form.fields : [];
    const canonicalSessions = Array.isArray(canonical?.form?.sessions) ? canonical.form.sessions : [];
    const settings = { ...previous, ...live };

    settings.registrationMode = cleanText(form.querySelector("[name='registrationMode']")?.value || settings.registrationMode || "form");
    settings.requireImageUpload = cleanText(form.querySelector("[name='requireImageUpload']")?.value || "N");
    settings.genderField = cleanText(form.querySelector("[name='genderField']")?.value || "none");
    settings.memberField = cleanText(form.querySelector("[name='memberField']")?.value || "none");
    settings.mealField = cleanText(form.querySelector("[name='mealField']")?.value || "none");

    const liveFields = Array.isArray(live.fields) ? live.fields : [];
    const sourceFields = liveFields.length ? liveFields : canonicalFields;
    const systemFields = sourceFields.filter((field) =>
      systemFieldKeys.has(cleanText(field?.key)) && !configurableSystemFieldKeys.has(cleanText(field?.key))
    );
    const previousSystemField = (key, fallback) => sourceFields.find((field) => cleanText(field?.key) === key) || fallback;
    if (settings.genderField !== "none") {
      systemFields.push({
        ...previousSystemField("gender", { key:"gender", label:"性別", type:"choice", options:["男","女","不便透露"] }),
        required: settings.genderField === "required"
      });
    }
    if (settings.memberField !== "none" && settings.memberField !== "login") {
      systemFields.push({
        ...previousSystemField("isMember", { key:"isMember", label:"是否為會員", type:"choice", options:["是","否","不確定"] }),
        required: settings.memberField === "required"
      });
    }
    if (settings.mealField !== "none") {
      systemFields.push({
        ...previousSystemField("meal", { key:"meal", label:"用餐選項", type:"choice", options:["葷","素"] }),
        required: settings.mealField === "required"
      });
    }
    if (settings.requireImageUpload === "Y") {
      systemFields.push({
        ...previousSystemField("imageUpload", { key:"imageUpload", label:"附件上傳", type:"file" }),
        required: false
      });
    }

    const domCustomFields = collectStructuredCustomFields(form, canonicalFields);
    const fallbackCustomFields = Array.isArray(live.customFields)
      ? live.customFields
      : canonicalFields.filter((field) => !systemFieldKeys.has(cleanText(field?.key)));
    const customFields = domCustomFields ?? fallbackCustomFields;

    const fields = dedupeByLabelPreferLast([...systemFields, ...customFields]);
    const domSessions = collectSessionsFromDom(form, canonicalSessions);
    const sessions = domSessions ?? (Array.isArray(live.sessions) ? live.sessions : canonicalSessions);

    settings.fields = fields;
    settings.customFields = customFields;
    const catalogMode = cleanText(form.querySelector("[name='catalogBillingMode']")?.value);
    if (catalogMode === "catalog_paid") {
      const catalogPricing = window.TDEACatalogPricing?.normalize(form.__tdeaCatalogPricing);
      if (!catalogPricing?.items?.length) throw new Error("請至少建立一個收費項目與報名方案");
      settings.billingMode = "catalog_paid";
      settings.catalogPricing = catalogPricing;
    }
    settings.sessions = sessions;
    return { settings, fields, sessions };
  }

  document.addEventListener("click", (event) => {
    const optionButton = event.target.closest?.(".custom-option-remove");
    const optionRow = optionButton?.closest?.(".custom-option-row");
    const optionField = optionButton?.closest?.("[data-custom-field]");
    const optionForm = optionButton?.closest?.("form");
    if (isActivityForm(optionForm) && optionField && optionRow) {
      rememberDeletedOption(optionForm, optionField, optionRow);
      return;
    }
    const button = event.target.closest?.("[data-remove-custom-field]");
    const row = button?.closest?.("[data-custom-field]");
    const form = button?.closest?.("form");
    if (isActivityForm(form) && row) rememberDeletedField(form, row);
  }, true);

  async function handleCanonicalActivitySubmit(event) {
    const form = event.target;
    if (!isActivityForm(form)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.dataset.canonicalSaving === "true") return;
    form.dataset.canonicalSaving = "true";
    const button = form.querySelector("button[type='submit']");
    const oldText = button?.textContent || "儲存";
    if (button) { button.disabled = true; button.textContent = "儲存中..."; }

    try {
      const id = String(form.querySelector("[name='id']")?.value || "").trim();
      if (!id) throw new Error("缺少活動 ID");
      setStatus(form, "讀取正式資料...");
      const canonical = await currentCanonical(id);
      const activity = activityFromForm(form, canonical.activity || {});
      const deletedFields = deletedFieldIdentities(form);
      const deletedOptions = deletedOptionRecords(form);

      if (cleanText(form.querySelector("[name='catalogBillingMode']")?.value) === "catalog_paid") {
        activity.billingMode = "catalog_paid";
        activity.catalogPricing = window.TDEACatalogPricing?.normalize(form.__tdeaCatalogPricing);
      }

      const posterFile = form.querySelector("[data-activity-poster-file]")?.files?.[0];
      if (posterFile) {
        setStatus(form, "主圖上傳中...");
        activity.posterUrl = await uploadFile(posterFile, id);
        activity.imageUrl = activity.posterUrl;
      }

      const galleryFiles = [...(form.querySelector("[data-activity-gallery-file]")?.files || [])];
      if (galleryFiles.length) {
        const uploaded = [];
        for (let i = 0; i < galleryFiles.length; i += 1) {
          setStatus(form, `圖集上傳中 ${i + 1}/${galleryFiles.length}...`);
          const url = await uploadFile(galleryFiles[i], id);
          if (url) uploaded.push(url);
        }
        activity.galleryUrls = cleanUrlList([activity.galleryUrls, uploaded]);
      }

      const { settings, fields, sessions } = settingsFromForm(form, canonical);
      settings.registrationMode = activity.registrationMode || settings.registrationMode || "form";
      if (activity.posterUrl) settings.posterUrl = activity.posterUrl;
      if (activity.galleryUrls) settings.galleryUrls = activity.galleryUrls;
      if (activity.youtubeUrl) settings.youtubeUrl = activity.youtubeUrl;

      setStatus(form, `寫入正式活動資料（${fields.length} 個欄位）...`);
      const response = await fetch(`${api}/api/admin-activities/${encodeURIComponent(id)}/canonical`, {
        method:"PUT",
        headers:headers({ "content-type":"application/json" }),
        body:JSON.stringify({ formId:canonical.formId, activity, settings, fields, sessions, deletedFields, deletedOptions })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "正式資料儲存失敗");

      const verify = await currentCanonical(id);
      if (!verify?.form || !Array.isArray(verify.form.fields)) throw new Error("儲存後驗證失敗");
      const savedByLabel = new Map(verify.form.fields.map((field) => [fieldLabelKey(field), field]));
      for (const expected of fields) {
        const saved = savedByLabel.get(fieldLabelKey(expected));
        if (!saved) throw new Error(`欄位「${expected.label}」儲存驗證失敗`);
        const wanted = Array.isArray(expected.options) ? expected.options.map(cleanText) : [];
        const got = Array.isArray(saved.options) ? saved.options.map(cleanText) : [];
        if (wanted.join("\u0001") !== got.join("\u0001")) {
          throw new Error(`欄位「${saved.label}」儲存驗證失敗`);
        }
      }
      for (const deleted of deletedFields) {
        const remained = verify.form.fields.find((field) =>
          (cleanText(deleted.key) && cleanText(field?.key) === cleanText(deleted.key)) ||
          (fieldLabelKey(deleted) && fieldLabelKey(field) === fieldLabelKey(deleted))
        );
        if (remained) throw new Error(`欄位「${deleted.label || remained.label}」刪除驗證失敗`);
      }
      for (const deleted of deletedOptions) {
        const savedField = verify.form.fields.find((field) =>
          (cleanText(deleted.fieldKey) && cleanText(field?.key) === cleanText(deleted.fieldKey)) ||
          (fieldLabelKey({ label:deleted.fieldLabel }) && fieldLabelKey(field) === fieldLabelKey({ label:deleted.fieldLabel }))
        );
        if (savedField && (savedField.options || []).some((value) => cleanText(value) === cleanText(deleted.option))) {
          throw new Error(`選項「${deleted.option}」刪除驗證失敗`);
        }
      }
      if (cleanText(verify.activity?.status) !== cleanText(activity.status)) {
        throw new Error("活動狀態儲存驗證失敗");
      }
      const expectedGallery = cleanUrlList(activity.galleryUrls);
      const savedGallery = cleanUrlList(verify.activity?.galleryUrls);
      if (expectedGallery.join("\u0001") !== savedGallery.join("\u0001")) {
        throw new Error("輪播圖儲存驗證失敗");
      }
      form.__tdeaRegistrationSettings = { ...(verify.form.settings || {}), fields:verify.form.fields, sessions:verify.form.sessions || [] };
      const posterInput = form.querySelector("[name='posterUrl']");
      if (posterInput && verify.activity?.posterUrl) posterInput.value = verify.activity.posterUrl;
      const galleryInput = form.querySelector("[name='galleryUrls']");
      if (galleryInput) galleryInput.value = cleanUrlList(verify.activity?.galleryUrls || []).join("\n");
      window.dispatchEvent(new CustomEvent("tdea:activity-canonical-saved", {
        detail: { activity:verify.activity, form:verify.form, formId:verify.formId }
      }));
      form.__tdeaDeletedCustomFields = [];
      form.__tdeaDeletedCustomOptions = [];
      setStatus(form, `已儲存並驗證（${verify.form.fields.length} 個欄位）`);
    } catch (error) {
      setStatus(form, error?.message || "儲存失敗", true);
    } finally {
      delete form.dataset.canonicalSaving;
      if (button) { button.disabled = false; button.textContent = oldText; }
    }
  }

  function bindCanonicalActivityForm(form) {
    if (!isActivityForm(form) || form.dataset.canonicalSubmitBound === "true") return;
    form.dataset.canonicalSubmitBound = "true";
    form.addEventListener("submit", handleCanonicalActivitySubmit);
  }

  function bindCanonicalActivityForms() {
    document.querySelectorAll("#drawer-activity").forEach(bindCanonicalActivityForm);
  }

  // capture listener 處理一般瀏覽器提交；直接綁表單則涵蓋不冒泡的程式化提交，
  // 並確保 app.js 每次重畫抽屜後產生的新 form 都有唯一 canonical 儲存者。
  document.addEventListener("submit", handleCanonicalActivitySubmit, true);
  const formObserver = new MutationObserver(bindCanonicalActivityForms);
  if (document.body) formObserver.observe(document.body, { childList:true, subtree:true });
  bindCanonicalActivityForms();
})();
