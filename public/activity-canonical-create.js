(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);

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
    return { ...extra, ...(email ? {"x-admin-email":email} : {}), ...(memberNo ? {"x-admin-member-no":memberNo} : {}), ...(lineUserId ? {"x-line-user-id":lineUserId} : {}) };
  }
  function clean(value) { return String(value ?? "").trim(); }
  function cleanUrlList(value) {
    const seen = new Set();
    const flatten = input => Array.isArray(input) ? input.flatMap(flatten) : String(input || "").split(/[\n,]+/);
    return flatten(value).map(clean).filter(x => /^https?:\/\//i.test(x)).filter(x => !seen.has(x) && seen.add(x));
  }
  function defaultFields(activity) {
    const mode1 = activity.templateMode === "mode1_vendor_visit" || activity.type === "企業參訪" || activity.typeLabel === "企業參訪";
    if (mode1) {
      if (activity.registrationMode === "member_login") return [
        {key:"participantUnit",label:"參加單位名稱",type:"radio",required:true,options:["社團法人台灣設計菁英協會會員","其他"]},
        {key:"note",label:"備註",type:"paragraph",required:false}
      ];
      return [
        {key:"name",label:"姓名",type:"text",required:true},
        {key:"phone",label:"電話",type:"text",required:true},
        {key:"participantUnit",label:"參加單位名稱",type:"radio",required:true,options:["社團法人台灣設計菁英協會會員","其他"]},
        {key:"note",label:"備註",type:"paragraph",required:false}
      ];
    }
    if (activity.registrationMode === "member_login") return [{key:"note",label:"備註",type:"paragraph",required:false}];
    return [
      {key:"name",label:"姓名",type:"text",required:true},
      {key:"phone",label:"手機",type:"text",required:true},
      {key:"email",label:"Email",type:"email",required:true},
      {key:"company",label:"公司/單位",type:"text",required:false},
      {key:"memberNo",label:"會員編號",type:"text",required:false},
      {key:"note",label:"備註",type:"paragraph",required:false}
    ];
  }
  function collectCustomFields(form) {
    return [...form.querySelectorAll("[data-custom-field]")].map((row, index) => ({
      key:`custom_${index + 1}`,
      label:clean(row.querySelector("[name='customLabel']")?.value),
      type:clean(row.querySelector("[name='customType']")?.value) || "text",
      options:[...row.querySelectorAll("[name='customOption']")].map(input => clean(input.value)).filter(Boolean),
      required:Boolean(row.querySelector("[name='customRequired']")?.checked)
    })).filter(field => field.label);
  }
  function collectSessions(form) {
    return [...form.querySelectorAll("[data-session-row]")].map((row, index) => ({
      id:`session_${index + 1}`,
      name:clean(row.querySelector("[name='sessionName']")?.value),
      startTime:clean(row.querySelector("[name='sessionTime']")?.value),
      capacity:Number(row.querySelector("[name='sessionCapacity']")?.value || 0) || 0,
      status:"open"
    })).filter(session => session.name);
  }
  function liveSettings(form, activity) {
    const customFields = collectCustomFields(form);
    const sessions = collectSessions(form);
    const settings = {
      posterUrl:clean(form.posterUrl?.value),
      galleryUrls:cleanUrlList(form.galleryUrls?.value || ""),
      youtubeUrl:clean(form.youtubeUrl?.value),
      registrationMode:clean(form.registrationMode?.value) || activity.registrationMode || "form",
      requireImageUpload:clean(form.requireImageUpload?.value) || "N",
      genderField:clean(form.genderField?.value) || "none",
      memberField:clean(form.memberField?.value) || "none",
      mealField:clean(form.mealField?.value) || "none",
      sessions,
      customFields
    };
    const base = defaultFields(activity);
    const note = base.find(field => field.key === "note");
    const fields = base.filter(field => field.key !== "note");
    if (settings.genderField !== "none") fields.push({key:"gender",label:"性別",type:"radio",options:["男","女","不便透露"],required:settings.genderField === "required"});
    if (settings.memberField !== "login" && settings.memberField !== "none") fields.push({key:"isMember",label:"是否為會員",type:"radio",options:["是","否","不確定"],required:settings.memberField === "required"});
    if (settings.mealField !== "none") fields.push({key:"meal",label:"用餐選項",type:"radio",options:["葷","素"],required:settings.mealField === "required"});
    if (settings.requireImageUpload === "Y") fields.push({key:"imageUpload",label:"附件上傳",type:"file",required:false});
    if (note) fields.push(note);
    fields.push(...customFields);
    return {...settings, fields};
  }
  async function uploadPoster(file, activityId) {
    if (!(file instanceof File) || !file.size) return null;
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", "posters");
    body.append("activityId", activityId);
    const response = await fetch(`${api}/api/uploads`, {method:"POST", headers:headers(), body});
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "活動主圖上傳失敗");
    return result;
  }
  function setButton(form, text, disabled) {
    const button = form.querySelector("button[type='submit']");
    if (!button) return;
    if (!button.dataset.canonicalDefaultText) button.dataset.canonicalDefaultText = button.textContent || "建立活動";
    button.textContent = text || button.dataset.canonicalDefaultText;
    button.disabled = Boolean(disabled);
  }
  function notify(text, error = false) {
    const toast = document.querySelector("#toast");
    if (toast) {
      toast.textContent = text;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2400);
    } else if (error) alert(text);
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "activity-form") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.dataset.canonicalCreating === "true") return;
    form.dataset.canonicalCreating = "true";
    setButton(form, "建立中...", true);
    try {
      const d = Object.fromEntries(new FormData(form));
      const templateMode = clean(d.templateMode) || "custom";
      const registrationMode = clean(d.registrationMode) || (templateMode === "mode1_vendor_visit" ? "member_login" : "form");
      const id = clean(form.dataset.canonicalActivityId) || `id-${crypto.randomUUID()}`;
      form.dataset.canonicalActivityId = id;
      const activity = {
        id,
        name:clean(d.name), templateMode, type:clean(d.type), typeLabel:clean(d.type),
        courseTime:clean(d.courseTime), deadline:clean(d.deadline), capacity:Number(d.capacity || 0),
        checkinPoints:Number(d.checkinPoints || 0), feePoints:Number(d.feePoints || 0), paymentAmount:Number(d.paymentAmount || 0),
        remittanceInfo:clean(d.remittanceInfo), registrationMode, detailText:clean(d.detailText), galleryUrls:cleanUrlList(d.galleryUrls),
        reg:0, check:0, status:clean(d.status) || "下架"
      };
      if (!activity.name) throw new Error("請輸入活動名稱");

      const settings = liveSettings(form, activity);
      const catalogMode = clean(form.querySelector("[name='catalogBillingMode']")?.value);
      if (catalogMode === "catalog_paid") {
        const catalogPricing = window.TDEACatalogPricing?.normalize(form.__tdeaCatalogPricing);
        if (!catalogPricing?.items?.length) throw new Error("請至少建立一個規格型品項與規格");
        settings.billingMode = "catalog_paid";
        settings.catalogPricing = catalogPricing;
        activity.billingMode = "catalog_paid";
        activity.catalogPricing = catalogPricing;
      }
      const posterFile = form.posterFile?.files?.[0] || null;
      if (posterFile) {
        setButton(form, "上傳主圖...", true);
        const uploaded = await uploadPoster(posterFile, id);
        if (uploaded?.url) {
          settings.posterUrl = uploaded.url;
          activity.posterUrl = uploaded.url;
          activity.imageUrl = uploaded.url;
        }
      } else if (settings.posterUrl) {
        activity.posterUrl = settings.posterUrl;
        activity.imageUrl = settings.posterUrl;
      }
      activity.galleryUrls = settings.galleryUrls;
      activity.youtubeUrl = settings.youtubeUrl;

      const fields = settings.fields;
      const customFields = fields.filter(field => !systemKeys.has(clean(field?.key)));
      settings.customFields = customFields;
      settings.templateMode = templateMode;
      const sessions = settings.sessions;
      form.__tdeaRegistrationSettings = settings;

      setButton(form, "建立活動...", true);
      const response = await fetch(`${api}/api/admin-activities/canonical`, {
        method:"POST", headers:headers({"content-type":"application/json"}),
        body:JSON.stringify({activity, settings, fields, sessions, formId:id})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "活動建立失敗");
      if (!result.form || !Array.isArray(result.form.fields)) throw new Error("活動建立後報名表驗證失敗");
      notify(`活動已建立，報名表 ${result.form.fields.length} 個欄位已同步`);
      delete form.dataset.canonicalActivityId;
      form.reset();
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      notify(error?.message || "活動建立失敗", true);
      delete form.dataset.canonicalCreating;
      setButton(form, "", false);
    }
  }, true);
})();
