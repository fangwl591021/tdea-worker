(() => {
  const originalFetch = window.fetch.bind(window);
  let hideTimer = null;

  function isManagerDataSave(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init.method || (typeof input !== "string" ? input?.method : "") || "GET").toUpperCase();
    return method === "PUT" && /\/api\/manager-data(?:\?|$)/.test(url);
  }

  function showSaveError(message) {
    let notice = document.querySelector("[data-manager-save-error]");
    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("data-manager-save-error", "");
      notice.setAttribute("role", "alert");
      notice.style.cssText = [
        "position:fixed",
        "right:20px",
        "bottom:20px",
        "z-index:99999",
        "max-width:360px",
        "padding:14px 18px",
        "border-radius:10px",
        "background:#b42318",
        "color:#fff",
        "font-weight:800",
        "line-height:1.5",
        "box-shadow:0 10px 30px rgba(0,0,0,.2)"
      ].join(";");
      document.body.appendChild(notice);
    }

    notice.textContent = message || "資料儲存失敗，請重新操作。";
    notice.hidden = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      notice.hidden = true;
    }, 6000);
  }

  window.fetch = async function guardedFetch(input, init) {
    if (!isManagerDataSave(input, init)) return originalFetch(input, init);

    try {
      const response = await originalFetch(input, init);
      const result = await response.clone().json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        const message = result.message || `資料儲存失敗（${response.status}）`;
        console.error("[manager-data] 儲存失敗", { status: response.status, result });
        showSaveError(message);
      }
      return response;
    } catch (error) {
      console.error("[manager-data] 儲存失敗", error);
      showSaveError(error?.message || "資料儲存失敗，請檢查網路後重新操作。");
      throw error;
    }
  };
})();
