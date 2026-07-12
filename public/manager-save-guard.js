(() => {
  const originalFetch = window.fetch.bind(window);
  let hideTimer = null;
  let latestSaveRequest = 0;

  function isManagerDataSave(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init.method || (typeof input !== "string" ? input?.method : "") || "GET").toUpperCase();
    return method === "PUT" && /\/api\/manager-data(?:\?|$)/.test(url);
  }

  function showSaveStatus(message, type = "info", duration = 0) {
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
    notice.textContent = message;
    notice.hidden = false;

    clearTimeout(hideTimer);
    if (duration > 0) {
      hideTimer = setTimeout(() => {
        notice.hidden = true;
      }, duration);
    }
  }

  window.fetch = async function guardedFetch(input, init) {
    if (!isManagerDataSave(input, init)) return originalFetch(input, init);

    const requestNo = ++latestSaveRequest;
    showSaveStatus("資料儲存中…", "info");

    const slowTimer = setTimeout(() => {
      if (requestNo === latestSaveRequest) {
        showSaveStatus("連線較慢，資料仍在儲存…", "warning");
      }
    }, 4000);

    try {
      const response = await originalFetch(input, init);
      const result = await response.clone().json().catch(() => ({}));
      clearTimeout(slowTimer);

      if (requestNo !== latestSaveRequest) return response;

      if (!response.ok || result.success === false) {
        const message = result.message || `資料儲存失敗（${response.status}）`;
        console.error("[manager-data] 儲存失敗", { status: response.status, result });
        showSaveStatus(message, "error", 6000);
        return response;
      }

      showSaveStatus("資料已儲存", "success", 2200);
      return response;
    } catch (error) {
      clearTimeout(slowTimer);
      if (requestNo === latestSaveRequest) {
        console.error("[manager-data] 儲存失敗", error);
        showSaveStatus(error?.message || "資料儲存失敗，請檢查網路後重新操作。", "error", 6000);
      }
      throw error;
    }
  };
})();