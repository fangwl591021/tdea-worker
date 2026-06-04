(() => {
  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const storageKey = "tdea-manager-v3";
  const keyword = "TDEA跑馬燈";
  let active = false;
  let draft = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const adminEmail = () => localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
  const loadData = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { return {}; } };
  const saveData = (data) => localStorage.setItem(storageKey, JSON.stringify(data));

  function blankButton(label) {
    return { enabled: true, label, eventName: `TDEA 跑馬燈 ${label}`, eventContent: "跑馬燈按鈕點擊簽到贈點", points: 1 };
  }

  function blankConfig() {
    return {
      enabled: true,
      keyword,
      altText: "TDEA 跑馬燈",
      title: "TDEA 跑馬燈",
      imageUrl: "",
      left: blankButton("左側簽到"),
      right: { ...blankButton("查詢點數"), eventName: "TDEA 跑馬燈 查詢點數", eventContent: "查詢母站點數", points: 1 }
    };
  }

  function normalizeButton(input, fallback) {
    return { ...blankButton(fallback), ...(input || {}), points: Math.max(1, Math.round(Number(input?.points || 1))) };
  }

  function normalizeConfig(input) {
    const next = { ...blankConfig(), ...(input || {}) };
    next.keyword = keyword;
    next.left = normalizeButton(next.left, "左側簽到");
    next.right = normalizeButton(next.right, "右側簽到");
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
      .marquee-square{width:min(100%,420px);aspect-ratio:1/1;margin:18px auto 0;border:1px solid #e4e7ec;border-radius:14px;background:#f8fafc;display:grid;place-items:center;overflow:hidden}
      .marquee-square img{width:100%;height:100%;object-fit:cover}
      .marquee-square span{color:#667085;font-weight:800}
      .marquee-preview-buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:min(100%,420px);margin:14px auto 18px}
      .marquee-preview-buttons button{border:0;border-radius:10px;background:#06c755;color:#fff;padding:13px 12px;font-weight:900}
      .marquee-button-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .marquee-button-card{border:1px solid #e4e7ec;border-radius:10px;padding:14px;display:grid;gap:12px;background:#fff}
      .marquee-liff{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:10px;background:#f8fafc;border:1px solid #e4e7ec;color:#344054}
      @media(max-width:1100px){.marquee-workspace{grid-template-columns:1fr}.marquee-preview{position:static}.marquee-button-grid{grid-template-columns:1fr}}
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
    if (side === "right") {
      return `
        <div class="marquee-button-card">
          <h3 style="margin:0">${title}</h3>
          <label style="display:inline-flex;gap:8px;align-items:center;font-weight:800"><input type="checkbox" data-marquee-button="${side}" data-field="enabled" ${button.enabled !== false ? "checked" : ""}> 啟用</label>
          <div class="field"><label>按鈕文字</label><input data-marquee-button="${side}" data-field="label" value="${esc(button.label || "查詢點數")}"></div>
          <div class="muted">右側按鈕固定用途：查詢母站點數，不寫入贈點。</div>
        </div>
      `;
    }
    return `
      <div class="marquee-button-card">
        <h3 style="margin:0">${title}</h3>
        <label style="display:inline-flex;gap:8px;align-items:center;font-weight:800"><input type="checkbox" data-marquee-button="${side}" data-field="enabled" ${button.enabled !== false ? "checked" : ""}> 啟用</label>
        <div class="field"><label>按鈕文字</label><input data-marquee-button="${side}" data-field="label" value="${esc(button.label)}"></div>
        <div class="field"><label>母站事件名稱</label><input data-marquee-button="${side}" data-field="eventName" value="${esc(button.eventName)}"></div>
        <div class="field"><label>事件內容</label><input data-marquee-button="${side}" data-field="eventContent" value="${esc(button.eventContent)}"></div>
        <div class="field"><label>每次贈點</label><input type="number" min="1" step="1" data-marquee-button="${side}" data-field="points" value="${esc(button.points || 1)}"></div>
      </div>
    `;
  }

  function render() {
    const config = draft || blankConfig();
    const main = document.querySelector(".main");
    if (!main) return;
    const liffUrl = "https://liff.line.me/2005868456-2jmxqyFU?marquee=1";
    main.innerHTML = `
      <div class="topbar">
        <div><h1>跑馬燈</h1><div class="subtitle">800 x 800 圖片互動頁，左右按鈕點擊後寫入母站簽到贈點。</div></div>
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
            <div class="field"><label>800 x 800 圖片上傳</label><input type="file" accept="image/*" data-marquee-upload><div class="muted">建議使用正方形 800 x 800 JPG/PNG。</div></div>
            <div class="field"><label>圖片 URL</label><input data-marquee-field="imageUrl" value="${esc(config.imageUrl || "")}" placeholder="https://..."></div>
            <div class="marquee-liff"><strong>LIFF Tall：</strong><span>${esc(liffUrl)}</span></div>
          </div>
        </section>
        <aside class="panel marquee-preview">
          <div class="panel-head"><h2 class="panel-title">預覽</h2><span class="muted">800 x 800</span></div>
          <div class="marquee-square">${config.imageUrl ? `<img src="${esc(config.imageUrl)}" alt="">` : "<span>尚未上傳圖片</span>"}</div>
          <div class="marquee-preview-buttons">
            <button type="button">${esc(config.left?.label || "左側簽到")}</button>
            <button type="button">${esc(config.right?.label || "查詢點數")}</button>
          </div>
        </aside>
        <section class="panel" style="grid-column:1/-1">
          <div class="panel-head"><h2 class="panel-title">按鈕贈點設定</h2></div>
          <div class="marquee-form"><div class="marquee-button-grid">${buttonFields("left", config.left || blankButton("左側簽到"))}${buttonFields("right", config.right || blankButton("查詢點數"))}</div></div>
        </section>
      </div>
      <div class="toast" id="marquee-toast"></div>
    `;
    bind();
  }

  function collect() {
    const current = normalizeConfig(draft || blankConfig());
    const next = { ...current };
    next.enabled = Boolean(document.querySelector("[data-marquee-enabled]")?.checked);
    document.querySelectorAll("[data-marquee-field]").forEach((input) => {
      next[input.dataset.marqueeField] = input.value.trim();
    });
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

  async function save() {
    draft = collect();
    saveLocal(draft);
    const response = await fetch(api + "/api/marquee", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": adminEmail() },
      body: JSON.stringify(draft)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
    draft = normalizeConfig(result.data);
    saveLocal(draft);
    render();
    toast("跑馬燈已儲存。");
  }

  async function upload(file) {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(api + "/api/marquee/upload", { method: "POST", headers: { "x-admin-email": adminEmail() }, body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
    document.querySelector('[data-marquee-field="imageUrl"]').value = result.url;
    draft = collect();
    saveLocal(draft);
    render();
    toast("圖片已上傳。");
  }

  function bind() {
    document.querySelector("[data-marquee-save]")?.addEventListener("click", async () => {
      try { await save(); } catch (error) { toast(error.message || "儲存失敗", true); }
    });
    document.querySelector("[data-marquee-upload]")?.addEventListener("change", async (event) => {
      try { await upload(event.target.files?.[0]); } catch (error) { toast(error.message || "上傳失敗", true); }
    });
    document.querySelector("[data-marquee-copy-url]")?.addEventListener("click", async () => {
      const url = "https://liff.line.me/2005868456-2jmxqyFU?marquee=1";
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast("LIFF URL 已複製。");
    });
    document.querySelectorAll("[data-marquee-field],[data-marquee-button],[data-marquee-enabled]").forEach((input) => {
      input.addEventListener("input", () => { draft = collect(); saveLocal(draft); render(); });
      input.addEventListener("change", () => { draft = collect(); saveLocal(draft); render(); });
    });
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
