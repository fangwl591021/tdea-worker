(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const storageKey = "tdea-rich-menu-draft";
  const adminEmail = () => localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "fangwl591021@gmail.com";

  let active = false;
  let canvas = null;
  let draft = blankConfig();
  let drawing = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let currentRect = null;
  let currentImageFile = null;

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
    const area = (label, x, y, width, areaHeight, text) => ({
      label,
      bounds: { x, y, width, height: areaHeight },
      action: { type: "message", text }
    });
    if (preset === "full") return [area("全版", 0, 0, 2500, h, "TDEA")];
    if (preset === "rows2") {
      const half = Math.floor(h / 2);
      return [
        area("上半部", 0, 0, 2500, half, "TDEA每月活動"),
        area("下半部", 0, half, 2500, h - half, "TDEA會員專區")
      ];
    }
    if (preset === "cols3") {
      return [0, 1, 2].map((index) => {
        const x = Math.round(index * 2500 / 3);
        return area(`第 ${index + 1} 欄`, x, 0, index === 2 ? 2500 - x : Math.round(2500 / 3), h, "TDEA");
      });
    }
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
    const labels = ["每月活動", "活動查詢", "廠商列表", "會員QR", "行事曆", "會員專區"];
    const texts = ["TDEA每月活動", "TDEA活動查詢", "TDEA廠商列表", "TDEA會員QR", "TDEA行事曆", "TDEA會員專區"];
    const colW = Math.floor(2500 / 3);
    const rowH = Math.floor(h / 2);
    return labels.map((label, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return area(label, col * colW, row * rowH, col === 2 ? 2500 - col * colW : colW, row === 1 ? h - row * rowH : rowH, texts[index]);
    });
  }

  function normalizeConfig(input) {
    const next = { ...blankConfig(), ...(input || {}) };
    next.name = String(next.name || "TDEA 圖文選單").trim() || "TDEA 圖文選單";
    next.chatBarText = String(next.chatBarText || "選單").trim().slice(0, 14) || "選單";
    next.selected = next.selected !== false;
    next.size = { width: 2500, height: Number(next.size?.height) === 843 ? 843 : 1686 };
    next.imageUrl = String(next.imageUrl || "").trim();
    next.areas = Array.isArray(next.areas) ? next.areas : [];
    if (!next.areas.length) next.areas = presetAreas("grid6", next.size.height);
    next.deployments = Array.isArray(next.deployments) ? next.deployments : [];
    return next;
  }

  function richMenuObject() {
    collectFromDom();
    return {
      size: draft.size,
      selected: draft.selected,
      name: draft.name,
      chatBarText: draft.chatBarText,
      areas: getCanvasAreas()
    };
  }

  function getCanvasAreas() {
    if (!canvas) return draft.areas || [];
    const scale = 2500 / canvas.getWidth();
    return canvas.getObjects("rect").map((rect, index) => {
      const x = Math.max(0, Math.round(rect.left * scale));
      const y = Math.max(0, Math.round(rect.top * scale));
      let width = Math.round(rect.getScaledWidth() * scale);
      let height = Math.round(rect.getScaledHeight() * scale);
      if (x + width > 2500) width = 2500 - x;
      if (y + height > draft.size.height) height = draft.size.height - y;
      return {
        label: rect.label || `區域 ${index + 1}`,
        bounds: { x, y, width, height },
        action: normalizeAction(rect.action || { type: "message", text: "" })
      };
    });
  }

  function normalizeAction(action) {
    const type = ["message", "uri", "postback", "richmenuswitch"].includes(action.type) ? action.type : "message";
    if (type === "uri") return { type, uri: String(action.uri || "") };
    if (type === "postback") {
      const next = { type, data: String(action.data || "") };
      if (action.displayText) next.displayText = String(action.displayText);
      return next;
    }
    if (type === "richmenuswitch") return { type, richMenuAliasId: String(action.richMenuAliasId || ""), data: String(action.data || "") };
    return { type: "message", text: String(action.text || "") };
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-rich-menu-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-rich-menu-style";
    style.textContent = `
      html,body{height:100%}.main{padding:0!important;max-width:none!important}
      .rm-app{display:flex;height:100vh;overflow:hidden;background:#f1f5f9;color:#0f172a}
      .rm-side{width:360px;flex:0 0 360px;background:#f8fafc;border-right:1px solid #e5e7eb;display:flex;flex-direction:column}
      .rm-side-head{display:flex;justify-content:space-between;align-items:center;background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 18px}
      .rm-side-head h1{font-size:18px;margin:0;font-weight:900}.rm-panel{padding:18px;background:#fff;border-bottom:1px solid #e5e7eb;display:grid;gap:14px}
      .rm-panel label{display:grid;gap:6px;font-size:13px;font-weight:800;color:#334155}.rm-panel input{border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font-size:14px;background:#f8fafc}
      .rm-upload{border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;border-radius:12px;padding:12px;font-weight:900;text-align:center;cursor:pointer}
      .rm-editor-list{flex:1;overflow:auto;padding:14px 18px;display:grid;gap:12px}.rm-area-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;display:grid;gap:10px}
      .rm-area-card h3{margin:0;color:#64748b;font-size:12px}.rm-area-card select,.rm-area-card input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:9px 10px;font-size:13px;background:#f8fafc}
      .rm-remove{border:0;background:#fef2f2;color:#dc2626;border-radius:8px;padding:8px;font-weight:900;cursor:pointer}
      .rm-json-box{padding:16px 18px;background:#fff;border-top:1px solid #e5e7eb}.rm-json-box textarea{width:100%;box-sizing:border-box;height:120px;border:1px solid #cbd5e1;border-radius:8px;font:12px ui-monospace,SFMono-Regular,Consolas,monospace;background:#f8fafc;padding:10px;resize:none}
      .rm-main{flex:1;display:flex;flex-direction:column;min-width:0}.rm-toolbar{display:flex;justify-content:space-between;align-items:center;background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 20px}
      .rm-toolbar .left,.rm-toolbar .right{display:flex;gap:10px;align-items:center}.rm-btn{border:1px solid #d7dde8;background:#fff;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:900;color:#071833;cursor:pointer}
      .rm-btn.primary{background:#06c755;color:#fff;border-color:#06c755}.rm-btn.dark{background:#111827;color:#fff;border-color:#111827}.rm-btn.warn{background:#fff7ed;color:#ea580c;border-color:#fed7aa}
      .rm-stage{flex:1;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:38px}.rm-canvas-wrap{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 18px 45px rgba(15,23,42,.15);position:relative;min-width:620px;min-height:420px;display:grid;place-items:center}
      .rm-placeholder{position:absolute;inset:16px;display:grid;place-items:center;background:rgba(248,250,252,.88);color:#94a3b8;font-weight:900;text-align:center;pointer-events:none;border-radius:12px}
      .rm-deploy-log{width:360px;background:#fff;border-left:1px solid #e5e7eb;display:flex;flex-direction:column}.rm-log-head{padding:16px 18px;border-bottom:1px solid #e5e7eb;font-size:18px;font-weight:900}
      .rm-log-body{padding:16px 18px;overflow:auto;display:grid;gap:10px}.rm-log-item{border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#f8fafc;font-size:13px}.muted{color:#667085}
      .hidden{display:none!important}
      @media(max-width:1100px){.rm-app{height:auto;min-height:100vh;display:block}.rm-side,.rm-deploy-log{width:auto}.rm-stage{padding:18px}.rm-canvas-wrap{min-width:0;width:100%;overflow:auto}}
    `;
    document.head.appendChild(style);
  }

  async function show() {
    active = true;
    ensureStyles();
    await loadRemote();
    render();
    initCanvas();
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

  function render() {
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = `
      <div class="rm-app">
        <aside class="rm-side">
          <div class="rm-side-head"><h1>圖文選單編輯器</h1></div>
          <div class="rm-panel">
            <label>1. 匯入底圖 JPG/PNG<input type="file" id="rm-image-upload" accept="image/jpeg,image/png" hidden><button type="button" class="rm-upload" data-rm-upload>上傳圖文選單底圖</button></label>
            <label>2. 選單名稱<input id="rm-name" value="${esc(draft.name)}" maxlength="300"></label>
            <label>3. 選單列文字 ChatBar<input id="rm-chatbar" value="${esc(draft.chatBarText)}" maxlength="14"></label>
          </div>
          <div id="rm-area-editor" class="rm-editor-list"></div>
          <div class="rm-json-box">
            <label style="font-size:13px;font-weight:900;color:#334155">JSON 輸出</label>
            <textarea id="rm-json" readonly></textarea>
          </div>
        </aside>
        <main class="rm-main">
          <div class="rm-toolbar">
            <div class="left">
              <button type="button" class="rm-btn dark" data-rm-draw>劃定點擊區域</button>
              <button type="button" class="rm-btn" data-rm-preset="grid6">套用 6 格</button>
              <button type="button" class="rm-btn" data-rm-preset="grid4">套用 4 格</button>
              <button type="button" class="rm-btn" data-rm-preset="rows2">套用上下 2 格</button>
            </div>
            <div class="right">
              <button type="button" class="rm-btn warn" data-rm-copy>複製 JSON</button>
              <button type="button" class="rm-btn" data-rm-save>儲存草稿</button>
              <button type="button" class="rm-btn primary" data-rm-deploy>發布到 LINE</button>
            </div>
          </div>
          <div class="rm-stage">
            <div class="rm-canvas-wrap">
              <canvas id="rm-canvas"></canvas>
              <div id="rm-placeholder" class="rm-placeholder">請先上傳底圖，或直接套用預設熱區。</div>
            </div>
          </div>
        </main>
        <aside class="rm-deploy-log">
          <div class="rm-log-head">發布紀錄</div>
          <div class="rm-log-body">${logHtml()}</div>
        </aside>
      </div>
      <div class="toast" id="rm-toast"></div>`;
    bind();
  }

  function initCanvas() {
    if (!window.fabric) {
      toast("Fabric.js 尚未載入，請重新整理頁面");
      return;
    }
    canvas = new fabric.Canvas("rm-canvas", { selection: true });
    canvas.setWidth(600);
    canvas.setHeight(Math.round(600 * draft.size.height / 2500));
    bindCanvasEvents();
    loadCanvasImage(draft.imageUrl);
    importAreas(draft.areas || []);
    updateOutput();
  }

  function bindCanvasEvents() {
    canvas.on("mouse:down", (event) => {
      if (!drawing || canvas.findTarget(event.e)) return;
      dragging = true;
      const pointer = canvas.getPointer(event.e);
      startX = pointer.x;
      startY = pointer.y;
      currentRect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: "rgba(6,199,85,.24)",
        stroke: "#06c755",
        strokeWidth: 2
      });
      currentRect.label = `區域 ${canvas.getObjects("rect").length + 1}`;
      currentRect.action = { type: "message", text: "" };
      canvas.add(currentRect);
    });
    canvas.on("mouse:move", (event) => {
      if (!dragging || !currentRect) return;
      const pointer = canvas.getPointer(event.e);
      currentRect.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(startX - pointer.x),
        height: Math.abs(startY - pointer.y)
      });
      canvas.renderAll();
    });
    canvas.on("mouse:up", () => {
      if (!dragging) return;
      dragging = false;
      drawing = false;
      currentRect = null;
      document.querySelector("[data-rm-draw]").textContent = "劃定點擊區域";
      updateOutput();
    });
    canvas.on("object:modified", updateOutput);
  }

  function bind() {
    document.querySelector("[data-rm-upload]")?.addEventListener("click", () => document.querySelector("#rm-image-upload")?.click());
    document.querySelector("#rm-image-upload")?.addEventListener("change", uploadImage);
    document.querySelector("#rm-name")?.addEventListener("input", updateOutput);
    document.querySelector("#rm-chatbar")?.addEventListener("input", updateOutput);
    document.querySelector("[data-rm-draw]")?.addEventListener("click", () => {
      drawing = true;
      document.querySelector("[data-rm-draw]").textContent = "拖曳建立區域...";
    });
    document.querySelectorAll("[data-rm-preset]").forEach((button) => button.addEventListener("click", () => {
      collectFromDom();
      draft.areas = presetAreas(button.dataset.rmPreset, draft.size.height);
      importAreas(draft.areas);
      updateOutput();
    }));
    document.querySelector("[data-rm-copy]")?.addEventListener("click", copyJson);
    document.querySelector("[data-rm-save]")?.addEventListener("click", saveRemote);
    document.querySelector("[data-rm-deploy]")?.addEventListener("click", deploy);
  }

  function collectFromDom() {
    draft.name = document.querySelector("#rm-name")?.value?.trim() || draft.name || "TDEA 圖文選單";
    draft.chatBarText = (document.querySelector("#rm-chatbar")?.value || draft.chatBarText || "選單").trim().slice(0, 14) || "選單";
    draft.areas = getCanvasAreas();
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }

  function loadCanvasImage(url) {
    document.querySelector("#rm-placeholder")?.classList.toggle("hidden", Boolean(url));
    if (!url || !canvas) return;
    fabric.Image.fromURL(url, (img) => {
      const scaleX = canvas.getWidth() / img.width;
      const scaleY = canvas.getHeight() / img.height;
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), { scaleX, scaleY });
      document.querySelector("#rm-placeholder")?.classList.add("hidden");
    }, { crossOrigin: "anonymous" });
  }

  function importAreas(areas) {
    if (!canvas) return;
    canvas.getObjects().forEach((object) => canvas.remove(object));
    const scale = canvas.getWidth() / 2500;
    (areas || []).forEach((area, index) => {
      const rect = new fabric.Rect({
        left: area.bounds.x * scale,
        top: area.bounds.y * scale,
        width: area.bounds.width * scale,
        height: area.bounds.height * scale,
        fill: "rgba(6,199,85,.24)",
        stroke: "#06c755",
        strokeWidth: 2
      });
      rect.label = area.label || `區域 ${index + 1}`;
      rect.action = normalizeAction(area.action || { type: "message", text: "" });
      canvas.add(rect);
    });
    refreshCanvasLabels();
    canvas.renderAll();
  }

  function refreshCanvasLabels() {
    if (!canvas) return;
    canvas.getObjects("text").forEach((label) => canvas.remove(label));
    canvas.getObjects("rect").forEach((rect, index) => {
      canvas.add(new fabric.Text(`#${index + 1}`, {
        left: rect.left + 6,
        top: rect.top + 6,
        fontSize: 14,
        fill: "#fff",
        backgroundColor: "#06c755",
        selectable: false,
        evented: false
      }));
    });
  }

  function updateOutput() {
    collectFromDom();
    refreshCanvasLabels();
    const output = document.querySelector("#rm-json");
    if (output) output.value = JSON.stringify(richMenuObject(), null, 2);
    renderAreaEditor();
  }

  function renderAreaEditor() {
    const container = document.querySelector("#rm-area-editor");
    if (!container || !canvas) return;
    const rects = canvas.getObjects("rect");
    if (!rects.length) {
      container.innerHTML = `<div class="muted">尚未建立點擊區域。</div>`;
      return;
    }
    container.innerHTML = rects.map((rect, index) => {
      const action = normalizeAction(rect.action || {});
      return `<div class="rm-area-card">
        <h3>區域 #${index + 1}</h3>
        <input data-area-label="${index}" value="${esc(rect.label || `區域 ${index + 1}`)}" placeholder="區域名稱">
        <select data-area-type="${index}">
          <option value="message" ${action.type === "message" ? "selected" : ""}>送出文字 Message</option>
          <option value="uri" ${action.type === "uri" ? "selected" : ""}>開啟網址 URI</option>
          <option value="postback" ${action.type === "postback" ? "selected" : ""}>Postback</option>
          <option value="richmenuswitch" ${action.type === "richmenuswitch" ? "selected" : ""}>切換選單 Switch</option>
        </select>
        ${actionFields(index, action)}
        <button class="rm-remove" data-area-remove="${index}" type="button">刪除此區域</button>
      </div>`;
    }).join("");
    container.querySelectorAll("[data-area-label]").forEach((input) => input.addEventListener("change", () => updateArea(input.dataset.areaLabel, "label", input.value)));
    container.querySelectorAll("[data-area-type]").forEach((select) => select.addEventListener("change", () => updateArea(select.dataset.areaType, "type", select.value)));
    container.querySelectorAll("[data-area-value]").forEach((input) => input.addEventListener("change", () => updateArea(input.dataset.areaValue, input.dataset.prop, input.value)));
    container.querySelectorAll("[data-area-remove]").forEach((button) => button.addEventListener("click", () => removeArea(button.dataset.areaRemove)));
  }

  function actionFields(index, action) {
    if (action.type === "uri") return `<input data-area-value="${index}" data-prop="uri" value="${esc(action.uri || "")}" placeholder="https://...">`;
    if (action.type === "postback") return `<input data-area-value="${index}" data-prop="data" value="${esc(action.data || "")}" placeholder="data，例如 action=menu"><input data-area-value="${index}" data-prop="displayText" value="${esc(action.displayText || "")}" placeholder="顯示文字，可空白">`;
    if (action.type === "richmenuswitch") return `<input data-area-value="${index}" data-prop="richMenuAliasId" value="${esc(action.richMenuAliasId || "")}" placeholder="Alias ID"><input data-area-value="${index}" data-prop="data" value="${esc(action.data || "")}" placeholder="data">`;
    return `<input data-area-value="${index}" data-prop="text" value="${esc(action.text || "")}" placeholder="例如 TDEA每月活動">`;
  }

  function updateArea(index, prop, value) {
    const rect = canvas?.getObjects("rect")[Number(index)];
    if (!rect) return;
    if (prop === "label") rect.label = value;
    else if (prop === "type") rect.action = normalizeAction({ type: value });
    else rect.action = normalizeAction({ ...(rect.action || {}), [prop]: value });
    updateOutput();
  }

  function removeArea(index) {
    const rect = canvas?.getObjects("rect")[Number(index)];
    if (!rect) return;
    canvas.remove(rect);
    updateOutput();
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast("圖文選單底圖只支援 JPG 或 PNG");
    currentImageFile = file;
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
    loadCanvasImage(draft.imageUrl);
    updateOutput();
    toast("底圖已上傳");
  }

  function resizeRichMenuImage(file, height) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("圖片讀取失敗"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("圖片格式無法讀取"));
        image.onload = () => {
          const output = document.createElement("canvas");
          output.width = 2500;
          output.height = height;
          const context = output.getContext("2d");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, output.width, output.height);
          context.drawImage(image, 0, 0, output.width, output.height);
          let quality = 0.92;
          let dataUrl = output.toDataURL("image/jpeg", quality);
          while (dataUrl.length > 1300000 && quality > 0.55) {
            quality -= 0.08;
            dataUrl = output.toDataURL("image/jpeg", quality);
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

  async function saveRemote() {
    const payload = richMenuObject();
    const response = await fetch(api + "/api/rich-menu", { method: "PUT", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...payload, imageUrl: draft.imageUrl, deployments: draft.deployments }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "儲存失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    toast("草稿已儲存");
  }

  async function deploy() {
    const payload = richMenuObject();
    if (!payload.imageUrl && !draft.imageUrl && !currentImageFile) return toast("請先上傳底圖");
    if (!payload.areas.length) return toast("請至少建立一個熱區");
    if (!confirm("確定發布到 LINE 並設為預設圖文選單？")) return;
    const response = await fetch(api + "/api/rich-menu/deploy", { method: "POST", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...payload, imageUrl: draft.imageUrl, setDefault: true }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "發布失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    show();
    toast("已發布到 LINE");
  }

  async function copyJson() {
    await navigator.clipboard?.writeText(JSON.stringify(richMenuObject(), null, 2));
    toast("JSON 已複製");
  }

  function logHtml() {
    if (!draft.deployments?.length) return `<div class="muted">尚未發布。</div>`;
    return draft.deployments.slice(0, 10).map((item) => `<div class="rm-log-item">
      <strong>${esc(item.name)}</strong><br>
      <span class="muted">${esc(item.richMenuId)}<br>${esc(new Date(item.createdAt).toLocaleString("zh-TW"))}</span>
    </div>`).join("");
  }

  function toast(message) {
    const el = document.querySelector("#rm-toast") || document.querySelector("#toast");
    if (!el) return alert(message);
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function boot() {
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
  }

  window.TDEARichMenuManager = { show, ensureNav: boot, isActive: () => active };
  boot();
})();
