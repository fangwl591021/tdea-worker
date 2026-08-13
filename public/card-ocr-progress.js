(() => {
  const nativeFetch = window.fetch.bind(window);
  let activeTimer = null;
  let activeStartedAt = 0;

  function ensureStyle() {
    if (document.getElementById("tdea-card-ocr-progress-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-card-ocr-progress-style";
    style.textContent = `
      .tdea-ocr-progress{margin:14px 0;padding:16px;border:1px solid #d8e5dc;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.05);display:grid;gap:12px}
      .tdea-ocr-progress-main{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center}
      .tdea-ocr-thumb{width:56px;height:56px;border-radius:50%;object-fit:cover;border:1px solid #d8e5dc;background:#f3f7f5}
      .tdea-ocr-copy strong{display:block;font-size:18px;color:#16382c}.tdea-ocr-copy small{display:block;margin-top:4px;color:#708078;line-height:1.45}
      .tdea-ocr-percent{font-size:20px;font-weight:900;color:#07883f;min-width:52px;text-align:right}
      .tdea-ocr-track{height:10px;border-radius:999px;overflow:hidden;background:#edf3ef}
      .tdea-ocr-bar{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#08b957,#07883f);transition:width .45s ease}
      .tdea-ocr-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:#7a8d84}
      .tdea-ocr-progress.warn{border-color:#f5d18a;background:#fffaf0}.tdea-ocr-progress.warn .tdea-ocr-percent{color:#b26a00}
      .tdea-ocr-progress.error{border-color:#f2b8b5;background:#fff5f5}.tdea-ocr-progress.error .tdea-ocr-percent{color:#b42318}.tdea-ocr-progress.error .tdea-ocr-bar{background:#d92d20}
      .tdea-ocr-progress.done{border-color:#9dddb4;background:#f6fff9}
      @media(max-width:560px){.tdea-ocr-progress-main{grid-template-columns:48px 1fr auto}.tdea-ocr-thumb{width:48px;height:48px}.tdea-ocr-copy strong{font-size:16px}.tdea-ocr-percent{font-size:17px}}
    `;
    document.head.appendChild(style);
  }

  function isCardOcrRequest(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || (typeof input !== "string" ? input?.method : "") || "GET").toUpperCase();
    return method === "POST" && /\/api\/card-collection\/ocr(?:\?|$)/.test(url);
  }

  function previewFromBody(init) {
    try {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      const value = String(body?.imageDataUrl || body?.frontImageDataUrl || "");
      return /^data:image\//i.test(value) ? value : "";
    } catch (_) {
      return "";
    }
  }

  function host() {
    return document.querySelector("#scanDraft")?.parentElement || document.querySelector("main .content") || document.querySelector("#app") || document.body;
  }

  function progressNode() {
    let node = document.getElementById("tdeaCardOcrProgress");
    if (node) return node;
    ensureStyle();
    node = document.createElement("section");
    node.id = "tdeaCardOcrProgress";
    node.className = "tdea-ocr-progress";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    node.innerHTML = `
      <div class="tdea-ocr-progress-main">
        <img class="tdea-ocr-thumb" data-ocr-thumb alt="名片預覽">
        <div class="tdea-ocr-copy"><strong data-ocr-title>名片 AI 分析中</strong><small data-ocr-status>準備辨識名片內容…</small></div>
        <div class="tdea-ocr-percent" data-ocr-percent>20%</div>
      </div>
      <div class="tdea-ocr-track"><div class="tdea-ocr-bar" data-ocr-bar></div></div>
      <div class="tdea-ocr-meta"><span data-ocr-engine>主引擎：Gemini</span><span data-ocr-elapsed>已處理 0 秒</span></div>`;
    const target = host();
    if (target?.querySelector?.("#scanDraft")) target.querySelector("#scanDraft").insertAdjacentElement("afterend", node);
    else target?.prepend?.(node);
    return node;
  }

  function setProgress(percent, status, options = {}) {
    const node = progressNode();
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    node.classList.toggle("warn", Boolean(options.warn));
    node.classList.toggle("error", Boolean(options.error));
    node.classList.toggle("done", Boolean(options.done));
    node.querySelector("[data-ocr-percent]").textContent = `${value}%`;
    node.querySelector("[data-ocr-bar]").style.width = `${value}%`;
    if (status) node.querySelector("[data-ocr-status]").textContent = status;
    if (options.title) node.querySelector("[data-ocr-title]").textContent = options.title;
    if (options.engine) node.querySelector("[data-ocr-engine]").textContent = options.engine;
  }

  function begin(preview) {
    clearInterval(activeTimer);
    activeStartedAt = Date.now();
    const node = progressNode();
    node.className = "tdea-ocr-progress";
    const thumb = node.querySelector("[data-ocr-thumb]");
    if (preview) {
      thumb.src = preview;
      thumb.hidden = false;
    } else {
      thumb.removeAttribute("src");
      thumb.hidden = true;
    }
    setProgress(24, "圖片已送出，正在準備 OCR…", { engine: "主引擎：Gemini" });
    activeTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - activeStartedAt) / 1000);
      const elapsed = node.querySelector("[data-ocr-elapsed]");
      if (elapsed) elapsed.textContent = `已處理 ${seconds} 秒`;
      if (seconds < 2) {
        setProgress(30 + seconds * 4, "正在分析名片影像…", { engine: "主引擎：Gemini" });
      } else if (seconds < 15) {
        const p = 38 + Math.min(28, Math.floor((seconds - 2) * 2.1));
        setProgress(p, "Gemini 正在辨識姓名、公司、電話與 Email…", { engine: "主引擎：Gemini" });
      } else if (seconds < 30) {
        const p = 72 + Math.min(16, Math.floor((seconds - 15) * 1.05));
        setProgress(p, "Gemini 未在預期時間完成，系統正在啟動 OpenAI 備援辨識…", { warn: true, engine: "備援引擎：OpenAI" });
      } else {
        setProgress(90, "辨識時間較久，系統仍在處理，請勿重新上傳。", { warn: true, engine: "AI 服務仍在處理" });
      }
    }, 1000);
  }

  function finishSuccess(payload) {
    clearInterval(activeTimer);
    activeTimer = null;
    const provider = String(payload?.data?.providerUsed || payload?.providerUsed || "").toLowerCase();
    const fallback = payload?.data?.fallbackUsed === true || payload?.fallbackUsed === true;
    if (fallback || provider === "openai") {
      setProgress(100, "OpenAI 備援辨識完成，正在顯示結果。", { done: true, engine: "完成引擎：OpenAI" });
    } else {
      setProgress(100, "Gemini 辨識完成，正在顯示結果。", { done: true, engine: "完成引擎：Gemini" });
    }
  }

  function finishError(message) {
    clearInterval(activeTimer);
    activeTimer = null;
    setProgress(100, message || "辨識失敗，請重新送出名片。", { error: true, title: "名片辨識失敗", engine: "可重新嘗試" });
  }

  window.fetch = async function patchedFetch(input, init) {
    if (!isCardOcrRequest(input, init)) return nativeFetch(input, init);
    begin(previewFromBody(init));
    try {
      const response = await nativeFetch(input, init);
      response.clone().json().then((payload) => {
        if (response.ok && payload?.success !== false) finishSuccess(payload);
        else finishError(payload?.message || payload?.error || `OCR 服務錯誤 HTTP ${response.status}`);
      }).catch(() => {
        if (response.ok) finishSuccess({});
        else finishError(`OCR 服務錯誤 HTTP ${response.status}`);
      });
      return response;
    } catch (error) {
      finishError(error?.message || "網路連線失敗，請重新送出名片。");
      throw error;
    }
  };
})();
