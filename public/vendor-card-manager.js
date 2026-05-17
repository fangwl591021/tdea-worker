(() => {
  const storageKey = "tdea-manager-v3";
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const fixedKeyword = "TDEA廠商列表";
  let active = false;
  let draft = null;

  const uid = () => "vendor-card-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const loadData = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { return {}; } };
  const saveData = (data) => localStorage.setItem(storageKey, JSON.stringify(data));
  const adminEmail = () => localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";

  function blankConfig() {
    return { enabled: true, keyword: fixedKeyword, altText: "TDEA 廠商列表", title: "TDEA 廠商列表", items: [] };
  }

  function normalizeItem(item, index = 0) {
    const name = String(item.name || item.label || item.actionText || "").trim();
    return {
      id: item.id || uid(),
      enabled: item.enabled !== false,
      name,
      label: String(item.label || name).trim(),
      actionText: String(item.actionText || name).trim(),
      imageUrl: String(item.imageUrl || "").trim(),
      order: Number(item.order ?? index)
    };
  }

  function normalizeConfig(config) {
    const next = { ...blankConfig(), ...(config || {}) };
    next.keyword = fixedKeyword;
    next.items = (Array.isArray(next.items) ? next.items : []).map(normalizeItem);
    return next;
  }

  function localConfig() {
    const data = loadData();
    return normalizeConfig(data.vendorCardMenu || blankConfig());
  }

  function saveLocal(config) {
    const data = loadData();
    data.vendorCardMenu = normalizeConfig(config);
    saveData(data);
  }

  async function loadRemote() {
    try {
      const response = await fetch(api + "/api/vendor-card-menu", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) {
        draft = normalizeConfig(result.data);
        saveLocal(draft);
        return;
      }
    } catch (_) {}
    draft = localConfig();
  }

  function ensureNav() {
    if (!window.TDEALineNav) return;
    window.TDEALineNav.register({
      id: "vendor-cards",
      label: "廠商名片",
      order: 24,
      onClick: () => show(),
      isActive: () => active
    });
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    window.TDEALineNav?.setOpen?.(true);
    window.TDEALineNav?.refresh?.();
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-vendor-card-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-vendor-card-style";
    style.textContent = `
      .vendor-card-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,38%);gap:18px;align-items:start}
      .vendor-card-form{display:grid;gap:14px;padding:18px}
      .vendor-card-grid{display:grid;grid-template-columns:repeat(4,minmax(70px,1fr));gap:14px;padding:18px}
      .vendor-card-tile{display:grid;justify-items:center;gap:8px;text-align:center;font-size:12px;font-weight:800;color:#344054}
      .vendor-card-tile img{width:60px;height:60px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb;background:#fff}
      .vendor-card-table input{min-width:120px}.vendor-card-table input[type="checkbox"]{min-width:0}
      .vendor-card-preview{position:sticky;top:24px}
      .vendor-card-json{min-height:170px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
      .vendor-card-spec{display:grid;gap:10px;padding:14px 16px;border:1px solid #d1fadf;border-radius:10px;background:#f0fdf4;color:#14532d}
      .vendor-card-spec h3{margin:0;font-size:17px;color:#064e3b}
      .vendor-card-spec ul{margin:0;padding-left:20px;line-height:1.7}
      .vendor-card-spec code{padding:2px 6px;border-radius:6px;background:#dcfce7;color:#064e3b;font-weight:800}
      @media(max-width:1100px){.vendor-card-workspace{grid-template-columns:1fr}.vendor-card-preview{position:static}}
    `;
    document.head.appendChild(style);
  }

  async function show() {
    active = true;
    setActiveNav();
    ensureStyles();
    if (!draft) await loadRemote();
    render();
  }

  function specGuide() {
    return `
      <div class="vendor-card-spec">
        <h3>廠商名片製作規格</h3>
        <ul>
          <li>LINE 觸發關鍵字固定為 <code>TDEA廠商列表</code>，發布後會員輸入這個關鍵字會收到廠商 Flex 選單。</li>
          <li>每列顯示 4 個廠商，系統會依「排序」由小到大排列，超過 4 個會自動換下一列。</li>
          <li>圖片建議使用正方形 logo，至少 300 x 300 px，PNG 或 JPG 皆可；背景透明或白底會最穩。</li>
          <li>「顯示名稱」是 Flex 上看到的文字，建議 2 到 8 個中文字，太長會被壓縮或換行。</li>
          <li>「點擊送出文字」是會員點 logo 後送回 LINE 的文字，通常填完整廠商名稱，用來接後續名片或介紹回覆。</li>
          <li>取消單列「啟用」後，該廠商會保留在後台但不出現在 LINE Flex。</li>
          <li>修改完成請按「發布並啟用」，再到 LINE 實測輸入 <code>TDEA廠商列表</code>。</li>
        </ul>
      </div>
    `;
  }

  function render() {
    ensureStyles();
    const config = draft || blankConfig();
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = `
      <div class="topbar">
        <div><h1>廠商名片</h1><div class="subtitle">用表單維護 LINE Flex 廠商 logo 選單；點擊 logo 後會送出對應廠商名稱。</div></div>
        <div class="actions"><button class="btn" data-vendor-card-copy>複製 FLEX JSON</button><button class="btn primary" data-vendor-card-publish>發布並啟用</button></div>
      </div>
      <div class="vendor-card-workspace">
        <div class="grid">
          <section class="panel">
            <div class="panel-head"><h2 class="panel-title">基本設定</h2><button class="btn" data-vendor-card-import-roster>從廠商名冊帶入</button></div>
            <div class="vendor-card-form">
              ${specGuide()}
              <div class="grid two">
                <div class="field"><label>觸發關鍵字</label><input value="${fixedKeyword}" readonly></div>
                <div class="field"><label>LINE 替代文字</label><input data-vendor-card-field="altText" value="${esc(config.altText || "")}"></div>
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:800"><input type="checkbox" data-vendor-card-enabled ${config.enabled ? "checked" : ""}> 啟用此關鍵字</label>
              <div class="field"><label>貼上舊 FLEX JSON 匯入</label><textarea class="vendor-card-json" data-vendor-card-import-json placeholder="可貼上舊版廠商列表 Flex JSON，系統會自動抓圖片、名稱與 message action。"></textarea></div>
              <button class="btn" data-vendor-card-import-json-button>匯入 JSON 內容</button>
            </div>
          </section>
          <section class="panel">
            <div class="panel-head"><h2 class="panel-title">廠商項目</h2><button class="btn" data-vendor-card-add>新增廠商</button></div>
            ${itemTable(config.items || [])}
          </section>
        </div>
        <aside class="panel vendor-card-preview">
          <div class="panel-head"><h2 class="panel-title">預覽</h2><span class="muted">${(config.items || []).filter((item) => item.enabled !== false).length} 個廠商</span></div>
          ${preview(config)}
        </aside>
      </div>
      <div class="toast" id="vendor-card-toast"></div>
    `;
    bind();
  }

  function itemTable(items) {
    if (!items.length) return `<div class="empty">尚未設定廠商。可從廠商名冊帶入，或貼上舊 FLEX JSON 匯入。</div>`;
    return `<div class="table-wrap"><table class="vendor-card-table"><thead><tr><th>啟用</th><th>排序</th><th>顯示名稱</th><th>點擊送出文字</th><th>圖片 URL</th><th>上傳</th><th>操作</th></tr></thead><tbody>${items.map((item, index) => `
      <tr data-vendor-card-row="${index}">
        <td><input type="checkbox" data-vendor-card-item="enabled" ${item.enabled !== false ? "checked" : ""}></td>
        <td><input type="number" data-vendor-card-item="order" value="${Number(item.order ?? index)}" style="width:76px"></td>
        <td><input data-vendor-card-item="label" value="${esc(item.label || item.name || "")}"></td>
        <td><input data-vendor-card-item="actionText" value="${esc(item.actionText || item.name || item.label || "")}"></td>
        <td><input data-vendor-card-item="imageUrl" value="${esc(item.imageUrl || "")}" placeholder="https://..."></td>
        <td><input type="file" accept="image/*" data-vendor-card-upload="${index}"></td>
        <td><button class="link danger-link" data-vendor-card-delete="${index}">刪除</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  function preview(config) {
    const items = [...(config.items || [])].filter((item) => item.enabled !== false && item.imageUrl).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (!items.length) return `<div class="empty">有圖片的啟用項目才會出現在 LINE 卡片。</div>`;
    return `<div class="vendor-card-grid">${items.map((item) => `<div class="vendor-card-tile"><img src="${esc(item.imageUrl)}" alt=""><span>${esc(item.label || item.name || item.actionText)}</span></div>`).join("")}</div>`;
  }

  function buildFlex(config) {
    const items = [...(config.items || [])].filter((item) => item.enabled !== false && item.imageUrl).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const rows = [];
    for (let index = 0; index < items.length; index += 4) {
      rows.push({
        type: "box",
        layout: "horizontal",
        justifyContent: "space-around",
        contents: items.slice(index, index + 4).map((item) => {
          const label = String(item.label || item.name || item.actionText || "").slice(0, 10);
          const text = String(item.actionText || item.name || item.label || "");
          return {
            type: "box",
            layout: "vertical",
            alignItems: "center",
            spacing: "sm",
            action: { type: "message", text },
            contents: [
              { type: "image", url: item.imageUrl, size: "60px", aspectMode: "cover", action: { type: "message", label: "action", text } },
              { type: "text", text: label, size: "xxs", align: "center", wrap: true, action: { type: "message", label: "action", text } }
            ]
          };
        })
      });
    }
    return { type: "flex", altText: config.altText || "TDEA 廠商列表", contents: { type: "bubble", size: "giga", body: { type: "box", layout: "vertical", spacing: "md", contents: rows } } };
  }

  function readFromDom() {
    const config = normalizeConfig(draft || blankConfig());
    config.altText = document.querySelector("[data-vendor-card-field='altText']")?.value?.trim() || "TDEA 廠商列表";
    config.enabled = Boolean(document.querySelector("[data-vendor-card-enabled]")?.checked);
    document.querySelectorAll("[data-vendor-card-row]").forEach((row) => {
      const index = Number(row.dataset.vendorCardRow);
      const item = config.items[index];
      if (!item) return;
      row.querySelectorAll("[data-vendor-card-item]").forEach((input) => {
        const key = input.dataset.vendorCardItem;
        if (key === "enabled") item.enabled = input.checked;
        else if (key === "order") item.order = Number(input.value || index);
        else item[key] = input.value.trim();
      });
      item.name = item.label || item.actionText;
    });
    draft = normalizeConfig(config);
    saveLocal(draft);
    return draft;
  }

  function addItem(item = {}) {
    const config = readFromDom();
    config.items.push(normalizeItem({ enabled: true, order: config.items.length, ...item }, config.items.length));
    draft = config;
    saveLocal(draft);
    render();
  }

  function importFromRoster() {
    const config = readFromDom();
    const data = loadData();
    const vendors = Array.isArray(data.vendor) ? data.vendor : [];
    const existing = new Set(config.items.map((item) => String(item.actionText || item.name || item.label)));
    for (const row of vendors) {
      const name = String(row.companyName || row.name || row.memberNo || "").trim();
      if (!name || existing.has(name)) continue;
      config.items.push(normalizeItem({ name, label: name, actionText: name, imageUrl: "", order: config.items.length }, config.items.length));
      existing.add(name);
    }
    draft = config;
    saveLocal(draft);
    render();
    toast(vendors.length ? "已從廠商名冊帶入，可再補圖片 URL" : "目前沒有廠商名冊資料");
  }

  function collectCards(node, output = []) {
    if (!node || typeof node !== "object") return output;
    const contents = Array.isArray(node.contents) ? node.contents : [];
    const image = contents.find((item) => item?.type === "image" && item.url);
    const textNode = contents.find((item) => item?.type === "text" && item.text);
    const actionText = node.action?.type === "message" ? node.action.text : image?.action?.text || textNode?.action?.text || "";
    if (image?.url && (textNode?.text || actionText)) {
      output.push(normalizeItem({ name: actionText || textNode.text, label: String(textNode.text || actionText).replace(/\n/g, ""), actionText: actionText || textNode.text, imageUrl: image.url, order: output.length }, output.length));
    }
    for (const child of contents) collectCards(child, output);
    if (Array.isArray(node.contents)) return output;
    for (const value of Object.values(node)) if (value && typeof value === "object") collectCards(value, output);
    return output;
  }

  function importJson() {
    const raw = document.querySelector("[data-vendor-card-import-json]")?.value || "";
    if (!raw.trim()) return toast("請先貼上 FLEX JSON");
    let parsed;
    try { parsed = JSON.parse(raw); } catch (_) { return toast("JSON 格式錯誤"); }
    const items = collectCards(parsed, []);
    if (!items.length) return toast("沒有抓到圖片與廠商名稱");
    const config = readFromDom();
    config.items = items;
    draft = normalizeConfig(config);
    saveLocal(draft);
    render();
    toast(`已匯入 ${items.length} 個廠商項目`);
  }

  async function uploadImage(index, file) {
    const email = adminEmail();
    if (!email) return toast("請先登入管理者");
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "vendor-card");
    form.append("activityId", "menu");
    const response = await fetch(api + "/api/uploads", { method: "POST", headers: { "x-admin-email": email }, body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "圖片上傳失敗");
    const config = readFromDom();
    if (config.items[index]) config.items[index].imageUrl = result.url?.startsWith("http") ? result.url : api + result.url;
    draft = config;
    saveLocal(draft);
    render();
    toast("圖片已上傳");
  }

  async function publish() {
    const email = adminEmail();
    if (!email) return toast("請先登入管理者");
    const config = readFromDom();
    config.enabled = true;
    draft = normalizeConfig(config);
    saveLocal(draft);
    const response = await fetch(api + "/api/vendor-card-menu", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(draft)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "發布失敗");
    draft = normalizeConfig(result.data);
    saveLocal(draft);
    render();
    toast("已發布並啟用，關鍵字 TDEA廠商列表 已啟用");
  }

  function bind() {
    document.querySelectorAll("[data-vendor-card-item], [data-vendor-card-field], [data-vendor-card-enabled]").forEach((input) => {
      input.addEventListener("input", () => readFromDom());
      input.addEventListener("change", () => readFromDom());
    });
    document.querySelector("[data-vendor-card-add]")?.addEventListener("click", () => addItem({ name: "新廠商", label: "新廠商", actionText: "新廠商" }));
    document.querySelector("[data-vendor-card-import-roster]")?.addEventListener("click", importFromRoster);
    document.querySelector("[data-vendor-card-import-json-button]")?.addEventListener("click", importJson);
    document.querySelector("[data-vendor-card-copy]")?.addEventListener("click", async () => { await navigator.clipboard.writeText(JSON.stringify(buildFlex(readFromDom()), null, 2)); toast("FLEX JSON 已複製"); });
    document.querySelector("[data-vendor-card-publish]")?.addEventListener("click", publish);
    document.querySelectorAll("[data-vendor-card-delete]").forEach((button) => button.addEventListener("click", () => {
      const config = readFromDom();
      config.items.splice(Number(button.dataset.vendorCardDelete), 1);
      draft = config;
      saveLocal(draft);
      render();
    }));
    document.querySelectorAll("[data-vendor-card-upload]").forEach((input) => input.addEventListener("change", () => uploadImage(Number(input.dataset.vendorCardUpload), input.files?.[0])));
  }

  function toast(message) {
    const el = document.querySelector("#vendor-card-toast") || document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  document.addEventListener("click", (event) => {
    const navButton = event.target.closest(".nav button");
    if (navButton && !event.target.closest('[data-line-item="vendor-cards"]') && !event.target.closest("[data-line-parent]")) active = false;
  }, true);
  new MutationObserver(() => ensureNav()).observe(document.body, { childList: true, subtree: true });
  ensureNav();
})();
