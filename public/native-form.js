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
  const liffId = "2005868456-cfANNVou";
  const calendarId = "7d66f2a96f192dda6cca2b04e60a6e549c7adf74f57721845d5b7e03f8b7ca89@group.calendar.google.com";
  let liffReady = null;
  let lineUserId = "";

  if (!app || (!formId && !checkinToken && !redeemToken && !queryMode && !memberQrMode && !calendarMode && !marqueeMode)) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const trim = (value) => String(value ?? "").trim();
  const fieldTypes = new Set(["text", "email", "paragraph", "radio", "checkbox", "dropdown"]);
  const autoMemberKeys = new Set(["line_user_id", "lineuserid", "lineid", "line_id", "lineuid", "line_uid", "uid", "name", "phone", "mobile", "email", "company", "memberno", "gender", "ismember", "membertype"]);

  function mergedParams() {
    const output = new URLSearchParams(location.search);
    const state = output.get("liff.state");
    if (!state) return output;
    let raw = state;
    try { raw = decodeURIComponent(state); } catch (_) {}
    const query = raw.startsWith("?") ? raw.slice(1) : raw.includes("?") ? raw.split("?").slice(1).join("?") : raw;
    new URLSearchParams(query).forEach((value, key) => {
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
      .nf-marquee-square{width:min(100%,800px);aspect-ratio:1/1;margin:0 auto;border-radius:16px;overflow:hidden;background:#f8fafc;display:grid;place-items:center;border:1px solid #e4e7ec}
      .nf-marquee-square img{width:100%;height:100%;object-fit:cover}
      .nf-marquee-buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      @media(max-width:640px){.nf-title{font-size:24px}.nf-body{padding:18px}.nf-actions{display:grid}.nf-btn{width:100%}}
      @media(max-width:640px){.nf-query-body{grid-template-columns:1fr}.nf-query-qr{justify-items:start;text-align:left}.nf-query-qr .nf-qr{width:180px;height:180px}}
    `;
    document.head.appendChild(style);
  }

  function renderShell(content) {
    installStyle();
    app.innerHTML = `<main class="nf-shell">${content}</main>`;
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

  function fieldHtml(field) {
    if (isAutoMemberField(field)) return "";
    const type = fieldTypes.has(field.type) ? field.type : "text";
    const label = `${esc(field.label || field.key)}${field.required ? ' <span class="nf-required">*</span>' : ""}`;
    const name = esc(field.key);
    if (type === "paragraph") return `<div class="nf-field"><label>${label}</label><textarea name="${name}" ${field.required ? "required" : ""}></textarea></div>`;
    if (type === "dropdown") {
      const options = Array.isArray(field.options) ? field.options : [];
      return `<div class="nf-field"><label>${label}</label><select name="${name}" ${field.required ? "required" : ""}><option value="">請選擇</option>${options.map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`).join("")}</select></div>`;
    }
    if (type === "radio") {
      const options = Array.isArray(field.options) ? field.options : [];
      return `<div class="nf-field"><label>${label}</label><div class="nf-choice">${options.map((opt) => `<label><input type="radio" name="${name}" value="${esc(opt)}" ${field.required ? "required" : ""}>${esc(opt)}</label>`).join("")}</div></div>`;
    }
    if (type === "checkbox") {
      const options = Array.isArray(field.options) ? field.options : [];
      return `<div class="nf-field" data-checkbox-field="${name}" data-required="${field.required ? "1" : "0"}"><label>${label}</label><div class="nf-choice">${options.map((opt) => `<label><input type="checkbox" name="${name}" value="${esc(opt)}">${esc(opt)}</label>`).join("")}</div></div>`;
    }
    return `<div class="nf-field"><label>${label}</label><input name="${name}" type="${type === "email" ? "email" : "text"}" ${field.required ? "required" : ""}></div>`;
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

  function sessionFieldHtml(sessions) {
    return sessions.length > 1
      ? `<div class="nf-field"><label>場次 <span class="nf-required">*</span></label><select name="sessionId" required>${sessions.map((session) => `<option value="${esc(session.id)}">${esc(session.name || "場次")}${session.startTime ? ` ${esc(session.startTime)}` : ""}</option>`).join("")}</select></div>`
      : `<input type="hidden" name="sessionId" value="${esc(sessions[0]?.id || "default")}">`;
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

  function loginRegisterPanel(mode, sessions) {
    if (mode !== "member_login" && mode !== "mixed") return "";
    return `<form class="nf-form nf-login-box" data-login-register-box novalidate>
      <div class="nf-ok">會員或廠商會員可使用 LINE 快速報名。系統會取得 LINE UID 並比對名冊，不需要手動填 LINE ID。</div>
      <div data-login-member-area></div>
      ${sessionFieldHtml(sessions)}
      <div class="nf-actions"><button class="nf-btn primary" type="button" data-login-register>會員/廠商快速報名</button></div>
    </form>`;
  }

  function loadLiff(options = {}) {
    if (liffReady) return liffReady;
    liffReady = new Promise((resolve) => {
      const finish = (value = "") => { lineUserId = value || lineUserId; resolve(lineUserId); };
      const init = async () => {
        try {
          await window.liff?.init?.({ liffId });
          if (window.liff?.isLoggedIn?.()) {
            const profile = await window.liff.getProfile();
            finish(profile?.userId || "");
            return;
          }
          if (options.login && window.liff?.login && location.hostname.includes("liff.line.me")) {
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
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">報名成功</h1>
      <div class="nf-ok">已完成報名。查詢碼：${esc(data.queryCode || "")}</div>
      ${qrUrl ? `<img class="nf-qr" src="${qrUrl}" alt="核銷 QR Code">` : ""}
      <div class="nf-actions">
        <a class="nf-btn" href="?query=1&code=${encodeURIComponent(data.queryCode || "")}">查詢或取消報名</a>
        <button class="nf-btn primary" data-close-window>完成</button>
      </div>
    </div></section>`);
    setTimeout(() => alert("報名成功"), 50);
    app.querySelector("[data-close-window]")?.addEventListener("click", closeWindow);
    setTimeout(closeWindow, 1800);
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
    const showFullForm = mode === "form" || mode === "mixed";

    renderShell(`<section class="nf-card">
      ${image ? `<img class="nf-hero" src="${esc(image)}" alt="${esc(activity.name || "")}">` : ""}
      <div class="nf-body">
        <h1 class="nf-title">${esc(activity.name || "活動報名")}</h1>
        <div class="nf-meta">${activity.courseTime ? `<span class="nf-pill">${esc(activity.courseTime)}</span>` : ""}${activity.deadline ? `<span class="nf-pill">截止 ${esc(activity.deadline)}</span>` : ""}</div>
        ${activity.detailText ? `<div class="nf-detail">${esc(activity.detailText)}</div>` : ""}
        ${loginRegisterPanel(mode, sessions)}
        ${showFullForm ? `<form class="nf-form" data-native-register novalidate>
          ${sessionFieldHtml(sessions)}
          ${fields.map(fieldHtml).join("")}
          <div class="nf-actions"><button class="nf-btn primary" type="submit">送出報名</button><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>
        </form>` : `<div class="nf-actions"><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>`}
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
      loginButton.textContent = "送出中...";
      const submitResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}/login-register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineUserId: uid, sessionId, answers: {} })
      });
      const submitResult = await submitResponse.json().catch(() => ({}));
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
      const claimError = missingMemberClaimIdentity(answers);
      if (claimError) {
        submit.disabled = false;
        submit.textContent = "送出報名";
        return alert(claimError);
      }
      const payload = { sessionId: registerForm.elements.sessionId?.value || "default", lineUserId: uid || "", answers };
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

  function registrationCard(row) {
    const activity = row.activity || {};
    const title = activity.name || row.formId || "活動報名";
    const submittedAt = row.submittedAt ? new Date(row.submittedAt).toLocaleString("zh-TW", { hour12: false }) : "";
    const checkedInAt = row.checkedInAt ? new Date(row.checkedInAt).toLocaleString("zh-TW", { hour12: false }) : "";
    const checkinUrl = row.checkinUrl || (row.checkinToken ? `${api || location.origin}?checkin=${encodeURIComponent(row.checkinToken)}` : "");
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
          ${lines || `<div>已找到報名紀錄。</div>`}
          ${row.status === "cancelled" ? "" : `<div class="nf-actions" style="margin-top:10px"><button class="nf-btn danger" data-cancel-registration="${esc(row.id)}" data-query-code="${esc(row.queryCode || "")}">取消報名</button></div>`}
        </div>
        ${qrUrl ? `<div class="nf-query-qr"><img class="nf-qr" src="${qrUrl}" alt="核銷 QR Code"><span>活動核銷 QR</span></div>` : ""}
      </div>
    </article>`;
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
      bindCancel(box, () => runCodeQuery(code));
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
      bindCancel(box, runLoginQuery);
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
    const response = await fetch(`${api}/api/native-checkin/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "核銷資料無效");
    const row = result.data || {};
    const answers = row.answers || {};
    const adminEmail = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">活動報到核銷</h1>
      <div class="${row.checkedInAt ? "nf-ok" : "nf-alert"}">${row.checkedInAt ? `已報到：${esc(row.checkedInAt)}` : "尚未報到"}</div>
      <table class="nf-table"><tbody>${Object.entries(answers).map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(Array.isArray(value) ? value.join(", ") : value)}</td></tr>`).join("")}</tbody></table>
      <div class="nf-field"><label>管理者 Email</label><input data-admin-email value="${esc(adminEmail)}"></div>
      <div class="nf-actions"><button class="nf-btn primary" data-confirm-checkin>確認報到</button></div>
    </div></section>`);
    app.querySelector("[data-confirm-checkin]")?.addEventListener("click", async () => {
      const email = app.querySelector("[data-admin-email]")?.value?.trim() || "";
      if (email) localStorage.setItem("tdea-admin-email", email);
      const confirmResponse = await fetch(`${api}/api/native-checkin/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-email": email },
        body: JSON.stringify({ token })
      });
      const confirmResult = await confirmResponse.json().catch(() => ({}));
      if (!confirmResponse.ok || !confirmResult.success) return alert(confirmResult.message || "核銷失敗");
      alert("報到成功");
      showCheckin(token);
    });
  }

  async function showRedeem(token) {
    renderLoading("讀取折抵資料...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE LIFF 開啟。");
    const response = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "折抵連結無效");
    const data = result.data || {};
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">點數折抵</h1>
      <div class="nf-ok">${esc(data.vendorName || "合作店家")}</div>
      <div class="nf-detail">本次折抵點數：${esc(data.points || data.maxPoints || 0)}</div>
      <div class="nf-actions"><button class="nf-btn primary" data-redeem-confirm>確認折抵</button></div>
    </div></section>`);
    app.querySelector("[data-redeem-confirm]")?.addEventListener("click", async () => {
      const confirmResponse = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}/use`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineUserId: uid })
      });
      const confirmResult = await confirmResponse.json().catch(() => ({}));
      if (!confirmResponse.ok || !confirmResult.success) return alert(confirmResult.message || "折抵失敗");
      alert("折抵完成");
      closeWindow();
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

  async function showMarquee() {
    renderLoading("載入跑馬燈...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE LIFF 開啟。");
    const response = await fetch(`${api}/api/marquee`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "跑馬燈資料讀取失敗");
    const config = result.data || {};
    if (config.enabled === false) return renderError("跑馬燈尚未啟用。");
    const left = config.left || {};
    const right = config.right || {};
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">${esc(config.title || "TDEA 跑馬燈")}</h1>
      <div class="nf-marquee-square">${config.imageUrl ? `<img src="${esc(config.imageUrl)}" alt="">` : "<span>尚未設定圖片</span>"}</div>
      <div class="nf-marquee-buttons">
        <button class="nf-btn primary" data-marquee-side="left" ${left.enabled === false ? "disabled" : ""}>${esc(left.label || "左側簽到")}</button>
        <button class="nf-btn primary" data-marquee-side="right" ${right.enabled === false ? "disabled" : ""}>${esc(right.label || "右側簽到")}</button>
      </div>
      <div class="nf-ok" data-marquee-result hidden></div>
    </div></section>`);
    app.querySelectorAll("[data-marquee-side]").forEach((button) => {
      button.addEventListener("click", async () => {
        const side = button.dataset.marqueeSide;
        const label = button.textContent;
        button.disabled = true;
        button.textContent = "送出中...";
        const rewardResponse = await fetch(`${api}/api/marquee/reward`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lineUserId: uid, side })
        });
        const rewardResult = await rewardResponse.json().catch(() => ({}));
        button.disabled = false;
        button.textContent = label;
        if (!rewardResponse.ok || !rewardResult.success) return alert(rewardResult.message || "贈點失敗");
        const resultNode = app.querySelector("[data-marquee-result]");
        if (resultNode) {
          resultNode.hidden = false;
          resultNode.textContent = `已完成簽到贈點：+${rewardResult.points || 1}`;
        }
        alert(`已完成簽到贈點：+${rewardResult.points || 1}`);
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
