(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const adminKey = "tdea-admin-email";
  const fixedKeyword = "TDEA每月活動";
  const defaultLiffBase = "https://liff.line.me/2005868456-2jmxqyFU?monthlyDetail={id}";
  const dataKey = "tdea-manager-v3";
  let active = false;
  let config = null;
  let selected = 0;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const id = () => "monthly-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const trim = (value) => String(value ?? "").trim();

  function adminEmail() { return sessionStorage.getItem(adminKey) || localStorage.getItem(adminKey) || ""; }

  function localData() {
    try { return JSON.parse(localStorage.getItem(dataKey) || "{}"); } catch (_) { return {}; }
  }

  function activities() {
    const rows = localData().activities;
    return Array.isArray(rows) ? rows.filter((item) => item && (item.name || item.activityNo || item.id)) : [];
  }

  function findActivity(value) {
    const key = trim(value);
    if (!key) return null;
    return activities().find((item) => String(item.activityNo || "") === key || String(item.id || "") === key || String(item.name || "") === key) || null;
  }

  function formSettingsFor(activity) {
    const data = localData();
    const settings = data.formSettings || {};
    return settings[activity?.id] || settings[activity?.activityNo] || settings[activity?.name] || {};
  }

  function firstUrl(...values) {
    for (const value of values.flat()) {
      const text = trim(value);
      if (/^https?:\/\//i.test(text)) return text;
    }
    return "";
  }

  function formUrlFor(activity) {
    if (!activity) return "";
    const settings = formSettingsFor(activity);
    return firstUrl(
      activity.formUrl,
      activity.googleFormUrl,
      activity.googleFormPublishedUrl,
      activity.registrationFormUrl,
      activity.formLink,
      activity.form_url,
      activity.signupUrl,
      activity.registerUrl,
      activity.registrationUrl,
      activity.googleForm?.url,
      activity.googleForm?.publishedUrl,
      activity.googleForm?.responderUri,
      settings.formUrl,
      settings.googleFormUrl,
      settings.googleFormPublishedUrl,
      settings.registrationFormUrl,
      settings.formLink,
      settings.signupUrl,
      settings.registerUrl,
      settings.googleForm?.url,
      settings.googleForm?.publishedUrl,
      settings.googleForm?.responderUri
    );
  }

  function detailTextFor(activity) {
    if (!activity) return "";
    const settings = formSettingsFor(activity);
    return trim(activity.detailText) || trim(activity.description) || trim(activity.detail) || trim(settings.detailText) || trim(settings.description) || "";
  }

  function posterUrlFor(activity) {
    if (!activity) return "";
    const settings = formSettingsFor(activity);
    return firstUrl(activity.posterUrl, activity.imageUrl, activity.coverUrl, settings.posterUrl, settings.imageUrl, settings.coverUrl);
  }

  function blankConfig() {
    return { enabled: true, keyword: fixedKeyword, month: new Date().toISOString().slice(0, 7), altText: "TDEA 每月活動", detailBaseUrl: defaultLiffBase, pages: [blankPage()] };
  }

  function blankPage() {
    return { id: id(), activityNo: "", activityId: "", imageUrl: "", shareUrl: "" };
  }

  function ensureConfigShape() {
    if (!config) config = blankConfig();
    config.keyword = fixedKeyword;
    config.altText = config.altText || "TDEA 每月活動";
    config.detailBaseUrl = config.detailBaseUrl || defaultLiffBase;
    if (!Array.isArray(config.pages) || !config.pages.length) config.pages = [blankPage()];
    config.pages = config.pages.map((page) => {
      const next = { ...blankPage(), ...page, id: page.id || id() };
      if (!next.activityNo && page.detailUrl && !String(page.detailUrl).startsWith("http")) next.activityNo = page.detailUrl;
      const activity = findActivity(next.activityNo || next.activityId);
      if (activity) applyActivityToPage(next, activity);
      return next;
    });
  }

  function applyActivityToPage(page, activity) {
    page.activityNo = activity.activityNo || page.activityNo || "";
    page.activityId = activity.id || page.activityId || "";
    page.activityName = activity.name || page.activityName || "";
    page.detailTitle = activity.name || page.detailTitle || "詳細說明";
    page.detailText = detailTextFor(activity);
    page.formUrl = formUrlFor(activity);
    if (!page.imageUrl) page.imageUrl = posterUrlFor(activity);
  }

  function hydratePage(page) {
    const activity = findActivity(page.activityNo || page.activityId);
    const next = { ...page };
    if (activity) applyActivityToPage(next, activity);
    next.detailTitle = next.detailTitle || next.activityName || "詳細說明";
    next.detailText = next.detailText || "";
    next.formUrl = next.formUrl || "";
    return next;
  }

  function appendIdToUrl(baseUrl, activityNo, pageId) {
    const raw = trim(baseUrl || defaultLiffBase);
    const target = trim(activityNo) || pageId || "";
    const encoded = encodeURIComponent(target);
    if (raw.includes("{id}")) return raw.replaceAll("{id}", encoded);
    if (raw.includes("{activityNo}")) return raw.replaceAll("{activityNo}", encoded);
    return raw + (raw.includes("?") ? "&" : "?") + "monthlyDetail=" + encoded;
  }

  function detailUrlForPage(page) {
    const hydrated = hydratePage(page);
    return appendIdToUrl(config.detailBaseUrl, hydrated.activityNo || hydrated.activityId, hydrated.id);
  }

  function shareUrlForPage(page) { return trim(page.shareUrl) || detailUrlForPage(page); }

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector("[data-monthly-zone]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.monthlyZone = "1";
    button.textContent = "每月活動";
    button.addEventListener("click", show);
    nav.appendChild(button);
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    document.querySelector("[data-monthly-zone]")?.classList.add("active");
  }

  async function show() {
    active = true;
    setActiveNav();
    if (!config) await load();
    render();
  }

  async function load() {
    try {
      const res = await fetch(`${api}/api/monthly-activity`, { cache: "no-store" });
      const result = await res.json();
      config = result.data || blankConfig();
    } catch (_) {
      config = blankConfig();
    }
    ensureConfigShape();
  }

  function ensureStyles() {
    if (document.querySelector("#monthly-activity-style")) return;
    const style = document.createElement("style");
    style.id = "monthly-activity-style";
    style.textContent = `.monthly-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,42%);gap:18px;align-items:start}.monthly-left{display:grid;gap:18px;min-width:0}.monthly-preview-panel{position:sticky;top:24px}.monthly-pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:14px}.monthly-page-btn{border:1px solid #d0d5dd;background:#fff;border-radius:8px;min-height:64px;padding:10px 12px;text-align:left;font-weight:800;display:grid;gap:4px}.monthly-page-btn span{color:#667085;font-size:13px}.monthly-page-btn strong{color:#111827;line-height:1.35;word-break:break-word}.monthly-page-btn.active{border-color:#06c755;background:#eafff1}.monthly-form{display:grid;gap:14px;padding:18px}.monthly-basic-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end}.monthly-keyword-pill{border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;padding:10px 12px;display:grid;gap:4px}.monthly-keyword-pill span{color:#667085;font-size:12px}.monthly-keyword-pill strong{color:#111827}.monthly-enabled{display:inline-flex;align-items:center;gap:8px;font-weight:800}.monthly-phone{width:min(100%,430px);margin:0 auto;border-radius:28px;background:#111827;padding:14px;box-shadow:0 18px 42px rgba(15,23,42,.18)}.monthly-screen{min-height:650px;border-radius:20px;background:#8fb7df;padding:18px 14px;overflow:hidden}.monthly-carousel{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}.monthly-card{flex:0 0 260px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,.12)}.monthly-image{position:relative;background:#e5e7eb;aspect-ratio:2/3;display:grid;place-items:center;color:#667085;font-weight:800}.monthly-image img{width:100%;height:100%;object-fit:cover}.monthly-share{position:absolute;top:18px;left:18px;background:#ff334b;color:#fff;border-radius:20px;width:53px;height:25px;display:grid;place-items:center;font-size:12px}.monthly-footer{display:flex;gap:8px;padding:10px}.monthly-footer button{flex:1;border:0;border-radius:6px;background:#06c755;color:#fff;font-weight:800;min-height:34px}.monthly-detail-pop{white-space:pre-wrap;line-height:1.6;color:#344054;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:10px;max-height:290px;overflow:auto}.monthly-warning{color:#b42318;background:#fff3f0;border:1px solid #fecdca;border-radius:8px;padding:10px;font-weight:700}.monthly-link-note{font-size:13px;color:#667085;line-height:1.5}.monthly-linked-box{border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;padding:12px;display:grid;gap:8px}.monthly-linked-box strong{display:block;color:#111827}.monthly-linked-box span{color:#667085;font-size:13px;line-height:1.5}.monthly-empty-link{background:#fffdf5;border-color:#fedf89}.monthly-status-row{display:flex;flex-wrap:wrap;gap:8px}.monthly-status{border-radius:999px;padding:5px 10px;font-weight:800}.monthly-status.ok{background:#dcfae6!important;color:#067647!important}.monthly-status.bad{background:#fee4e2!important;color:#b42318!important}.monthly-detail-pop p{margin:10px 0 0;white-space:pre-wrap}.monthly-image-empty{padding:16px;text-align:center}@media(max-width:1100px){.monthly-workspace{grid-template-columns:1fr}.monthly-preview-panel{position:static}.monthly-phone{width:min(100%,460px)}}@media(max-width:720px){.monthly-basic-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function render() {
    ensureStyles();
    ensureConfigShape();
    const main = document.querySelector(".main");
    if (!main || !config) return;
    selected = Math.min(selected, config.pages.length - 1);
    const page = config.pages[selected];
    main.innerHTML = `<div class="topbar"><div><h1>每月活動</h1></div><div class="actions"><button class="btn" data-monthly-json>複製 FLEX JSON</button><button class="btn primary" data-monthly-publish>發布</button></div></div><div class="monthly-workspace"><div class="monthly-left"><section class="panel"><div class="panel-head"><h2 class="panel-title">基本設定</h2></div><div class="monthly-form">${basicFields()}</div></section><section class="panel"><div class="panel-head"><h2 class="panel-title">活動頁數</h2><div class="actions"><button class="btn" data-monthly-add>新增頁</button><button class="btn danger" data-monthly-delete>刪除頁</button></div></div><div class="monthly-pages">${pageButtons()}</div></section><section class="panel"><div class="panel-head"><h2 class="panel-title">第 ${selected + 1} 頁設定</h2></div>${pageForm(page)}</section></div><aside class="panel monthly-preview-panel"><div class="panel-head"><h2 class="panel-title">預覽區</h2><span class="muted">橫式多頁 FLEX</span></div><div style="padding:18px" data-monthly-preview-wrap>${preview()}</div></aside></div><div class="toast" id="monthly-toast"></div>`;
    bind();
  }

  function pageButtons() {
    return config.pages.map((item, index) => {
      const page = hydratePage(item);
      const rawLabel = page.activityName || page.activityNo || "";
      const label = rawLabel && !String(rawLabel).startsWith("id-") ? rawLabel : "未選活動";
      return `<button class="monthly-page-btn ${index === selected ? "active" : ""}" data-monthly-select="${index}"><span>第 ${index + 1} 頁</span><strong>${esc(label)}</strong></button>`;
    }).join("");
  }
  function basicFields() {
    return `<div class="monthly-basic-grid"><div class="field"><label>月份</label><input name="month" data-monthly-basic value="${esc(config.month || "")}" placeholder="2026-05"></div><div class="monthly-keyword-pill"><span>觸發關鍵字</span><strong>${fixedKeyword}</strong></div><label class="monthly-enabled"><input type="checkbox" name="enabled" data-monthly-enabled ${config.enabled ? "checked" : ""}> 啟用此關鍵字</label></div>`;
  }
  function activitySelect(page) {
    const current = page.activityNo || page.activityId || "";
    const rows = activities();
    if (!rows.length) return `<div class="monthly-warning">目前沒有可連動的活動。請先到「創建活動」建立活動，並儲存詳細說明與表單連結。</div>`;
    return `<select name="activityNo" data-monthly-activity><option value="">請選擇活動</option>${rows.map((activity) => {
      const value = activity.activityNo || activity.id || activity.name;
      const label = `${activity.name || "未命名活動"}${activity.activityNo ? `（${activity.activityNo}）` : ""}`;
      return `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
    }).join("")}</select>`;
  }

  function linkedInfo(page) {
    const hydrated = hydratePage(page);
    if (!hydrated.activityName && !hydrated.activityNo) return `<div class="monthly-linked-box monthly-empty-link"><strong>請先選擇活動</strong><span>選擇後會自動帶入詳細說明與報名表，不需要填 LIFF 網址。</span></div>`;
    return `<div class="monthly-linked-box"><strong>${esc(hydrated.activityName || hydrated.activityNo)}</strong><div class="monthly-status-row"><span class="monthly-status ${trim(hydrated.detailText) ? "ok" : "bad"}">詳細說明：${trim(hydrated.detailText) ? "已帶入" : "未填"}</span><span class="monthly-status ${trim(hydrated.formUrl) ? "ok" : "bad"}">報名表：${trim(hydrated.formUrl) ? "已連動" : "未連動"}</span></div></div>`;
  }
  function pageForm(page) {
    const hydrated = hydratePage(page);
    const linked = trim(hydrated.activityNo || hydrated.activityId);
    return `<div class="monthly-form"><div class="field"><label>連動活動</label>${activitySelect(page)}<div class="monthly-link-note">只要選活動即可。詳細說明走 LIFF，報名按鈕走該活動的報名表。</div></div>${linkedInfo(page)}<div class="field"><label>活動圖片</label><input type="file" accept="image/*" data-monthly-file><div class="muted">上傳後會自動更新預覽圖片。</div></div><div class="field"><label>圖片網址</label><input name="imageUrl" data-monthly-page value="${esc(page.imageUrl)}" placeholder="上傳後自動填入，也可貼既有海報網址"></div>${!linked ? `<div class="monthly-warning">這頁尚未選擇活動，發布前請先選擇活動。</div>` : ""}${linked && !trim(hydrated.formUrl) ? `<div class="monthly-warning">這個活動還沒有報名表；發布時系統會自動產生並寫回活動。</div>` : ""}${linked && !trim(hydrated.detailText) ? `<div class="monthly-warning">此活動沒有詳細說明，請回到活動編輯補上「詳細說明」。</div>` : ""}</div>`;
  }
  function preview() {
    return `<div class="monthly-phone"><div class="monthly-screen"><div class="monthly-carousel">${config.pages.map((rawPage, index) => {
      const page = hydratePage(rawPage);
      const detail = page.detailText || (page.activityName ? `${page.activityName}\n\n尚未填寫詳細說明。` : "請先在左側選擇活動。");
      const title = page.activityName || "未選活動";
      return `<div class="monthly-card"><div class="monthly-image">${page.imageUrl ? `<img src="${esc(page.imageUrl)}" alt="">` : `<div class="monthly-image-empty">第 ${index + 1} 頁圖片</div>`}<div class="monthly-share">分享</div></div><div class="monthly-footer"><button>詳細說明</button><button>點我報名</button></div>${index === selected ? `<div class="monthly-detail-pop"><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>` : ""}</div>`;
    }).join("")}</div></div></div>`;
  }
  function updatePreview() {
    const wrap = document.querySelector("[data-monthly-preview-wrap]");
    if (wrap) wrap.innerHTML = preview();
  }

  function updatePageLabels() {
    const wrap = document.querySelector(".monthly-pages");
    if (wrap) wrap.innerHTML = pageButtons();
    bindPageButtons();
  }

  function formPayloadForActivity(activity) {
    const settings = formSettingsFor(activity);
    const fields = Array.isArray(settings.fields) && settings.fields.length ? settings.fields : [
      { key: "name", label: "姓名", type: "text", required: true },
      { key: "phone", label: "手機", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "company", label: "公司/單位", type: "text", required: false },
      { key: "memberNo", label: "會員編號", type: "text", required: false },
      { key: "gender", label: "性別", type: "choice", options: ["男", "女", "不透露"], required: true },
      { key: "isMember", label: "是否為會員", type: "choice", options: ["是", "否", "不確定"], required: true },
      { key: "meal", label: "用餐選項", type: "choice", options: ["葷", "素"], required: true },
      { key: "note", label: "備註", type: "paragraph", required: false }
    ];
    return {
      activity: {
        id: activity.id || "",
        activityNo: activity.activityNo || "",
        name: activity.name || "未命名活動",
        type: activity.type || "",
        courseTime: activity.courseTime || "",
        deadline: activity.deadline || "",
        capacity: Number(activity.capacity || 0),
        detailText: detailTextFor(activity)
      },
      settings: { ...settings, fields }
    };
  }

  function persistGeneratedFormUrl(activity, formUrl) {
    const data = localData();
    data.formSettings ||= {};
    const row = Array.isArray(data.activities)
      ? data.activities.find((item) => String(item.id || "") === String(activity.id || "") || String(item.activityNo || "") === String(activity.activityNo || "") || String(item.name || "") === String(activity.name || ""))
      : null;
    const target = row || activity;
    target.formMode = "google_form";
    target.formUrl = formUrl;
    target.googleFormUrl = formUrl;
    data.formSettings[target.id] ||= {};
    Object.assign(data.formSettings[target.id], formSettingsFor(activity), { formUrl, googleFormUrl: formUrl });
    if (target.activityNo) {
      data.formSettings[target.activityNo] ||= {};
      Object.assign(data.formSettings[target.activityNo], data.formSettings[target.id]);
    }
    saveLocalData(data);
    return target;
  }

  function saveLocalData(data) {
    localStorage.setItem(dataKey, JSON.stringify(data));
  }

  async function generateFormForActivity(activity, email) {
    const response = await fetch(`${api}/api/google-forms/create`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(formPayloadForActivity(activity))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Google 報名表自動產生失敗");
    }
    const formUrl = result.formUrl || result.responderUri || result.data?.formUrl || result.data?.responderUri;
    if (!formUrl) throw new Error("Google 報名表已建立，但沒有收到公開報名網址");
    return formUrl;
  }

  async function ensureFormUrls(email) {
    for (let index = 0; index < config.pages.length; index += 1) {
      const page = hydratePage(config.pages[index]);
      if (trim(page.formUrl)) continue;
      const activity = findActivity(page.activityNo || page.activityId);
      if (!activity) return `第 ${index + 1} 頁尚未選擇活動`;
      toast(`第 ${index + 1} 頁正在自動產生報名表...`);
      try {
        const formUrl = await generateFormForActivity(activity, email);
        const saved = persistGeneratedFormUrl(activity, formUrl);
        applyActivityToPage(config.pages[index], saved);
      } catch (error) {
        return `第 ${index + 1} 頁報名表自動產生失敗：${error.message}`;
      }
    }
    return "";
  }

  function buildFlex() {
    return { type: "carousel", contents: config.pages.slice(0, 12).map((rawPage) => {
      const page = hydratePage(rawPage);
      const detailUri = detailUrlForPage(page);
      const formUri = trim(page.formUrl);
      const shareUri = shareUrlForPage(page);
      return { type: "bubble", size: "kilo", body: { type: "box", layout: "vertical", paddingAll: "0px", contents: [{ type: "image", url: page.imageUrl || "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png", size: "full", aspectMode: "cover", aspectRatio: "2:3", gravity: "top", action: { type: "uri", label: "報名", uri: formUri } }, { type: "box", layout: "vertical", position: "absolute", cornerRadius: "20px", offsetTop: "18px", backgroundColor: "#ff334b", offsetStart: "18px", height: "25px", width: "53px", action: { type: "uri", label: "分享", uri: shareUri }, contents: [{ type: "text", text: "分享", color: "#ffffff", align: "center", size: "xs", offsetTop: "3px", action: { type: "uri", label: "分享", uri: shareUri } }] }] }, footer: { type: "box", layout: "horizontal", contents: [{ type: "button", action: { type: "uri", label: "詳細說明", uri: detailUri }, height: "sm", style: "primary" }, { type: "button", action: { type: "uri", label: "點我報名", uri: formUri }, height: "sm", style: "primary", margin: "md" }] } };
    }) };
  }

  function validateForPublish() {
    for (let index = 0; index < config.pages.length; index += 1) {
      const page = hydratePage(config.pages[index]);
      if (!trim(page.activityNo) && !trim(page.activityId)) return `第 ${index + 1} 頁尚未選擇活動`;
      if (!trim(page.detailText)) return `第 ${index + 1} 頁連動活動缺少詳細說明`;
    }
    return "";
  }

  function bindPageButtons() {
    document.querySelectorAll("[data-monthly-select]").forEach((button) => button.addEventListener("click", () => { selected = Number(button.dataset.monthlySelect || 0); render(); }));
  }

  function bind() {
    document.querySelectorAll("[data-monthly-basic]").forEach((input) => input.addEventListener("input", () => { config[input.name] = input.value; updatePreview(); }));
    document.querySelector("[data-monthly-enabled]")?.addEventListener("change", (event) => { config.enabled = event.target.checked; });
    bindPageButtons();
    document.querySelector("[data-monthly-add]")?.addEventListener("click", () => { if (config.pages.length >= 12) return toast("LINE carousel 最多 12 頁"); config.pages.push(blankPage()); selected = config.pages.length - 1; render(); });
    document.querySelector("[data-monthly-delete]")?.addEventListener("click", () => { if (config.pages.length <= 1) return toast("至少保留 1 頁"); config.pages.splice(selected, 1); selected = Math.max(0, selected - 1); render(); });
    document.querySelector("[data-monthly-activity]")?.addEventListener("change", (event) => { const page = config.pages[selected]; const activity = findActivity(event.target.value); page.activityNo = activity?.activityNo || event.target.value || ""; page.activityId = activity?.id || ""; if (activity) applyActivityToPage(page, activity); updatePreview(); updatePageLabels(); render(); });
    document.querySelectorAll("[data-monthly-page]").forEach((input) => input.addEventListener("input", () => { const page = config.pages[selected]; page[input.name] = input.value; updatePreview(); if (input.name === "imageUrl") updatePageLabels(); }));
    document.querySelector("[data-monthly-file]")?.addEventListener("change", uploadImage);
    document.querySelector("[data-monthly-json]")?.addEventListener("click", async () => { const email = adminEmail(); if (!email) return toast("尚未登入，暫不能產生 FLEX JSON。"); const formError = await ensureFormUrls(email); if (formError) return toast(formError); const validation = validateForPublish(); if (validation) return toast(validation); await navigator.clipboard.writeText(JSON.stringify(buildFlex(), null, 2)); toast("FLEX JSON 已複製"); });
    document.querySelector("[data-monthly-publish]")?.addEventListener("click", publish);
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const email = adminEmail();
    if (!email) return toast("尚未登入，暫不能上傳。後續接 LINE Login 後會自動授權。");
    const page = hydratePage(config.pages[selected]);
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "monthly");
    form.append("activityId", page.activityNo || page.activityId || config.month || "draft");
    const res = await fetch(`${api}/api/uploads`, { method: "POST", headers: { "x-admin-email": email }, body: form });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.url) return toast(result.message || "上傳失敗");
    config.pages[selected].imageUrl = result.url.startsWith("http") ? result.url : api + result.url;
    render();
    toast("圖片已上傳");
  }

  async function publish() {
    const email = adminEmail();
    if (!email) return toast("尚未登入，暫不能發布。後續接 LINE Login 後會自動授權。");
    const formError = await ensureFormUrls(email);
    if (formError) return toast(formError);
    const validation = validateForPublish();
    if (validation) return toast(validation);
    config.keyword = fixedKeyword;
    config.enabled = Boolean(config.enabled);
    config.pages = config.pages.map((page, order) => ({ ...hydratePage(page), detailUrl: detailUrlForPage(page), order })).slice(0, 12);
    const res = await fetch(`${api}/api/monthly-activity`, { method: "PUT", headers: { "content-type": "application/json", "x-admin-email": email }, body: JSON.stringify(config) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.success) return toast(result.message || "發布失敗");
    config = result.data;
    ensureConfigShape();
    render();
    toast("已發布，關鍵字 TDEA每月活動 已啟用");
  }

  function toast(message) {
    const el = document.querySelector("#monthly-toast") || document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2600);
  }

  function schedule() { ensureNav(); if (active) setActiveNav(); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => { if (event.target.closest(".nav button:not([data-monthly-zone])")) active = false; }, true);
  schedule();
})();
