(() => {
  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const storageKey = "tdea-manager-v3";
  const keyword = "TDEA跑馬燈";
  const liffUrl = "https://liff.line.me/2005868456-cfANNVou?marquee=1";
  let active = false;
  let draft = null;
  let previewIndex = 0;
  let previewTimer = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const storedValue = (...keys) => {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (String(value).trim()) return String(value).trim();
    }
    return "";
  };
  const adminIdentity = () => ({
    email: storedValue("tdea-admin-email").toLowerCase(),
    memberNo: storedValue("tdea-admin-member-no", "tdea-member-no").toUpperCase(),
    lineUserId: storedValue("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId")
  });
  const adminHeaders = (extra = {}) => {
    const identity = adminIdentity();
    return {
      ...extra,
      ...(identity.email ? { "x-admin-email": identity.email } : {}),
      ...(identity.memberNo ? { "x-admin-member-no": identity.memberNo } : {}),
      ...(identity.lineUserId ? { "x-line-user-id": identity.lineUserId } : {})
    };
  };
  const loadData = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { return {}; } };
  const saveData = (data) => localStorage.setItem(storageKey, JSON.stringify(data));
  const id = () => (crypto?.randomUUID ? crypto.randomUUID() : `img-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  function blankButton(label) {
    return { enabled: true, label, eventName: `TDEA 跑馬燈 ${label}`, eventContent: "跑馬燈按鈕點擊", points: 1 };
  }

  function blankConfig() {
    return {
      enabled: true,
      keyword,
      altText: "TDEA 跑馬燈",
      title: "TDEA 跑馬燈",
      imageUrl: "",
      imageUrls: [],
      imageItems: [],
      left: blankButton("簽到贈點"),
      right: { ...blankButton("查詢點數"), eventName: "TDEA 跑馬燈 查詢點數", eventContent: "查詢母站點數", points: 1 }
    };
  }

  function normalizeButton(input, fallback) {
    return { ...blankButton(fallback), ...(input || {}), points: Math.max(1, Math.round(Number(input?.points || 1))) };
  }

  function normalizeItem(item, index) {
    const imageUrl = String(item?.imageUrl || item?.url || item || "").trim();
    return {
      id: String(item?.id || id()).trim(),
      imageUrl,
      linkUrl: String(item?.linkUrl || "").trim(),
      title: String(item?.title || "").trim(),
      points: Math.max(1, Math.round(Number(item?.points || 1))),
      enabled: item?.enabled !== false,
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index
    };
  }

  function normalizeItems(input) {
    const rawItems = Array.isArray(input?.imageItems) ? input.imageItems : [];
    const legacyUrls = [...new Set([...(Array.isArray(input?.imageUrls) ? input.imageUrls : []), input?.imageUrl].map((url) => String(url || "").trim()).filter(Boolean))];
    const source = rawItems.length ? rawItems : legacyUrls.map((url, index) => ({ id: `legacy-${index + 1}`, imageUrl: url, points: 1, enabled: true, order: index }));
    const seen = new Set();
    return source.map(normalizeItem).filter((item) => {
      if (!item.imageUrl || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).slice(0, 20);
  }

  function normalizeConfig(input) {
    const next = { ...blankConfig(), ...(input || {}) };
    next.keyword = keyword;
    next.imageItems = normalizeItems(next);
    next.imageUrls = next.imageItems.map((item) => item.imageUrl);
    next.imageUrl = next.imageUrls[0] || "";
    next.left = normalizeButton(next.left, "簽到贈點");
    next.right = normalizeButton(next.right, "查詢點數");
    return next;
  }

  function saveLocal(config) {
    const data = loadData();
    data.marquee = normalizeConfig(config);
    saveData(data);
  }

  function localConfig() {
    return normalizeConfig(loadData().marquee || blankConfig());
  }

  async function loadRemote() {
    try {
      const response = await fetch(api + "/api/marquee", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) {
        draft = normalizeConfig(result.data);
        saveLocal(draft);
        return;
      }
    } catch (_) {}
    draft = localConfig();
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-marquee-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-marquee-style";
    style.textContent = `
      .marquee-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,36%);gap:18px;align-items:start}
      .marquee-form{display:grid;gap:14px;padding:18px}
      .marquee-preview{position:sticky;top:24px}
      .marquee-square{width:min(100%,420px);aspect-ratio:1/1;margin:18px auto 0;border:1px solid #e4e7ec;border-radius:14px;background:#f8fafc;display:grid;place-items:center;overflow:hidden;position:relative}
      .marquee-track{display:flex;width:100%;height:100%;transition:transform .42s ease}
      .marquee-slide{flex:0 0 100%;height:100%}
      .marquee-slide img{width:100%;height:100%;object-fit:cover}
      .marquee-square span{color:#667085;font-weight:800}
      .marquee-button-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .marquee-button-card{border:1px solid #e4e7ec;border-radius:10px;padding:14px;display:grid;gap:12px;background:#fff}
      .marquee-liff{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:10px;background:#f8fafc;border:1px solid #e4e7ec;color:#344054}
      .marquee-images{display:grid;gap:10px}
      .marquee-image-row{display:grid;grid-template-columns:1fr 1fr 120px 180px auto;gap:8px;align-items:end;border:1px solid #e4e7ec;border-radius:8px;padding:10px;background:#f8fafc}
      .marquee-image-row label{display:grid;gap:4px;font-weight:800;color:#344054}
      .marquee-image-row input{width:100%;box-sizing:border-box}
      .marquee-image-status{border-radius:999px;padding:10px 12px;font-weight:900;text-align:center;background:#ecfdf3;color:#067647;white-space:nowrap}
      .marquee-image-status.warn{background:#fff3f0;color:#b42318}
      .marquee-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;gap:6px;justify-content:center}
      .marquee-dots button{width:8px;height:8px;border-radius:50%;border:0;background:rgba(255,255,255,.6);padding:0}
      .marquee-dots button.active{background:#06c755}
      .marquee-arrows{position:absolute;left:0;right:0;top:50%;display:flex;justify-content:space-between;transform:translateY(-50%);pointer-events:none}
      .marquee-arrows button{pointer-events:auto;border:0;border-radius:999px;background:rgba(17,24,39,.62);color:#fff;width:34px;height:34px;margin:0 10px;font-size:20px}
      @media(max-width:1100px){.marquee-workspace{grid-template-columns:1fr}.marquee-preview{position:static}.marquee-button-grid{grid-template-columns:1fr}.marquee-image-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureNav() {
    if (!window.TDEALineNav) return;
    window.TDEALineNav.register({
      id: "marquee",
      label: "跑馬燈",
      order: 27,
      onClick: () => show(),
      isActive: () => active
    });
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    window.TDEALineNav?.setOpen?.(true);
    window.TDEALineNav?.refresh?.();
  }

  async function show() {
    active = true;
    setActiveNav();
    ensureStyles();
    if (!draft) await loadRemote();
    render();
  }

  function buttonFields(side, button) {
    const title = side === "left" ? "左側按鈕" : "右側按鈕";
    const extra = side === "right" ? `<div class="muted">右側按鈕目前用於查詢點數。</div>` : `
      <div class="field"><label>事件名稱</label><input data-marquee-button="${side}" data-field="eventName" value="${esc(button.eventName)}"></div>
      <div class="field"><label>事件內容</label><input data-marquee-button="${side}" data-field="eventContent" value="${esc(button.eventContent)}"></div>
      <div class="field"><label>贈點數</label><input type="number" min="1" step="1" data-marquee-button="${side}" data-field="points" value="${esc(button.points || 1)}"></div>
    `;
    return `
      <div class="marquee-button-card">
        <h3 style="margin:0">${title}</h3>
        <label style="display:inline-flex;gap:8px;align-items:center;font-weight:800"><input type="checkbox" data-marquee-button="${side}" data-field="enabled" ${button.enabled !== false ? "checked" : ""}> 啟用</label>
        <div class="field"><label>按鈕文字</label><input data-marquee-button="${side}" data-field="label" value="${esc(button.label)}"></div>
        ${extra}
      </div>
    `;
  }

  function imageListHtml(config) {
    const items = normalizeItems(config);
    if (!items.length) return `<div class="muted">尚未上傳圖片。可一次選多張，LIFF 會每 3 秒自動輪播。</div>`;
    return `<div class="marquee-images">${items.map((item, index) => `
      <div class="marquee-image-row" data-marquee-image-row="${esc(item.id)}">
        <label>圖片 URL<input data-marquee-item="${esc(item.id)}" data-field="imageUrl" value="${esc(item.imageUrl)}"></label>
        <label>點擊連結網址<input data-marquee-item="${esc(item.id)}" data-field="linkUrl" value="${esc(item.linkUrl)}" placeholder="https://..."></label>
        <label>每日贈點<input type="number" min="1" step="1" data-marquee-item="${esc(item.id)}" data-field="points" value="${esc(item.points || 1)}"></label>
        <div class="marquee-image-status ${item.linkUrl ? "" : "warn"}">${item.linkUrl ? "贈點並跳轉" : "只贈點不跳轉"}</div>
        <button class="btn danger" type="button" data-marquee-remove-image="${index}">刪除</button>
      </div>
    `).join("")}</div>`;
  }

  function previewHtml(config) {
    const items = normalizeItems(config);
    if (!items.length) return `<span>尚未設定圖片</span>`;
    const index = Math.min(previewIndex, items.length - 1);
    return `
      <div class="marquee-track" data-marquee-track style="transform:translateX(-${index * 100}%)">
        ${items.map((item) => `<div class="marquee-slide"><img src="${esc(item.imageUrl)}" alt=""></div>`).join("")}
      </div>
      ${items.length > 1 ? `<div class="marquee-arrows"><button type="button" data-marquee-prev>‹</button><button type="button" data-marquee-next>›</button></div><div class="marquee-dots">${items.map((_, dotIndex) => `<button type="button" data-marquee-dot="${dotIndex}" class="${dotIndex === index ? "active" : ""}"></button>`).join("")}</div>` : ""}
    `;
  }

  function render() {
    const config = normalizeConfig(draft || blankConfig());
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = `
      <div class="topbar">
        <div><h1>跑馬燈</h1><div class="subtitle">LIFF Tall 多圖輪播。每張圖片可設定連結，會員每天點同一張圖只贈點一次。</div></div>
        <div class="actions"><button class="btn" data-marquee-copy-url>複製 LIFF URL</button><button class="btn primary" data-marquee-save>儲存並啟用</button></div>
      </div>
      <div class="marquee-workspace">
        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">基本設定</h2></div>
          <div class="marquee-form">
            <label style="display:inline-flex;gap:8px;align-items:center;font-weight:800"><input type="checkbox" data-marquee-enabled ${config.enabled !== false ? "checked" : ""}> 啟用此關鍵字</label>
            <div class="grid two">
              <div class="field"><label>觸發關鍵字</label><input value="${keyword}" readonly></div>
              <div class="field"><label>LINE 替代文字</label><input data-marquee-field="altText" value="${esc(config.altText || "")}"></div>
            </div>
            <div class="field"><label>標題</label><input data-marquee-field="title" value="${esc(config.title || "")}"></div>
            <div class="field"><label>圖片上傳</label><input type="file" accept="image/*" multiple data-marquee-upload><div class="muted">可一次選多張 JPG/PNG。LIFF 會每 3 秒自動左移輪播。</div></div>
            <div class="field"><label>圖片列表</label>${imageListHtml(config)}</div>
            <div class="marquee-liff"><strong>LIFF Tall：</strong><span>${esc(liffUrl)}</span></div>
          </div>
        </section>
        <aside class="panel marquee-preview">
          <div class="panel-head"><h2 class="panel-title">預覽</h2><span class="muted">${normalizeItems(config).length} 張</span></div>
          <div class="marquee-square">${previewHtml(config)}</div>
        </aside>
        <section class="panel" style="grid-column:1/-1">
          <div class="panel-head"><h2 class="panel-title">底部按鈕設定</h2></div>
          <div class="marquee-form"><div class="marquee-button-grid">${buttonFields("left", config.left || blankButton("簽到贈點"))}${buttonFields("right", config.right || blankButton("查詢點數"))}</div></div>
        </section>
      </div>
      <div class="toast" id="marquee-toast"></div>
    `;
    bind();
    startPreviewTimer();
  }

  function collect() {
    const current = normalizeConfig(draft || blankConfig());
    const next = { ...current };
    next.enabled = Boolean(document.querySelector("[data-marquee-enabled]")?.checked);
    document.querySelectorAll("[data-marquee-field]").forEach((input) => {
      next[input.dataset.marqueeField] = input.value.trim();
    });
    const itemMap = new Map(current.imageItems.map((item) => [item.id, { ...item }]));
    document.querySelectorAll("[data-marquee-item]").forEach((input) => {
      const item = itemMap.get(input.dataset.marqueeItem);
      if (!item) return;
      const field = input.dataset.field;
      item[field] = field === "points" ? Math.max(1, Math.round(Number(input.value || 1))) : input.value.trim();
    });
    next.imageItems = [...itemMap.values()];
    next.imageUrls = next.imageItems.map((item) => item.imageUrl).filter(Boolean);
    next.imageUrl = next.imageUrls[0] || "";
    for (const side of ["left", "right"]) {
      next[side] = { ...(next[side] || {}) };
      document.querySelectorAll(`[data-marquee-button="${side}"]`).forEach((input) => {
        const field = input.dataset.field;
        next[side][field] = input.type === "checkbox" ? input.checked : input.value.trim();
      });
      next[side].points = Math.max(1, Math.round(Number(next[side].points || 1)));
    }
    return normalizeConfig(next);
  }

  function updateDraftOnly() {
    draft = collect();
    saveLocal(draft);
  }

  function updatePreviewOnly() {
    const config = normalizeConfig(draft || blankConfig());
    const preview = document.querySelector(".marquee-preview");
    if (!preview) return;
    preview.querySelector(".panel-head .muted").textContent = `${normalizeItems(config).length} 張`;
    preview.querySelector(".marquee-square").innerHTML = previewHtml(config);
    bindPreviewControls();
  }

  async function save() {
    updateDraftOnly();
    const response = await fetch(api + "/api/marquee", {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(draft)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
    draft = normalizeConfig(result.data);
    saveLocal(draft);
    render();
    toast("跑馬燈已儲存");
  }

  async function upload(files) {
    const list = [...(files || [])].filter(Boolean);
    if (!list.length) return;
    const uploaded = [];
    for (const file of list) {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(api + "/api/marquee/upload", { method: "POST", headers: adminHeaders(), body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
      uploaded.push(result.url);
    }
    updateDraftOnly();
    draft.imageItems = normalizeItems(draft).concat(uploaded.map((url, index) => ({
      id: id(),
      imageUrl: url,
      linkUrl: "",
      title: "",
      points: 1,
      enabled: true,
      order: normalizeItems(draft).length + index
    })));
    draft = normalizeConfig(draft);
    saveLocal(draft);
    render();
    toast(`已上傳 ${uploaded.length} 張圖片`);
  }

  function goPreview(index) {
    const items = normalizeItems(draft || {});
    if (!items.length) return;
    previewIndex = (index + items.length) % items.length;
    updatePreviewOnly();
  }

  function startPreviewTimer() {
    clearInterval(previewTimer);
    const items = normalizeItems(draft || {});
    if (items.length > 1) previewTimer = setInterval(() => goPreview(previewIndex + 1), 3000);
  }

  function bindPreviewControls() {
    document.querySelector("[data-marquee-prev]")?.addEventListener("click", () => { goPreview(previewIndex - 1); startPreviewTimer(); });
    document.querySelector("[data-marquee-next]")?.addEventListener("click", () => { goPreview(previewIndex + 1); startPreviewTimer(); });
    document.querySelectorAll("[data-marquee-dot]").forEach((button) => {
      button.addEventListener("click", () => { goPreview(Number(button.dataset.marqueeDot || 0)); startPreviewTimer(); });
    });
  }

  function bind() {
    document.querySelector("[data-marquee-save]")?.addEventListener("click", async () => {
      try { await save(); } catch (error) { toast(error.message || "儲存失敗", true); }
    });
    document.querySelector("[data-marquee-upload]")?.addEventListener("change", async (event) => {
      try { await upload(event.target.files); } catch (error) { toast(error.message || "上傳失敗", true); }
    });
    document.querySelector("[data-marquee-copy-url]")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(liffUrl).catch(() => {});
      toast("LIFF URL 已複製");
    });
    document.querySelectorAll("[data-marquee-field],[data-marquee-button],[data-marquee-enabled],[data-marquee-item]").forEach((input) => {
      input.addEventListener("input", () => { updateDraftOnly(); updatePreviewOnly(); });
      input.addEventListener("change", () => { updateDraftOnly(); updatePreviewOnly(); });
    });
    document.querySelectorAll("[data-marquee-remove-image]").forEach((button) => {
      button.addEventListener("click", () => {
        updateDraftOnly();
        const index = Number(button.dataset.marqueeRemoveImage || -1);
        draft.imageItems = normalizeItems(draft).filter((_, itemIndex) => itemIndex !== index);
        draft = normalizeConfig(draft);
        previewIndex = Math.min(previewIndex, Math.max(draft.imageItems.length - 1, 0));
        saveLocal(draft);
        render();
      });
    });
    bindPreviewControls();
  }

  function toast(message, danger = false) {
    const node = document.querySelector("#marquee-toast");
    if (!node) return alert(message);
    node.textContent = message;
    node.classList.toggle("danger", danger);
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
  }

  function refreshSoon() {
    ensureNav();
    setTimeout(ensureNav, 100);
    setTimeout(ensureNav, 500);
    setTimeout(ensureNav, 1200);
  }

  new MutationObserver(refreshSoon).observe(document.body, { childList: true, subtree: true });
  refreshSoon();
})();
