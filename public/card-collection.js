(() => {
  const API = "https://tdeawork.fangwl591021.workers.dev";
  const LIFF_ID = "2005868456-cfANNVou";
  const $ = (selector) => document.querySelector(selector);
  const app = document.getElementById("app");

  const INDUSTRIES = [
    "健康醫療", "美容美業", "餐飲食品", "零售電商", "直銷／社群電商",
    "金融保險", "房地產居家", "工商專業服務", "教育培訓", "科技資訊",
    "行銷設計媒體", "製造批發貿易", "旅遊交通服務", "社團協會公益", "其他行業"
  ];
  const collectionFields = [
    ["displayName", "姓名", "text"], ["englishName", "英文姓名", "text"],
    ["companyName", "公司", "text"], ["jobTitle", "職稱", "text"],
    ["department", "部門", "text"], ["mobile", "手機", "tel"],
    ["companyPhone", "公司電話", "tel"], ["email", "Email", "email"],
    ["websiteUrl", "網站", "text"], ["lineUrl", "LINE 連結", "url"],
    ["address", "地址", "text"], ["serviceDescription", "服務說明", "textarea"],
    ["note", "私人備註", "textarea"]
  ];
  const collectionWideFields = new Set([
    "companyName", "mobile", "companyPhone", "email", "websiteUrl", "lineUrl", "address"
  ]);

  let lineUserId = "";
  let cards = [];
  let searchText = "";
  let industryFilter = "";
  let collectionScanFiles = [];
  let cropper = null;
  let reviewCard = null;
  let currentCard = null;
  let currentView = "contact";
  const imageObjectUrls = new Set();

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));

  function addStyles() {
    ["/akaffit-card-collection.css?v=akaffit-current", "/vendor/cropper.min.css"].forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (src.includes("cropper") && window.Cropper) return resolve();
      if (src.includes("line-scdn") && window.liff) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("程式載入失敗"));
      document.head.appendChild(script);
    });
  }

  async function resolveIdentity() {
    await loadScript("https://static.line-scdn.net/liff/edge/2/sdk.js");
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href });
      throw new Error("正在開啟 LINE 登入");
    }
    const profile = await liff.getProfile();
    lineUserId = String(profile.userId || "").trim();
    if (!lineUserId) throw new Error("無法取得 LINE 使用者身份");
  }

  async function api(path, options = {}) {
    const headers = { "x-line-user-id": lineUserId, ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) {
      headers["content-type"] = "application/json; charset=utf-8";
    }
    const response = await fetch(API + path, { cache: "no-store", ...options, headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.message || "操作失敗");
    }
    return result;
  }

  function layout(content) {
    imageObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    imageObjectUrls.clear();
    app.innerHTML = `<main><div class="content">${content}</div></main>`;
  }

  async function withActionFeedback(button, action, labels = {}) {
    const original = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = labels.busy || "處理中…";
    }
    try {
      const result = await action();
      if (button && labels.success) button.textContent = labels.success;
      return result;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  function ensureCardCropperModal() {
    let modal = $("#cardCropperModal");
    if (modal) return modal;
    document.body.insertAdjacentHTML("beforeend", `<div class="card-cropper-modal" id="cardCropperModal" role="dialog" aria-modal="true"><div class="card-cropper-sheet"><div class="card-cropper-head"><strong>裁切名片</strong><button type="button" id="closeCardCropper">×</button></div><div class="card-cropper-stage"><img id="cardCropperImage" alt="裁切圖片"></div><div class="card-cropper-tools"><button type="button" data-crop-action="zoom-out">縮小</button><button type="button" data-crop-action="zoom-in">放大</button><button type="button" data-crop-action="rotate">旋轉</button><button type="button" data-crop-action="reset">重設</button></div><div class="card-cropper-actions"><button type="button" class="btn alt" id="cancelCardCropper">取消</button><button type="button" class="btn" id="confirmCardCropper">確認裁切</button></div></div></div>`);
    return $("#cardCropperModal");
  }

  async function cropCollectionScanImage(file, sideLabel = "正面") {
    if (!window.Cropper) throw new Error("裁切器載入失敗，請重新開啟頁面");
    if (!file?.type?.startsWith("image/")) throw new Error("請選擇圖片檔案");
    const modal = ensureCardCropperModal();
    const image = $("#cardCropperImage");
    const objectUrl = URL.createObjectURL(file);
    modal.querySelector(".card-cropper-head strong").textContent = `裁切名片${sideLabel}`;
    image.alt = `名片${sideLabel}裁切預覽`;
    modal.classList.add("open");
    image.src = objectUrl;
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("名片圖片讀取失敗"));
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      modal.classList.remove("open");
      throw error;
    }
    cropper?.destroy();
    cropper = new Cropper(image, {
      viewMode: 1, dragMode: "move", autoCropArea: 0.9,
      cropBoxMovable: true, cropBoxResizable: true, zoomable: true,
      zoomOnTouch: true, zoomOnWheel: true, movable: true,
      responsive: true, background: false, guides: true, center: true, highlight: false
    });
    modal.querySelectorAll("[data-crop-action]").forEach((button) => {
      button.onclick = () => {
        const action = button.dataset.cropAction;
        if (action === "zoom-in") cropper.zoom(0.1);
        if (action === "zoom-out") cropper.zoom(-0.1);
        if (action === "rotate") cropper.rotate(90);
        if (action === "reset") cropper.reset();
      };
    });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        cropper?.destroy();
        cropper = null;
        URL.revokeObjectURL(objectUrl);
        modal.classList.remove("open");
        resolve(value);
      };
      $("#closeCardCropper").onclick = () => finish(null);
      $("#cancelCardCropper").onclick = () => finish(null);
      $("#confirmCardCropper").onclick = async () => {
        const button = $("#confirmCardCropper");
        try {
          button.disabled = true;
          button.textContent = "裁切中…";
          const canvas = cropper.getCroppedCanvas({
            maxWidth: 2000, maxHeight: 2000,
            imageSmoothingEnabled: true, imageSmoothingQuality: "high"
          });
          const blob = await new Promise((done) => canvas.toBlob(done, "image/webp", 0.9));
          if (!blob) throw new Error("名片裁切失敗");
          finish(new File([blob], `business-card-${sideLabel === "背面" ? "back" : "front"}.webp`, { type: "image/webp" }));
        } catch (error) {
          alert(error.message || "名片裁切失敗");
        } finally {
          if (button.isConnected) {
            button.disabled = false;
            button.textContent = "確認裁切";
          }
        }
      };
    });
  }

  function collectionForm(card = {}, prefix = "contact") {
    return `<div class="contact-card-form">${collectionFields.map(([key, label, type]) => {
      const full = type === "textarea" || collectionWideFields.has(key);
      const extras = key === "websiteUrl" ? ' inputmode="url" autocomplete="url" placeholder="https://"' : "";
      return `<label class="${full ? "full" : ""}">${label}${type === "textarea" ? `<textarea id="${prefix}-${key}" rows="4">${esc(card[key])}</textarea>` : `<input id="${prefix}-${key}" type="${type}" value="${esc(card[key])}"${extras}>`}</label>`;
    }).join("")}</div>`;
  }

  function normalizeWebsite(value) {
    const raw = String(value || "").trim();
    return !raw || /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  }

  function readCollectionForm(prefix = "contact") {
    const values = Object.fromEntries(collectionFields.map(([key]) => [key, $(`#${prefix}-${key}`)?.value || ""]));
    values.websiteUrl = normalizeWebsite(values.websiteUrl);
    return values;
  }

  function collectionIndustryForm(card = {}) {
    const selectedPrimary = card.industry?.primary || "待分類";
    const selectedSecondary = new Set(card.industry?.secondary || []);
    return `<fieldset class="collection-industry-editor"><legend>行業分類</legend><p>可依名片內容人工調整分類。</p><label>主行業<select id="contact-industry-primary"><option value="待分類">待分類</option>${INDUSTRIES.map((industry) => `<option value="${esc(industry)}" ${industry === selectedPrimary ? "selected" : ""}>${esc(industry)}</option>`).join("")}</select></label><div class="collection-industry-secondary"><strong>次行業（最多 2 個）</strong>${INDUSTRIES.map((industry) => `<label><input type="checkbox" name="contact-industry-secondary" value="${esc(industry)}" ${selectedSecondary.has(industry) ? "checked" : ""}>${esc(industry)}</label>`).join("")}</div></fieldset>`;
  }

  function readCollectionIndustry() {
    const primary = $("#contact-industry-primary")?.value || "待分類";
    const secondary = Array.from(document.querySelectorAll('input[name="contact-industry-secondary"]:checked'))
      .map((input) => input.value).filter((value) => value !== primary).slice(0, 2);
    return { primary, secondary };
  }

  function bindCollectionIndustryEditor() {
    const primary = $("#contact-industry-primary");
    const boxes = Array.from(document.querySelectorAll('input[name="contact-industry-secondary"]'));
    const sync = () => {
      const checked = boxes.filter((box) => box.checked);
      boxes.forEach((box) => {
        box.disabled = box.value === primary?.value || (!box.checked && checked.length >= 2);
        if (box.value === primary?.value) box.checked = false;
      });
    };
    primary?.addEventListener("change", sync);
    boxes.forEach((box) => box.addEventListener("change", sync));
    sync();
  }

  const cardCrmSteps = ["拍照", "AI 校正圖片", "OCR", "AI 二次檢查", "公司資料搜尋", "社群資料補全", "建立 CRM", "建立公司知識卡", "建立第一個任務"];
  const cardCrmFields = ["官網", "Google Map", "Facebook", "Instagram", "YouTube", "LinkedIn", "新聞", "得獎紀錄", "公司介紹", "Logo", "地址", "電話", "Email", "統編"];
  const cardCrmIntro = `<details class="card ai-card-crm-intro"><summary><span><small>AI 智慧名片 CRM</small><strong>從拍照開始，自動完成所有建檔</strong></span><b>查看流程</b></summary><div class="ai-card-crm-body"><ol class="ai-card-crm-flow">${cardCrmSteps.map((step, index) => `<li><i>${index + 1}</i><span>${step}</span></li>`).join("")}</ol><section class="ai-card-crm-fields"><h3>AI 自動補全</h3><div>${cardCrmFields.map((field) => `<span>${field}</span>`).join("")}</div><p>本階段先完成 OCR、人工確認與私人名片 CRM；公開資料補全將沿用後續設定。</p></section></div></details>`;

  function renderCollection() {
    layout(`<section class="card card-scan-panel"><h2>▣ 掃描建立名片</h2><p class="muted">選擇照片後先裁切名片範圍，再上傳做 OCR 分析並建立 CRM 檔案；相同名片不得重複收藏。</p><div class="card-scan-actions"><label>📷 拍照掃描<input id="cardCamera" type="file" accept="image/*" capture="environment" hidden></label><label>▧ 相簿上傳<input id="cardGallery" type="file" accept="image/*" multiple hidden></label></div><div id="scanDraft" class="scan-draft hidden"><strong id="scanDraftCount"></strong><label class="mini-btn">＋ 加入背面<input id="cardBack" type="file" accept="image/*" capture="environment" hidden></label><button class="btn" id="startCardOcr">送出名片</button></div></section>${cardCrmIntro}<section class="collection-search"><input id="collectionSearch" value="${esc(searchText)}" placeholder="搜尋姓名、公司、電話或 Email…"><button class="mini-btn" id="runCollectionSearch">搜尋</button></section><nav id="collectionIndustryFilters" class="collection-industry-filters" aria-label="行業分類篩選"></nav><section class="card collection-list"><div class="collection-list-head"><h2>我的收藏名單</h2><div class="collection-list-tools"><span id="collectionCount">載入中…</span></div></div><p class="muted collection-system-note">名片先完成 OCR 並由你確認後寫入私人收藏；本階段不處理點數。</p><div id="collectionRows"><p class="muted">正在載入收藏名片…</p></div></section>`);
    bindScanInputs();
    bindCollectionSearch();
    renderCards();
  }

  function bindScanInputs() {
    const select = async (files) => {
      try {
        const selected = Array.from(files || []).slice(0, 2);
        const cropped = [];
        for (let index = 0; index < selected.length; index += 1) {
          const image = await cropCollectionScanImage(selected[index], index ? "背面" : "正面");
          if (!image) return;
          cropped.push(image);
        }
        collectionScanFiles = cropped;
        updateScanDraft();
      } catch (error) {
        alert(error.message || "名片圖片處理失敗");
      }
    };
    $("#cardCamera").onchange = (event) => select(event.target.files);
    $("#cardGallery").onchange = (event) => select(event.target.files);
    $("#cardBack").onchange = async (event) => {
      try {
        const file = event.target.files?.[0];
        if (!file) return;
        const cropped = await cropCollectionScanImage(file, "背面");
        if (!cropped) return;
        collectionScanFiles[1] = cropped;
        updateScanDraft();
      } catch (error) {
        alert(error.message || "名片背面處理失敗");
      }
    };
    $("#startCardOcr").onclick = startCardOcr;
  }

  function updateScanDraft() {
    const draft = $("#scanDraft");
    if (!draft) return;
    draft.classList.toggle("hidden", !collectionScanFiles.length);
    if (collectionScanFiles.length) {
      $("#scanDraftCount").textContent = `已裁切 ${collectionScanFiles.length} 張（正面${collectionScanFiles.length > 1 ? "＋背面" : ""}）`;
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("圖片讀取失敗"));
      reader.readAsDataURL(file);
    });
  }

  async function startCardOcr() {
    if (!collectionScanFiles[0]) return alert("請先拍照或上傳名片");
    const button = $("#startCardOcr");
    try {
      await withActionFeedback(button, async () => {
        const imageDataUrl = await fileToDataUrl(collectionScanFiles[0]);
        const result = await api("/api/card-collection/ocr", {
          method: "POST", body: JSON.stringify({ imageDataUrl })
        });
        reviewCard = result.data || {};
        showCollectionReview(reviewCard, reviewCard.confidence);
      }, { busy: "AI OCR 辨識中…", success: "辨識完成" });
    } catch (error) {
      alert(error.message || "名片 OCR 失敗");
    }
  }

  function showCollectionReview(card, confidence) {
    layout(`<section class="card collection-review"><button class="back-card" id="cancelCollectionReview" aria-label="返回">‹</button><h2>確認名片資料</h2><p class="muted">AI 辨識信心 ${Math.round(Number(confidence || 0) * 100)}%。請先校正再收藏，避免錯誤資料。</p>${collectionForm(card, "scan")}<button class="btn" id="saveScannedCard">儲存至名片收藏</button></section>`);
    $("#cancelCollectionReview").onclick = renderCollection;
    $("#saveScannedCard").onclick = saveScannedCard;
  }

  async function saveScannedCard() {
    const button = $("#saveScannedCard");
    try {
      await withActionFeedback(button, async () => {
        const payload = { ...readCollectionForm("scan"), industry: { primary: "待分類", secondary: [] } };
        payload.frontImageDataUrl = await fileToDataUrl(collectionScanFiles[0]);
        if (collectionScanFiles[1]) payload.backImageDataUrl = await fileToDataUrl(collectionScanFiles[1]);
        const result = await api("/api/card-collection/cards", {
          method: "POST", body: JSON.stringify(payload)
        });
        if (result.duplicate) alert("收藏名單已有相同名片，沒有重複新增。");
        collectionScanFiles = [];
        await loadCards();
        renderCollection();
      }, { busy: "儲存中…", success: "已收藏" });
    } catch (error) {
      alert(error.message || "名片儲存失敗");
    }
  }

  function bindCollectionSearch() {
    const run = () => {
      searchText = $("#collectionSearch").value.trim();
      renderCards();
    };
    $("#runCollectionSearch").onclick = run;
    $("#collectionSearch").onkeydown = (event) => {
      if (event.key === "Enter") run();
    };
  }

  async function loadCards() {
    const result = await api("/api/card-collection/cards");
    cards = Array.isArray(result.data) ? result.data : [];
  }

  function filteredCards() {
    const q = searchText.toLowerCase();
    return cards.filter((card) => {
      const searchMatch = !q || [card.displayName, card.companyName, card.mobile, card.email]
        .some((value) => String(value || "").toLowerCase().includes(q));
      const industries = [card.industry?.primary, ...(card.industry?.secondary || [])];
      const industryMatch = !industryFilter || industries.includes(industryFilter);
      return searchMatch && industryMatch;
    });
  }

  function renderCards() {
    const filters = ["", ...INDUSTRIES, "待分類"];
    const filterNav = $("#collectionIndustryFilters");
    if (filterNav) {
      filterNav.innerHTML = filters.map((value) => `<button type="button" class="${value === industryFilter ? "active" : ""}" data-industry-filter="${esc(value)}">${esc(value || "全部")}</button>`).join("");
      document.querySelectorAll("[data-industry-filter]").forEach((button) => {
        button.onclick = () => {
          industryFilter = button.dataset.industryFilter || "";
          renderCards();
        };
      });
    }
    const list = filteredCards();
    if ($("#collectionCount")) $("#collectionCount").textContent = `${list.length} 位`;
    const rows = $("#collectionRows");
    if (!rows) return;
    rows.innerHTML = list.length ? list.map((card) => {
      const facts = [card.companyName, card.jobTitle].filter(Boolean).join("／") || card.mobile || card.email || "名片已收藏";
      const industries = [card.industry?.primary, ...(card.industry?.secondary || [])].filter(Boolean);
      return `<button class="contact-row" data-contact-id="${esc(card.id)}"><span class="contact-thumb">${card.hasImage ? `<img data-contact-image="${esc(card.id)}" alt="">` : esc((card.displayName || "名").slice(0, 1))}</span><span><strong>${esc(card.displayName || "未命名")}</strong><small>${esc(facts)}</small><span class="contact-industry-tags">${industries.map((label) => `<i>${esc(label)}</i>`).join("")}</span></span><span class="contact-rank-summary"><b>›</b></span></button>`;
    }).join("") : `<div class="collection-empty">尚未收藏名片，從上方拍照或相簿開始。</div>`;
    document.querySelectorAll("[data-contact-id]").forEach((row) => {
      row.onclick = () => showContactEditor(cards.find((card) => card.id === row.dataset.contactId));
    });
    attachCollectionImages();
  }

  async function authorizedImageUrl(card, side = "front") {
    if (side === "front" && !card.hasImage) return "";
    if (side === "back" && !card.hasBackImage) return "";
    try {
      const response = await fetch(`${API}/api/card-collection/cards/${encodeURIComponent(card.id)}/image?side=${side}`, {
        headers: { "x-line-user-id": lineUserId }, cache: "no-store"
      });
      if (!response.ok) return "";
      const url = URL.createObjectURL(await response.blob());
      imageObjectUrls.add(url);
      return url;
    } catch (_) {
      return "";
    }
  }

  async function attachCollectionImages() {
    await Promise.all(cards.map(async (card) => {
      const image = document.querySelector(`[data-contact-image="${CSS.escape(card.id)}"]`);
      if (!image) return;
      const src = await authorizedImageUrl(card);
      if (src) image.src = src;
    }));
  }

  function contactRows(card) {
    const items = [
      ["姓名", card.displayName], ["英文姓名", card.englishName], ["公司", card.companyName],
      ["職稱", card.jobTitle], ["部門", card.department], ["手機", card.mobile],
      ["公司電話", card.companyPhone], ["Email", card.email], ["網站", card.websiteUrl],
      ["LINE", card.lineUrl], ["地址", card.address], ["服務說明", card.serviceDescription],
      ["私人備註", card.note]
    ].filter(([, value]) => value);
    return items.map(([label, value]) => `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join("");
  }

  function collectionEditSection(title, summary, content, open = false) {
    return `<details class="collection-edit-section" ${open ? "open" : ""}><summary><span><b>${title}</b><small>${summary}</small></span><i aria-hidden="true">⌄</i></summary><div class="collection-edit-section-body">${content}</div></details>`;
  }

  function aiCardCrmSection(card) {
    return `<section class="ai-card-crm-result pending"><h3>AI 智慧名片 CRM</h3><p>名片已完成 OCR 與人工確認，並依 LINE UID 保存在你的私人收藏。公開公司與社群資料補全尚未啟用。</p><div class="ai-card-crm-info"><div><small>姓名</small><strong>${esc(card.displayName || "-")}</strong></div><div><small>公司</small><strong>${esc(card.companyName || "-")}</strong></div><div><small>行業</small><strong>${esc(card.industry?.primary || "待分類")}</strong></div></div></section>`;
  }

  async function showContactEditor(card) {
    if (!card) return renderCollection();
    currentCard = card;
    const tabs = `<div class="business-card-tabs"><button data-collection-card-tab="contact" class="${currentView === "contact" ? "active" : ""}">聯絡資料</button><button data-collection-card-tab="edit" class="${currentView === "edit" ? "active" : ""}">編輯內容</button><button data-collection-card-tab="insights" class="${currentView === "insights" ? "active" : ""}">AI 智慧 CRM</button></div>`;
    let panel = "";
    if (currentView === "contact") {
      panel = `<div class="business-card-contact">${contactRows(card)}</div>`;
    }
    if (currentView === "edit") {
      panel = `<form id="collectionCardForm" class="business-card-form"><div class="collection-edit-sections full">${collectionEditSection("行業分類", "主行業與次行業", collectionIndustryForm(card))}${collectionEditSection("聯絡資料", "姓名、公司、電話與地址", collectionForm(card, "contact"), true)}</div><p class="collection-verification-note full">人工修改內容會直接儲存於你的私人名片收藏。</p><button class="btn full" type="submit">儲存修改</button><button class="btn danger full" type="button" id="deleteContact">刪除名片</button></form>`;
    }
    if (currentView === "insights") panel = aiCardCrmSection(card);
    layout(`<section class="business-card collection-editor"><div class="business-card-title"><button class="back-card" id="backCollection" aria-label="返回">←</button><h2>名片詳細資料</h2></div>${tabs}<section id="collectionCardImages" class="crm-insight-reference"></section>${panel}</section>`);
    $("#backCollection").onclick = () => {
      currentView = "contact";
      renderCollection();
    };
    document.querySelectorAll("[data-collection-card-tab]").forEach((button) => {
      button.onclick = () => {
        currentView = button.dataset.collectionCardTab;
        showContactEditor(currentCard);
      };
    });
    const imageContainer = $("#collectionCardImages");
    const frontUrl = await authorizedImageUrl(card, "front");
    const backUrl = await authorizedImageUrl(card, "back");
    imageContainer.innerHTML = [frontUrl, backUrl].filter(Boolean)
      .map((url, index) => `<img class="crm-insight-reference-image" src="${esc(url)}" alt="名片${index ? "背面" : "正面"}">`).join("");
    imageContainer.classList.toggle("hidden", !imageContainer.innerHTML);
    if (currentView === "edit") bindEditForm(card);
  }

  function bindEditForm(card) {
    bindCollectionIndustryEditor();
    $("#collectionCardForm").onsubmit = async (event) => {
      event.preventDefault();
      const button = event.submitter;
      try {
        const updated = await withActionFeedback(button, () => api(`/api/card-collection/cards/${encodeURIComponent(card.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ ...readCollectionForm(), industry: readCollectionIndustry() })
        }), { busy: "儲存中…", success: "已儲存" });
        Object.assign(card, updated.data);
        currentView = "contact";
        showContactEditor(card);
      } catch (error) {
        alert(error.message || "名片修改失敗");
      }
    };
    $("#deleteContact").onclick = async () => {
      if (!confirm(`確定刪除「${card.displayName || "這張名片"}」？`)) return;
      try {
        await api(`/api/card-collection/cards/${encodeURIComponent(card.id)}`, { method: "DELETE" });
        cards = cards.filter((item) => item.id !== card.id);
        currentView = "contact";
        renderCollection();
      } catch (error) {
        alert(error.message || "刪除失敗");
      }
    };
  }

  async function start() {
    try {
      addStyles();
      await Promise.all([loadScript("/vendor/cropper.min.js"), resolveIdentity()]);
      await loadCards();
      renderCollection();
    } catch (error) {
      layout(`<section class="card"><h2>無法開啟名片收藏</h2><p class="muted">${esc(error.message || "載入失敗")}</p></section>`);
    }
  }

  start();
})();
