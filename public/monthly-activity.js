(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const adminKey = "tdea-admin-email";
  const fixedKeyword = "TDEA每月活動";
  let active = false;
  let config = null;
  let selected = 0;

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const id = () => "monthly-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const trim = (value) => String(value ?? "").trim();

  function blankConfig() {
    return {
      enabled: true,
      keyword: fixedKeyword,
      month: new Date().toISOString().slice(0, 7),
      altText: "TDEA 每月活動",
      detailBaseUrl: "",
      pages: [blankPage()]
    };
  }

  function blankPage() {
    return { id: id(), imageUrl: "", detailTitle: "詳細說明", detailText: "", detailUrl: "", formUrl: "", shareUrl: "" };
  }

  function adminEmail() { return sessionStorage.getItem(adminKey) || ""; }

  function ensureConfigShape() {
    if (!config) config = blankConfig();
    config.keyword = fixedKeyword;
    config.altText = config.altText || "TDEA 每月活動";
    config.detailBaseUrl = config.detailBaseUrl || "";
    if (!Array.isArray(config.pages) || !config.pages.length) config.pages = [blankPage()];
    config.pages = config.pages.map((page) => ({ ...blankPage(), ...page, id: page.id || id() }));
  }

  function appendIdToUrl(baseUrl, pageId) {
    const raw = trim(baseUrl);
    if (!raw) return "";
    const encoded = encodeURIComponent(pageId || "");
    if (raw.includes("{id}")) return raw.replaceAll("{id}", encoded);
    return raw + (raw.includes("?") ? "&" : "?") + "id=" + encoded;
  }

  function detailUrlForPage(page) {
    return trim(page.detailUrl) || appendIdToUrl(config.detailBaseUrl, page.id) || `${api}/monthly-detail/${encodeURIComponent(page.id)}`;
  }

  function shareUrlForPage(page) {
    return trim(page.shareUrl) || detailUrlForPage(page);
  }

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
    style.textContent = `.monthly-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,42%);gap:18px;align-items:start}.monthly-left{display:grid;gap:18px;min-width:0}.monthly-preview-panel{position:sticky;top:24px}.monthly-pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;padding:14px}.monthly-page-btn{border:1px solid #d0d5dd;background:#fff;border-radius:8px;min-height:46px;padding:8px 10px;text-align:left;font-weight:800}.monthly-page-btn.active{border-color:#06c755;background:#eafff1}.monthly-form{display:grid;gap:14px;padding:18px}.monthly-phone{width:min(100%,430px);margin:0 auto;border-radius:28px;background:#111827;padding:14px;box-shadow:0 18px 42px rgba(15,23,42,.18)}.monthly-screen{min-height:650px;border-radius:20px;background:#8fb7df;padding:18px 14px;overflow:hidden}.monthly-carousel{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}.monthly-card{flex:0 0 260px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,.12)}.monthly-image{position:relative;background:#e5e7eb;aspect-ratio:2/3;display:grid;place-items:center;color:#667085;font-weight:800}.monthly-image img{width:100%;height:100%;object-fit:cover}.monthly-share{position:absolute;top:18px;left:18px;background:#ff334b;color:#fff;border-radius:20px;width:53px;height:25px;display:grid;place-items:center;font-size:12px}.monthly-footer{display:flex;gap:8px;padding:10px}.monthly-footer button{flex:1;border:0;border-radius:6px;background:#06c755;color:#fff;font-weight:800;min-height:34px}.monthly-detail-pop{white-space:pre-wrap;line-height:1.6;color:#344054;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:10px}.monthly-warning{color:#b42318;background:#fff3f0;border:1px solid #fecdca;border-radius:8px;padding:10px;font-weight:700}.monthly-link-note{font-size:13px;color:#667085;line-height:1.5}@media(max-width:1100px){.monthly-workspace{grid-template-columns:1fr}.monthly-preview-panel{position:static}.monthly-phone{width:min(100%,460px)}}`;
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
    return config.pages.map((item, index) => `<button class="monthly-page-btn ${index === selected ? "active" : ""}" data-monthly-select="${index}">第 ${index + 1} 頁<div class="muted">${esc(item.detailTitle || item.formUrl || "未命名")}</div></button>`).join("");
  }

  function basicFields() {
    return `<div class="field"><label>月份</label><input name="month" data-monthly-basic value="${esc(config.month || "")}" placeholder="2026-05"></div><div class="field"><label>關鍵字</label><input value="${fixedKeyword}" disabled></div><div class="field"><label>LINE 替代文字</label><input name="altText" data-monthly-basic value="${esc(config.altText || "TDEA 每月活動")}"></div><div class="field"><label>LIFF/詳細頁基底網址（選填）</label><input name="detailBaseUrl" data-monthly-basic value="${esc(config.detailBaseUrl || "")}" placeholder="https://liff.line.me/你的LIFF/detail?id={id}"><div class="monthly-link-note">填入後，詳細說明按鈕會優先開這個網址。可用 {id} 代入頁面 ID；不填則使用 Worker 內建詳細頁。</div></div><label style="display:inline-flex;align-items:center;gap:8px;font-weight:700"><input type="checkbox" name="enabled" data-monthly-enabled ${config.enabled ? "checked" : ""}>啟用此關鍵字</label>`;
  }

  function pageForm(page) {
    const detailTarget = detailUrlForPage(page);
    return `<div class="monthly-form"><div class="field"><label>圖片上傳</label><input type="file" accept="image/*" data-monthly-file><div class="muted">上傳後會自動填入圖片 URL</div></div><div class="field"><label>圖片 URL</label><input name="imageUrl" data-monthly-page value="${esc(page.imageUrl)}" placeholder="https://..."></div><div class="field"><label>詳細說明標題</label><input name="detailTitle" data-monthly-page value="${esc(page.detailTitle || "詳細說明")}"></div><div class="field"><label>詳細說明內容</label><textarea name="detailText" data-monthly-page placeholder="若沒有填 LIFF/外部詳情網址，這裡就是詳細說明頁內容。">${esc(page.detailText)}</textarea></div><div class="field"><label>LIFF/外部詳細說明網址（選填）</label><input name="detailUrl" data-monthly-page value="${esc(page.detailUrl)}" placeholder="https://liff.line.me/... 或外部詳情頁"><div class="monthly-link-note">目前此頁會開：${esc(detailTarget)}</div></div><div class="field"><label>Google 報名網址</label><input name="formUrl" data-monthly-page value="${esc(page.formUrl)}" placeholder="https://forms.gle/..."></div><div class="field"><label>分享網址（選填）</label><input name="shareUrl" data-monthly-page value="${esc(page.shareUrl)}" placeholder="留空則使用詳細說明頁"></div>${!trim(page.detailText) && !trim(page.detailUrl) && !trim(config.detailBaseUrl) ? `<div class="monthly-warning">這頁還沒有詳細說明內容，也沒有 LIFF/外部網址，發布前需要補上。</div>` : ""}</div>`;
  }

  function preview() {
    return `<div class="monthly-phone"><div class="monthly-screen"><div class="monthly-carousel">${config.pages.map((page, index) => `<div class="monthly-card"><div class="monthly-image">${page.imageUrl ? `<img src="${esc(page.imageUrl)}" alt="">` : `第 ${index + 1} 頁圖片`}<div class="monthly-share">分享</div></div><div class="monthly-footer"><button>詳細說明</button><button>點我報名</button></div>${index === selected ? `<div class="monthly-detail-pop">${esc(page.detailText || (page.detailUrl || config.detailBaseUrl ? "詳細說明將開啟 LIFF/外部頁面。" : "尚未填寫詳細說明。"))}</div>` : ""}</div>`).join("")}</div></div></div>`;
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

  function buildFlex() {
    return {
      type: "carousel",
      contents: config.pages.slice(0, 12).map((page) => {
        const detailUri = detailUrlForPage(page);
        const formUri = trim(page.formUrl) || api;
        const shareUri = shareUrlForPage(page);
        return {
          type: "bubble",
          size: "kilo",
          body: {
            type: "box",
            layout: "vertical",
            paddingAll: "0px",
            contents: [
              { type: "image", url: page.imageUrl || "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png", size: "full", aspectMode: "cover", aspectRatio: "2:3", gravity: "top", action: { type: "uri", label: "報名", uri: formUri } },
              { type: "box", layout: "vertical", position: "absolute", cornerRadius: "20px", offsetTop: "18px", backgroundColor: "#ff334b", offsetStart: "18px", height: "25px", width: "53px", action: { type: "uri", label: "分享", uri: shareUri }, contents: [{ type: "text", text: "分享", color: "#ffffff", align: "center", size: "xs", offsetTop: "3px", action: { type: "uri", label: "分享", uri: shareUri } }] }
            ]
          },
          footer: { type: "box", layout: "horizontal", contents: [{ type: "button", action: { type: "uri", label: "詳細說明", uri: detailUri }, height: "sm", style: "primary" }, { type: "button", action: { type: "uri", label: "點我報名", uri: formUri }, height: "sm", style: "primary", margin: "md" }] }
        };
      })
    };
  }

  function validateForPublish() {
    for (let index = 0; index < config.pages.length; index += 1) {
      const page = config.pages[index];
      if (!trim(page.detailText) && !trim(page.detailUrl) && !trim(config.detailBaseUrl)) return `第 ${index + 1} 頁缺少詳細說明內容或 LIFF/外部詳情網址`;
      if (!trim(page.formUrl)) return `第 ${index + 1} 頁缺少 Google 報名網址`;
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
    document.querySelectorAll("[data-monthly-page]").forEach((input) => input.addEventListener("input", () => { config.pages[selected][input.name] = input.value; updatePreview(); if (["detailTitle", "formUrl", "detailUrl"].includes(input.name)) updatePageLabels(); }));
    document.querySelector("[data-monthly-file]")?.addEventListener("change", uploadImage);
    document.querySelector("[data-monthly-json]")?.addEventListener("click", async () => { await navigator.clipboard.writeText(JSON.stringify(buildFlex(), null, 2)); toast("FLEX JSON 已複製"); });
    document.querySelector("[data-monthly-publish]")?.addEventListener("click", publish);
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const email = adminEmail();
    if (!email) return toast("尚未登入，暫不能上傳。後續接 LINE Login 後會自動授權。");
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "monthly");
    form.append("activityId", config.month || "draft");
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
    const validation = validateForPublish();
    if (validation) return toast(validation);
    config.keyword = fixedKeyword;
    config.enabled = Boolean(config.enabled);
    config.pages = config.pages.map((page, order) => ({ ...page, order })).slice(0, 12);
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
