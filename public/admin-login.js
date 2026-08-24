(() => {
  window.__tdeaDeferredAppLoader = true;
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const adminLiffId = "2005868456-2jmxqyFU";
  const adminLiffUrl = `https://liff.line.me/${adminLiffId}?adminLogin=1`;
  const sessionKey = "tdea-admin-login-v1";
  const publicModes = [
    "cardCollection","register","query","memberQr","calendar","checkin","redeem","redeemSession","monthlyDetail","monthlyShare","personalMessages","close","marquee","motherRegister","memberHome","checkinModule"
  ];
  const deferredFeatureScripts = [
    "marquee-mode-guard.js?v=20260821-1",
    "native-form-trace.js?v=20260821-1",
    "marquee-ui-fix.js?v=20260821-1",
    "marquee-standalone.js?v=20260821-1",
    "registration-total-preview.js?v=total-preview1",
    "registration-attachment-fix.js?v=attachment-fix3",
    "custom-line-id-field-fix.js?v=line-id-fix1",
    "custom-id-card-field-fix.js?v=id-card-fix1",
    "manager-save-optimizer.js?v=save-opt2",
    "card-ocr-progress.js?v=ocr-progress1",
    "form-builder-edit-guard.js?v=edit-guard1",
    "activity-edit-canonical-hotfix.js?v=canonical-hotfix2",
    "liff-entry-access-log.js?v=entry-log1",
    "activity-edit-fast-save.js?v=fast-save1",
    "member-name-search.js?v=name-roster1",
    "roster-single-entry-only.js?v=single-entry1",
    "member-single-crud.js?v=single-crud1",
    "roster-anomaly-list.js?v=anomaly2",
    "admin-registration-query.js?v=restore1",
    "smart-activity.js?v=v2split1",
    "smart-activity-publish.js?v=publish3",
    "smart-activity-staged.js?v=staged1",
    "smart-activity-intelligence.js?v=rules2",
    "smart-activity-docs.js?v=docs1",
    "smart-activity-points.js?v=points1"
  ];
  const scriptVersions = [
    "activity-canonical-editor.js?v=canonical4",
    "app.js?v=activity-editor10",
    "catalog-pricing.js?v=catalog2",
    "catalog-pricing-editor.js?v=catalog2",
    "line-zone.js?v=access-label1",
    "lottery.js?v=lottery4",
    "activity-types.js?v=types4",
    "form-builder.js?v=form17",
    "google-form-engine.js?v=gform17",
    "activity-detail.js?v=activity-detail7",
    "uid-column.js?v=uid21",
    "login-access.js?v=login7",
    "flex-manager.js?v=flex4",
    "vendor-card-manager.js?v=vendor-card7",
    "marquee-manager.js?v=ad-points-a4-1",
    "push-manager.js?v=push6",
    "calendar-manager.js?v=calendar3",
    "monthly-activity.js?v=monthly-add-sync1",
    "native-form.js?v=registration-options2",
    "liff-detail.js?v=liff-detail14",
    "personal-message.js?v=pm4",
    "keyword-extra.js?v=kw2",
    "line-monitor-link.js?v=monitor-hidden2"
  ];

  const appRoot = document.getElementById("app");
  const scriptBase = new URL(".", document.currentScript?.src || `${location.origin}/tdea-worker/public/`).href;
  function clean(value) { return String(value || "").trim(); }
  function searchParams() {
    const params = new URLSearchParams(location.search);
    const state = params.get("liff.state");
    if (state) {
      try {
        const decoded = new URLSearchParams(decodeURIComponent(state).replace(/^\?/, ""));
        decoded.forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
      } catch (_error) {}
    }
    return params;
  }
  function isPublicMode() {
    const params = searchParams();
    if (params.has("adminLogin")) return false;
    return publicModes.some((key) => params.has(key));
  }
  function storeIdentity(identity) {
    const email = clean(identity.email).toLowerCase();
    const memberNo = clean(identity.memberNo).toUpperCase();
    const lineUserId = clean(identity.lineUserId);
    const displayName = clean(identity.displayName);
    const pictureUrl = clean(identity.pictureUrl);
    const expiresAt = Number(identity.expiresAt) || Date.now() + 12 * 60 * 60 * 1000;
    const session = { email, memberNo, lineUserId, displayName, pictureUrl, expiresAt };
    localStorage.setItem(sessionKey, JSON.stringify(session));
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    setStored("tdea-admin-email", email);
    setStored("tdea-admin-member-no", memberNo);
    setStored("tdea-admin-line-user-id", lineUserId);
    setStored("tdea-admin-display-name", displayName);
    setStored("tdea-admin-picture-url", pictureUrl);
    return session;
  }
  function clearIdentity() {
    try { localStorage.removeItem(sessionKey); } catch (_error) {}
    try { sessionStorage.removeItem(sessionKey); } catch (_error) {}
    ["tdea-admin-email", "tdea-admin-member-no", "tdea-admin-line-user-id", "tdea-admin-display-name", "tdea-admin-picture-url"]
      .forEach((key) => setStored(key, ""));
  }
  function setStored(key, value) {
    try {
      if (value) { localStorage.setItem(key, value); sessionStorage.setItem(key, value); }
      else { localStorage.removeItem(key); sessionStorage.removeItem(key); }
    } catch (_error) {}
  }
  function cachedSession() {
    const raw = sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || Number(parsed.expiresAt) <= Date.now()) return null;
      if (!clean(parsed.email) && !clean(parsed.memberNo) && !clean(parsed.lineUserId)) return null;
      return storeIdentity(parsed);
    } catch (_error) { return null; }
  }
  function headersFor(identity) {
    const headers = {};
    if (identity.email) headers["x-admin-email"] = identity.email;
    if (identity.memberNo) headers["x-admin-member-no"] = identity.memberNo;
    if (identity.lineUserId) headers["x-line-user-id"] = identity.lineUserId;
    return headers;
  }
  function identityFromUrl() {
    const params = searchParams();
    return {
      email: clean(params.get("adminEmail") || params.get("email")).toLowerCase(),
      memberNo: clean(params.get("adminMemberNo") || params.get("memberNo")).toUpperCase(),
      lineUserId: clean(params.get("adminLineUserId") || params.get("lineUserId") || params.get("lineUid") || params.get("uid"))
    };
  }
  async function validateIdentity(identity) {
    if (!identity.email && !identity.memberNo && !identity.lineUserId) return false;
    const response = await fetch(`${api}/api/admin-login/validate`, { headers: headersFor(identity), cache: "no-store" });
    return response.ok;
  }
  async function loadApp() {
    document.body.classList.remove("admin-login-body");
    await loadDeferredFeatureScripts();
    const files = isPublicMode() ? publicScriptVersions() : scriptVersions;
    for (const file of files) {
      await loadScript(file).catch((error) => { if (!file.startsWith("line-monitor-link")) throw error; });
    }
  }
  async function loadDeferredFeatureScripts() {
    const loads = deferredFeatureScripts.map((file) => loadScript(file, { ordered: true }).catch((error) => {
      console.warn(`[deferred-script] ${file}`, error);
      return null;
    }));
    await Promise.all(loads);
  }
  function publicScriptVersions() {
    const params = searchParams();
    if (params.has("cardCollection")) return ["card-collection.js?v=card3"];
    if (params.has("monthlyDetail") || params.has("monthlyShare") || params.has("close")) return ["liff-detail.js?v=liff-detail14"];
    if (params.has("personalMessages")) return ["personal-message.js?v=pm4"];
    if (params.has("memberHome")) return ["member-home.js?v=home5"];
    if (params.has("checkinModule")) return ["checkin-module.js?v=identity1"];
    return ["catalog-pricing.js?v=catalog2", "native-form.js?v=catalog2"];
  }
  function loadScript(src, { ordered = false } = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(src, scriptBase).href;
      if (ordered) script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`script load failed: ${src}`));
      document.body.appendChild(script);
    });
  }
  function renderLogin(message = "") {
    document.body.classList.add("admin-login-body");
    appRoot.innerHTML = `
      <main class="admin-login-shell"><section class="admin-login-card">
        <h1>TDEA 管理中心</h1><p>請先登入後台。</p>
        ${message ? `<div class="admin-login-alert">${escapeHtml(message)}</div>` : ""}
        <button class="admin-line-login" type="button" data-login-line><span class="line-badge">LINE</span>LINE 授權一鍵登入</button>
        <div class="admin-login-sep"><span>或使用備用密碼登入</span></div>
        <form class="admin-password-form" data-login-form><input name="username" autocomplete="username" value="admin" aria-label="帳號"><input name="password" type="password" autocomplete="current-password" placeholder="密碼" aria-label="密碼"><button type="submit">密碼登入</button></form>
      </section></main>`;
    injectStyle();
    appRoot.querySelector("[data-login-line]")?.addEventListener("click", handleLineLogin);
    appRoot.querySelector("[data-login-form]")?.addEventListener("submit", handlePasswordLogin);
  }
  function injectStyle() {
    if (document.getElementById("admin-login-style")) return;
    const style = document.createElement("style");
    style.id = "admin-login-style";
    style.textContent = `.admin-login-body{min-height:100vh;background:#eef2f6;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}.admin-login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.admin-login-card{width:min(450px,100%);background:#fff;border:1px solid #dbe3ef;border-radius:18px;box-shadow:0 18px 45px rgba(15,23,42,.08);padding:34px 40px;text-align:center}.admin-login-card h1{margin:0 0 8px;font-size:30px;color:#111827}.admin-login-card p{margin:0 0 24px;color:#64748b;font-weight:700}.admin-login-alert{margin:0 0 16px;padding:12px;border-radius:12px;background:#fff1f2;color:#b42318;font-weight:800;text-align:left}.admin-line-login,.admin-password-form button{width:100%;height:62px;border:0;border-radius:9px;font-size:18px;font-weight:900;cursor:pointer}.admin-line-login{background:#06c755;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px}.line-badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#fff;color:#06c755;font-size:10px;font-weight:900}.admin-login-sep{display:flex;align-items:center;gap:14px;margin:28px 0;color:#8492a6;font-weight:800}.admin-login-sep:before,.admin-login-sep:after{content:"";height:1px;background:#dbe3ef;flex:1}.admin-password-form{display:grid;gap:20px}.admin-password-form input{height:58px;border:1px solid #cbd5e1;border-radius:7px;background:#e8f0fe;text-align:center;font-size:18px;font-weight:800;color:#111827}.admin-password-form button{background:#1f2a3d;color:#fff}.admin-line-login[disabled],.admin-password-form button[disabled]{opacity:.65;cursor:wait}`;
    document.head.appendChild(style);
  }
  function escapeHtml(value) { return clean(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[ch] || ch)); }
  async function handlePasswordLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    button.disabled = true; button.textContent = "登入中...";
    try {
      const response = await fetch(`${api}/api/admin-login/password`, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ username:clean(form.username.value), password:clean(form.password.value) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "登入失敗");
      storeIdentity(result.data || {}); appRoot.innerHTML = ""; await loadApp();
    } catch (error) { renderLogin(error.message || "登入失敗"); }
  }
  function lineLoginRedirectUri() {
    const url = new URL(location.href); url.searchParams.set("adminLogin", "1");
    ["code","state","liff.state","friendship_status_changed"].forEach((key) => url.searchParams.delete(key)); url.hash = ""; return url.href;
  }
  async function completeLineLogin({ button = null, redirectIfNeeded = true } = {}) {
    if (button) { button.disabled = true; button.textContent = "LINE 登入中..."; }
    await ensureLiffSdk(); await liff.init({ liffId:adminLiffId });
    if (!liff.isLoggedIn()) { if (redirectIfNeeded) liff.login({ redirectUri:lineLoginRedirectUri() }); return false; }
    const profile = await liff.getProfile();
    const response = await fetch(`${api}/api/admin-login/line`, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ lineUserId:profile.userId, displayName:profile.displayName }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "LINE 登入失敗");
    storeIdentity({ ...(result.data || {}), displayName:(result.data || {}).displayName || profile.displayName, pictureUrl:profile.pictureUrl });
    appRoot.innerHTML = ""; await loadApp(); return true;
  }
  async function handleLineLogin(event) { try { await completeLineLogin({ button:event.currentTarget, redirectIfNeeded:true }); } catch (error) { renderLogin(error.message || "LINE 登入失敗"); } }
  function ensureLiffSdk() {
    if (window.liff) return Promise.resolve();
    return new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js"; script.onload = resolve; script.onerror = () => reject(new Error("LIFF SDK 載入失敗")); document.head.appendChild(script); });
  }
  async function boot() {
    if (isPublicMode()) { await loadApp(); return; }
    if (searchParams().has("adminLogin")) {
      renderLogin("LINE 登入確認中...");
      try { const completed = await completeLineLogin({ redirectIfNeeded:true }); if (completed) return; } catch (error) { renderLogin(error.message || "LINE 登入失敗"); return; }
    }
    const urlIdentity = identityFromUrl();
    if (await validateIdentity(urlIdentity).catch(() => false)) { storeIdentity(urlIdentity); await loadApp(); return; }
    const session = cachedSession();
    if (session) {
      if (await validateIdentity(session).catch(() => false)) { await loadApp(); return; }
      clearIdentity();
      renderLogin("登入權限已取消或過期，請重新登入。");
      return;
    }
    renderLogin();
  }
  boot().catch((error) => renderLogin(error.message || "入口載入失敗"));
})();
