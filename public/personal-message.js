(function () {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const liffId = "2005868456-2jmxqyFU";
  const publicKey = "personalMessages";

  function getParams() {
    const bags = [new URLSearchParams(location.search)];
    const state = bags[0].get("liff.state");
    if (state) {
      let decoded = state;
      try { decoded = decodeURIComponent(state); } catch (_) {}
      const query = decoded.startsWith("?")
        ? decoded.slice(1)
        : decoded.includes("?")
          ? decoded.split("?").slice(1).join("?")
          : decoded;
      bags.push(new URLSearchParams(query));
    }
    return bags;
  }

  function hasPersonalMode() {
    return getParams().some((params) => params.has(publicKey));
  }

  function adminEmail() {
    return localStorage.getItem("tdea-admin-email") ||
      sessionStorage.getItem("tdea-admin-email") ||
      localStorage.getItem("adminEmail") ||
      sessionStorage.getItem("adminEmail") ||
      prompt("請輸入管理者 Email") ||
      "";
  }

  function adminHeaders(json) {
    const headers = { "x-admin-email": adminEmail().trim() };
    if (json) headers["content-type"] = "application/json";
    return headers;
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[ch]));
  }

  function toast(text) {
    let el = document.querySelector(".pm-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "pm-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function injectStyles() {
    if (document.querySelector("#personal-message-style")) return;
    const style = document.createElement("style");
    style.id = "personal-message-style";
    style.textContent = `
      .pm-action{margin-left:8px;color:#06c755;background:transparent;border:0;font:inherit;font-weight:800;cursor:pointer}
      .pm-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:20px}
      .pm-modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(15,23,42,.25)}
      .pm-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e5e7eb}
      .pm-head h2{margin:0;font-size:24px}
      .pm-close{border:1px solid #d0d5dd;border-radius:10px;background:#fff;width:42px;height:42px;font-size:22px;cursor:pointer}
      .pm-body{padding:22px 24px;display:grid;gap:16px}
      .pm-meta{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;color:#344054}
      .pm-field{display:grid;gap:7px}
      .pm-field label{font-weight:800;color:#0f172a}
      .pm-field input,.pm-field textarea{border:1px solid #cbd5e1;border-radius:10px;padding:12px;font:inherit}
      .pm-field textarea{min-height:160px;resize:vertical}
      .pm-send{border:0;border-radius:10px;background:#06c755;color:#fff;padding:14px 18px;font-weight:900;font-size:18px;cursor:pointer}
      .pm-send:disabled{opacity:.55;cursor:wait}
      .pm-inbox{max-width:760px;margin:0 auto;padding:22px;background:#f4f6f8;min-height:100vh;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}
      .pm-inbox h1{margin:0 0 10px;font-size:28px}
      .pm-inbox .sub{color:#667085;margin-bottom:18px}
      .pm-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:14px 0;box-shadow:0 10px 24px rgba(15,23,42,.06)}
      .pm-card time{display:block;color:#667085;font-size:13px;margin-bottom:8px}
      .pm-card h2{font-size:20px;margin:0 0 10px}
      .pm-card .content{white-space:pre-wrap;line-height:1.7;color:#344054}
      .pm-attachments{display:grid;gap:8px;margin-top:14px}
      .pm-attachments a{display:block;border:1px solid #d0d5dd;border-radius:10px;padding:11px 12px;text-decoration:none;color:#0f172a;font-weight:800}
      .pm-empty{background:#fff;border-radius:14px;padding:28px;text-align:center;color:#667085}
      .pm-toast{position:fixed;right:18px;bottom:18px;background:#0f172a;color:#fff;border-radius:10px;padding:12px 16px;z-index:10000;opacity:0;transform:translateY(8px);transition:.2s}
      .pm-toast.show{opacity:1;transform:translateY(0)}
    `;
    document.head.appendChild(style);
  }

  function lineUidFromRow(row) {
    const fromDataset = row.dataset.lineUid || "";
    if (/^U[0-9a-f]{32}$/i.test(fromDataset.trim())) return fromDataset.trim();
    const match = row.textContent.match(/U[0-9a-f]{32}/i);
    return match ? match[0] : "";
  }

  function memberFromRow(row) {
    const cells = Array.from(row.children);
    return {
      memberNo: (cells[0]?.textContent || "").trim(),
      name: (cells[1]?.textContent || "").trim(),
      lineUserId: lineUidFromRow(row)
    };
  }

  function openComposer(member) {
    injectStyles();
    const overlay = document.createElement("div");
    overlay.className = "pm-overlay";
    overlay.innerHTML = `
      <section class="pm-modal" role="dialog" aria-modal="true">
        <div class="pm-head">
          <h2>發送個人訊息</h2>
          <button class="pm-close" type="button" aria-label="關閉">×</button>
        </div>
        <form class="pm-body">
          <div class="pm-meta">
            收件人：<b>${esc(member.name || "-")}</b><br>
            會員編號：${esc(member.memberNo || "-")}<br>
            LINE UID：${esc(member.lineUserId || "尚未綁定，會先儲存到會員編號")}
          </div>
          <div class="pm-field">
            <label>主旨</label>
            <input name="subject" value="TDEA 個人訊息" required>
          </div>
          <div class="pm-field">
            <label>內容</label>
            <textarea name="body" placeholder="請輸入要傳給對方的訊息"></textarea>
          </div>
          <div class="pm-field">
            <label>附件</label>
            <input name="files" type="file" multiple>
          </div>
          <button class="pm-send" type="submit">送出訊息</button>
        </form>
      </section>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector(".pm-close").onclick = () => overlay.remove();
    overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
    overlay.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector(".pm-send");
      button.disabled = true;
      button.textContent = "送出中...";
      try {
        const files = Array.from(form.elements.files.files || []);
        const attachments = [];
        for (const file of files) {
          const data = new FormData();
          data.append("file", file);
          data.append("memberNo", member.memberNo || "");
          const upload = await fetch(api + "/api/personal-messages/upload", {
            method: "POST",
            headers: adminHeaders(false),
            body: data
          }).then((r) => r.json());
          if (!upload.success) throw new Error(upload.message || "附件上傳失敗");
          attachments.push(upload.data);
        }
        const payload = {
          recipientMemberNo: member.memberNo,
          recipientName: member.name,
          recipientLineUserId: member.lineUserId,
          subject: form.elements.subject.value.trim(),
          body: form.elements.body.value.trim(),
          attachments
        };
        const result = await fetch(api + "/api/personal-messages", {
          method: "POST",
          headers: adminHeaders(true),
          body: JSON.stringify(payload)
        }).then((r) => r.json());
        if (!result.success) throw new Error(result.message || "訊息儲存失敗");
        toast(result.pushResult?.ok ? "已儲存並推播通知" : "已儲存，對方可由個人訊息 LIFF 查看");
        overlay.remove();
      } catch (error) {
        toast(error.message || String(error));
        button.disabled = false;
        button.textContent = "送出訊息";
      }
    };
  }

  function enhanceMemberTables() {
    injectStyles();
    document.querySelectorAll("table").forEach((table) => {
      const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
      const hasOperation = heads.some((text) => text.includes("操作"));
      const hasMemberNo = heads.some((text) => text.includes("會員編號") || text.includes("廠商"));
      if (!hasOperation || !hasMemberNo) return;
      table.querySelectorAll("tbody tr").forEach((row) => {
        if (row.dataset.pmReady) return;
        const member = memberFromRow(row);
        if (!member.memberNo && !member.name) return;
        const opCell = row.children[row.children.length - 1];
        if (!opCell) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pm-action";
        button.textContent = "個人訊息";
        button.onclick = () => openComposer(memberFromRow(row));
        opCell.appendChild(document.createTextNode(" / "));
        opCell.appendChild(button);
        row.dataset.pmReady = "1";
      });
    });
  }

  async function loadLiffProfile() {
    if (!window.liff) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    await liff.init({ liffId });
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href });
      return null;
    }
    return liff.getProfile();
  }

  function renderInboxShell() {
    injectStyles();
    document.body.innerHTML = `<main id="pm-inbox" class="pm-inbox"><h1>TDEA 個人訊息</h1><div class="sub">讀取中...</div></main>`;
  }

  function renderInbox(profile, data) {
    const root = document.querySelector("#pm-inbox");
    const messages = Array.isArray(data.data) ? data.data : [];
    root.innerHTML = `
      <h1>TDEA 個人訊息</h1>
      <div class="sub">${esc(data.member?.rosterName || profile?.displayName || "")} ${messages.length} 則訊息</div>
      ${messages.length ? messages.map((item) => `
        <article class="pm-card">
          <time>${esc(new Date(item.createdAt || Date.now()).toLocaleString("zh-TW"))}</time>
          <h2>${esc(item.subject || "TDEA 個人訊息")}</h2>
          <div class="content">${esc(item.body || "")}</div>
          ${(item.attachments || []).length ? `<div class="pm-attachments">${item.attachments.map((file) => `<a href="${esc(file.url)}" target="_blank" rel="noopener">${esc(file.name || "附件")}</a>`).join("")}</div>` : ""}
        </article>
      `).join("") : `<div class="pm-empty">目前沒有個人訊息。</div>`}
    `;
  }

  async function renderInboxMode() {
    renderInboxShell();
    try {
      const profile = await loadLiffProfile();
      if (!profile) return;
      const data = await fetch(api + "/api/personal-messages?lineUserId=" + encodeURIComponent(profile.userId)).then((r) => r.json());
      if (!data.success) throw new Error(data.message || "讀取失敗");
      renderInbox(profile, data);
    } catch (error) {
      document.querySelector("#pm-inbox").innerHTML = `<h1>TDEA 個人訊息</h1><div class="pm-empty">${esc(error.message || String(error))}</div>`;
    }
  }

  if (hasPersonalMode()) {
    renderInboxMode();
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    enhanceMemberTables();
    new MutationObserver(enhanceMemberTables).observe(document.body, { childList: true, subtree: true });
  });
})();
