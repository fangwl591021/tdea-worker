(() => {
  const api = location.hostname.endsWith("github.io") ? "https://tdeawork.fangwl591021.workers.dev" : "";
  const params = mergedParams();
  const formId = params.get("register");
  const checkinToken = params.get("checkin");
  const queryMode = params.has("query");
  const app = document.querySelector("#app");
  const liffId = "2005868456-2jmxqyFU";
  let liffReady = null;
  let lineUserId = "";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const trim = (value) => String(value ?? "").trim();
  const fieldTypes = new Set(["text", "email", "paragraph", "radio", "checkbox", "dropdown"]);

  if (!app || (!formId && !checkinToken && !queryMode)) return;

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

  function loadLiff() {
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

  loadLiff();
  if (formId) showRegister(formId);
  else if (checkinToken) showCheckin(checkinToken);
  else showQuery();
})();
