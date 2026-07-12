(() => {
  const originalFetch = window.fetch.bind(window);
  const maxRetryCount = 3;
  let hideTimer = null;
  let latestSaveRequest = 0;
  let pendingSaveCount = 0;
  let lastFailedSave = null;
  let nextRetryCount = 0;

  function isManagerDataSave(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init.method || (typeof input !== "string" ? input?.method : "") || "GET").toUpperCase();
    return method === "PUT" && /\/api\/manager-data(?:\?|$)/.test(url);
  }

  function showSaveStatus(message, type = "info", duration = 0, action = null) {
    let notice = document.querySelector("[data-manager-save-status]");
    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("data-manager-save-status", "");
      notice.setAttribute("role", "status");
      notice.style.cssText = [
        "position:fixed",
        "right:20px",
        "bottom:20px",
        "z-index:99999",
        "max-width:360px",
        "padding:14px 18px",
        "border-radius:10px",
        "color:#fff",
        "font-weight:800",
        "line-height:1.5",
        "box-shadow:0 10px 30px rgba(0,0,0,.2)",
        "transition:opacity .2s ease"
      ].join(";");
      document.body.appendChild(notice);
    }

    const backgrounds = {
      info: "#344054",
      warning: "#b54708",
      success: "#067647",
      error: "#b42318"
    };

    notice.setAttribute("role", type === "error" ? "alert" : "status");
    notice.style.background = backgrounds[type] || backgrounds.info;
    notice.replaceChildren();

    const text = document.createElement("span");
    text.textContent = message;
    notice.appendChild(text);

    if (action?.label && typeof action.onClick === "function") {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.style.cssText = [
        "display:block",
        "margin-top:10px",
        "padding:8px 14px",
        "border:0",
        "border-radius:7px",
        "background:#fff",
        "color:#7a271a",
        "font-weight:900",
        "cursor:pointer"
      ].join(";");
      button.addEventListener("click", () => {
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = "重新儲存中…";
        button.style.cursor = "wait";
        button.style.opacity = ".7";
        action.onClick();
      }, { once: true });
      notice.appendChild(button);
    }

    notice.hidden = false;
    clearTimeout(hideTimer);
    if (duration > 0) {
      hideTimer = setTimeout(() => {
        notice.hidden = true;
      }, duration);
    }
  }

  function retryLastFailedSave() {
    if (!lastFailedSave) return;
    const retry = lastFailedSave;
    lastFailedSave = null;
    nextRetryCount = retry.retryCount + 1;
    window.fetch(retry.input, retry.init).catch(() => {});
  }

  function showSaveFailure(message, retryCount = 0) {
    if (retryCount >= maxRetryCount) {
      lastFailedSave = null;
      showSaveStatus(`${message}（已重試 ${retryCount} 次）請保留此畫面並聯絡管理人員。`, "error");
      return;
    }

    const retryNote = retryCount > 0 ? `（已重試 ${retryCount} 次）` : "";
    showSaveStatus(`${message}${retryNote}`, "error", 0, {
      label: "再次儲存",
      onClick: retryLastFailedSave
    });
  }

  window.addEventListener("beforeunload", (event) => {
    if (pendingSaveCount <= 0) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.fetch = async function guardedFetch(input, init) {
    if (!isManagerDataSave(input, init)) return originalFetch(input, init);

    const retryInput = input instanceof Request ? input.clone() : input;
    const retryInit = init ? { ...init } : init;
    const retryCount = nextRetryCount;
    nextRetryCount = 0;
    const requestNo = ++latestSaveRequest;
    pendingSaveCount += 1;
    lastFailedSave = null;
    showSaveStatus(retryCount > 0 ? `重新儲存中…（第 ${retryCount} 次）` : "資料儲存中…", "info");

    const slowTimer = setTimeout(() => {
      if (requestNo === latestSaveRequest) {
        showSaveStatus("連線較慢，資料仍在儲存…", "warning");
      }
    }, 4000);

    const timeoutWarningTimer = setTimeout(() => {
      if (requestNo === latestSaveRequest) {
        console.warn("[manager-data] 儲存超過 15 秒仍未完成");
        showSaveStatus("儲存時間過久，請先不要關閉頁面；系統仍在等待結果。", "error");
      }
    }, 15000);

    try {
      const response = await originalFetch(input, init);
      const result = await response.clone().json().catch(() => ({}));

      if (requestNo !== latestSaveRequest) return response;

      if (!response.ok || result.success === false) {
        const message = result.message || `資料儲存失敗（${response.status}）`;
        lastFailedSave = { input: retryInput, init: retryInit, retryCount };
        console.error("[manager-data] 儲存失敗", { status: response.status, result, retryCount });
        showSaveFailure(message, retryCount);
        return response;
      }

      lastFailedSave = null;
      showSaveStatus(retryCount > 0 ? `資料已儲存（重試 ${retryCount} 次後成功）` : "資料已儲存", "success", 2200);
      return response;
    } catch (error) {
      if (requestNo === latestSaveRequest) {
        lastFailedSave = { input: retryInput, init: retryInit, retryCount };
        console.error("[manager-data] 儲存失敗", { error, retryCount });
        showSaveFailure(error?.message || "資料儲存失敗，請檢查網路後重新操作。", retryCount);
      }
      throw error;
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutWarningTimer);
      pendingSaveCount = Math.max(0, pendingSaveCount - 1);
    }
  };
})();