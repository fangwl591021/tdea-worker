(() => {
  const PUBLIC_KEYS = [
    "cardCollection", "register", "query", "memberQr", "calendar", "checkin", "redeem",
    "redeemSession", "monthlyDetail", "monthlyShare", "personalMessages", "close", "marquee",
    "motherRegister", "memberHome", "checkinModule"
  ];
  const params = new URLSearchParams(location.search);
  if (PUBLIC_KEYS.some((key) => params.has(key))) return;

  const docs = [];
  const MAX_FILES = 5;
  const MAX_BYTES = 10 * 1024 * 1024;
  const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
  let queued = false;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function showToast(message) {
    const toast = document.querySelector("[data-smart-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function removeDoc(index) {
    const item = docs[index];
    if (!item) return;
    try { URL.revokeObjectURL(item.url); } catch (_) {}
    docs.splice(index, 1);
    mount();
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    for (const file of incoming) {
      if (docs.length >= MAX_FILES) {
        showToast(`活動文件最多 ${MAX_FILES} 份`);
        break;
      }
      if (file.size > MAX_BYTES) {
        showToast(`${file.name} 超過 10MB，已略過`);
        continue;
      }
      docs.push({
        name: file.name || "活動文件",
        size: file.size || 0,
        type: file.type || "",
        url: URL.createObjectURL(file)
      });
    }
    mount();
  }

  function docsListHtml() {
    if (!docs.length) return `<div class="smart-doc-empty">尚未上傳活動文件</div>`;
    return docs.map((item, index) => `
      <div class="smart-doc-row">
        <div><strong>${esc(item.name)}</strong><span>${esc(formatBytes(item.size))}</span></div>
        <button type="button" data-smart-doc-remove="${index}">移除</button>
      </div>`).join("");
  }

  function docsSheetHtml() {
    if (!docs.length) return `<div class="smart-sheet-empty"><strong>沒有活動文件</strong><p>這個活動目前沒有附加文件。</p></div>`;
    return `<div class="smart-sheet-doc-list">${docs.map((item) => `
      <a class="smart-sheet-doc-row" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
        <div><strong>${esc(item.name)}</strong><span>${esc(formatBytes(item.size))}</span></div>
        <b>開啟</b>
      </a>`).join("")}</div>`;
  }

  function injectBuilder() {
    const builder = document.querySelector(".smart-builder-panel");
    if (!builder) return;
    const sections = Array.from(builder.querySelectorAll(":scope > .smart-builder-section"));
    if (!sections.length) return;

    const textSection = sections.find((section) => section.querySelector("[data-smart-text]"));
    if (textSection) {
      const label = textSection.querySelector(".smart-builder-label");
      if (label && /^3\./.test(label.textContent || "")) label.textContent = "4. 文字補充";
    }

    let section = builder.querySelector("[data-smart-doc-section]");
    if (!section) {
      section = document.createElement("div");
      section.className = "smart-builder-section smart-doc-section";
      section.dataset.smartDocSection = "";
      section.innerHTML = `
        <label class="smart-builder-label">3. 活動文件（選填）</label>
        <label class="smart-doc-upload-button">
          <input type="file" multiple accept="${ACCEPT}" data-smart-doc-input>
          <span>上傳活動文件</span>
        </label>
        <div class="smart-doc-help">PDF、Word、Excel、PowerPoint、TXT、CSV；最多 ${MAX_FILES} 份，每份 10MB。</div>
        <div class="smart-doc-list" data-smart-doc-list></div>`;
      if (textSection) textSection.insertAdjacentElement("beforebegin", section);
      else builder.appendChild(section);
    }

    const list = section.querySelector("[data-smart-doc-list]");
    if (list) list.innerHTML = docsListHtml();

    const input = section.querySelector("[data-smart-doc-input]");
    if (input && !input.dataset.bound) {
      input.dataset.bound = "true";
      input.addEventListener("change", () => {
        addFiles(input.files);
        input.value = "";
      });
    }
    section.querySelectorAll("[data-smart-doc-remove]").forEach((button) => {
      button.addEventListener("click", () => removeDoc(Number(button.dataset.smartDocRemove)));
    });
  }

  function injectPreviewButton() {
    if (!docs.length) return;
    const buttons = document.querySelector(".smart-preview-buttons");
    if (!buttons || buttons.querySelector("[data-smart-doc-preview]")) return;
    const register = buttons.querySelector('[data-smart-preview-action="register"]');
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.smartDocPreview = "";
    button.textContent = `活動文件（${docs.length}）`;
    if (register) register.insertAdjacentElement("beforebegin", button);
    else buttons.appendChild(button);
    button.addEventListener("click", openDocsSheet);
  }

  function openDocsSheet() {
    const phone = document.querySelector(".smart-preview-phone");
    if (!phone) return;
    phone.querySelector("[data-smart-doc-sheet]")?.remove();
    const sheet = document.createElement("div");
    sheet.className = "smart-preview-sheet";
    sheet.dataset.smartDocSheet = "";
    sheet.innerHTML = `
      <div class="smart-sheet-head"><strong>活動文件</strong><button type="button" data-smart-doc-close>關閉</button></div>
      <div class="smart-sheet-body">${docsSheetHtml()}</div>`;
    phone.appendChild(sheet);
    sheet.querySelector("[data-smart-doc-close]")?.addEventListener("click", () => sheet.remove());
  }

  function mount() {
    injectBuilder();
    injectPreviewButton();
  }

  function queueMount() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      mount();
    });
  }

  new MutationObserver(queueMount).observe(document.documentElement, { childList: true, subtree: true });
  queueMount();
})();
