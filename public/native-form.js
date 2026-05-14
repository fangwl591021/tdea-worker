(() => {
  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const params = mergedParams();
  const formId = params.get("register");
  const checkinToken = params.get("checkin");
  const redeemToken = params.get("redeemSession") || params.get("redeem");
  const queryMode = params.has("query");
  const memberQrMode = params.has("memberQr");
  const app = document.querySelector("#app");
  const liffId = "2005868456-2jmxqyFU";
  let liffReady = null;
  let lineUserId = "";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const trim = (value) => String(value ?? "").trim();
  const fieldTypes = new Set(["text", "email", "paragraph", "radio", "checkbox", "dropdown"]);

  if (!app || (!formId && !checkinToken && !redeemToken && !queryMode && !memberQrMode)) return;

  function mergedParams() {
    const output = new URLSearchParams(location.search);
    const state = output.get("liff.state");
    if (!state) return output;
    let raw = state;
    try { raw = decodeURIComponent(state); } catch (_) {}
    const query = raw.startsWith("?") ? raw.slice(1) : raw.includes("?") ? raw.split("?").slice(1).join("?") : raw;
    const stateParams = new URLSearchParams(query);
    stateParams.forEach((value, key) => {
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
      .nf-alert{border-radius:8px;padding:12px 14px;background:#fff3f0;border:1px solid #fecdca;color:#b42318;font-weight:800}
      .nf-ok{border-radius:8px;padding:12px 14px;background:#ecfdf3;border:1px solid #abefc6;color:#067647;font-weight:800}
      .nf-table{width:100%;border-collapse:collapse}.nf-table th,.nf-table td{border-bottom:1px solid #eaecf0;padding:10px;text-align:left;vertical-align:top}
      .nf-qr{width:220px;height:220px;border:1px solid #e4e7ec;border-radius:8px;background:#fff}
      @media(max-width:640px){.nf-title{font-size:24px}.nf-body{padding:18px}.nf-actions{display:grid}.nf-btn{width:100%}}
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

  function fieldHtml(field) {
    const type = fieldTypes.has(field.type) ? field.type : "text";
    const label = `${esc(field.label || field.key)}${field.required ? ' <span class="nf-required">*</span>' : ""}`;
    const name = esc(field.key);
    if (type === "paragraph") return `<div class="nf-field"><label>${label}</label><textarea name="${name}" ${field.required ? "required" : ""}></textarea></div>`;
    if (type === "radio" || type === "dropdown") {
      const options = Array.isArray(field.options) ? field.options : [];
      if (type === "dropdown") {
        return `<div class="nf-field"><label>${label}</label><select name="${name}" ${field.required ? "required" : ""}><option value="">請選擇</option>${options.map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`).join("")}</select></div>`;
      }
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
      if (field.type === "checkbox") {
        answers[field.key] = [...form.querySelectorAll(`[name="${CSS.escape(field.key)}"]:checked`)].map((node) => node.value);
      } else {
        answers[field.key] = trim(form.elements[field.key]?.value);
      }
    }
    return answers;
  }

  function validateCheckboxes(form) {
    for (const block of form.querySelectorAll("[data-checkbox-field][data-required='1']")) {
      const key = block.dataset.checkboxField;
      if (!key || form.querySelectorAll(`[name="${CSS.escape(key)}"]:checked`).length) continue;
      return `${block.querySelector("label")?.textContent?.replace("*", "").trim() || "複選欄位"} 為必填`;
    }
    return "";
  }

  function renderReceipt(result) {
    const data = result.data || {};
    const checkinUrl = data.checkinUrl || "";
    const qrUrl = checkinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkinUrl)}` : "";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">報名完成</h1>
      <div class="nf-ok">請保存查詢碼：${esc(data.queryCode || "")}</div>
      ${qrUrl ? `<img class="nf-qr" src="${qrUrl}" alt="核銷 QR Code">` : ""}
      <div class="nf-actions">
        <a class="nf-btn" href="?query=1&code=${encodeURIComponent(data.queryCode || "")}">查詢或取消報名</a>
        <button class="nf-btn primary" data-close-window>完成</button>
      </div>
    </div></section>`);
    app.querySelector("[data-close-window]")?.addEventListener("click", () => {
      closeWindow();
    });
    setTimeout(closeWindow, 900);
  }

  function closeWindow() {
    if (window.liff?.closeWindow) {
      try { window.liff.closeWindow(); return; } catch (_) {}
    }
    if (location.hostname.includes("liff.line.me")) return;
    window.close();
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
      if (window.liff) {
        init();
        return;
      }
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
    renderShell(`<section class="nf-card">
      ${image ? `<img class="nf-hero" src="${esc(image)}" alt="${esc(activity.name || "")}">` : ""}
      <div class="nf-body">
        <h1 class="nf-title">${esc(activity.name || "活動報名")}</h1>
        <div class="nf-meta">${activity.courseTime ? `<span class="nf-pill">${esc(activity.courseTime)}</span>` : ""}${activity.deadline ? `<span class="nf-pill">截止 ${esc(activity.deadline)}</span>` : ""}</div>
        ${activity.detailText ? `<div class="nf-detail">${esc(activity.detailText)}</div>` : ""}
        <form class="nf-form" data-native-register>
          ${sessions.length > 1 ? `<div class="nf-field"><label>梯次 <span class="nf-required">*</span></label><select name="sessionId" required>${sessions.map((session) => `<option value="${esc(session.id)}">${esc(session.name)}${session.startTime ? `｜${esc(session.startTime)}` : ""}</option>`).join("")}</select></div>` : `<input type="hidden" name="sessionId" value="${esc(sessions[0]?.id || "default")}">`}
          ${fields.map(fieldHtml).join("")}
          <div class="nf-actions"><button class="nf-btn primary" type="submit">送出報名</button><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>
        </form>
      </div>
    </section>`);
    const registerForm = app.querySelector("[data-native-register]");
    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const checkboxError = validateCheckboxes(registerForm);
      if (checkboxError) return alert(checkboxError);
      const submit = registerForm.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "送出中...";
      const uid = await loadLiff();
      const payload = { sessionId: registerForm.elements.sessionId?.value || "default", lineUserId: uid || "", answers: collectAnswers(registerForm, fields) };
      const submitResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
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
    if (row.checkedInAt) return "已報到";
    return "已報名";
  }

  function registrationCard(row) {
    const activity = row.activity || {};
    const answers = row.answers || {};
    return `<article class="nf-card" style="box-shadow:none">
      <div class="nf-body">
        <div class="nf-meta"><span class="nf-pill">${esc(registrationStatus(row))}</span>${row.submittedAt ? `<span class="nf-pill">${esc(new Date(row.submittedAt).toLocaleString("zh-TW", { hour12: false }))}</span>` : ""}</div>
        <h2 class="nf-title" style="font-size:22px">${esc(activity.name || row.formId || "活動報名")}</h2>
        ${activity.courseTime ? `<div class="nf-detail">活動時間：${esc(activity.courseTime)}</div>` : ""}
        <table class="nf-table"><tbody>${Object.entries(answers).filter(([key]) => key !== "LINE_user_id").map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(Array.isArray(value) ? value.join(", ") : value)}</td></tr>`).join("")}</tbody></table>
        ${row.status === "cancelled" ? "" : `<div class="nf-actions"><button class="nf-btn danger" data-cancel-registration="${esc(row.id)}" data-query-code="${esc(row.queryCode || "")}">取消報名</button></div>`}
      </div>
    </article>`;
  }

  async function showMyRegistrations() {
    const initialCode = params.get("code") || "";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">我的活動報名</h1>
      <div data-my-query-result><div class="nf-ok">正在讀取 LINE 登入資料...</div></div>
      <details>
        <summary>使用查詢碼查詢</summary>
        <form class="nf-form" data-query-form style="margin-top:14px">
          <div class="nf-field"><label>查詢碼</label><input name="code" value="${esc(initialCode)}"></div>
          <div class="nf-actions"><button class="nf-btn" type="submit">查詢</button></div>
        </form>
      </details>
    </div></section>`);

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
        box.innerHTML = `<div class="nf-alert">請從 LINE LIFF 開啟此頁，系統才能自動查詢你的報名紀錄。</div>`;
        return;
      }
      box.innerHTML = `<div class="nf-ok">正在查詢你的報名紀錄...</div>`;
      const response = await fetch(`${api}/api/native-registrations/me?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        box.innerHTML = `<div class="nf-alert">${esc(result.message || "查詢失敗")}</div>`;
        return;
      }
      const rows = Array.isArray(result.data) ? result.data : [];
      box.innerHTML = rows.length ? `<div class="nf-form">${rows.map(registrationCard).join("")}</div>` : `<div class="nf-alert">目前沒有查到此 LINE 帳號的報名紀錄。</div>`;
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

  async function showQuery() {
    const initialCode = params.get("code") || "";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">報名查詢/取消</h1>
      <form class="nf-form" data-query-form>
        <div class="nf-field"><label>查詢碼</label><input name="code" value="${esc(initialCode)}" required></div>
        <div class="nf-actions"><button class="nf-btn primary" type="submit">查詢</button></div>
      </form>
      <div data-query-result></div>
    </div></section>`);
    async function runQuery(code) {
      const box = app.querySelector("[data-query-result]");
      box.innerHTML = `<div class="nf-ok">查詢中...</div>`;
      const response = await fetch(`${api}/api/native-registrations/query?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        box.innerHTML = `<div class="nf-alert">${esc(result.message || "查無資料")}</div>`;
        return;
      }
      const row = result.data || {};
      const answers = row.answers || {};
      box.innerHTML = `<div class="nf-ok">狀態：${esc(row.status === "cancelled" ? "已取消" : row.checkedInAt ? "已核銷" : "報名成功")}</div>
        <table class="nf-table"><tbody>${Object.entries(answers).map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(Array.isArray(value) ? value.join(", ") : value)}</td></tr>`).join("")}</tbody></table>
        ${row.status === "cancelled" ? "" : `<div class="nf-actions"><button class="nf-btn danger" data-cancel-registration="${esc(row.id)}">取消報名</button></div>`}`;
      box.querySelector("[data-cancel-registration]")?.addEventListener("click", async (event) => {
        if (!confirm("確定取消這筆報名？")) return;
        const cancelResponse = await fetch(`${api}/api/native-registrations/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ registrationId: event.currentTarget.dataset.cancelRegistration, queryCode: code }) });
        const cancelResult = await cancelResponse.json().catch(() => ({}));
        if (!cancelResponse.ok || !cancelResult.success) return alert(cancelResult.message || "取消失敗");
        runQuery(code);
      });
    }
    app.querySelector("[data-query-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      runQuery(event.currentTarget.elements.code.value.trim());
    });
    if (initialCode) runQuery(initialCode);
  }

  async function showCheckin(token) {
    renderLoading("讀取核銷資料...");
    const response = await fetch(`${api}/api/native-checkin/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "核銷碼無效");
    const row = result.data || {};
    const answers = row.answers || {};
    const pointResults = Array.isArray(row.pointResults) ? row.pointResults : [];
    const pointHtml = pointResults.length ? `<div class="nf-detail"><strong>點數同步結果</strong><br>${pointResults.map((item) => `${item?.success ? "成功" : "未完成"}：${item?.message || item?.code || item?.get_point || ""}`).map(esc).join("<br>")}</div>` : "";
    const adminEmail = localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">報到核銷</h1>
      <div class="${row.checkedInAt ? "nf-ok" : "nf-alert"}">${row.checkedInAt ? `已核銷：${esc(row.checkedInAt)}` : "尚未核銷"}</div>
      <table class="nf-table"><tbody>${Object.entries(answers).map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(Array.isArray(value) ? value.join(", ") : value)}</td></tr>`).join("")}</tbody></table>
      ${pointHtml}
      <div class="nf-field"><label>管理者 Email</label><input data-admin-email value="${esc(adminEmail)}"></div>
      <div class="nf-actions"><button class="nf-btn primary" data-confirm-checkin>確認核銷</button></div>
    </div></section>`);
    app.querySelector("[data-confirm-checkin]")?.addEventListener("click", async () => {
      const email = app.querySelector("[data-admin-email]")?.value?.trim() || "";
      if (email) localStorage.setItem("tdea-admin-email", email);
      const confirmResponse = await fetch(`${api}/api/native-checkin/confirm`, { method: "POST", headers: { "content-type": "application/json", "x-admin-email": email }, body: JSON.stringify({ token }) });
      const confirmResult = await confirmResponse.json().catch(() => ({}));
      if (!confirmResponse.ok || !confirmResult.success) return alert(confirmResult.message || "核銷失敗");
      showCheckin(token);
    });
  }

  async function showRedeem(token) {
    renderLoading("正在讀取折抵授權...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("請從 LINE LIFF 開啟此頁，系統才能確認會員身分。");
    const loadRedeem = async () => {
      const response = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) return renderError(result.message || "折抵碼無效");
      const row = result.data || {};
      const expired = row.status === "expired";
      const used = row.status === "used";
      renderShell(`<section class="nf-card"><div class="nf-body">
        <h1 class="nf-title">確認點數折抵</h1>
        <div class="${row.status === "pending" ? "nf-ok" : "nf-alert"}">${esc(used ? "此折抵碼已使用" : expired ? "此折抵碼已過期" : "請確認是否同意扣點")}</div>
        <table class="nf-table"><tbody>
          <tr><th>合作店家</th><td>${esc(row.vendorName || "")}</td></tr>
          <tr><th>消費金額</th><td>${esc(row.amount || 0)}</td></tr>
          <tr><th>折抵點數</th><td>${esc(row.points || 0)} 點</td></tr>
          <tr><th>目前點數</th><td>${row.balance === undefined ? "查詢中" : `${esc(row.balance)} 點`}</td></tr>
          <tr><th>有效期限</th><td>${esc(row.expiresAt ? new Date(row.expiresAt).toLocaleString("zh-TW", { hour12: false }) : "")}</td></tr>
          ${row.note ? `<tr><th>備註</th><td>${esc(row.note)}</td></tr>` : ""}
        </tbody></table>
        <div class="nf-actions">${row.status === "pending" ? `<button class="nf-btn primary" data-confirm-redeem>確認折抵</button>` : ""}</div>
      </div></section>`);
      app.querySelector("[data-confirm-redeem]")?.addEventListener("click", async () => {
        if (!confirm(`確認扣抵 ${row.points || 0} 點？`)) return;
        const confirmResponse = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lineUserId: uid })
        });
        const confirmResult = await confirmResponse.json().catch(() => ({}));
        if (!confirmResponse.ok || !confirmResult.success) return alert(confirmResult.message || "折抵失敗");
        const done = confirmResult.data || {};
        renderShell(`<section class="nf-card"><div class="nf-body">
          <h1 class="nf-title">折抵完成</h1>
          <div class="nf-ok">已成功扣抵 ${esc(done.points || row.points || 0)} 點。</div>
          <table class="nf-table"><tbody><tr><th>合作店家</th><td>${esc(done.vendorName || row.vendorName || "")}</td></tr><tr><th>剩餘點數</th><td>${esc(done.balance ?? "")}</td></tr></tbody></table>
          <div class="nf-actions"><button class="nf-btn primary" data-close-window>完成</button></div>
        </div></section>`);
        app.querySelector("[data-close-window]")?.addEventListener("click", closeWindow);
      });
    };
    await loadRedeem();
  }

  function extractLineUserId(value) {
    const raw = trim(value);
    if (!raw) return "";
    if (/^U[a-f0-9]{32}$/i.test(raw)) return raw;
    try {
      const url = new URL(raw);
      return trim(url.searchParams.get("lineUserId") || url.searchParams.get("uid") || url.searchParams.get("userId") || url.searchParams.get("line_user_id"));
    } catch (_) {
      const match = raw.match(/U[a-f0-9]{32}/i);
      return match ? match[0] : raw;
    }
  }

  async function openCodeScanner(onValue) {
    if (window.liff?.scanCodeV2) {
      try {
        const result = await window.liff.scanCodeV2();
        const value = result?.value || result?.text || result;
        if (value) onValue(String(value));
        return;
      } catch (error) {
        if (error?.code !== "USER_CANCEL") alert(error?.message || "LINE 掃描器開啟失敗，請改用手動輸入。");
      }
    }
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      const manual = prompt("此裝置不支援網頁掃描器，請貼上會員 QR 內容或 LINE UID");
      if (manual) onValue(manual);
      return;
    }
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.92);z-index:9999;display:grid;place-items:center;padding:18px";
    overlay.innerHTML = `<div style="width:min(480px,100%);display:grid;gap:12px"><video playsinline style="width:100%;border-radius:12px;background:#000"></video><button class="nf-btn" type="button">關閉掃描器</button></div>`;
    document.body.appendChild(overlay);
    const video = overlay.querySelector("video");
    let stream = null;
    let stopped = false;
    const close = () => {
      stopped = true;
      stream?.getTracks?.().forEach((track) => track.stop());
      overlay.remove();
    };
    overlay.querySelector("button")?.addEventListener("click", close);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (codes?.length) {
            const value = codes[0].rawValue || codes[0].rawValueText || "";
            close();
            if (value) onValue(value);
            return;
          }
        } catch (_) {}
        requestAnimationFrame(tick);
      };
      tick();
    } catch (error) {
      close();
      const manual = prompt("相機無法開啟，請貼上會員 QR 內容或 LINE UID");
      if (manual) onValue(manual);
    }
  }

  async function showVendorRedeem(token) {
    renderLoading("載入店家扣點工作台...");
    let session = null;
    let selectedMember = "";

    async function loadSession(lineUserId = "") {
      const query = lineUserId ? `?lineUserId=${encodeURIComponent(lineUserId)}` : "";
      const response = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}${query}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "店家授權不存在或已失效");
      return result.data || {};
    }

    function statusText(status) {
      if (status === "active" || status === "pending") return "授權有效";
      if (status === "expired") return "授權已過期";
      if (status === "closed") return "授權已關閉";
      return status || "-";
    }
    function modeText(mode) {
      if (mode === "manual") return "店家現場輸入點數";
      if (mode === "rate") return "依消費金額換算點數";
      return "固定點數";
    }
    function computedPoints() {
      if (!session) return 0;
      if (session.mode === "manual") return Number(app.querySelector("[data-redeem-points]")?.value || 0);
      if (session.mode === "rate") {
        const amount = Number(app.querySelector("[data-redeem-amount]")?.value || 0);
        return Math.floor(amount * Number(session.pointRate || 0));
      }
      return Number(session.points || 0);
    }

    function render() {
      const active = session?.status === "active" || session?.status === "pending";
      const tx = Array.isArray(session?.transactions) ? session.transactions : [];
      const pointInput = selectedMember && session?.mode === "manual" ? `<div class="nf-field"><label>本次扣抵點數</label><input data-redeem-points type="number" min="0" step="1" placeholder="請輸入本次扣點"></div>` : "";
      const amountInput = selectedMember && session?.mode === "rate" ? `<div class="nf-field"><label>本次消費金額</label><input data-redeem-amount type="number" min="0" step="1" placeholder="輸入金額後自動換算點數"></div>` : "";
      const noteInput = selectedMember ? `<div class="nf-field"><label>本次備註</label><input data-redeem-note placeholder="選填，例如桌號、單號、品項"></div>` : "";
      renderShell(`<section class="nf-card"><div class="nf-body">
        <h1 class="nf-title">店家扣點工作台</h1>
        <div class="${active ? "nf-ok" : "nf-alert"}">${esc(statusText(session?.status))}</div>
        <table class="nf-table"><tbody>
          <tr><th>合作店家</th><td>${esc(session?.vendorName || "")}</td></tr>
          <tr><th>扣點模式</th><td>${esc(modeText(session?.mode))}</td></tr>
          <tr><th>固定點數 / 上限</th><td>${esc(session?.points || 0)} / ${esc(session?.maxPoints || 0)} 點</td></tr>
          <tr><th>授權期間</th><td>${esc(session?.startsAt ? new Date(session.startsAt).toLocaleString("zh-TW", { hour12: false }) : "")}<br>${esc(session?.expiresAt ? new Date(session.expiresAt).toLocaleString("zh-TW", { hour12: false }) : "")}</td></tr>
          ${session?.note ? `<tr><th>備註</th><td>${esc(session.note)}</td></tr>` : ""}
        </tbody></table>
        ${active ? `<div class="nf-actions"><button class="nf-btn primary" data-scan-member>掃描會員 QR</button><button class="nf-btn" data-manual-member>手動輸入 UID</button></div>` : ""}
        <div class="nf-field"><label>會員 LINE UID</label><input data-member-uid value="${esc(selectedMember)}" placeholder="掃描會員 QR 後會自動填入"></div>
        ${selectedMember ? `<div class="nf-ok">目前會員點數：${session?.balance === undefined ? "查詢中" : `${esc(session.balance)} 點`}</div>${amountInput}${pointInput}${noteInput}<div class="nf-actions"><button class="nf-btn primary" data-confirm-redeem ${active ? "" : "disabled"}>確認扣點</button></div>` : ""}
        <div class="nf-detail"><strong>扣點紀錄</strong><br>${tx.length ? tx.map((row) => `${new Date(row.createdAt).toLocaleString("zh-TW", { hour12: false })}｜${row.lineUserId}｜${row.amount ? `${row.amount} 元｜` : ""}${row.points} 點｜餘額 ${row.balanceAfter ?? ""}`).map(esc).join("<br>") : "尚無扣點紀錄"}</div>
      </div></section>`);
      app.querySelector("[data-member-uid]")?.addEventListener("change", async (event) => {
        selectedMember = extractLineUserId(event.currentTarget.value);
        await refreshMember();
      });
      app.querySelector("[data-scan-member]")?.addEventListener("click", () => openCodeScanner(async (value) => {
        selectedMember = extractLineUserId(value);
        await refreshMember();
      }));
      app.querySelector("[data-manual-member]")?.addEventListener("click", async () => {
        const value = prompt("請輸入會員 LINE UID 或貼上會員 QR 內容", selectedMember);
        if (!value) return;
        selectedMember = extractLineUserId(value);
        await refreshMember();
      });
      app.querySelector("[data-confirm-redeem]")?.addEventListener("click", confirmRedeem);
    }

    async function refreshMember() {
      try {
        session = await loadSession(selectedMember);
        render();
      } catch (error) {
        renderError(error.message);
      }
    }

    async function confirmRedeem() {
      const uid = extractLineUserId(app.querySelector("[data-member-uid]")?.value || selectedMember);
      if (!uid) return alert("請先掃描會員 QR 或輸入會員 LINE UID");
      const amount = Number(app.querySelector("[data-redeem-amount]")?.value || 0);
      const points = computedPoints();
      const note = trim(app.querySelector("[data-redeem-note]")?.value || "");
      if (!points) return alert("請輸入有效的扣抵點數或消費金額");
      if (session?.maxPoints && points > Number(session.maxPoints)) return alert(`本授權單次最多可扣 ${session.maxPoints} 點`);
      if (!confirm(`確認扣除 ${points} 點？`)) return;
      const response = await fetch(`${api}/api/redeem/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineUserId: uid, amount, points, note })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) return alert(result.message || "扣點失敗");
      selectedMember = "";
      session = result.data || await loadSession();
      render();
      alert("扣點完成");
    }

    try {
      session = await loadSession();
      render();
    } catch (error) {
      renderError(error.message);
    }
  }

  async function showMemberQr() {
    renderLoading("正在開啟會員 QR...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("請從 LINE LIFF 開啟此頁，系統才能取得會員身分。");
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(uid)}`;
    renderShell(`<section class="nf-card"><div class="nf-body">
      <h1 class="nf-title">TDEA 會員 QR</h1>
      <div class="nf-ok">請把這個 QR 給合作店家掃描，店家端確認後才會扣點。</div>
      <img class="nf-qr" src="${qr}" alt="會員 QR" style="width:260px;height:260px">
      <table class="nf-table"><tbody><tr><th>LINE UID</th><td>${esc(uid)}</td></tr></tbody></table>
      <div class="nf-actions"><button class="nf-btn primary" data-close-window>完成</button></div>
    </div></section>`);
    app.querySelector("[data-close-window]")?.addEventListener("click", closeWindow);
  }

  if (formId) showRegister(formId);
  else if (checkinToken) showCheckin(checkinToken);
  else if (redeemToken) showVendorRedeem(redeemToken);
  else if (memberQrMode) showMemberQr();
  else showMyRegistrations();
})();
