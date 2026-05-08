(() => {
  const key = "tdea-manager-v3";

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function enhanceCreatorForm() {
    const form = document.querySelector("#activity-form");
    if (!form || form.dataset.formBuilderReady) return;
    form.dataset.formBuilderReady = "true";

    const submit = form.querySelector("button[type='submit']");
    const block = document.createElement("section");
    block.className = "form-builder-block";
    block.innerHTML = `
      <div class="form-builder-title">Google 表單設定</div>
      <div class="field">
        <label>活動圖片 / 海報連結</label>
        <input name="posterUrl" type="url" placeholder="貼上圖片網址，之後可放在 Google 表單說明或活動頁">
      </div>
      <div class="field">
        <label>圖片上傳欄位</label>
        <select name="requireImageUpload">
          <option value="N">不需要</option>
          <option value="Y">需要，讓報名者上傳圖片/附件</option>
        </select>
      </div>
      <div class="field">
        <label>性別欄位</label>
        <select name="genderField">
          <option value="required">需要，必填</option>
          <option value="optional">需要，選填</option>
          <option value="none">不需要</option>
        </select>
      </div>
      <div class="field">
        <label>是否為會員</label>
        <select name="memberField">
          <option value="required">需要，必填</option>
          <option value="optional">需要，選填</option>
          <option value="login">之後由 Login 自動判定</option>
        </select>
      </div>
      <div class="form-schema-preview">
        <strong>預設表單欄位</strong>
        <span>姓名、手機、Email、公司/單位、會員編號、性別、是否為會員、備註</span>
      </div>`;

    submit?.insertAdjacentElement("beforebegin", block);
    submit.textContent = "建立 Google 表單設定";
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "activity-form") return;

    const settings = {
      posterUrl: form.posterUrl?.value?.trim() || "",
      requireImageUpload: form.requireImageUpload?.value || "N",
      genderField: form.genderField?.value || "required",
      memberField: form.memberField?.value || "required",
      fields: [
        { key: "name", label: "姓名", type: "text", required: true },
        { key: "phone", label: "手機", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "company", label: "公司/單位", type: "text", required: false },
        { key: "memberNo", label: "會員編號", type: "text", required: false }
      ]
    };

    if (settings.genderField !== "none") {
      settings.fields.push({ key: "gender", label: "性別", type: "choice", options: ["男", "女", "不便透露"], required: settings.genderField === "required" });
    }
    if (settings.memberField !== "login") {
      settings.fields.push({ key: "isMember", label: "是否為會員", type: "choice", options: ["是", "否", "不確定"], required: settings.memberField === "required" });
    }
    if (settings.requireImageUpload === "Y") {
      settings.fields.push({ key: "imageUpload", label: "圖片/附件上傳", type: "file", required: false });
    }
    settings.fields.push({ key: "note", label: "備註", type: "paragraph", required: false });

    setTimeout(() => {
      const data = load();
      data.formSettings ||= {};
      const latest = data.activities?.[0];
      if (!latest) return;
      data.formSettings[latest.id] = settings;
      latest.formMode = "google_form";
      latest.posterUrl = settings.posterUrl;
      save(data);
    }, 0);
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    .form-builder-block{display:grid;gap:16px;border:1px solid #dbeafe;border-radius:8px;padding:16px;background:#f8fbff}
    .form-builder-title{font-weight:800;color:#1d4ed8}
    .form-schema-preview{display:grid;gap:6px;border:1px dashed #bfdbfe;border-radius:8px;padding:12px;background:#fff;color:#344054}
    .form-schema-preview span{color:#667085;font-size:13px;line-height:1.6}
  `;
  document.head.appendChild(style);

  new MutationObserver(enhanceCreatorForm).observe(document.body, { childList: true, subtree: true });
  enhanceCreatorForm();
})();
