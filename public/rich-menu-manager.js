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
      areas: [],
      deployments: [],
      snapshots: []
    };
  }

  function normalizeConfig(input) {
    const next = { ...blankConfig(), ...(input || {}) };
    next.name = String(next.name || "TDEA 圖文選單").trim() || "TDEA 圖文選單";
    next.chatBarText = String(next.chatBarText || "選單").trim().slice(0, 14) || "選單";
    next.selected = next.selected !== false;
    next.size = { width: 2500, height: Number(next.size?.height) === 843 ? 843 : 1686 };
    next.imageUrl = String(next.imageUrl || "").trim();
    next.areas = Array.isArray(next.areas) ? next.areas.map(normalizeArea) : [];
    next.deployments = Array.isArray(next.deployments) ? next.deployments : [];
    next.snapshots = Array.isArray(next.snapshots) ? next.snapshots : [];
    return next;
  }

  function normalizeArea(area, index = 0) {
    const b = area?.bounds || {};
    return {
      label: String(area?.label || `區域 #${index + 1}`),
      bounds: {
        x: clamp(b.x, 0, 2499, 0),
        y: clamp(b.y, 0, 1685, 0),
        width: clamp(b.width, 1, 2500, 500),
        height: clamp(b.height, 1, 1686, 300)
      },
      action: normalizeAction(area?.action || { type: "message", text: "" })
    };
  }

  function clamp(value, min, max, fallback) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeAction(action) {
    const type = ["message", "uri", "postback", "richmenuswitch"].includes(action.type) ? action.type : "message";
    if (type === "uri") return { type, uri: String(action.uri || "") };
    if (type === "postback") {
      const next = { type, data: String(action.data || "") };
      if (action.displayText) next.displayText = String(action.displayText);
      return next;
    }
    if (type === "richmenuswitch") {
      const richMenuAliasId = String(action.richMenuAliasId || "").trim();
      const data = String(action.data || "").trim() || (richMenuAliasId ? `switch:${richMenuAliasId}` : "");
      return { type, richMenuAliasId, data };
    }
    return { type: "message", text: String(action.text || "") };
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-rich-menu-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-rich-menu-style";
    style.textContent = `
      html,body{height:100%}.main{padding:0!important;max-width:none!important}
      .rm-app{display:grid;grid-template-columns:420px minmax(620px,1fr) 360px;height:100vh;background:#eef3f8;color:#071833;overflow:hidden}
      .rm-left,.rm-log{background:#fff;border-right:1px solid #dfe5ee;overflow:auto}
      .rm-log{border-right:0;border-left:1px solid #dfe5ee}
      .rm-title{font-size:24px;font-weight:900;padding:18px 24px;border-bottom:1px solid #e5e7eb}
      .rm-basic{padding:18px 24px;display:grid;gap:16px;border-bottom:1px solid #e5e7eb}
      .rm-basic label,.rm-area-card label{display:grid;gap:5px;font-size:14px;font-weight:700;min-width:0}
      .rm-basic input,.rm-area-card input,.rm-area-card select{height:40px;min-width:0;width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:0 10px;font-size:15px;background:#f8fafc;box-sizing:border-box}
      .rm-upload{height:52px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:12px;font-weight:900;font-size:16px;cursor:pointer}
      .rm-area-list{display:grid;gap:12px;padding:14px 18px}
      .rm-area-card{border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:12px;display:grid;gap:10px;min-width:0;overflow:hidden}
      .rm-area-card h3{font-size:16px;margin:0;color:#475467}
      .rm-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .rm-remove{height:44px;border:0;border-radius:10px;background:#fef2f2;color:#dc2626;font-weight:900;cursor:pointer}
      .rm-stage{display:flex;flex-direction:column;min-width:0}
      .rm-toolbar{display:flex;justify-content:space-between;align-items:center;background:#fff;border-bottom:1px solid #dfe5ee;padding:14px 24px;gap:12px}
      .rm-toolbar .left,.rm-toolbar .right{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .rm-btn{border:1px solid #d7dde8;background:#fff;border-radius:10px;padding:13px 26px;font-size:16px;font-weight:900;color:#071833;cursor:pointer;min-height:56px}
      .rm-btn.dark{background:#111827;color:#fff;border-color:#111827}.rm-btn.primary{background:#06c755;color:#fff;border-color:#06c755}.rm-btn.warn{background:#fff7ed;color:#ea580c;border-color:#fed7aa}
      .rm-canvas-area{flex:1;overflow:auto;display:grid;place-items:center;padding:48px}
      .rm-canvas-wrap{position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 18px 45px rgba(15,23,42,.15);min-width:640px;min-height:430px;display:grid;place-items:center}
      .rm-placeholder{position:absolute;inset:16px;display:grid;place-items:center;background:rgba(248,250,252,.88);color:#94a3b8;font-weight:900;text-align:center;pointer-events:none;border-radius:12px}
      .rm-json-box{padding:18px 24px;border-top:1px solid #e5e7eb;background:#fff}.rm-json-box textarea{width:100%;height:170px;border:1px solid #cbd5e1;border-radius:10px;background:#0f172a;color:#e2e8f0;font:12px Consolas,monospace;padding:12px;box-sizing:border-box}
      .rm-log-body{padding:18px 24px;display:grid;gap:12px}.rm-log-item{border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;padding:12px;font-size:13px}.muted{color:#667085}.hidden{display:none!important}
      .rm-log-title{font-size:16px;font-weight:900;margin-top:8px}.rm-mini{border:1px solid #d7dde8;background:#fff;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer;margin-top:8px}
      .rm-health{margin:12px 24px 0;border-radius:10px;padding:12px 14px;font-weight:800}.rm-health.ok{background:#ecfdf3;border:1px solid #abefc6;color:#067647}.rm-health.bad{background:#fff3f0;border:1px solid #fecdca;color:#b42318}
      @media(max-width:1200px){.rm-app{grid-template-columns:1fr;height:auto;min-height:100vh}.rm-left,.rm-log{border:0}.rm-canvas-wrap{min-width:0;width:100%;overflow:auto}}
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
        <aside class="rm-left">
          <div class="rm-title">圖文選單編輯器</div>
          <div class="rm-basic">
            <label>1. 匯入底圖 JPG/PNG<input id="rm-image-upload" type="file" accept="image/jpeg,image/png" hidden><button type="button" class="rm-upload" data-rm-upload>上傳圖文選單底圖</button></label>
            <label>2. 選單名稱<input id="rm-name" value="${esc(draft.name)}" maxlength="300"></label>
            <label>3. 選單列文字 ChatBar<input id="rm-chatbar" value="${esc(draft.chatBarText)}" maxlength="14"></label>
          </div>
          <div id="rm-area-editor" class="rm-area-list"></div>
        </aside>
        <main class="rm-stage">
          <div class="rm-toolbar">
            <div class="left">
              <button type="button" class="rm-btn dark" data-rm-draw>劃定點擊區域</button>
              <button type="button" class="rm-btn" data-rm-clear>清除全部區域</button>
            </div>
            <div class="right">
              <button type="button" class="rm-btn warn" data-rm-copy>複製 JSON</button>
              <button type="button" class="rm-btn" data-rm-save>儲存檔案</button>
              <button type="button" class="rm-btn primary" data-rm-deploy>發布到 LINE</button>
            </div>
          </div>
          <div class="rm-canvas-area">
            <div class="rm-canvas-wrap">
              <canvas id="rm-canvas"></canvas>
              <div id="rm-placeholder" class="rm-placeholder">請先上傳底圖，或直接劃定點擊區域。</div>
            </div>
          </div>
        </main>
        <aside class="rm-log">
          <div class="rm-title">發布紀錄</div>
          <div class="rm-log-body">${logHtml()}</div>
          <div class="rm-json-box"><textarea id="rm-json" readonly></textarea></div>
        </aside>
      </div>
      <div class="toast" id="rm-toast"></div>`;
    bind();
  }

  function initCanvas() {
    if (!window.fabric) return toast("Fabric.js 尚未載入，請重新整理頁面。");
    canvas = new fabric.Canvas("rm-canvas", { selection: true });
    canvas.setWidth(600);
    canvas.setHeight(Math.round(600 * draft.size.height / 2500));
    bindCanvasEvents();
    loadCanvasImage(draft.imageUrl);
    importAreas(draft.areas);
    updateOutput();
  }

  function bind() {
    const saveButton = document.querySelector("[data-rm-save]");
    if (saveButton && !document.querySelector("[data-rm-validate]")) {
      const validateButton = document.createElement("button");
      validateButton.type = "button";
      validateButton.className = "rm-btn";
      validateButton.dataset.rmValidate = "1";
      validateButton.textContent = "選單健檢";
      saveButton.parentElement?.insertBefore(validateButton, saveButton);
    }
    const logBody = document.querySelector(".rm-log-body");
    if (logBody && !document.querySelector("#rm-health")) {
      const health = document.createElement("div");
      health.id = "rm-health";
      health.className = "rm-health hidden";
      logBody.parentElement?.insertBefore(health, logBody);
    }
    document.querySelector("[data-rm-upload]")?.addEventListener("click", () => document.querySelector("#rm-image-upload")?.click());
    document.querySelector("#rm-image-upload")?.addEventListener("change", uploadImage);
    document.querySelector("#rm-name")?.addEventListener("input", updateOutput);
    document.querySelector("#rm-chatbar")?.addEventListener("input", updateOutput);
    document.querySelector("[data-rm-draw]")?.addEventListener("click", toggleDrawMode);
    document.querySelector("[data-rm-clear]")?.addEventListener("click", clearAreas);
    document.querySelector("[data-rm-copy]")?.addEventListener("click", copyJson);
    document.querySelector("[data-rm-validate]")?.addEventListener("click", validateRemote);
    document.querySelector("[data-rm-save]")?.addEventListener("click", saveRemote);
    document.querySelector("[data-rm-deploy]")?.addEventListener("click", deploy);
    document.querySelectorAll("[data-rm-load-snapshot]").forEach((button) => {
      button.addEventListener("click", () => loadSnapshot(Number(button.dataset.rmLoadSnapshot)));
    });
  }

  function bindCanvasEvents() {
    canvas.on("mouse:down", (event) => {
      if (!drawing || canvas.findTarget(event.e)) return;
      dragging = true;
      const pointer = canvas.getPointer(event.e);
      startX = pointer.x;
      startY = pointer.y;
      currentRect = makeRect({ x: startX, y: startY, width: 0, height: 0 }, `區域 #${canvas.getObjects("rect").length + 1}`, { type: "message", text: "" }, false);
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
    canvas.on("selection:created", renderAreaEditor);
    canvas.on("selection:updated", renderAreaEditor);
    canvas.on("selection:cleared", renderAreaEditor);
  }

  function toggleDrawMode() {
    drawing = !drawing;
    document.querySelector("[data-rm-draw]").textContent = drawing ? "拖曳建立區域中..." : "劃定點擊區域";
  }

  function clearAreas() {
    if (!canvas) return;
    if (!confirm("確定清除全部點擊區域？")) return;
    canvas.getObjects().forEach((object) => canvas.remove(object));
    updateOutput();
  }

  function makeRect(bounds, label, action, nativeBounds = true) {
    const scale = nativeBounds ? canvas.getWidth() / 2500 : 1;
    const rect = new fabric.Rect({
      left: bounds.x * scale,
      top: bounds.y * scale,
      width: bounds.width * scale,
      height: bounds.height * scale,
      fill: "rgba(6,199,85,.26)",
      stroke: "#06c755",
      strokeWidth: 2,
      cornerColor: "#06c755",
      borderColor: "#06c755",
      transparentCorners: false
    });
    rect.label = label;
    rect.action = normalizeAction(action);
    return rect;
  }

  function collectFromDom() {
    draft.name = document.querySelector("#rm-name")?.value?.trim() || "TDEA 圖文選單";
    draft.chatBarText = (document.querySelector("#rm-chatbar")?.value || "選單").trim().slice(0, 14) || "選單";
    draft.areas = getCanvasAreas();
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }

  function getCanvasAreas() {
    if (!canvas) return draft.areas || [];
    const scale = 2500 / canvas.getWidth();
    return canvas.getObjects("rect").map((rect, index) => {
      const x = clamp(rect.left * scale, 0, 2499, 0);
      const y = clamp(rect.top * scale, 0, draft.size.height - 1, 0);
      let width = clamp(rect.getScaledWidth() * scale, 1, 2500, 1);
      let height = clamp(rect.getScaledHeight() * scale, 1, draft.size.height, 1);
      if (x + width > 2500) width = 2500 - x;
      if (y + height > draft.size.height) height = draft.size.height - y;
      return { label: rect.label || `區域 #${index + 1}`, bounds: { x, y, width, height }, action: normalizeAction(rect.action || {}) };
    });
  }

  function updateOutput() {
    collectFromDom();
    refreshCanvasLabels();
    const output = document.querySelector("#rm-json");
    if (output) output.value = JSON.stringify(richMenuObject(), null, 2);
    renderAreaEditor();
  }

  function richMenuObject() {
    return {
      size: draft.size,
      selected: draft.selected,
      name: draft.name,
      chatBarText: draft.chatBarText,
      areas: draft.areas.map((area) => ({ bounds: area.bounds, action: area.action }))
    };
  }

  function importAreas(areas) {
    if (!canvas) return;
    canvas.getObjects().forEach((object) => canvas.remove(object));
    areas.forEach((area, index) => canvas.add(makeRect(area.bounds, area.label || `區域 #${index + 1}`, area.action || {})));
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

  function renderAreaEditor() {
    const container = document.querySelector("#rm-area-editor");
    if (!container || !canvas) return;
    const selected = canvas.getActiveObject();
    container.innerHTML = canvas.getObjects("rect").map((rect, index) => areaCard(rect, index, selected === rect)).join("") || `<div class="muted">尚未建立點擊區域。</div>`;
    bindAreaEditor();
  }

  function areaCard(rect, index, selected) {
    const area = getCanvasAreas()[index];
    const action = normalizeAction(area.action);
    const value = action.type === "uri" ? action.uri : action.type === "postback" ? action.data : action.type === "richmenuswitch" ? action.richMenuAliasId : action.text;
    return `<div class="rm-area-card" data-area-card="${index}" style="${selected ? "border-color:#06c755;box-shadow:0 0 0 2px rgba(6,199,85,.18)" : ""}">
      <h3>區域 #${index + 1}</h3>
      <label>名稱<input data-area-prop="label" data-area-index="${index}" value="${esc(area.label)}"></label>
      <label>動作<select data-area-prop="type" data-area-index="${index}">
        <option value="message" ${action.type === "message" ? "selected" : ""}>送出文字 Message</option>
        <option value="uri" ${action.type === "uri" ? "selected" : ""}>開啟網址 URI</option>
        <option value="postback" ${action.type === "postback" ? "selected" : ""}>Postback</option>
        <option value="richmenuswitch" ${action.type === "richmenuswitch" ? "selected" : ""}>切換選單 Switch</option>
      </select></label>
      <label>內容<input data-area-prop="value" data-area-index="${index}" value="${esc(value)}"></label>
      <div class="rm-action-grid">
        <label>X<input data-area-prop="x" data-area-index="${index}" type="number" value="${area.bounds.x}"></label>
        <label>Y<input data-area-prop="y" data-area-index="${index}" type="number" value="${area.bounds.y}"></label>
        <label>寬<input data-area-prop="width" data-area-index="${index}" type="number" value="${area.bounds.width}"></label>
        <label>高<input data-area-prop="height" data-area-index="${index}" type="number" value="${area.bounds.height}"></label>
      </div>
      <button type="button" class="rm-remove" data-area-remove="${index}">刪除此區域</button>
    </div>`;
  }

  function bindAreaEditor() {
    document.querySelectorAll("[data-area-card]").forEach((card) => {
      card.addEventListener("click", () => {
        const rect = canvas.getObjects("rect")[Number(card.dataset.areaCard)];
        if (rect) canvas.setActiveObject(rect);
        canvas.renderAll();
      });
    });
    document.querySelectorAll("[data-area-prop]").forEach((input) => {
      input.addEventListener("change", () => updateArea(Number(input.dataset.areaIndex), input.dataset.areaProp, input.value));
    });
    document.querySelectorAll("[data-area-remove]").forEach((button) => {
      button.addEventListener("click", () => removeArea(Number(button.dataset.areaRemove)));
    });
  }

  function updateArea(index, prop, value) {
    const rect = canvas.getObjects("rect")[index];
    if (!rect) return;
    if (prop === "label") rect.label = value;
    if (prop === "type") {
      const current = normalizeAction(rect.action || {});
      const currentValue = current.type === "uri" ? current.uri : current.type === "postback" ? current.data : current.type === "richmenuswitch" ? current.richMenuAliasId : current.text;
      if (value === "richmenuswitch") rect.action = normalizeAction({ type: value, richMenuAliasId: currentValue, data: currentValue ? `switch:${currentValue}` : "" });
      else if (value === "uri") rect.action = normalizeAction({ type: value, uri: currentValue });
      else if (value === "postback") rect.action = normalizeAction({ type: value, data: currentValue });
      else rect.action = normalizeAction({ type: "message", text: currentValue });
    }
    if (prop === "value") {
      const type = normalizeAction(rect.action || {}).type;
      if (type === "uri") rect.action = normalizeAction({ type, uri: value });
      else if (type === "postback") rect.action = normalizeAction({ type, data: value });
      else if (type === "richmenuswitch") rect.action = normalizeAction({ type, richMenuAliasId: value, data: value ? `switch:${value}` : "" });
      else rect.action = normalizeAction({ type: "message", text: value });
    }
    if (["x", "y", "width", "height"].includes(prop)) {
      const area = getCanvasAreas()[index];
      area.bounds[prop] = Number(value);
      const scale = canvas.getWidth() / 2500;
      rect.set({
        left: area.bounds.x * scale,
        top: area.bounds.y * scale,
        width: area.bounds.width * scale,
        height: area.bounds.height * scale,
        scaleX: 1,
        scaleY: 1
      });
    }
    canvas.renderAll();
    updateOutput();
  }

  function removeArea(index) {
    const rect = canvas.getObjects("rect")[index];
    if (!rect) return;
    canvas.remove(rect);
    updateOutput();
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

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast("圖文選單底圖只支援 JPG 或 PNG");
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

  function showHealth(ok, message, detail = "") {
    const box = document.querySelector("#rm-health");
    if (!box) return toast(message);
    box.className = `rm-health ${ok ? "ok" : "bad"}`;
    box.textContent = detail ? `${message} ${detail}` : message;
  }

  async function validateRemote() {
    updateOutput();
    const response = await fetch(api + "/api/rich-menu/validate", { method: "POST", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...draft, areas: getCanvasAreas() }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      showHealth(false, result.message || "選單健檢未通過");
      return toast(result.message || "選單健檢未通過");
    }
    const data = result.data || {};
    showHealth(true, result.message || "選單健檢通過", `區域 ${data.areaCount || 0} 個，圖片 ${Math.round((data.imageBytes || 0) / 1024)} KB`);
    toast("選單健檢通過");
  }

  function loadSnapshot(index) {
    const item = draft.snapshots?.[index];
    if (!item?.config) return toast("找不到這筆檔案紀錄");
    if (!confirm(`載入 ${item.name || "未命名"} 的儲存檔案？目前畫面尚未儲存的修改會被覆蓋。`)) return;
    draft = normalizeConfig({ ...item.config, deployments: draft.deployments || [], snapshots: draft.snapshots || [] });
    localStorage.setItem(storageKey, JSON.stringify(draft));
    render();
    initCanvas();
    toast("已載入檔案紀錄");
  }

  async function saveRemote() {
    updateOutput();
    const response = await fetch(api + "/api/rich-menu", { method: "PUT", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...draft, areas: getCanvasAreas() }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "儲存失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    toast("檔案已儲存");
  }

  async function saveRemote() {
    updateOutput();
    const response = await fetch(api + "/api/rich-menu", { method: "PUT", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...draft, areas: getCanvasAreas() }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "儲存失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    const logBody = document.querySelector(".rm-log-body");
    if (logBody) {
      logBody.innerHTML = logHtml();
      document.querySelectorAll("[data-rm-load-snapshot]").forEach((button) => {
        button.addEventListener("click", () => loadSnapshot(Number(button.dataset.rmLoadSnapshot)));
      });
    }
    toast("檔案已儲存");
  }

  async function deploy() {
    updateOutput();
    if (!draft.imageUrl) return toast("請先上傳底圖");
    if (!draft.areas.length) return toast("請至少建立一個熱區");
    if (!confirm("確定發布到 LINE 並設為預設圖文選單？")) return;
    const response = await fetch(api + "/api/rich-menu/deploy", { method: "POST", headers: { "content-type": "application/json", "x-admin-email": adminEmail() }, body: JSON.stringify({ ...draft, setDefault: true }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "發布失敗");
    draft = normalizeConfig(result.data);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    show();
    toast("已發布到 LINE");
  }

  async function copyJson() {
    updateOutput();
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

  function logHtml() {
    const snapshots = Array.isArray(draft.snapshots) ? draft.snapshots : [];
    const deployments = Array.isArray(draft.deployments) ? draft.deployments : [];
    const snapshotHtml = snapshots.length ? snapshots.slice(0, 15).map((item, index) => `<div class="rm-log-item">
      <strong>${esc(item.name || "未命名檔案")}</strong><br>
      <span class="muted">${esc(item.id || "")}<br>${esc(new Date(item.savedAt).toLocaleString("zh-TW"))}<br>${esc(item.areaCount || 0)} 個區域</span><br>
      <button type="button" class="rm-mini" data-rm-load-snapshot="${index}">載入此檔案</button>
    </div>`).join("") : `<div class="muted">尚未儲存檔案。</div>`;
    const deploymentHtml = deployments.length ? deployments.slice(0, 10).map((item) => `<div class="rm-log-item">
      <strong>${esc(item.name)}</strong><br>
      <span class="muted">${esc(item.richMenuId)}<br>${esc(new Date(item.createdAt).toLocaleString("zh-TW"))}</span>
    </div>`).join("") : `<div class="muted">尚未發布。</div>`;
    return `<div class="rm-log-title">檔案儲存紀錄</div>${snapshotHtml}<div class="rm-log-title">發布紀錄</div>${deploymentHtml}`;
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
