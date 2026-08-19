(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const numericKeys = new Set(["capacity","checkinPoints","feePoints","paymentAmount","reg","check"]);
  const systemFieldKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
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

  async function uploadFile(file, activityId) {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", `activities/${activityId || "poster"}`);
    const response = await fetch(`${api}/api/uploads`, { method:"POST", headers:headers(), body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "圖片上傳失敗");
    return result.url || "";
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
    next.galleryUrls = cleanUrlList(fd.get("galleryUrls") || base.galleryUrls || "");
    if (next.posterUrl) next.imageUrl = next.posterUrl;
    return next;
  }

  function settingsFromForm(form, canonical) {
    const live = form.__tdeaRegistrationSettings && typeof form.__tdeaRegistrationSettings === "object"
      ? form.__tdeaRegistrationSettings
      : {};
    const previous = canonical?.form?.settings && typeof canonical.form.settings === "object" ? canonical.form.settings : {};
    const settings = { ...previous, ...live };
    const fields = Array.isArray(live.fields) && live.fields.length
      ? live.fields
      : (Array.isArray(canonical?.form?.fields) ? canonical.form.fields : []);
    const sessions = Array.isArray(live.sessions)
      ? live.sessions
      : (Array.isArray(canonical?.form?.sessions) ? canonical.form.sessions : []);
    const customFields = Array.isArray(live.customFields)
      ? live.customFields
      : fields.filter((field) => !systemFieldKeys.has(String(field?.key || "").trim()));
    settings.fields = fields;
    settings.customFields = customFields;
    settings.sessions = sessions;
    return { settings, fields, sessions };
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-activity") return;

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

      setStatus(form, "寫入正式活動資料...");
      const response = await fetch(`${api}/api/admin-activities/${encodeURIComponent(id)}/canonical`, {
        method:"PUT",
        headers:headers({ "content-type":"application/json" }),
        body:JSON.stringify({ formId:canonical.formId, activity, settings, fields, sessions })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "正式資料儲存失敗");

      const verify = await currentCanonical(id);
      if (!verify?.form || !Array.isArray(verify.form.fields)) throw new Error("儲存後驗證失敗");
      form.__tdeaRegistrationSettings = { ...(verify.form.settings || {}), fields:verify.form.fields, sessions:verify.form.sessions || [] };
      const posterInput = form.querySelector("[name='posterUrl']");
      if (posterInput && verify.activity?.posterUrl) posterInput.value = verify.activity.posterUrl;
      const galleryInput = form.querySelector("[name='galleryUrls']");
      if (galleryInput) galleryInput.value = cleanUrlList(verify.activity?.galleryUrls || []).join("\n");
      setStatus(form, `已儲存並驗證（${verify.form.fields.length} 個欄位）`);
    } catch (error) {
      setStatus(form, error?.message || "儲存失敗", true);
    } finally {
      delete form.dataset.canonicalSaving;
      if (button) { button.disabled = false; button.textContent = oldText; }
    }
  }, true);
})();
