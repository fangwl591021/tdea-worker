(() => {
  const storageKey = "tdea-manager-v3";
  let flexActive = false;
  let editId = "";

  const sampleFlex = {
    type: "bubble",
    body: { type: "box", layout: "vertical", contents: [
      { type: "text", text: "TDEA 活動資訊", weight: "bold", size: "lg" },
      { type: "text", text: "請在後台修改這張卡片內容。", wrap: true, margin: "md" }
    ] }
  };

  const uid = () => "flex-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const loadData = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { return {}; } };
  const saveData = (data) => localStorage.setItem(storageKey, JSON.stringify(data));
  const flexRules = () => { const data = loadData(); data.flexRules ||= []; return { data, rows: data.flexRules }; };

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector("[data-flex-zone]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.flexZone = "1";
    button.textContent = "FLEX專區";
    button.addEventListener("click", () => showFlexZone());
    nav.appendChild(button);
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    document.querySelector("[data-flex-zone]")?.classList.add("active");
  }

  function showFlexZone() { flexActive = true; editId = ""; setActiveNav(); render(); }

  function defaultRule() {
    return { id: uid(), enabled: true, keyword: "TDEA活動", matchMode: "exact", replyType: "flex", title: "活動資訊", altText: "TDEA 活動資訊", text: "目前沒有設定文字回覆。", flexJson: JSON.stringify(sampleFlex, null, 2), updatedAt: new Date().toISOString() };
  }

  function normalizeKeyword(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.toUpperCase().startsWith("TDEA") ? text : `TDEA${text}`;
  }

  function validateFlexJson(rule) {
    if (rule.replyType !== "flex") return "";
    try { if (!JSON.parse(rule.flexJson || "{}").type) return "Flex JSON 缺少 type"; return ""; }
    catch (_) { return "Flex JSON 格式錯誤"; }
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-flex-manager-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-flex-manager-style";
    style.textContent = `
      .flex-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,42%);gap:18px;align-items:start}.flex-left{display:grid;gap:18px;min-width:0}.flex-preview-panel{position:sticky;top:24px}.flex-phone{width:min(100%,430px);margin:0 auto;border-radius:28px;background:#111827;padding:14px;box-shadow:0 18px 42px rgba(15,23,42,.18)}.flex-screen{min-height:650px;border-radius:20px;background:#8fb7df;padding:18px 14px;overflow:hidden}.flex-chat-row{display:flex;align-items:flex-end;gap:8px;margin-top:18px}.flex-avatar{width:34px;height:34px;border-radius:50%;background:#06c755;color:#fff;display:grid;place-items:center;font-weight:900;flex:0 0 auto}.flex-bubble{width:300px;max-width:300px;border-radius:16px;background:#fff;color:#111827;box-shadow:0 6px 18px rgba(15,23,42,.12);overflow:hidden}.flex-json-error{padding:14px;color:#dc2626;font-weight:800}.flex-mini-list{max-height:260px;overflow:auto}.flex-form-grid{display:grid;gap:14px;padding:18px}.line-flex-box{display:flex;min-width:0}.line-flex-vertical{flex-direction:column}.line-flex-horizontal,.line-flex-baseline{flex-direction:row;align-items:center}.line-flex-text{min-width:0;line-height:1.35}.line-flex-image{display:block;width:100%;object-fit:cover}.line-flex-icon{display:inline-block;object-fit:contain;flex:0 0 auto}.line-flex-button{display:block;width:100%;border:0;background:transparent;color:#2563eb;font-weight:800;text-align:center;padding:9px;border-radius:6px}.line-flex-button.primary{background:#2563eb;color:white}.line-flex-button.secondary{border:1px solid #d0d5dd}.line-flex-separator{height:1px;background:#edf0f3;margin:8px 0}@media(max-width:1100px){.flex-workspace{grid-template-columns:1fr}.flex-preview-panel{position:static}.flex-phone{width:min(100%,460px)}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    ensureStyles();
    const main = document.querySelector(".main");
    if (!main) return;
    const { rows } = flexRules();
    const editing = rows.find((row) => row.id === editId) || null;
    const current = editing || defaultRule();
    main.innerHTML = `
      <div class="topbar"><div><h1>FLEX專區</h1><div class="subtitle">管理 LINE OA 關鍵字觸發的 Flex Message，左側設定，右側即時預覽。</div></div><div class="actions"><button class="btn" data-flex-export>匯出 JSON</button><button class="btn primary" data-flex-new>新增 FLEX</button></div></div>
      <div class="flex-workspace"><div class="flex-left"><section class="panel"><div class="panel-head"><h2 class="panel-title">關鍵字觸發</h2><span class="muted">${rows.length} 組規則</span></div>${rows.length ? table(rows) : `<div class="empty">目前沒有 FLEX 關鍵字規則</div>`}</section><section class="panel"><div class="panel-head"><h2 class="panel-title">${editing ? "編輯 FLEX" : "新增 FLEX"}</h2></div>${form(current)}</section></div><aside class="panel flex-preview-panel"><div class="panel-head"><h2 class="panel-title">預覽區</h2><span class="muted">LINE 手機畫面</span></div><div style="padding:18px">${preview(current)}</div></aside></div><div class="toast" id="flex-toast"></div>`;
    bind();
    updatePreviewFromForm();
  }

  function table(rows) {
    return `<div class="table-wrap flex-mini-list"><table><thead><tr><th>啟用</th><th>關鍵字</th><th>回覆</th><th>操作</th></tr></thead><tbody>${rows.map((row) => `<tr><td><input type="checkbox" data-flex-toggle="${esc(row.id)}" ${row.enabled ? "checked" : ""}></td><td><strong>${esc(row.keyword)}</strong><div class="muted">${row.matchMode === "contains" ? "包含" : "完全符合"}</div></td><td>${row.replyType === "flex" ? "Flex" : "文字"}</td><td><button class="link" data-flex-edit="${esc(row.id)}">編輯</button><span class="muted"> / </span><button class="link" data-flex-delete="${esc(row.id)}">刪除</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function form(rule) {
    return `<form class="flex-form-grid" id="flex-form"><input type="hidden" name="id" value="${esc(rule.id)}"><div class="field"><label>關鍵字</label><input name="keyword" value="${esc(rule.keyword)}" placeholder="例如：TDEA活動" required></div><div class="field"><label>比對方式</label><select name="matchMode"><option value="exact" ${rule.matchMode !== "contains" ? "selected" : ""}>完全符合</option><option value="contains" ${rule.matchMode === "contains" ? "selected" : ""}>包含關鍵字</option></select></div><div class="field"><label>回覆類型</label><select name="replyType"><option value="flex" ${rule.replyType !== "text" ? "selected" : ""}>Flex Message</option><option value="text" ${rule.replyType === "text" ? "selected" : ""}>文字訊息</option></select></div><div class="field"><label>標題</label><input name="title" value="${esc(rule.title)}" placeholder="後台辨識用"></div><div class="field"><label>LINE 替代文字</label><input name="altText" value="${esc(rule.altText)}" placeholder="手機通知或不支援 Flex 時顯示"></div><div class="field"><label>文字回覆</label><textarea name="text" placeholder="回覆類型選文字時使用">${esc(rule.text)}</textarea></div><div class="field"><label>Flex JSON</label><textarea name="flexJson" style="min-height:260px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace">${esc(rule.flexJson)}</textarea></div><label style="display:inline-flex;align-items:center;gap:8px;font-weight:700"><input type="checkbox" name="enabled" value="1" ${rule.enabled ? "checked" : ""}>啟用此規則</label><button class="btn primary" type="submit">儲存 FLEX</button></form>`;
  }

  function parseRuleFromForm() {
    const form = document.querySelector("#flex-form");
    if (!form) return defaultRule();
    const formData = Object.fromEntries(new FormData(form));
    return { id: String(formData.id || uid()), enabled: formData.enabled === "1", keyword: normalizeKeyword(formData.keyword), matchMode: formData.matchMode === "contains" ? "contains" : "exact", replyType: formData.replyType === "text" ? "text" : "flex", title: String(formData.title || "").trim(), altText: String(formData.altText || "").trim() || "TDEA 訊息", text: String(formData.text || ""), flexJson: String(formData.flexJson || ""), updatedAt: new Date().toISOString() };
  }

  function preview(rule) {
    return `<div class="flex-phone"><div class="flex-screen"><div class="flex-chat-row"><div class="flex-avatar">T</div><div class="flex-bubble" data-flex-preview>${previewContent(rule)}</div></div></div></div>`;
  }

  function previewContent(rule) {
    if (rule.replyType === "text") return `<div style="padding:14px"><div style="font-weight:800;margin-bottom:8px">${esc(rule.keyword || "TDEA關鍵字")}</div><div style="white-space:pre-wrap;color:#475467;line-height:1.5">${esc(rule.text || "文字回覆預覽")}</div></div>`;
    try {
      const parsed = JSON.parse(rule.flexJson || "{}");
      if (parsed.type === "carousel") return `<div style="display:flex;gap:10px;overflow:auto">${(parsed.contents || []).map(renderBubble).join("")}</div>`;
      return renderBubble(parsed);
    } catch (_) {
      return `<div class="flex-json-error">Flex JSON 格式錯誤</div><div style="padding:0 14px 14px;color:#475467">右側會在 JSON 修正後更新預覽。</div>`;
    }
  }

  function renderBubble(bubble) {
    if (!bubble || bubble.type !== "bubble") return `<div class="flex-json-error">目前預覽支援 bubble / carousel</div>`;
    return `<div>${bubble.hero ? renderNode(bubble.hero, "hero") : ""}${bubble.body ? renderSection(bubble.body, "body") : ""}${bubble.footer ? renderSection(bubble.footer, "footer") : ""}</div>`;
  }

  function renderSection(node, section) {
    const padding = section === "body" ? "14px" : "8px 14px 12px";
    return `<div style="padding:${padding};${section === "footer" ? "border-top:1px solid #edf0f3" : ""}">${renderNode(node, section)}</div>`;
  }

  function renderNode(node, section = "") {
    if (!node || typeof node !== "object") return "";
    if (node.type === "box") {
      const layout = node.layout === "horizontal" ? "horizontal" : node.layout === "baseline" ? "baseline" : "vertical";
      const gap = spacing(node.spacing || "none");
      return `<div class="line-flex-box line-flex-${layout}" style="gap:${gap};${margin(node.margin)}">${(node.contents || []).map((item) => renderNode(item, section)).join("")}</div>`;
    }
    if (node.type === "text") {
      return `<div class="line-flex-text" style="${textStyle(node)}${margin(node.margin)}${node.flex === 0 ? "flex:0 0 auto;" : node.flex ? `flex:${Number(node.flex)} 1 0;` : ""}">${esc(node.text || "")}</div>`;
    }
    if (node.type === "image") {
      const ratio = aspectRatio(node.aspectRatio);
      return `<img class="line-flex-image" src="${esc(node.url || "")}" style="${ratio ? `aspect-ratio:${ratio};` : ""}${node.aspectMode === "fit" ? "object-fit:contain;" : "object-fit:cover;"}${margin(node.margin)}">`;
    }
    if (node.type === "icon") {
      const size = iconSize(node.size);
      return `<img class="line-flex-icon" src="${esc(node.url || "")}" style="width:${size};height:${size};${margin(node.margin)}">`;
    }
    if (node.type === "button") {
      const label = node.action?.label || "BUTTON";
      return `<button class="line-flex-button ${esc(node.style || "")}" type="button" style="${margin(node.margin)}">${esc(label)}</button>`;
    }
    if (node.type === "separator") return `<div class="line-flex-separator"></div>`;
    return "";
  }

  function margin(value) {
    const map = { none: 0, xs: 4, sm: 6, md: 10, lg: 14, xl: 18, xxl: 24 };
    const px = map[value] ?? 0;
    return px ? `margin-top:${px}px;` : "";
  }

  function spacing(value) {
    const map = { none: 0, xs: 4, sm: 6, md: 10, lg: 14, xl: 18, xxl: 24 };
    return `${map[value] ?? 0}px`;
  }

  function iconSize(value) {
    const map = { xxs: 10, xs: 12, sm: 14, md: 18, lg: 24, xl: 32, xxl: 40 };
    return `${map[value] ?? 14}px`;
  }

  function aspectRatio(value) {
    const match = String(value || "").match(/^(\d+)\s*:\s*(\d+)$/);
    return match ? `${match[1]} / ${match[2]}` : "";
  }

  function textStyle(node) {
    const sizes = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, "3xl": 28, "4xl": 32, "5xl": 36 };
    const weight = node.weight === "bold" ? 800 : 400;
    const size = sizes[node.size] || 15;
    const color = node.color || "#111827";
    return `font-size:${size}px;font-weight:${weight};color:${esc(color)};${node.wrap ? "white-space:normal;" : "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}`;
  }

  function updatePreviewFromForm() {
    const target = document.querySelector("[data-flex-preview]");
    if (target) target.innerHTML = previewContent(parseRuleFromForm());
  }

  function bind() {
    document.querySelector("[data-flex-new]")?.addEventListener("click", () => { editId = ""; render(); });
    document.querySelector("[data-flex-export]")?.addEventListener("click", async () => { const { rows } = flexRules(); await navigator.clipboard.writeText(JSON.stringify(rows, null, 2)); toast("FLEX JSON 已複製"); });
    document.querySelectorAll("[data-flex-edit]").forEach((button) => button.addEventListener("click", () => { editId = button.dataset.flexEdit || ""; render(); }));
    document.querySelectorAll("[data-flex-delete]").forEach((button) => button.addEventListener("click", () => { if (!confirm("確定刪除這組 FLEX 規則？")) return; const { data, rows } = flexRules(); data.flexRules = rows.filter((row) => row.id !== button.dataset.flexDelete); saveData(data); render(); }));
    document.querySelectorAll("[data-flex-toggle]").forEach((input) => input.addEventListener("change", () => { const { data, rows } = flexRules(); const target = rows.find((row) => row.id === input.dataset.flexToggle); if (target) target.enabled = input.checked; saveData(data); }));
    document.querySelectorAll("#flex-form input, #flex-form select, #flex-form textarea").forEach((input) => input.addEventListener("input", updatePreviewFromForm));
    document.querySelector("#flex-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const rule = parseRuleFromForm();
      const error = validateFlexJson(rule);
      if (error) { toast(error); return; }
      const { data, rows } = flexRules();
      const index = rows.findIndex((row) => row.id === rule.id);
      if (index >= 0) rows[index] = rule; else rows.unshift(rule);
      data.flexRules = rows;
      saveData(data);
      editId = rule.id;
      render();
      toast("FLEX 規則已儲存");
    });
  }

  function toast(message) {
    const el = document.querySelector("#flex-toast") || document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  }

  function schedule() { ensureNav(); if (flexActive) setActiveNav(); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => { if (event.target.closest(".nav button:not([data-flex-zone])")) flexActive = false; }, true);
  schedule();
})();
