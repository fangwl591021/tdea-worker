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
      const id = `id-${crypto.randomUUID()}`;
      const activity = {
        id,
        name: clean(d.name), templateMode, type:clean(d.type), typeLabel:clean(d.type),
        courseTime:clean(d.courseTime), deadline:clean(d.deadline), capacity:Number(d.capacity || 0),
        checkinPoints:Number(d.checkinPoints || 0), feePoints:Number(d.feePoints || 0), paymentAmount:Number(d.paymentAmount || 0),
        remittanceInfo:clean(d.remittanceInfo), registrationMode, detailText:clean(d.detailText), galleryUrls:cleanUrlList(d.galleryUrls),
        reg:0, check:0, status:clean(d.status) || "下架"
      };
      if (!activity.name) throw new Error("請輸入活動名稱");
      const liveSettings = form.__tdeaRegistrationSettings && typeof form.__tdeaRegistrationSettings === "object" ? form.__tdeaRegistrationSettings : {};
      const fields = Array.isArray(liveSettings.fields) && liveSettings.fields.length ? liveSettings.fields : defaultFields(activity);
      const customFields = fields.filter(field => !systemKeys.has(clean(field?.key)));
      const sessions = Array.isArray(liveSettings.sessions) ? liveSettings.sessions : [];
      const settings = { ...liveSettings, registrationMode, templateMode, fields, customFields, sessions };
      const response = await fetch(`${api}/api/admin-activities/canonical`, {
        method:"POST", headers:headers({"content-type":"application/json"}),
        body:JSON.stringify({ activity, settings, fields, sessions, formId:id })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "活動建立失敗");
      if (!result.form || !Array.isArray(result.form.fields)) throw new Error("活動建立後報名表驗證失敗");
      notify(`活動已建立，報名表 ${result.form.fields.length} 個欄位已同步`);
      form.reset();
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      notify(error?.message || "活動建立失敗", true);
      delete form.dataset.canonicalCreating;
      setButton(form, "", false);
    }
  }, true);
})();
