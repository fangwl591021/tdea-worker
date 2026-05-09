(() => {
  const key = "tdea-manager-v3";
  const apiBase = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function getAdminEmail() {
    let email = localStorage.getItem("tdea-admin-email") || "";
    if (!email) {
      email = prompt("請輸入管理者 Email，用於上傳活動圖片")?.trim() || "";
      if (email) localStorage.setItem("tdea-admin-email", email);
    }
    return email;
  }

  async function uploadPoster(file, activityId) {
    const email = getAdminEmail();
    if (!email) throw new Error("未輸入管理者 Email");

    const body = new FormData();
    body.append("file", file);
    body.append("purpose", "posters");
    body.append("activityId", activityId || "draft");

    const response = await fetch(`${apiBase}/api/uploads`, {
      method: "POST",
      headers: { "x-admin-email": email },
      body
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "圖片上傳失敗");
    }
    return result;
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
        <label>活動圖片 / 海報上傳</label>
        <input name="posterFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf">
        <small class="form-builder-hint">可上傳到 Cloudflare R2；未設定 R2 前會保留為待上傳。</small>
      </div>
      <div class="field">
        <label>活動圖片 / 海報連結</label>
        <input name="posterUrl" type="url" placeholder="若已有圖片網址也可貼上；R2 上傳完成會自動回填">
      </div>
      <div class="field">
        <label>Google 表單報名網址</label>
        <input name="formUrl" type="url" placeholder="貼上 Google 表單公開報名網址，會同步寫入活動的表單連結">
        <small class="form-builder-hint">目前這裡負責保存網址；之後接 Google Drive / Forms API 後可改為自動建立並回填。</small>
      </div>
      <div class="field">
        <label>YouTube 影片網址</label>
        <input name="youtubeUrl" type="url" placeholder="可放活動介紹、回顧或直播連結">
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
      <div class="field">
        <label>用餐選項</label>
        <select name="mealField">
          <option value="required">需要，必填</option>
          <option value="optional">需要，選填</option>
          <option value="none">不需要</option>
        </select>
      </div>
      <div class="custom-fields-block">
        <div class="custom-fields-head">
          <strong>自訂欄位</strong>
          <button class="btn" type="button" data-add-custom-field>新增欄位</button>
        </div>
        <small class="form-builder-hint">可新增簡答、段落、單選、複選、下拉選單。單選、複選、下拉請在選項欄用逗號或換行分隔。</small>
        <div class="custom-fields-list" data-custom-fields></div>
      </div>
      <div class="form-schema-preview">
        <strong>預設表單欄位</strong>
        <span>姓名、手機、Email、公司/單位、會員編號、性別、是否為會員、用餐選項、備註；也可再加自訂欄位。</span>
      </div>
      <div class="form-upload-status" aria-live="polite"></div>`;

    submit?.insertAdjacentElement("beforebegin", block);
    submit.textContent = "建立 Google 表單設定";
    block.querySelector("[data-add-custom-field]")?.addEventListener("click", () => addCustomField(block));
  }

  function addCustomField(scope, value = {}) {
    const list = scope.querySelector("[data-custom-fields]");
    if (!list) return;
    const row = document.createElement("div");
    row.className = "custom-field-row";
    row.dataset.customField = "1";
    row.innerHTML = `
      <div class="field">
        <label>欄位名稱</label>
        <input name="customLabel" value="${escapeHtml(value.label || "")}" placeholder="例如：交通方式">
      </div>
      <div class="field">
        <label>題型</label>
        <select name="customType">
          ${[
            ["text", "簡答"],
            ["paragraph", "段落"],
            ["radio", "單選"],
            ["checkbox", "複選"],
            ["dropdown", "下拉選單"]
          ].map(([type, label]) => `<option value="${type}" ${value.type === type ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </div>
      <div class="field custom-options">
        <label>選項</label>
        <textarea name="customOptions" placeholder="例：自行開車, 高鐵, 遊覽車">${escapeHtml((value.options || []).join("\n"))}</textarea>
      </div>
      <label class="custom-required"><input type="checkbox" name="customRequired" ${value.required ? "checked" : ""}> 必填</label>
      <button class="btn danger" type="button" data-remove-custom-field>刪除</button>`;
    row.querySelector("[data-remove-custom-field]")?.addEventListener("click", () => row.remove());
    list.appendChild(row);
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function parseOptions(value) {
    return String(value || "")
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function collectCustomFields(form) {
    return [...form.querySelectorAll("[data-custom-field]")].map((row, index) => {
      const type = row.querySelector("[name='customType']")?.value || "text";
      return {
        key: "custom_" + (index + 1),
        label: row.querySelector("[name='customLabel']")?.value?.trim() || "",
        type,
        options: parseOptions(row.querySelector("[name='customOptions']")?.value),
        required: Boolean(row.querySelector("[name='customRequired']")?.checked)
      };
    }).filter(field => field.label);
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "activity-form") return;

    const posterFile = form.posterFile?.files?.[0] || null;
    const status = form.querySelector(".form-upload-status");
    const formUrl = form.formUrl?.value?.trim() || "";
    const customFields = collectCustomFields(form);
    const settings = {
      posterUrl: form.posterUrl?.value?.trim() || "",
      posterR2Key: "",
      formUrl,
      googleFormUrl: formUrl,
      youtubeUrl: form.youtubeUrl?.value?.trim() || "",
      requireImageUpload: form.requireImageUpload?.value || "N",
      genderField: form.genderField?.value || "required",
      memberField: form.memberField?.value || "required",
      mealField: form.mealField?.value || "required",
      customFields,
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
    if (settings.mealField !== "none") {
      settings.fields.push({ key: "meal", label: "用餐選項", type: "choice", options: ["葷", "素"], required: settings.mealField === "required" });
    }
    if (settings.requireImageUpload === "Y") {
      settings.fields.push({ key: "imageUpload", label: "圖片/附件上傳", type: "file", required: false });
    }
    settings.fields.push({ key: "note", label: "備註", type: "paragraph", required: false });
    settings.fields.push(...customFields);

    setTimeout(async () => {
      const data = load();
      data.formSettings ||= {};
      const latest = data.activities?.[0];
      if (!latest) return;

      data.formSettings[latest.id] = settings;
      if (latest.activityNo) data.formSettings[latest.activityNo] = settings;
      latest.formMode = "google_form";
      latest.posterUrl = settings.posterUrl;
      latest.youtubeUrl = settings.youtubeUrl;
      if (settings.formUrl) {
        latest.formUrl = settings.formUrl;
        latest.googleFormUrl = settings.formUrl;
      }
      save(data);

      if (!posterFile) return;
      try {
        if (status) status.textContent = "活動圖片上傳中...";
        const uploaded = await uploadPoster(posterFile, latest.id);
        const nextData = load();
        const nextActivity = nextData.activities?.find(activity => activity.id === latest.id);
        nextData.formSettings ||= {};
        nextData.formSettings[latest.id] ||= settings;
        nextData.formSettings[latest.id].posterUrl = uploaded.url;
        nextData.formSettings[latest.id].posterR2Key = uploaded.key;
        if (nextActivity) nextActivity.posterUrl = uploaded.url;
        save(nextData);
        if (form.posterUrl) form.posterUrl.value = uploaded.url;
        if (status) status.textContent = "活動圖片已上傳到 R2。";
      } catch (error) {
        if (status) status.textContent = `活動圖片尚未上傳：${error.message}`;
      }
    }, 0);
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    .form-builder-block{display:grid;gap:16px;border:1px solid #dbeafe;border-radius:8px;padding:16px;background:#f8fbff}
    .form-builder-title{font-weight:800;color:#1d4ed8}
    .form-schema-preview{display:grid;gap:6px;border:1px dashed #bfdbfe;border-radius:8px;padding:12px;background:#fff;color:#344054}
    .form-schema-preview span,.form-builder-hint{color:#667085;font-size:13px;line-height:1.6}
    .form-upload-status{min-height:18px;color:#2563eb;font-size:13px}
    .custom-fields-block{display:grid;gap:10px;border:1px solid #d0d5dd;border-radius:8px;background:#fff;padding:12px}
    .custom-fields-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .custom-field-row{display:grid;grid-template-columns:minmax(150px,1fr) 150px minmax(180px,1.3fr) auto auto;gap:10px;align-items:end;border-top:1px dashed #e5e7eb;padding-top:12px}
    .custom-required{display:flex;align-items:center;gap:6px;min-height:42px;font-weight:700;color:#344054}
    .custom-required input{width:auto}
    @media(max-width:900px){.custom-field-row{grid-template-columns:1fr}.custom-required{min-height:auto}}
  `;
  document.head.appendChild(style);

  new MutationObserver(enhanceCreatorForm).observe(document.body, { childList: true, subtree: true });
  enhanceCreatorForm();
})();
