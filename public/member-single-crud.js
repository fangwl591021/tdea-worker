(() => {
  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const clean = (v) => String(v ?? "").trim();
  const stored = (...keys) => {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (clean(value)) return clean(value);
    }
    return "";
  };
  const adminHeaders = (extra = {}) => ({
    ...extra,
    ...(stored("tdea-admin-email") ? { "x-admin-email": stored("tdea-admin-email").toLowerCase() } : {}),
    ...(stored("tdea-admin-member-no", "tdea-member-no") ? { "x-admin-member-no": stored("tdea-admin-member-no", "tdea-member-no").toUpperCase() } : {}),
    ...(stored("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId") ? { "x-line-user-id": stored("tdea-admin-line-user-id", "tdea-line-user-id", "lineUserId") } : {})
  });
  const notify = (message) => {
    if (typeof window.toast === "function") window.toast(message);
    else console.log(message);
  };

  async function saveSingleMember(form) {
    const type = clean(form.dataset.type);
    if (type !== "association" && type !== "vendor") return false;

    const data = Object.fromEntries(new FormData(form));
    const memberNo = clean(data.memberNo || data.rosterMemberNo).toUpperCase();
    const displayName = type === "association" ? clean(data.name) : clean(data.companyName || data.name);
    if (!memberNo) throw new Error("請輸入會員編號");
    if (!displayName) throw new Error(type === "association" ? "請輸入姓名" : "請輸入公司名稱");

    const loginAccess = data.loginAccess === "Y" || data.loginAccess === "on" || data.loginAccess === true;
    const payload = {
      ...data,
      memberType: type,
      memberNo,
      loginAccess,
      allowLogin: loginAccess,
      canLogin: loginAccess
    };
    if (type === "association") payload.name = displayName;
    else payload.companyName = displayName;

    const method = clean(data.id) ? "PUT" : "POST";
    const response = await fetch(`${api}/api/roster/member`, {
      method,
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true || result.verified !== true) {
      throw new Error(result.message || "會員資料寫入失敗");
    }
    return result.data;
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "drawer-member") return;
    const type = clean(form.dataset.type);
    if (type !== "association" && type !== "vendor") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const button = form.querySelector('button[type="submit"]');
    const oldText = button?.textContent || "儲存檔案變更";
    if (button) {
      button.disabled = true;
      button.textContent = "儲存中…";
    }

    try {
      const saved = await saveSingleMember(form);
      notify(`會員資料已儲存：${clean(saved?.name || saved?.companyName || saved?.memberNo)}`);
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
      notify(error?.message || "會員資料儲存失敗");
    }
  }, true);
})();
