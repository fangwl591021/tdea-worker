(() => {
  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const params = mergedParams();
  const formId = params.get("register");
  const checkinToken = params.get("checkin");
  const redeemToken = params.get("redeemSession") || params.get("redeem");
  const queryMode = params.has("query");
  const memberQrMode = params.has("memberQr");
  const calendarMode = params.has("calendar");
  const marqueeMode = params.has("marquee");
  const app = document.querySelector("#app");
  const liffId = (checkinToken || redeemToken || memberQrMode || calendarMode || marqueeMode) ? "2005868456-cfANNVou" : "2005868456-2jmxqyFU";
  const nativeLiffUrl = "https://liff.line.me/2005868456-cfANNVou";
  const calendarId = "7d66f2a96f192dda6cca2b04e60a6e549c7adf74f57721845d5b7e03f8b7ca89@group.calendar.google.com";
  let liffReady = null;
  let lineUserId = "";

  if (!app || (!formId && !checkinToken && !redeemToken && !queryMode && !memberQrMode && !calendarMode && !marqueeMode)) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const trim = (value) => String(value ?? "").trim();
  const fieldTypes = new Set(["text", "email", "paragraph", "radio", "checkbox", "dropdown"]);
  const autoMemberKeys = new Set(["line_user_id", "lineuserid", "lineid", "line_id", "lineuid", "line_uid", "uid"]);

  function mergedParams() {
    const output = new URLSearchParams(location.search);
    const merge = (rawValue) => {
      if (!rawValue) return;
      let raw = rawValue;
      for (let i = 0; i < 2; i += 1) {
        try {
          const decoded = decodeURIComponent(raw);
          if (decoded === raw) break;
          raw = decoded;
        } catch (_) {
          break;
        }
      }
      const query = raw.startsWith("?") ? raw.slice(1) : raw.includes("?") ? raw.split("?").slice(1).join("?") : raw;
      new URLSearchParams(query).forEach((value, key) => {
        if (!output.has(key)) output.set(key, value);
      });
    };
    merge(output.get("liff.state"));
    if (location.hash) {
      const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
      merge(hash);
      new URLSearchParams(hash).forEach((value, key) => {
        if (!output.has(key)) output.set(key, value);
      });
    }
    new URLSearchParams(location.search.replace(/^\?/, "")).forEach((value, key) => {
      if (!output.has(key)) output.set(key, value);
    });
    return output;
  }

  function installStyle() {
    if (document.querySelector("#native-form-style")) return;
    const style = document.createElement("style");
    style.id = "native-form-style";
    style.textContent = `
      body{background:#f3f6f9;color:#101828}
      .nf-shell{max-width:840px;margin:0 auto;padding:24px 16px 44px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}
      .nf-card{background:#fff;border:1px solid #e4e7ec;border-radius:10px;box-shadow:0 16px 42px rgba(15,23,42,.08);overflow:hidden}
      .nf-hero{width:100%;max-height:520px;object-fit:contain;background:#fff;display:block}
      .nf-body{display:grid;gap:18px;padding:24px}
      .nf-title{font-size:30px;line-height:1.25;margin:0;color:#111827}
      .nf-meta{display:flex;flex-wrap:wrap;gap:8px;color:#344054}
      .nf-pill{border-radius:999px;background:#eafff1;color:#067647;padding:6px 10px;font-weight:800;font-size:13px}
      .nf-detail{white-space:pre-wrap;line-height:1.75;color:#344054;border-top:1px solid #eaecf0;padding-top:16px}
      .nf-form{display:grid;gap:18px}
      .nf-field{display:grid;gap:8px}
      .nf-field label{font-weight:800;color:#111827}
      .nf-required{color:#d92d20}
      .nf-field input,.nf-field textarea,.nf-field select{width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:12px 14px;font-size:16px;background:#fff}
      .nf-field textarea{min-height:110px;resize:vertical}
      .nf-choice{display:grid;gap:8px}
      .nf-choice label{display:flex;align-items:center;gap:8px;font-weight:600;color:#344054}
      .nf-choice input{width:auto}
      .nf-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .nf-btn{border:1px solid #d0d5dd;background:#fff;color:#111827;border-radius:8px;padding:12px 18px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;justify-content:center}
      .nf-btn.primary{border-color:#06c755;background:#06c755;color:#fff}
      .nf-btn.danger{border-color:#fecdca;color:#b42318}
      .nf-btn[disabled]{opacity:.62;cursor:not-allowed}
      .nf-alert{border-radius:8px;padding:12px 14px;background:#fff3f0;border:1px solid #fecdca;color:#b42318;font-weight:800}
      .nf-ok{border-radius:8px;padding:12px 14px;background:#ecfdf3;border:1px solid #abefc6;color:#067647;font-weight:800}
      .nf-member-card{border:1px solid #abefc6;background:#f6fef9;border-radius:10px;padding:12px 14px;display:grid;gap:8px}
      .nf-member-card strong{font-size:18px;color:#064e3b}
      .nf-member-grid{display:grid;grid-template-columns:120px 1fr;gap:6px 12px;color:#344054}
      .nf-table{width:100%;border-collapse:collapse}.nf-table th,.nf-table td{border-bottom:1px solid #eaecf0;padding:10px;text-align:left;vertical-align:top}
      .nf-qr{width:220px;height:220px;border:1px solid #e4e7ec;border-radius:8px;background:#fff}
      .nf-query-card{border:1px solid #e4e7ec;border-radius:12px;background:#fff;overflow:hidden}
      .nf-query-head{display:grid;gap:10px;padding:18px;border-bottom:1px solid #eaecf0}
      .nf-query-body{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start;padding:18px}
      .nf-query-lines{display:grid;gap:8px;color:#344054;line-height:1.55}
      .nf-query-lines strong{color:#111827}
      .nf-query-qr{display:grid;gap:8px;justify-items:center;text-align:center;color:#667085;font-size:13px}
      .nf-marquee-shell{padding:0;background:#fff}
      .nf-card.nf-marquee-card{border-radius:0;max-width:none;border:0;box-shadow:none;background:#fff}
      .nf-card.nf-marquee-card .nf-body{padding:0}
      .nf-marquee-square{width:100%;aspect-ratio:1/1;margin:0 auto;border-radius:0;overflow:hidden;background:#f8fafc;display:grid;place-items:center;border:0}
      .nf-marquee-square img{width:100%;height:100%;object-fit:cover}
      .nf-marquee-slider{position:relative;width:100%;height:100%;overflow:hidden}
      .nf-marquee-track{display:flex;width:100%;height:100%;transition:transform .42s ease}
      .nf-marquee-slide{flex:0 0 100%;width:100%;height:100%;border:0;background:transparent;padding:0;cursor:pointer;display:block}
      .nf-marquee-slide img{width:100%;height:100%;object-fit:cover}
      .nf-marquee-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;gap:6px;justify-content:center}
      .nf-marquee-dots button{width:8px;height:8px;border:0;border-radius:999px;background:rgba(255,255,255,.65);padding:0}
      .nf-marquee-dots button.active{background:#06c755}
      .nf-marquee-buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px}
      .nf-marquee-card [data-marquee-result]{margin:0 14px 14px}
      .nf-marquee-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:20;background:rgba(17,24,39,.92);color:#fff;border-radius:999px;padding:10px 16px;font-weight:900;box-shadow:0 12px 28px rgba(15,23,42,.24)}
      @media(max-width:640px){.nf-title{font-size:24px}.nf-body{padding:18px}.nf-actions{display:grid}.nf-btn{width:100%}}
      @media(max-width:640px){.nf-query-body{grid-template-columns:1fr}.nf-query-qr{justify-items:start;text-align:left}.nf-query-qr .nf-qr{width:180px;height:180px}}
    `;
    document.head.appendChild(style);
  }

  function renderShell(content, className = "") {
    installStyle();
    app.innerHTML = `<main class="nf-shell ${esc(className)}">${content}</main>`;
  }

  function renderLoading(text = "載入中...") {
    renderShell(`<section class="nf-card"><div class="nf-body"><div class="nf-ok">${esc(text)}</div></div></section>`);
  }

  function renderError(message) {
    renderShell(`<section class="nf-card"><div class="nf-body"><div class="nf-alert">${esc(message || "發生錯誤")}</div></div></section>`);
  }

  function isAutoMemberField(field) {
    const key = trim(field?.key).toLowerCase().replace(/[\s_-]+/g, "");
    const label = trim(field?.label).toLowerCase().replace(/[\s_-]+/g, "");
    return autoMemberKeys.has(key) || ["lineid", "lineuid", "lineuserid"].includes(label);
  }

  const loginAutoMemberKeys = new Set([
    "lineuserid", "lineid", "lineuid", "uid",
    "name", "membername", "phone", "mobile", "email",
    "company", "memberno", "membernumber", "gender", "ismember", "membertype",
    "participantunit", "qualification"
  ]);

  function isLoginAutoMemberField(field) {
    const key = trim(field?.key).toLowerCase().replace(/[\s_-]+/g, "");
    const label = trim(field?.label).toLowerCase().replace(/[\s_/-]+/g, "");
    return loginAutoMemberKeys.has(key) || [
      "lineid", "lineuid", "lineuserid", "姓名", "會員姓名", "手機", "電話",
      "email", "公司單位", "會員編號", "性別", "是否為會員", "身分", "資格"
    ].includes(label);
  }

  function selectedValue(value, option) {
    if (Array.isArray(value)) return value.map(String).includes(String(option));
    return String(value ?? "") === String(option);
  }

  function fieldHtml(field, answers = {}) {
    if (isAutoMemberField(field)) return "";
    const type = fieldTypes.has(field.type) ? field.type : "text";
    const label = `${esc(field.label || field.key)}${field.required ? ' <span class="nf-required">*</span>' : ""}`;
    const name = esc(field.key);
    const value = answers[field.key] ?? answers[field.label] ?? "";
    if (type === "paragraph") return `<div class="nf-field"><label>${label}</label><textarea name="${name}" ${field.required ? "required" : ""}>${esc(value)}</textarea></div>`;
    if (type === "dropdown") {
      const options = Array.isArray(field.options) ? field.options : [];
      return `<div class="nf-field"><label>${label}</label><select name="${name}" ${field.required ? "required" : ""}><option value="">請選擇</option>${options.map((opt) => `<option value="${esc(opt)}" ${selectedValue(value, opt) ? "selected" : ""}>${esc(opt)}</option>`).join("")}</select></div>`;
    }
    if (type === "radio") {
      const options = Array.isArray(field.options) ? field.options : [];
      return `<div class="nf-field"><label>${label}</label><div class="nf-choice">${options.map((opt) => `<label><input type="radio" name="${name}" value="${esc(opt)}" ${field.required ? "required" : ""} ${selectedValue(value, opt) ? "checked" : ""}>${esc(opt)}</label>`).join("")}</div></div>`;
    }
    if (type === "checkbox") {
      const options = Array.isArray(field.options) ? field.options : [];
      return `<div class="nf-field" data-checkbox-field="${name}" data-required="${field.required ? "1" : "0"}"><label>${label}</label><div class="nf-choice">${options.map((opt) => `<label><input type="checkbox" name="${name}" value="${esc(opt)}" ${selectedValue(value, opt) ? "checked" : ""}>${esc(opt)}</label>`).join("")}</div></div>`;
    }
    return `<div class="nf-field"><label>${label}</label><input name="${name}" type="${type === "email" ? "email" : "text"}" value="${esc(value)}" ${field.required ? "required" : ""}></div>`;
  }

  function collectAnswers(form, fields) {
    const answers = {};
    for (const field of fields) {
      if (isAutoMemberField(field)) continue;
      if (field.type === "checkbox") {
        answers[field.key] = [...form.querySelectorAll(`[name="${CSS.escape(field.key)}"]:checked`)].map((node) => node.value);
      } else {
        answers[field.key] = trim(form.elements[field.key]?.value);
      }
    }
    return answers;
  }

  function isElementVisible(node) {
    if (!node || node.closest("[hidden]")) return false;
    return Boolean(node.offsetParent || node.getClientRects().length);
  }

  function fieldLabel(node) {
    const field = node.closest(".nf-field");
    return trim(field?.querySelector("label")?.textContent?.replace("*", "")) || trim(node.name) || "欄位";
  }

  function validateVisibleRequired(form) {
    const checkedRadioNames = new Set();
    for (const node of form.querySelectorAll("input,textarea,select")) {
      if (node.disabled || !node.required || !isElementVisible(node)) continue;
      if (node.type === "radio") {
        if (checkedRadioNames.has(node.name)) continue;
        checkedRadioNames.add(node.name);
        if (!form.querySelector(`input[type="radio"][name="${CSS.escape(node.name)}"]:checked`)) return `${fieldLabel(node)} 為必填`;
        continue;
      }
      if (!trim(node.value)) return `${fieldLabel(node)} 為必填`;
    }
    for (const block of form.querySelectorAll("[data-checkbox-field][data-required='1']")) {
      if (!isElementVisible(block)) continue;
      const key = block.dataset.checkboxField;
      if (key && !form.querySelectorAll(`[name="${CSS.escape(key)}"]:checked`).length) return `${block.querySelector("label")?.textContent?.replace("*", "").trim() || "選項"} 為必填`;
    }
    return "";
  }

  function answerText(answers, keys) {
    for (const key of keys) {
      const value = answers[key];
      const text = Array.isArray(value) ? value.map(trim).filter(Boolean).join(",") : trim(value);
      if (text) return text;
    }
    return "";
  }

  function claimIsMember(answers) {
    const text = answerText(answers, ["isMember", "memberType", "memberRole", "qualification", "是否為會員", "參加單位名稱"]).toLowerCase();
    if (!text || text.includes("其他") || text.includes("非會員")) return false;
    return ["會員", "廠商", "vendor", "member", "yes", "true", "y", "1"].some((item) => text.includes(item));
  }

  function missingMemberClaimIdentity(answers) {
    if (!claimIsMember(answers)) return "";
    const name = answerText(answers, ["name", "memberName", "姓名", "會員姓名", "公司名稱", "公司/單位"]);
    const memberNo = answerText(answers, ["memberNo", "member_no", "memberNumber", "會員編號"]);
    if (!name || !memberNo) return "會員或廠商會員尚未完成 LINE 綁定，請填寫姓名與會員編號。";
    return "";
  }

  async function submitLoginRegistration(id, input) {
    const submitResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}/login-register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const submitResult = await submitResponse.json().catch(() => ({}));
    return { response: submitResponse, result: submitResult };
  }

  function sessionFieldHtml(sessions, selectedSessionId = "") {
    return sessions.length > 1
      ? `<div class="nf-field"><label>場次 <span class="nf-required">*</span></label><select name="sessionId" required>${sessions.map((session) => `<option value="${esc(session.id)}" ${trim(selectedSessionId) === trim(session.id) ? "selected" : ""}>${esc(session.name || "場次")}${session.startTime ? ` ${esc(session.startTime)}` : ""}</option>`).join("")}</select></div>`
      : `<input type="hidden" name="sessionId" value="${esc(selectedSessionId || sessions[0]?.id || "default")}">`;
  }

  function memberSummary(member) {
    if (!member) return "";
    return `<div class="nf-member-card" data-login-member-preview>
      <strong>${esc(member.name || "會員")}</strong>
      <div class="nf-member-grid">
        <span>身分</span><b>${esc(member.role || "")}</b>
        <span>會員編號</span><b>${esc(member.memberNo || "-")}</b>
        <span>公司/單位</span><b>${esc(member.company || "-")}</b>
      </div>
    </div>`;
  }

  function loginRegisterPanel(mode, sessions, fields) {
    if (mode !== "member_login" && mode !== "mixed") return "";
    const extraFields = fields.filter((field) => !isLoginAutoMemberField(field));
    return `<form class="nf-form nf-login-box" data-login-register-box novalidate>
      <div class="nf-ok">會員或廠商會員可使用 LINE 快速報名。系統會取得 LINE UID 並比對名冊，不需要手動填 LINE ID。</div>
      <div data-login-member-area></div>
      ${sessionFieldHtml(sessions)}
      ${extraFields.length ? `<div class="nf-ok">會員資料會自動帶入，只需補活動必要欄位。</div>${extraFields.map(fieldHtml).join("")}` : ""}
      <div class="nf-actions"><button class="nf-btn primary" type="button" data-login-register>會員/廠商快速報名</button></div>
    </form>`;
  }

  function loadLiff(options = {}) {
    if (options.login && !lineUserId) liffReady = null;
    if (liffReady) return liffReady;
    liffReady = new Promise((resolve) => {
      const finish = (value = "") => { lineUserId = value || lineUserId; resolve(lineUserId); };
      const loadSdk = () => new Promise((sdkResolve) => {
        if (window.liff) return sdkResolve(true);
        const existing = document.querySelector("script[data-liff-sdk]");
        if (existing) {
          existing.addEventListener("load", () => sdkResolve(true), { once: true });
          existing.addEventListener("error", () => sdkResolve(false), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
        script.async = true;
        script.dataset.liffSdk = "1";
        script.onload = () => sdkResolve(true);
        script.onerror = () => sdkResolve(false);
        document.head.appendChild(script);
      });
      const init = async () => {
        try {
          await loadSdk();
          await window.liff?.init?.({ liffId });
          if (window.liff?.isLoggedIn?.()) {
            const profile = await window.liff.getProfile();
            finish(profile?.userId || "");
            return;
          }
          if (options.login && window.liff?.login) {
            window.liff.login({ redirectUri: location.href });
            return;
          }
        } catch (_) {}
        finish("");
      };
      if (window.liff) return init();
      const existing = document.querySelector("script[data-liff-sdk]");
      if (existing) {
        existing.addEventListener("load", init, { once: true });
        setTimeout(() => finish(""), 3000);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
      script.dataset.liffSdk = "1";
      script.onload = init;
      script.onerror = () => finish("");
      document.head.appendChild(script);
    });
    return liffReady;
  }

  function renderReceipt(result) {
    const data = result.data || {};
    const checkinUrl = data.checkinUrl || "";
    const qrUrl = checkinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkinUrl)}` : "";
    const payment = data.payment || {};
    const paymentDue = Number(payment.amount || 0) > 0 && payment.status !== "paid";
    const queryCode = data.queryCode || "";
    const queryUrl = `?query=1&code=${encodeURIComponent(queryCode)}`;
    const editUrl = `${queryUrl}&edit=1`;
    const title = data.duplicate ? "已找到既有報名" : "報名成功";
    const notice = data.duplicate ? "你已完成這場活動報名，可在這裡修改資料或取消報名。" : "已完成報名，後續仍可使用查詢碼修改資料或取消報名。";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">${esc(title)}</h1>
      <div class="nf-ok">${esc(notice)}查詢碼：${esc(queryCode)}</div>
      ${paymentDue ? `<div class="nf-alert">此活動需匯款 NT$ ${esc(Number(payment.amount || 0).toLocaleString())}，請完成匯款後到查詢頁回報末五碼。</div>` : ""}
      ${qrUrl ? `<img class="nf-qr" src="${qrUrl}" alt="核銷 QR Code">` : ""}
      <div class="nf-actions">
        <a class="nf-btn primary" href="${editUrl}">修改報名資料</a>
        <a class="nf-btn" href="${queryUrl}">查詢 / 取消報名</a>
        <button class="nf-btn" data-close-window>完成</button>
      </div>
    </div></section>`);
    setTimeout(() => alert(data.duplicate ? "已找到既有報名" : "報名成功"), 50);
    app.querySelector("[data-close-window]")?.addEventListener("click", closeWindow);
  }

  function closeWindow() {
    if (window.liff?.closeWindow) {
      try { window.liff.closeWindow(); return; } catch (_) {}
    }
    if (!location.hostname.includes("liff.line.me")) window.close();
  }

  function registrationMode(form) {
    const settings = form.settings || {};
    if (settings.lineLoginEnabled && settings.registrationMode === "form") return "mixed";
    return trim(settings.registrationMode || "form");
  }

  async function showRegister(id) {
    renderLoading("載入報名表...");
    const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "找不到報名表");
    const form = result.data;
    const activity = form.activity || {};
    const sessions = Array.isArray(form.sessions) ? form.sessions : [];
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const image = activity.posterUrl || activity.imageUrl || "";
    const mode = registrationMode(form);
    const showFullForm = mode === "form";
    let autoLoginNotice = "";

    if (formId) {
      renderLoading("正在比對會員名冊...");
      const uid = await loadLiff({ login: true });
      if (uid) {
        const memberResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}/login-member?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
        const memberResult = await memberResponse.json().catch(() => ({}));
        if (memberResponse.ok && memberResult.success) {
          const member = memberResult.data || {};
          const sessionId = sessions[0]?.id || "default";
          renderLoading(`已確認會員 ${member.name || ""}，正在送出報名...`);
          const { response: submitResponse, result: submitResult } = await submitLoginRegistration(id, { lineUserId: uid, sessionId, answers: {} });
          if (submitResponse.ok && submitResult.success) {
            renderReceipt(submitResult);
            return;
          }
          if (mode === "member_login") return renderError(submitResult.message || "報名失敗");
          autoLoginNotice = submitResult.message || "會員自動報名未完成，請補填必要欄位後送出。";
        } else if (mode === "member_login") {
          return renderError(memberResult.message || "此 LINE 帳號尚未綁定會員或廠商會員資料。");
        }
      } else if (mode === "member_login") {
        return renderError("無法取得 LINE UID，請從 LINE LIFF 開啟報名頁。");
      }
    }

    renderShell(`<section class="nf-card">
      ${image ? `<img class="nf-hero" src="${esc(image)}" alt="${esc(activity.name || "")}">` : ""}
      <div class="nf-body">
        <h1 class="nf-title">${esc(activity.name || "活動報名")}</h1>
        <div class="nf-meta">${activity.courseTime ? `<span class="nf-pill">${esc(activity.courseTime)}</span>` : ""}${activity.deadline ? `<span class="nf-pill">截止 ${esc(activity.deadline)}</span>` : ""}</div>
        ${activity.detailText ? `<div class="nf-detail">${esc(activity.detailText)}</div>` : ""}
        ${autoLoginNotice ? `<div class="nf-alert">${esc(autoLoginNotice)}</div>` : ""}
        ${loginRegisterPanel(mode, sessions, fields)}
        ${showFullForm ? `<form class="nf-form" data-native-register novalidate>
          ${sessionFieldHtml(sessions)}
          ${fields.map(fieldHtml).join("")}
          <div class="nf-actions"><button class="nf-btn primary" type="submit">送出報名</button><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>
        </form>` : mode === "mixed" ? `<details class="nf-form">
          <summary class="nf-btn">非會員或無法快速報名，改填完整表單</summary>
          <form class="nf-form" data-native-register novalidate>
            ${sessionFieldHtml(sessions)}
            ${fields.map(fieldHtml).join("")}
            <div class="nf-actions"><button class="nf-btn primary" type="submit">送出報名</button><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>
          </form>
        </details>` : `<div class="nf-actions"><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>`}
      </div>
    </section>`);

    const loginButton = app.querySelector("[data-login-register]");
    loginButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      const loginBox = app.querySelector("[data-login-register-box]");
      const requiredError = loginBox ? validateVisibleRequired(loginBox) : "";
      if (requiredError) return alert(requiredError);
      loginButton.disabled = true;
      loginButton.textContent = "取得 LINE 身分中...";
      const uid = await loadLiff({ login: true });
      if (!uid) {
        loginButton.disabled = false;
        loginButton.textContent = "會員/廠商快速報名";
        return alert("無法取得 LINE UID，請從 LINE LIFF 開啟報名頁。");
      }
      const memberResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}/login-member?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
      const memberResult = await memberResponse.json().catch(() => ({}));
      if (!memberResponse.ok || !memberResult.success) {
        loginButton.disabled = false;
        loginButton.textContent = "會員/廠商快速報名";
        return alert(memberResult.message || "此 LINE 帳號尚未綁定會員或廠商會員資料。");
      }
      const member = memberResult.data || {};
      const memberArea = app.querySelector("[data-login-member-area]");
      if (memberArea) memberArea.innerHTML = memberSummary(member);
      if (!confirm(`確認以 ${member.name || "會員"} 報名？\n會員編號：${member.memberNo || "-"}`)) {
        loginButton.disabled = false;
        loginButton.textContent = "會員/廠商快速報名";
        return;
      }
      const sessionId = loginBox?.querySelector("[name='sessionId']")?.value || sessions[0]?.id || "default";
      const loginFields = fields.filter((field) => !isLoginAutoMemberField(field));
      const answers = loginBox ? collectAnswers(loginBox, loginFields) : {};
      loginButton.textContent = "送出中...";
      const { response: submitResponse, result: submitResult } = await submitLoginRegistration(id, { lineUserId: uid, sessionId, answers });
      if (!submitResponse.ok || !submitResult.success) {
        loginButton.disabled = false;
        loginButton.textContent = "會員/廠商快速報名";
        return alert(submitResult.message || "報名失敗");
      }
      renderReceipt(submitResult);
    });

    const registerForm = app.querySelector("[data-native-register]");
    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const requiredError = validateVisibleRequired(registerForm);
      if (requiredError) return alert(requiredError);
      const submit = registerForm.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "送出中...";
      const uid = await loadLiff({ login: true });
      const answers = collectAnswers(registerForm, fields);
      if (uid) answers.LINE_user_id = uid;
      if (!uid && claimIsMember(answers)) {
        submit.disabled = false;
        submit.textContent = "送出報名";
        return alert("無法取得 LINE UID，請從 LINE LIFF 開啟報名頁，或先完成會員報到。");
      }
      const sessionId = registerForm.elements.sessionId?.value || "default";
      const claimError = missingMemberClaimIdentity(answers);
      if (claimError) {
        submit.disabled = false;
        submit.textContent = "送出報名";
        return alert(claimError);
      }
      const payload = { sessionId, lineUserId: uid || "", answers };
      const submitResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const submitResult = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok || !submitResult.success) {
        submit.disabled = false;
        submit.textContent = "送出報名";
        return alert(submitResult.message || "報名失敗");
      }
      renderReceipt(submitResult);
    });
  }

  function registrationStatus(row) {
    if (row.status === "cancelled") return "已取消";
    if (row.checkedInAt) return "已核銷";
    return "已報名";
  }

  function paymentStatusText(payment = {}) {
    if (!payment || Number(payment.amount || 0) <= 0 || payment.status === "free") return "免付款";
    if (payment.status === "paid") return "已完成付款";
    if (payment.status === "reported") return "已回報，待協會核對";
    if (payment.status === "cancelled") return "付款已取消";
    if (payment.status === "refunded") return "已退款";
    return "待付款";
  }

  function paymentBlock(row) {
    const payment = row.payment || {};
    const activity = row.activity || {};
    const amount = Number(payment.amount || 0);
    if (amount <= 0) return `<div><strong>付款狀態：</strong>免付款</div>`;
    const remittanceInfo = activity.remittanceInfo || activity.paymentInfo || "";
    const canReport = row.status !== "cancelled" && payment.status !== "paid";
    return `<div class="nf-alert" style="margin-top:10px">
      <div><strong>付款狀態：</strong>${esc(paymentStatusText(payment))}</div>
      <div><strong>應付金額：</strong>NT$ ${esc(amount.toLocaleString())}</div>
      ${payment.remittanceLast5 ? `<div><strong>已回報末五碼：</strong>${esc(payment.remittanceLast5)}</div>` : ""}
      ${payment.paidAt ? `<div><strong>確認時間：</strong>${esc(new Date(payment.paidAt).toLocaleString("zh-TW", { hour12: false }))}</div>` : ""}
      ${remittanceInfo ? `<div style="white-space:pre-wrap"><strong>匯款資訊：</strong>${esc(remittanceInfo)}</div>` : ""}
      ${canReport ? `<form class="nf-form" data-payment-report style="margin-top:10px">
        <input type="hidden" name="registrationId" value="${esc(row.id)}">
        <input type="hidden" name="queryCode" value="${esc(row.queryCode || "")}">
        <div class="nf-field"><label>匯款帳號末五碼</label><input name="remittanceLast5" inputmode="numeric" maxlength="5" placeholder="例如 12345" required></div>
        <div class="nf-field"><label>備註</label><input name="note" placeholder="可填匯款人姓名或轉帳時間"></div>
        <div class="nf-actions"><button class="nf-btn primary" type="submit">回報匯款</button></div>
      </form>` : ""}
    </div>`;
  }

  function registrationCard(row) {
    const activity = row.activity || {};
    const title = activity.name || row.formId || "活動報名";
    const submittedAt = row.submittedAt ? new Date(row.submittedAt).toLocaleString("zh-TW", { hour12: false }) : "";
    const checkedInAt = row.checkedInAt ? new Date(row.checkedInAt).toLocaleString("zh-TW", { hour12: false }) : "";
    const isCheckedIn = Boolean(row.checkedInAt);
    const checkinUrl = row.checkinUrl || (row.checkinToken ? `${nativeLiffUrl}?checkin=${encodeURIComponent(row.checkinToken)}` : "");
    const qrUrl = checkinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkinUrl)}` : "";
    const lines = [
      activity.courseTime ? `<div><strong>活動時間：</strong>${esc(activity.courseTime)}</div>` : "",
      submittedAt ? `<div><strong>報名時間：</strong>${esc(submittedAt)}</div>` : "",
      row.queryCode ? `<div><strong>查詢碼：</strong>${esc(row.queryCode)}</div>` : "",
      checkedInAt ? `<div><strong>核銷時間：</strong>${esc(checkedInAt)}</div>` : ""
    ].filter(Boolean).join("");
    return `<article class="nf-query-card">
      <div class="nf-query-head">
        <div class="nf-meta"><span class="nf-pill">${esc(registrationStatus(row))}</span></div>
        <h2 class="nf-title" style="font-size:22px">${esc(title)}</h2>
      </div>
      <div class="nf-query-body">
        <div class="nf-query-lines">
          ${isCheckedIn ? `<div class="nf-ok">已完成報到</div>` : ""}
          ${lines || `<div>已找到報名紀錄。</div>`}
          ${paymentBlock(row)}
          ${row.status === "cancelled" || isCheckedIn ? "" : `<div class="nf-actions" style="margin-top:10px"><button class="nf-btn" data-edit-registration="${esc(row.id)}" data-query-code="${esc(row.queryCode || "")}">修改報名資料</button><button class="nf-btn danger" data-cancel-registration="${esc(row.id)}" data-query-code="${esc(row.queryCode || "")}">取消報名</button></div>`}
        </div>
        ${!isCheckedIn && qrUrl ? `<div class="nf-query-qr"><img class="nf-qr" src="${qrUrl}" alt="核銷 QR Code"><span>活動核銷 QR</span></div>` : ""}
      </div>
    </article>`;
  }

  async function loadFormForRegistration(row) {
    const id = trim(row.formId || row.activity?.formId || formId);
    if (!id) throw new Error("找不到原報名表設定，無法修改。");
    const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "讀取原報名表失敗");
    return result.data || {};
  }

  function editRegistrationForm(row, form) {
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const sessions = Array.isArray(form.sessions) ? form.sessions : [];
    const answers = row.answers || {};
    return `<article class="nf-query-card">
      <h2 class="nf-title" style="font-size:22px">修改報名資料</h2>
      <div class="nf-ok">請確認資料後儲存，儲存完成會回到報名查詢。</div>
      <form class="nf-form" data-edit-registration-form novalidate>
        <input type="hidden" name="registrationId" value="${esc(row.id)}">
        <input type="hidden" name="queryCode" value="${esc(row.queryCode || "")}">
        ${sessionFieldHtml(sessions, row.sessionId || "default")}
        ${fields.map((field) => fieldHtml(field, answers)).join("")}
        <div class="nf-actions">
          <button class="nf-btn primary" type="submit">儲存修改</button>
          <button class="nf-btn" type="button" data-edit-cancel>返回</button>
        </div>
      </form>
    </article>`;
  }

  async function bindEditRegistration(container, refresh) {
    container.querySelectorAll("[data-edit-registration]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const current = event.currentTarget;
        current.disabled = true;
        const originalText = current.textContent;
        current.textContent = "讀取中...";
        const card = current.closest(".nf-query-card");
        try {
          const registrationId = current.dataset.editRegistration || "";
          const queryCode = current.dataset.queryCode || "";
          const response = await fetch(`${api}/api/native-registrations/query?registrationId=${encodeURIComponent(registrationId)}&code=${encodeURIComponent(queryCode)}`, { cache: "no-store" });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.success) throw new Error(result.message || "查無報名資料");
          const row = result.data || {};
          const form = await loadFormForRegistration(row);
          const host = card || container;
          host.outerHTML = editRegistrationForm(row, form);
          const nextForm = container.querySelector("[data-edit-registration-form]");
          const cancel = container.querySelector("[data-edit-cancel]");
          cancel?.addEventListener("click", refresh);
          nextForm?.addEventListener("submit", async (submitEvent) => {
            submitEvent.preventDefault();
            const requiredError = validateVisibleRequired(nextForm);
            if (requiredError) return alert(requiredError);
            const submit = nextForm.querySelector("button[type='submit']");
            submit.disabled = true;
            submit.textContent = "儲存中...";
            const answers = collectAnswers(nextForm, Array.isArray(form.fields) ? form.fields : []);
            const payload = {
              registrationId: nextForm.elements.registrationId.value,
              queryCode: nextForm.elements.queryCode.value,
              sessionId: nextForm.elements.sessionId?.value || row.sessionId || "default",
              answers
            };
            const updateResponse = await fetch(`${api}/api/native-registrations/update`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            });
            const updateResult = await updateResponse.json().catch(() => ({}));
            if (!updateResponse.ok || !updateResult.success) {
              submit.disabled = false;
              submit.textContent = "儲存修改";
              return alert(updateResult.message || "儲存失敗");
            }
            alert("已更新報名資料");
            refresh();
          });
        } catch (error) {
          current.disabled = false;
          current.textContent = originalText;
          alert(error instanceof Error ? error.message : "讀取修改表單失敗");
        }
      });
    });
  }

  async function bindCancel(container, refresh) {
    container.querySelectorAll("[data-cancel-registration]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        if (!confirm("確定取消這筆報名？")) return;
        const cancelResponse = await fetch(`${api}/api/native-registrations/cancel`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ registrationId: event.currentTarget.dataset.cancelRegistration, queryCode: event.currentTarget.dataset.queryCode })
        });
        const cancelResult = await cancelResponse.json().catch(() => ({}));
        if (!cancelResponse.ok || !cancelResult.success) return alert(cancelResult.message || "取消失敗");
        refresh();
      });
    });
  }

  async function bindPaymentReport(container, refresh) {
    container.querySelectorAll("[data-payment-report]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const button = event.currentTarget.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        const response = await fetch(`${api}/api/native-registrations/payment-report`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          if (button) button.disabled = false;
          return alert(result.message || "回報失敗");
        }
        alert("已回報，協會將進行帳務核對。");
        refresh();
      });
    });
  }

  async function showMyRegistrations() {
    const initialCode = params.get("code") || "";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">我的活動報名</h1>
      <div data-my-query-result><div class="nf-ok">正在讀取 LINE 報名資料...</div></div>
      <details>
        <summary>使用查詢碼查詢</summary>
        <form class="nf-form" data-query-form style="margin-top:14px">
          <div class="nf-field"><label>查詢碼</label><input name="code" value="${esc(initialCode)}"></div>
          <div class="nf-actions"><button class="nf-btn" type="submit">查詢</button></div>
        </form>
      </details>
    </div></section>`);

    async function runCodeQuery(code) {
      const box = app.querySelector("[data-my-query-result]");
      box.innerHTML = `<div class="nf-ok">查詢中...</div>`;
      const response = await fetch(`${api}/api/native-registrations/query?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        box.innerHTML = `<div class="nf-alert">${esc(result.message || "查無資料")}</div>`;
        return;
      }
      box.innerHTML = registrationCard(result.data || {});
      bindEditRegistration(box, () => runCodeQuery(code));
      bindCancel(box, () => runCodeQuery(code));
      bindPaymentReport(box, () => runCodeQuery(code));
      if (params.get("edit") === "1") setTimeout(() => box.querySelector("[data-edit-registration]")?.click(), 0);
    }

    async function runLoginQuery() {
      const box = app.querySelector("[data-my-query-result]");
      const uid = await loadLiff({ login: true });
      if (!uid) {
        box.innerHTML = `<div class="nf-alert">無法取得 LINE UID，請從 LINE LIFF 開啟查詢頁。</div>`;
        return;
      }
      box.innerHTML = `<div class="nf-ok">查詢你的報名紀錄中...</div>`;
      const response = await fetch(`${api}/api/native-registrations/me?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        box.innerHTML = `<div class="nf-alert">${esc(result.message || "查詢失敗")}</div>`;
        return;
      }
      const rows = Array.isArray(result.data) ? result.data : [];
      box.innerHTML = rows.length ? `<div class="nf-form">${rows.map(registrationCard).join("")}</div>` : `<div class="nf-alert">目前沒有報名紀錄。</div>`;
      bindEditRegistration(box, runLoginQuery);
      bindCancel(box, runLoginQuery);
      bindPaymentReport(box, runLoginQuery);
    }

    app.querySelector("[data-query-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = event.currentTarget.elements.code.value.trim();
      if (code) runCodeQuery(code);
    });
    if (initialCode) runCodeQuery(initialCode);
    else runLoginQuery();
  }

  async function showCheckin(token) {
    renderLoading("讀取核銷資料...");
    const operatorReady = loadLiff({ login: false });
    const response = await fetch(`${api}/api/native-checkin/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "核銷資料無效");
    const row = result.data || {};
    const answers = row.answers || {};
    const activity = row.activity || {};
    const pickFrom = (source, ...keys) => {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim()) return value;
      }
      return "-";
    };
    const attendeeName = pickFrom(answers, "memberName", "name", "姓名", "participantName", "displayName");
    const activityName = pickFrom(activity, "name", "activityName", "活動名稱", "title");
    const alreadyCheckedIn = Boolean(row.checkedInAt);
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">活動報到核銷</h1>
      <div class="${alreadyCheckedIn ? "nf-ok" : "nf-alert"}">${alreadyCheckedIn ? `已完成報到：${esc(row.checkedInAt)}` : "尚未報到"}</div>
      <table class="nf-table"><tbody>
        <tr><th>人名</th><td>${esc(attendeeName)}</td></tr>
        <tr><th>活動名稱</th><td>${esc(activityName)}</td></tr>
      </tbody></table>
      <div class="nf-actions"><button class="nf-btn primary" data-confirm-checkin ${alreadyCheckedIn ? "disabled" : "disabled"}>${alreadyCheckedIn ? "已完成報到" : "準備核銷..."}</button></div>
    </div></section>`);
    if (alreadyCheckedIn) return;
    const button = app.querySelector("[data-confirm-checkin]");
    let preparedOperatorLineUserId = "";
    const prepareOperator = async ({ login = false } = {}) => {
      if (preparedOperatorLineUserId) return preparedOperatorLineUserId;
      if (button) {
        button.disabled = true;
        button.textContent = login ? "LINE 登入中..." : "準備核銷...";
      }
      preparedOperatorLineUserId = await (login ? loadLiff({ login: true }) : operatorReady);
      if (!preparedOperatorLineUserId && login) preparedOperatorLineUserId = await loadLiff({ login: true });
      if (button) {
        button.disabled = false;
        button.textContent = preparedOperatorLineUserId ? "確認報到" : "用 LINE 登入後核銷";
      }
      return preparedOperatorLineUserId;
    };
    prepareOperator().then((uid) => {
      if (uid || !button) return;
      button.disabled = false;
      button.textContent = "用 LINE 登入後核銷";
    });
    button?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (button?.dataset.busy === "1") return;
      const originalText = button?.textContent || "確認報到";
      if (button) {
        button.dataset.busy = "1";
        button.disabled = true;
        button.textContent = "核銷中，請稍候...";
      }
      try {
        const operatorLineUserId = preparedOperatorLineUserId || await prepareOperator({ login: true });
        if (!operatorLineUserId) throw new Error("無法取得工作人員 LINE UID，請用 LINE 開啟此核銷 QR。");
        const confirmResponse = await fetch(`${api}/api/native-checkin/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-line-user-id": operatorLineUserId },
          body: JSON.stringify({ token, operatorLineUserId })
        });
        const confirmResult = await confirmResponse.json().catch(() => ({}));
        if (!confirmResponse.ok || !confirmResult.success) throw new Error(confirmResult.message || "核銷失敗");
        if (button) button.textContent = "報到成功";
        alert("報到成功");
        showCheckin(token);
      } catch (error) {
        if (button) {
          button.dataset.busy = "0";
          button.disabled = false;
          button.textContent = originalText;
        }
        alert(error?.message || "核銷失敗");
      }
    });
  }

  function redeemModeText(mode) {
    if (mode === "manual") return "店家輸入扣點";
    if (mode === "rate") return "依消費金額換算";
    return "固定點數";
  }

  function parseMemberQr(rawValue) {
    const raw = trim(rawValue);
    const output = { raw, lineUserId: "", memberNo: "", phone: "", balanceHint: "" };
    const pick = (source = {}) => {
      const data = source || {};
      output.lineUserId ||= trim(data.lineUserId || data.LINE_user_id || data.line_user_id || data.uid || data.UID || data.userId || data.lineUid);
      output.memberNo ||= trim(data.memberNo || data.member_no || data.rosterMemberNo || data.user_login || data.no || data["會員編號"]);
      output.phone ||= trim(data.phone || data.mobile || data.tel || data.telephone || data.contactPhone || data["手機"] || data["行動電話"]);
      output.balanceHint ||= trim(data.balance || data.pointBalance || data.point_balance || data.points || data["購物金餘額"] || data["點數"]);
    };
    try { pick(JSON.parse(raw)); } catch (_) {}
    try {
      const url = new URL(raw);
      pick(Object.fromEntries(url.searchParams.entries()));
      const nested = url.searchParams.get("data") || url.searchParams.get("q") || url.searchParams.get("member") || "";
      if (nested && nested !== raw) pick(parseMemberQr(nested));
    } catch (_) {
      if (raw.includes("=") || raw.includes("&")) pick(Object.fromEntries(new URLSearchParams(raw.replace(/^\?/, "")).entries()));
    }
    const uidMatch = raw.match(/U[a-f0-9]{32}/i);
    if (!output.lineUserId && uidMatch) output.lineUserId = uidMatch[0];
    const phoneMatch = raw.replace(/\D/g, "");
    if (!output.phone && !output.lineUserId && phoneMatch.length >= 8 && phoneMatch.length <= 12) output.phone = phoneMatch;
    return output;
  }

  function redeemRuleText(data = {}) {
    const parts = [redeemModeText(data.mode || "fixed")];
    if (data.mode === "fixed") parts.push(`固定扣 ${Number(data.points || 0).toLocaleString()} 點`);
    if (data.mode === "manual") parts.push("掃描後輸入扣點");
    if (data.mode === "rate") parts.push(`每 1 元扣 ${Number(data.pointRate || 0).toLocaleString()} 點`);
    if (Number(data.maxPoints || 0) > 0) parts.push(`單次上限 ${Number(data.maxPoints || 0).toLocaleString()} 點`);
    return parts.join(" / ");
  }

  function redeemMemberPreviewHtml(data, member, detail) {
    const balance = Number(detail.balance ?? detail.pointAccount?.balance ?? 0);
    const mode = data.mode || "fixed";
    return `<div class="nf-member-card" data-redeem-preview>
      <strong>已讀取會員</strong>
      <div class="nf-member-grid">
        ${member.phone ? `<span>手機</span><b>${esc(member.phone)}</b>` : ""}
        ${member.memberNo ? `<span>會員編號</span><b>${esc(member.memberNo)}</b>` : ""}
        ${!member.phone && !member.memberNo ? `<span>會員識別</span><b>${esc(member.lineUserId)}</b>` : ""}
        ${member.balanceHint ? `<span>QR 顯示餘額</span><b>${esc(member.balanceHint)}（僅供參考）</b>` : ""}
        <span>系統可用點數</span><b>${esc(balance.toLocaleString())}</b>
      </div>
      <form class="nf-form" data-redeem-use style="margin-top:10px">
        <input type="hidden" name="lineUserId" value="${esc(member.lineUserId)}">
        <input type="hidden" name="phone" value="${esc(member.phone || "")}">
        ${mode === "manual" ? `<div class="nf-field"><label>本次扣抵點數 <span class="nf-required">*</span></label><input name="points" type="number" min="1" required></div>` : ""}
        ${mode === "rate" ? `<div class="nf-field"><label>消費金額 <span class="nf-required">*</span></label><input name="amount" type="number" min="1" required></div>` : ""}
        ${mode === "fixed" ? `<div class="nf-ok">本次固定扣抵 ${esc(Number(data.points || 0).toLocaleString())} 點。</div>` : ""}
        <div class="nf-field"><label>備註</label><input name="note" placeholder="例如發票號碼、櫃位、操作人員"></div>
        <div class="nf-actions"><button class="nf-btn primary" type="submit">確認扣點</button><button class="nf-btn" type="button" data-redeem-clear>重新掃描</button></div>
      </form>
    </div>`;
  }

  async function showRedeem(token) {
    renderLoading("讀取店家工作台...");
    await loadLiff({ login: false });
    const response = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "店家工作台無效");
    const data = result.data || {};
    const active = data.status === "active" || data.status === "pending";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">店家掃碼工作台</h1>
      <div class="nf-ok">${esc(data.vendorName || "合作店家")}</div>
      ${active ? "" : `<div class="nf-alert">此授權目前狀態：${esc(data.status || "不可用")}</div>`}
      <div class="nf-detail">${esc(redeemRuleText(data))}\n有效時間：${esc(new Date(data.startsAt || data.createdAt || "").toLocaleString("zh-TW", { hour12: false }))} - ${esc(new Date(data.expiresAt || "").toLocaleString("zh-TW", { hour12: false }))}</div>
      <div class="nf-actions"><button class="nf-btn primary" data-redeem-scan ${active ? "" : "disabled"}>掃描會員 QR</button></div>
      <form class="nf-form" data-redeem-manual>
        <div class="nf-field"><label>手動輸入行動電話</label><input name="qr" inputmode="tel" placeholder="例如 0912345678"></div>
        <div class="nf-actions"><button class="nf-btn" type="submit" ${active ? "" : "disabled"}>讀取會員點數</button></div>
      </form>
      <div data-redeem-member-area></div>
      <div data-redeem-result></div>
    </div></section>`);

    const memberArea = app.querySelector("[data-redeem-member-area]");
    const resultArea = app.querySelector("[data-redeem-result]");
    const readMember = async (raw) => {
      const member = parseMemberQr(raw);
      if (!member.lineUserId) {
        if (!member.phone) {
          const message = member.memberNo ? `此 QR 只解析到會員編號 ${member.memberNo}，尚缺 LINE UID 或手機，請先完成會員綁定或改掃會員個人 QR。` : "掃描內容無法解析 LINE UID 或手機。";
          memberArea.innerHTML = `<div class="nf-alert">${esc(message)}</div>`;
          return;
        }
      }
      memberArea.innerHTML = `<div class="nf-ok">正在查詢會員點數...</div>`;
      const query = member.lineUserId ? `lineUserId=${encodeURIComponent(member.lineUserId)}` : `phone=${encodeURIComponent(member.phone)}`;
      const detailResponse = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}?${query}`, { cache: "no-store" });
      const detailResult = await detailResponse.json().catch(() => ({}));
      if (!detailResponse.ok || !detailResult.success) {
        memberArea.innerHTML = `<div class="nf-alert">${esc(detailResult.message || "會員點數查詢失敗")}</div>`;
        return;
      }
      const detailData = detailResult.data || {};
      if (!detailData.lineUserId && !detailData.member?.lineUserId && detailData.lookupMessage) {
        memberArea.innerHTML = `<div class="nf-alert">${esc(detailData.lookupMessage)}</div>`;
        return;
      }
      member.lineUserId ||= detailData.lineUserId || detailData.member?.lineUserId || "";
      member.memberNo ||= detailData.member?.memberNo || detailData.member?.rosterMemberNo || "";
      member.phone ||= detailData.member?.phone || "";
      memberArea.innerHTML = redeemMemberPreviewHtml(data, member, detailData);
      bindRedeemUse();
    };
    const bindRedeemUse = () => {
      memberArea.querySelector("[data-redeem-clear]")?.addEventListener("click", () => { memberArea.innerHTML = ""; resultArea.innerHTML = ""; });
      memberArea.querySelector("[data-redeem-use]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const payload = Object.fromEntries(new FormData(form));
        const button = form.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        const confirmResponse = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}/use`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const confirmResult = await confirmResponse.json().catch(() => ({}));
        if (button) button.disabled = false;
        if (!confirmResponse.ok || !confirmResult.success) return alert(confirmResult.message || "折抵失敗");
        const tx = confirmResult.data?.transaction || {};
        resultArea.innerHTML = `<div class="nf-ok">扣點完成：${esc(Math.abs(Number(tx.points || 0)).toLocaleString())} 點，扣後餘額 ${esc(Number(tx.balanceAfter ?? confirmResult.data?.balance ?? 0).toLocaleString())} 點。</div>`;
        memberArea.innerHTML = "";
      });
    };
    app.querySelector("[data-redeem-scan]")?.addEventListener("click", async () => {
      try {
        if (!window.liff?.scanCodeV2) return alert("目前環境不支援 LIFF 掃描器，請改用手動輸入行動電話。");
        const scan = await window.liff.scanCodeV2();
        const value = scan?.value || scan?.text || "";
        if (!value) return;
        await readMember(value);
      } catch (error) {
        alert(error?.message || "掃描失敗，請改用手動輸入。");
      }
    });
    app.querySelector("[data-redeem-manual]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = new FormData(event.currentTarget).get("qr") || "";
      await readMember(value);
    });
  }

  async function showMemberQr() {
    renderLoading("讀取會員 QR...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE LIFF 開啟。");
    const qrData = JSON.stringify({ type: "tdea-member", lineUserId: uid });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrData)}`;
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">會員 QR Code</h1>
      <img class="nf-qr" src="${qrUrl}" alt="會員 QR Code">
      <div class="nf-ok">請出示此 QR Code 供店家或活動人員掃描。</div>
    </div></section>`);
  }

  function showCalendar() {
    const src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia%2FTaipei`;
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">TDEA 行事曆</h1>
      <iframe title="TDEA 行事曆" src="${src}" style="width:100%;height:720px;border:0;border-radius:8px"></iframe>
    </div></section>`);
  }

  function marqueeItems(config) {
    const rawItems = Array.isArray(config?.imageItems) ? config.imageItems : [];
    if (rawItems.length) {
      return rawItems.map((item, index) => ({
        id: trim(item.id) || `image-${index + 1}`,
        imageUrl: trim(item.imageUrl),
        linkUrl: trim(item.linkUrl),
        points: Number(item.points || 1),
        enabled: item.enabled !== false
      })).filter((item) => item.imageUrl);
    }
    return [...new Set([...(Array.isArray(config?.imageUrls) ? config.imageUrls : []), config?.imageUrl].map((url) => trim(url)).filter(Boolean))]
      .map((url, index) => ({ id: `legacy-${index + 1}`, imageUrl: url, linkUrl: "", points: 1, enabled: true }));
  }

  function marqueeSliderHtml(items) {
    const list = (items || []).filter((item) => item?.imageUrl);
    if (!list.length) return "<span>尚未設定圖片</span>";
    if (list.length === 1) return `<button type="button" class="nf-marquee-slide" data-marquee-image-id="${esc(list[0].id)}" data-marquee-image-url="${esc(list[0].imageUrl)}" data-marquee-link-url="${esc(list[0].linkUrl)}"><img src="${esc(list[0].imageUrl)}" alt=""></button>`;
    return `<div class="nf-marquee-slider" data-nf-marquee-slider>
      <div class="nf-marquee-track">${list.map((item) => `<button type="button" class="nf-marquee-slide" data-marquee-image-id="${esc(item.id)}" data-marquee-image-url="${esc(item.imageUrl)}" data-marquee-link-url="${esc(item.linkUrl)}"><img src="${esc(item.imageUrl)}" alt=""></button>`).join("")}</div>
      <div class="nf-marquee-dots">${list.map((_, index) => `<button type="button" data-nf-marquee-dot="${index}" class="${index === 0 ? "active" : ""}" aria-label="第 ${index + 1} 張"></button>`).join("")}</div>
    </div>`;
  }

  function bindMarqueeSlider() {
    const root = app.querySelector("[data-nf-marquee-slider]");
    if (!root) return;
    const track = root.querySelector(".nf-marquee-track");
    const dots = [...root.querySelectorAll("[data-nf-marquee-dot]")];
    let index = 0;
    let timer = null;
    let touchStartX = 0;
    let touchDeltaX = 0;
    const go = (next) => {
      index = (next + dots.length) % dots.length;
      if (track) track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
    };
    const restart = () => {
      clearInterval(timer);
      timer = setInterval(() => go(index + 1), 3000);
    };
    root.addEventListener("touchstart", (event) => {
      touchStartX = event.touches?.[0]?.clientX || 0;
      touchDeltaX = 0;
    }, { passive: true });
    root.addEventListener("touchmove", (event) => {
      touchDeltaX = (event.touches?.[0]?.clientX || 0) - touchStartX;
    }, { passive: true });
    root.addEventListener("touchend", () => {
      if (Math.abs(touchDeltaX) > 35) {
        go(index + (touchDeltaX < 0 ? 1 : -1));
        restart();
      }
      setTimeout(() => { touchDeltaX = 0; }, 0);
    }, { passive: true });
    root.dataset.swipeDelta = "0";
    root.addEventListener("pointerdown", (event) => {
      root.dataset.swipeStartX = String(event.clientX || 0);
      root.dataset.swipeDelta = "0";
    });
    root.addEventListener("pointermove", (event) => {
      const start = Number(root.dataset.swipeStartX || 0);
      if (start) root.dataset.swipeDelta = String((event.clientX || 0) - start);
    });
    dots.forEach((dot) => dot.addEventListener("click", () => { go(Number(dot.dataset.nfMarqueeDot || 0)); restart(); }));
    restart();
  }

  function marqueePointDetailHtml(result) {
    const balance = result.balance ?? result.pointBalance ?? result.point_balance ?? "-";
    const rows = Array.isArray(result.logs) && result.logs.length ? result.logs : (Array.isArray(result.list) ? result.list : []);
    const detail = rows.slice(0, 5).map((row) => {
      const amount = row.amount ?? row.points ?? row.point ?? row.change_point ?? row.changed_point ?? "";
      const reason = row.reason || row.event_name || row.event_content || row.shop_remark || "";
      const time = row.createdAt || row.created_at || row.create_time || row.date || "";
      const balanceAfter = row.balanceAfter ?? row.point_balance ?? "";
      return `<li><strong>${esc(amount)}</strong><span>${esc(reason || "點數異動")}</span><small>${esc(time)}${balanceAfter !== "" ? `｜餘額 ${esc(balanceAfter)}` : ""}</small></li>`;
    }).join("");
    return `<div><strong>目前點數餘額：${esc(balance)}</strong>${detail ? `<ul style="margin:10px 0 0;padding-left:18px;display:grid;gap:8px;text-align:left">${detail}</ul>` : `<div style="margin-top:8px">目前沒有明細。</div>`}</div>`;
  }
  async function showMarquee() {
    renderLoading("載入廣告贈點...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE LIFF 開啟。");
    const response = await fetch(`${api}/api/marquee`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "廣告贈點資料讀取失敗");
    const config = result.data || {};
    if (config.enabled === false) return renderError("廣告贈點尚未啟用。");
    const right = config.right || {};
    const left = config.left || {};
    const items = marqueeItems(config);
    renderShell(`<section class="nf-card nf-marquee-card"><div class="nf-body">
      <div class="nf-marquee-square">${marqueeSliderHtml(items)}</div>
      <div class="nf-marquee-buttons">
        <button class="nf-btn" data-marquee-action="checkin" ${left.enabled === false ? "disabled" : ""}>${esc((left.label || "系統簽到").replace("簽到贈點", "系統簽到").replace("左側簽到", "系統簽到"))}</button>
        <button class="nf-btn primary" data-marquee-action="points" ${right.enabled === false ? "disabled" : ""}>${esc(right.label || "查詢點數")}</button>
      </div>
      <div class="nf-ok" data-marquee-result hidden></div>
    </div></section><div class="nf-marquee-toast" data-marquee-toast hidden></div>`, "nf-marquee-shell");
    bindMarqueeSlider();
    app.querySelectorAll("[data-marquee-image-id]").forEach((button) => {
      let pointerStartX = 0;
      let pointerStartY = 0;
      let moved = false;
      button.addEventListener("pointerdown", (event) => {
        pointerStartX = event.clientX || 0;
        pointerStartY = event.clientY || 0;
        moved = false;
      });
      button.addEventListener("pointermove", (event) => {
        if (Math.abs((event.clientX || 0) - pointerStartX) > 20 || Math.abs((event.clientY || 0) - pointerStartY) > 20) moved = true;
      });
      button.addEventListener("click", async () => {
        const slider = button.closest("[data-nf-marquee-slider]");
        const sliderMoved = Math.abs(Number(slider?.dataset.swipeDelta || 0)) > 20;
        if (moved || sliderMoved) return;
        const imageId = button.dataset.marqueeImageId || "";
        const imageUrl = button.dataset.marqueeImageUrl || "";
        const linkUrl = button.dataset.marqueeLinkUrl || "";
        const resultNode = app.querySelector("[data-marquee-result]");
        const toastNode = app.querySelector("[data-marquee-toast]");
        const showToast = (message) => {
          if (toastNode) {
            toastNode.textContent = message;
            toastNode.hidden = false;
            clearTimeout(showToast.timer);
            showToast.timer = setTimeout(() => { toastNode.hidden = true; }, 1800);
          }
        };
        if (resultNode) resultNode.hidden = true;
        showToast("處理中...");
        const actionResponse = await fetch(`${api}/api/marquee/reward`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lineUserId: uid, imageId, imageUrl })
        });
        const actionResult = await actionResponse.json().catch(() => ({}));
        if (!actionResponse.ok || !actionResult.success) {
          showToast(actionResult.message || "贈點失敗");
          alert(actionResult.message || "贈點失敗");
          return;
        }
        const message = actionResult.awarded ? `已贈點 +${actionResult.points || 1}` : "今日已領取此圖片點數";
        showToast(message);
        if (linkUrl) setTimeout(() => { location.href = linkUrl; }, 650);
      });
    });
    app.querySelectorAll("[data-marquee-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.marqueeAction;
        const label = button.textContent;
        button.disabled = true;
        if (action === "checkin") {
          const firstItem = marqueeItems(config).find((item) => item.enabled !== false) || {};
          const actionResponse = await fetch(`${api}/api/marquee/reward`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              lineUserId: uid,
              imageId: firstItem.id || "system-checkin",
              imageUrl: firstItem.imageUrl || "",
              linkUrl: "",
              action: "checkin"
            })
          });
          const actionResult = await actionResponse.json().catch(() => ({}));
          if (!actionResponse.ok || !actionResult.success) {
            resultNode.hidden = false;
            resultNode.textContent = actionResult.message || "系統簽到失敗";
            return;
          }
          resultNode.hidden = false;
          resultNode.textContent = `系統簽到完成，餘額 ${actionResult.balanceAfter ?? actionResult.balance ?? "-"}`;
          return;
        }
        button.textContent = "送出中...";
        const endpoint = "/api/marquee/points";
        const actionResponse = await fetch(`${api}${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lineUserId: uid })
        });
        const actionResult = await actionResponse.json().catch(() => ({}));
        button.disabled = false;
        button.textContent = label;
        if (!actionResponse.ok || !actionResult.success) return alert(actionResult.message || "點數查詢失敗");
        const resultNode = app.querySelector("[data-marquee-result]");
        if (resultNode) {
          resultNode.hidden = false;
          resultNode.innerHTML = marqueePointDetailHtml(actionResult);
        }
        alert(message);
      });
    });
  }
  if (formId) showRegister(formId);
  else if (checkinToken) showCheckin(checkinToken);
  else if (redeemToken) showRedeem(redeemToken);
  else if (queryMode) showMyRegistrations();
  else if (memberQrMode) showMemberQr();
  else if (calendarMode) showCalendar();
  else if (marqueeMode) showMarquee();
})();

