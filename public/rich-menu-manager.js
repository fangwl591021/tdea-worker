(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const storageKey = "tdea-rich-menu-draft";
  let active = false;
  let draft = blankConfig();

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const uid = () => "rm-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const adminEmail = () => localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
  const setAdminEmail = (value) => {
    const email = String(value || "").trim();
    if (email) localStorage.setItem("tdea-admin-email", email);
  };

  function blankConfig() {
    return {
      name: "TDEA 圖文選單",
      chatBarText: "選單",
      selected: true,
      size: { width: 2500, height: 1686 },
      imageUrl: "",
      areas: presetAreas("grid6", 1686),
      deployments: []
    };
  }

  function presetAreas(preset, height) {
    const h = Number(height) === 843 ? 843 : 1686;
    const area = (label, x, y, width, areaHeight, actionText) => ({
      id: uid(),
      label,
      bounds: { x, y, width, height: areaHeight },
      action: { type: "message", text: actionText || label }
    });
    if (preset === "full") return [area("全版", 0, 0, 2500, h, "TDEA")];
    if (preset === "rows2") return [area("上半部", 0, 0, 2500, Math.floor(h / 2), "TDEA活動"), area("下半部", 0, Math.floor(h / 2), 2500, h - Math.floor(h / 2), "TDEA會員專區")];
    if (preset === "cols3") return [0, 1, 2].map((index) => area(`第 ${index + 1} 欄`, Math.round(index * 2500 / 3), 0, index === 2 ? 2500 - Math.round(index * 2500 / 3) : Math.round(2500 / 3), h, "TDEA"));
    if (preset === "grid4") {
      const halfW = 1250;
      const halfH = Math.floor(h / 2);
      return [
        area("左上", 0, 0, halfW, halfH, "TDEA每月活動"),
        area("右上", halfW, 0, halfW, halfH, "TDEA活動查詢"),
        area("左下", 0, halfH, halfW, h - halfH, "TDEA廠商列表"),
        area("右下", halfW, halfH, halfW, h - halfH, "TDEA會員QR")
      ];
    }
    const colW = Math.floor(2500 / 3);
    const rowH = Math.floor(h / 2);
    const labels = ["每月活動", "活動查詢", "廠商列表", "會員QR", "行事曆", "會員專區"];
    const texts = ["TDEA每月活動", "TDEA活動查詢", "TDEA廠商列表", "TDEA會員QR", "TDEA行事曆", "TDEA會員專區"];
    return labels.map((label, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return area(label, col * colW, row * rowH, col === 2 ? 2500 - col * colW : colW, row === 1 ? h - row * rowH : rowH, texts[index]);
    });
  }

  function normalizeConfig(config) {
    const next = { ...blankConfig(), ...(config || {}) };
    next.size = { width: 2500, height: Number(next.size?.height) === 843 ? 843 : 1686 };
    next.name = String(next.name || "TDEA 圖文選單").trim() || "TDEA 圖文選單";
    next.chatBarText = String(next.chatBarText || "選單").trim().slice(0, 14) || "選單";
    next.imageUrl = String(next.imageUrl || "").trim();
    next.selected = next.selected !== false;
    next.areas = Array.isArray(next.areas) && next.areas.length ? next.areas.map((item, index) => normalizeArea(item, index, next.size.height)) : presetAreas("grid6", next.size.height);
    next.deployments = Array.isArray(next.deployments) ? next.deployments : [];
    return next;
  }

  function normalizeArea(item, index, height) {
    const action = item.action || {};
    const type = ["uri", "message", "postback", "richmenuswitch"].includes(action.type) ? action.type : "message";
    const bounds = item.bounds || {};
    return {
      id: item.id || uid(),
      label: String(item.label || `區域 ${index + 1}`).trim(),
      bounds: {
        x: clamp(bounds.x, 0, 2499, 0),
        y: clamp(bounds.y, 0, height - 1, 0),
        width: clamp(bounds.width, 1, 2500, 2500),
        height: clamp(bounds.height, 1, height, Math.floor(height / 2))
      },
      action: { ...action, type }
    };
  }

  function clamp(value, min, max, fallback) {
    const next = Math.round(Number(value));
    if (!Number.isFinite(next)) return fallback;
    return Math.min(Math.max(next, min), max);
  }

  function ensureNav() {
    if (window.TDEALineNav?.register) {
      window.TDEALineNav.register({
        id: "rich-menu",
        label: "圖文選單",
        order: 28,
        onClick: () => show(),
        isActive: () => active
      });
      window.TDEALineNav.refresh?.();
    }
    setTimeout(ensureFallbackNav, 0);
  }

  function ensureFallbackNav() {
    if (document.querySelector('[data-line-item="rich-menu"],[data-rich-menu-fallback]')) return;
    const children = document.querySelector(".line-nav-children");
    if (!children) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.richMenuFallback = "1";
    button.textContent = "圖文選單";
    button.addEventListener("click", () => show());
    const push = children.querySelector('[data-line-item="push"]');
    if (push) children.insertBefore(button, push);
    else children.appendChild(button);
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-rich-menu-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-rich-menu-style";
    style.textContent = `
      .rm-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,38%);gap:18px;align-items:start}
      .rm-form{display:grid;gap:14px;padding:18px}.rm-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .rm-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.rm-help{font-size:13px;color:#667085;line-height:1.6}
      .rm-preview{position:sticky;top:24px}.rm-canvas{position:relative;width:min(100%,420px);margin:0 auto;background:#e5e7eb;border:12px solid #111827;border-radius:24px;overflow:hidden}
      .rm-canvas::before{content:"";display:block;padding-top:67.44%}.rm-canvas[data-half="1"]::before{padding-top:33.72%}
      .rm-canvas img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.rm-placeholder{position:absolute;inset:0;display:grid;place-items:center;color:#667085;font-weight:800;text-align:center;padding:24px}
      .rm-area{position:absolute;border:2px solid #06c755;background:rgba(6,199,85,.2);color:#063;font-size:12px;font-weight:900;display:grid;place-items:center;text-align:center;padding:4px}
      .rm-table-wrap{overflow:auto}.rm-table{width:100%;border-collapse:collapse;min-width:980px}.rm-table th,.rm-table td{border-top:1px solid #e5e7eb;padding:10px;text-align:left;vertical-align:top}.rm-table th{background:#f8fafc;color:#344054;font-size:13px}
      .rm-table input,.rm-table select{width:100%;box-sizing:border-box}.rm-num{width:82px!important}.rm-chip{display:inline-flex;align-items:center;border-radius:999px;background:#eafff1;color:#027a48;padding:5px 10px;font-weight:800;font-size:12px}
      .rm-log{display:grid;gap:10px;padding:18px}.rm-log-item{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff}.rm-json{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:12px;max-height:260px;overflow:auto}
      @media(max-width:1100px){.rm-workspace{grid-template-columns:1fr}.rm-preview{position:static}.rm-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function show() {
    active = true;
    ensureStyles();
    window.TDEALineNav?.setOpen?.(true);
    window.TDEALineNav?.refresh?.();
    await loadRemote();
    render();
  }

  async function loadRemote() {
    try {
      const response = await fetch(api + "/api/rich-menu", { cache: "no-store", headers: { "x-admin-email": adminEmail() } });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) {
        draft = normalizeConfig(result.data);
        localStorage.setItem(storageKey, JSON.stringify(draft));
        return;
      }
    } catch (_) {}
    try { draft = normalizeConfig(JSON.parse(localStorage.getItem(storageKey) || "{}")); }
    catch (_) { draft = blankConfig(); }
  }

  function collect() {
    const main = document.querySelector(".main");
    const height = Number(main?.querySelector("[data-rm-height]")?.value) === 843 ? 843 : 1686;
    const areas = [...main.querySelectorAll("[data-rm-area]")].map((row, index) => {
      const type = row.querySelector("[data-rm-action-type]")?.value || "message";
      const action = { type };
      if (type === "uri") action.uri = row.querySelector("[data-rm-uri]")?.value || "";
      if (type === "message") action.text = row.querySelector("[data-rm-text]")?.value || "";
      if (type === "postback") {
        action.data = row.querySelector("[data-rm-data]")?.value || "";
        action.displayText = row.querySelector("[data-rm-display]")?.value || "";
      }
      if (type === "richmenuswitch") {
        action.richMenuAliasId = row.querySelector("[data-rm-alias]")?.value || "";
        action.data = row.querySelector("[data-rm-data]")?.value || "";
      }
      return normalizeArea({
        id: row.dataset.rmArea,
        label: row.querySelector("[data-rm-label]")?.value || `區域 ${index + 1}`,
        bounds: {
          x: row.querySelector("[data-rm-x]")?.value,
          y: row.querySelector("[data-rm-y]")?.value,
          width: row.querySelector("[data-rm-w]")?.value,
          height: row.querySelector("[data-rm-h]")?.value
        },
        action
      }, index, height);
    });
    draft = normalizeConfig({
      ...draft,
      name: main?.querySelector("[data-rm-name]")?.value || "",
      chatBarText: main?.querySelector("[data-rm-chatbar]")?.value || "",
      selected: Boolean(main?.querySelector("[data-rm-selected]")?.checked),
      size: { width: 2500, height },
      imageUrl: main?.querySelector("[data-rm-image-url]")?.value || "",
      areas
    });
    localStorage.setItem(storageKey, JSON.stringify(draft));
    return draft;
  }

  function render() {
    ensureStyles();
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = `
      <div class="topbar">
        <div>
          <h1>圖文選單</h1>
          <div class="subtitle">建立 LINE Rich Menu，設定熱區後可直接發布為官方帳號預設選單。</div>
        </div>
        <div class="actions">
          <button class="btn" data-rm-copy>複製 JSON</button>
          <button class="btn" data-rm-save>儲存草稿</button>
          <button class="btn primary" data-rm-deploy>發布到 LINE</button>
        </div>
      </div>
      <div class="rm-workspace">
        <section class="panel">
          <div class="panel-head"><h2>基本設定</h2></div>
          <div class="rm-form">
            <div class="rm-row">
              <label>管理者 Email<input data-rm-admin value="${esc(adminEmail())}" placeholder="fangwl591021@gmail.com"></label>
              <label>選單名稱<input data-rm-name value="${esc(draft.name)}" maxlength="300"></label>
            </div>
            <div class="rm-row">
              <label>選單列文字<input data-rm-chatbar value="${esc(draft.chatBarText)}" maxlength="14"></label>
              <label>LINE 尺寸<select data-rm-height>
                <option value="1686" ${draft.size?.height === 1686 ? "selected" : ""}>全版 2500 x 1686</option>
                <option value="843" ${draft.size?.height === 843 ? "selected" : ""}>半版 2500 x 843</option>
              </select></label>
            </div>
            <label class="check"><input type="checkbox" data-rm-selected ${draft.selected !== false ? "checked" : ""}> 預設展開選單</label>
            <label>底圖 JPG/PNG<input type="file" data-rm-file accept="image/jpeg,image/png"></label>
            <label>底圖 URL<input data-rm-image-url value="${esc(draft.imageUrl)}" placeholder="上傳後自動填入，也可貼圖片網址"></label>
            <div class="rm-actions">
              <button class="btn" data-rm-preset="grid6">套用 6 格</button>
              <button class="btn" data-rm-preset="grid4">套用 4 格</button>
              <button class="btn" data-rm-preset="cols3">套用 3 欄</button>
              <button class="btn" data-rm-preset="rows2">套用上下 2 格</button>
              <button class="btn" data-rm-preset="full">套用全版 1 格</button>
              <button class="btn" data-rm-add>新增區域</button>
            </div>
            <div class="rm-help">規格：LINE 圖文選單底圖只接受 JPG 或 PNG。全版 2500x1686、半版 2500x843。座標以 LINE 原始尺寸計算。</div>
          </div>
          <div class="panel-head"><h2>點擊區域</h2></div>
          <div class="rm-table-wrap">${areaTable()}</div>
        </section>
        <aside class="panel rm-preview">
          <div class="panel-head"><h2>預覽</h2><span class="rm-chip">${draft.areas.length} 個區域</span></div>
          ${previewHtml()}
          <div class="panel-head"><h2>發布紀錄</h2></div>
          <div class="rm-log">${logHtml()}</div>
        </aside>
      </div>
      <div class="toast" id="rm-toast"></div>`;
    bind();
  }

  function areaTable() {
    return `<table class="rm-table">
      <thead><tr><th>名稱</th><th>動作</th><th>內容</th><th>X</th><th>Y</th><th>寬</th><th>高</th><th></th></tr></thead>
      <tbody>${draft.areas.map((area, index) => areaRow(area, index)).join("")}</tbody>
    </table>`;
  }

  function areaRow(area, index) {
    const type = area.action?.type || "message";
    return `<tr data-rm-area="${esc(area.id)}">
      <td><input data-rm-label value="${esc(area.label || `區域 ${index + 1}`)}"></td>
      <td><select data-rm-action-type>
        <option value="message" ${type === "message" ? "selected" : ""}>送出文字</option>
        <option value="uri" ${type === "uri" ? "selected" : ""}>開啟網址</option>
        <option value="postback" ${type === "postback" ? "selected" : ""}>Postback</option>
        <option value="richmenuswitch" ${type === "richmenuswitch" ? "selected" : ""}>切換選單</option>
      </select></td>
      <td>${actionFields(area.action || {})}</td>
      <td><input class="rm-num" data-rm-x type="number" value="${esc(area.bounds.x)}"></td>
      <td><input class="rm-num" data-rm-y type="number" value="${esc(area.bounds.y)}"></td>
      <td><input class="rm-num" data-rm-w type="number" value="${esc(area.bounds.width)}"></td>
      <td><input class="rm-num" data-rm-h type="number" value="${esc(area.bounds.height)}"></td>
      <td><button class="btn danger" data-rm-delete="${esc(area.id)}">刪除</button></td>
    </tr>`;
  }

  function actionFields(action) {
    if (action.type === "uri") return `<input data-rm-uri value="${esc(action.uri || "")}" placeholder="https://...">`;
    if (action.type === "postback") return `<input data-rm-data value="${esc(action.data || "")}" placeholder="data，例如 action=menu"><input data-rm-display value="${esc(action.displayText || "")}" placeholder="顯示文字，可空白">`;
    if (action.type === "richmenuswitch") return `<input data-rm-alias value="${esc(action.richMenuAliasId || "")}" placeholder="Alias ID"><input data-rm-data value="${esc(action.data || "")}" placeholder="data">`;
    return `<input data-rm-text value="${esc(action.text || "")}" placeholder="例如 TDEA每月活動">`;
  }

  function previewHtml() {
    const height = draft.size?.height === 843 ? 843 : 1686;
    return `<div class="rm-canvas" data-half="${height === 843 ? "1" : "0"}">
      ${draft.imageUrl ? `<img src="${esc(draft.imageUrl)}" alt="">` : `<div class="rm-placeholder">尚未上傳底圖</div>`}
      ${draft.areas.map((area) => {
        const b = area.bounds;
        return `<div class="rm-area" style="left:${b.x / 25}%;top:${b.y / height * 100}%;width:${b.width / 25}%;height:${b.height / height * 100}%">${esc(area.label)}</div>`;
      }).join("")}
    </div>
    <div class="rm-json">${esc(JSON.stringify(lineMenuObject(), null, 2))}</div>`;
  }

  function lineMenuObject() {
    return {
      size: draft.size,
      selected: draft.selected !== false,
      name: draft.name,
      chatBarText: draft.chatBarText,
      areas: draft.areas.map((area) => ({ bounds: area.bounds, action: area.action }))
    };
  }

  function logHtml() {
    if (!draft.deployments?.length) return `<div class="muted">尚未發布。</div>`;
    return draft.deployments.slice(0, 8).map((item) => `<div class="rm-log-item">
      <strong>${esc(item.name)}</strong><br>
      <span class="muted">${esc(item.richMenuId)} / ${esc(new Date(item.createdAt).toLocaleString("zh-TW"))}</span>
    </div>`).join("");
  }

  function bind() {
    const main = document.querySelector(".main");
    main.querySelector("[data-rm-admin]")?.addEventListener("change", (event) => setAdminEmail(event.target.value));
    main.querySelectorAll("input,select").forEach((el) => {
      if (el.type !== "file") el.addEventListener("change", () => { collect(); render(); });
    });
    main.querySelector("[data-rm-file]")?.addEventListener("change", uploadImage);
    main.querySelectorAll("[data-rm-preset]").forEach((button) => button.addEventListener("click", () => {
      collect();
      draft.areas = presetAreas(button.dataset.rmPreset, draft.size.height);
      render();
    }));
    main.querySelector("[data-rm-add]")?.addEventListener("click", () => {
      collect();
      draft.areas.push(normalizeArea({ label: `區域 ${draft.areas.length + 1}`, bounds: { x: 0, y: 0, width: 500, height: 500 }, action: { type: "message", text: "TDEA" } }, draft.areas.length, draft.size.height));
      render();
    });
    main.querySelectorAll("[data-rm-delete]").forEach((button) => button.addEventListener("click", () => {
      collect();
      draft.areas = draft.areas.filter((area) => area.id !== button.dataset.rmDelete);
      render();
    }));
    main.querySelector("[data-rm-save]")?.addEventListener("click", saveRemote);
    main.querySelector("[data-rm-deploy]")?.addEventListener("click", deploy);
    main.querySelector("[data-rm-copy]")?.addEventListener("click", copyJson);
  }

  function resizeRichMenuImage(file, height) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("圖片讀取失敗"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("圖片格式無法讀取"));
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 2500;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          let quality = 0.92;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > 1300000 && quality > 0.55) {
            quality -= 0.08;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          const bytes = atob(dataUrl.split(",")[1]);
          const buffer = new Uint8Array(bytes.length);
          for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
          resolve(new File([buffer], file.name.replace(/\.[^.]+$/, "") + "-rich-menu.jpg", { type: "image/jpeg" }));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast("圖文選單底圖只支援 JPG 或 PNG");
    setAdminEmail(document.querySelector("[data-rm-admin]")?.value);
    collect();
    const uploadFile = await resizeRichMenuImage(file, draft.size.height).catch((error) => {
      toast(error.message || "圖片處理失敗");
      return null;
    });
    if (!uploadFile) return;
    const form = new FormData();
    form.append("file", uploadFile);
    form.append("purpose", "rich-menu");
    form.append("activityId", "default");
    const response = await fetch(api + "/api/uploads", { method: "POST", headers: { "x-admin-email": adminEmail() }, body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "上傳失敗");
    draft.imageUrl = result.url?.startsWith("http") ? result.url : api + result.url;
    render();
    toast("底圖已轉成 LINE 尺寸並上傳");
  }

  async function saveRemote() {
    setAdminEmail(document.querySelector("[data-rm-admin]")?.value);
    const payload = collect();
    const response = await fetch(api + "/api/rich-menu", { method: "PUT", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "儲存失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    render();
    toast("草稿已儲存");
  }

  async function deploy() {
    if (!confirm("確定發布到 LINE 並設為預設圖文選單？")) return;
    setAdminEmail(document.querySelector("[data-rm-admin]")?.value);
    const payload = collect();
    const response = await fetch(api + "/api/rich-menu/deploy", { method: "POST", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...payload, setDefault: true }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "發布失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    render();
    toast("已發布到 LINE");
  }

  async function copyJson() {
    collect();
    await navigator.clipboard?.writeText(JSON.stringify(lineMenuObject(), null, 2));
    toast("已複製 JSON");
  }

  function toast(message) {
    const el = document.querySelector("#rm-toast") || document.querySelector("#toast");
    if (!el) return alert(message);
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function boot() {
    ensureNav();
    ensureFallbackNav();
  }
  boot();
  setTimeout(boot, 100);
  setTimeout(boot, 500);
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
})();
