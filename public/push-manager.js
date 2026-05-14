(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const storageKey = "tdea-manager-v3";
  let active = false;
  let navOpen = true;
  let view = "list";
  let lastSegments = null;
  let lastResolve = null;
  let draft = {
    targetKind: "broadcast",
    memberNoPrefix: "",
    manualUids: "",
    notificationDisabled: false,
    messageType: "text",
    title: "",
    altText: "",
    text: "",
    flexRuleId: "",
    flexJson: ""
  };

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const n = (value) => Number(value || 0).toLocaleString("zh-TW");
  const adminEmail = () => localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
  const loadData = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); }
    catch (_) { return {}; }
  };
  const flexRules = () => {
    const data = loadData();
    return Array.isArray(data.flexRules) ? data.flexRules : [];
  };

  function ensureNav() {
    if (window.TDEALineNav) {
      window.TDEALineNav.register({
        id: "push",
        label: "群發訊息",
        order: 30,
        onClick: () => show("list"),
        isActive: () => active
      });
      return;
    }
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector("[data-push-group]")) return;
    const group = document.createElement("div");
    group.className = "push-nav-group";
    group.dataset.pushGroup = "1";
    group.innerHTML = `
      <button type="button" class="push-nav-parent" data-push-parent>
        <span class="push-nav-icon">◎</span>
        <span>群發訊息</span>
        <span class="push-nav-caret">▾</span>
      </button>
      <div class="push-nav-children">
        <button type="button" data-push-view="list">訊息一覽</button>
        <button type="button" data-push-view="create">建立新訊息</button>
      </div>`;
    nav.appendChild(group);
    group.querySelector("[data-push-parent]")?.addEventListener("click", () => {
      if (!active) {
        show("list");
        return;
      }
      navOpen = !navOpen;
      setActiveNav();
    });
    group.querySelectorAll("[data-push-view]").forEach((button) => {
      button.addEventListener("click", () => show(button.dataset.pushView || "list"));
    });
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    if (window.TDEALineNav) {
      window.TDEALineNav.setOpen(true);
      window.TDEALineNav.refresh();
      return;
    }
    const group = document.querySelector("[data-push-group]");
    group?.classList.toggle("open", active && navOpen);
    group?.classList.toggle("active", active);
    document.querySelector("[data-push-parent]")?.classList.toggle("active", active);
    document.querySelector(`[data-push-view="${view}"]`)?.classList.add("active");
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-push-manager-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-push-manager-style";
    style.textContent = `
      .push-nav-group{margin-top:2px}
      .push-nav-parent{gap:10px}
      .push-nav-icon{width:22px;color:#06c755;font-weight:900}
      .push-nav-caret{margin-left:auto;color:#06c755;transition:transform .16s ease}
      .push-nav-group.open .push-nav-caret{transform:rotate(180deg)}
      .push-nav-children{display:none;margin-left:36px;border-left:1px solid rgba(255,255,255,.16);padding:4px 0 6px}
      .push-nav-group.open .push-nav-children{display:block}
      .push-nav-children button{min-height:44px!important;padding-left:22px!important;border-left:3px solid transparent!important;background:transparent!important;color:#d7dce5!important}
      .push-nav-children button:hover{background:#3b4352!important;color:#fff!important}
      .push-nav-children button.active{border-left-color:#7c9cff!important;background:#f8fafc!important;color:#06a24b!important}
      .push-shell{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,42%);gap:18px;align-items:start}
      .push-form{display:grid;gap:14px;padding:18px}
      .push-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .push-preview{position:sticky;top:24px}
      .push-phone{width:min(100%,390px);margin:auto;border-radius:30px;background:#111827;padding:14px}
      .push-screen{min-height:560px;border-radius:22px;background:#8fb7df;padding:18px 14px}
      .push-chat{display:flex;gap:8px;align-items:flex-end;margin-top:18px}
      .push-avatar{width:34px;height:34px;border-radius:50%;background:#06c755;color:#fff;display:grid;place-items:center;font-weight:900;flex:none}
      .push-bubble{max-width:280px;border-radius:16px;background:#fff;color:#111827;padding:14px;box-shadow:0 6px 18px rgba(15,23,42,.12);white-space:pre-wrap;line-height:1.55}
      .push-flex-note{font-weight:900;color:#2563eb}
      .push-kpis,.push-analytics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px}
      .push-analytics{grid-template-columns:repeat(5,1fr);padding-top:0}
      .push-kpis div,.push-analytics div{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff}
      .push-kpis span,.push-analytics span{display:block;color:#667085;font-size:13px}
      .push-kpis strong,.push-analytics strong{display:block;margin-top:5px;font-size:24px}
      .push-list-title{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px;border-bottom:1px solid #e5e7eb}
      .push-list-title h2{margin:0;font-size:18px}
      .push-status-ok{color:#067647;font-weight:900}
      .push-status-bad{color:#b42318;font-weight:900}
      .push-status-dry{color:#475467;font-weight:900}
      .push-segment-note{padding:0 18px 18px;color:#667085;font-size:13px;line-height:1.6}
      @media(max-width:1100px){
        .push-shell{grid-template-columns:1fr}
        .push-preview{position:static}
        .push-row{grid-template-columns:1fr}
        .push-kpis,.push-analytics{grid-template-columns:repeat(2,1fr)}
      }`;
    document.head.appendChild(style);
  }

  function show(nextView = "list") {
    active = true;
    navOpen = true;
    view = nextView;
    ensureStyles();
    setActiveNav();
    render();
    loadSegments({ rerenderList: nextView === "list" });
  }

  function render() {
    ensureStyles();
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = view === "create" ? createPage() : listPage();
    setActiveNav();
    bind();
    updatePreview();
  }

  function listPage() {
    const logs = lastSegments?.logs || [];
    return `
      <div class="topbar">
        <div>
          <h1>群發訊息</h1>
          <div class="subtitle">管理 LINE OA 推播、分眾名單與發送成效。</div>
        </div>
        <div class="actions">
          <button class="btn" data-push-refresh>刷新資料</button>
          <button class="btn primary" data-push-create>建立新訊息</button>
        </div>
      </div>
      <section class="panel">
        <div class="push-list-title">
          <h2>分眾概況</h2>
          <span class="muted">目前可用名單數據</span>
        </div>
        ${segmentSummary()}
        <div class="push-segment-note">全體 LINE 好友會使用 LINE Broadcast；其他分眾會使用已匯入 UID 的 Multicast。</div>
      </section>
      <section class="panel" style="margin-top:18px">
        <div class="push-list-title">
          <h2>訊息一覽</h2>
          <span class="muted">${n(logs.length)} 筆紀錄</span>
        </div>
        ${analytics()}
        ${logsTable()}
      </section>
      <div class="toast" id="push-toast"></div>`;
  }

  function createPage() {
    const rules = flexRules().filter((rule) => rule.enabled && rule.replyType !== "text");
    const resolvedText = lastResolve
      ? (lastResolve.mode === "broadcast" ? "全體 LINE 好友" : `預估 ${n(lastResolve.count)} 人`)
      : "尚未試算";
    return `
      <div class="topbar">
        <div>
          <h1>建立新訊息</h1>
          <div class="subtitle">選擇發送對象、撰寫內容，可使用純文字或已建立的 FLEX。</div>
        </div>
        <div class="actions">
          <button class="btn" data-push-list>訊息一覽</button>
        </div>
      </div>
      <div class="push-shell">
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">訊息設定</h2>
            <span class="muted" data-push-resolve-label>${resolvedText}</span>
          </div>
          <form class="push-form" id="push-form">
            <div class="field">
              <label>發送對象</label>
              <select name="targetKind">
                ${option("broadcast", "全體 LINE 好友（Broadcast）", draft.targetKind)}
                ${option("known", "全部已知 UID", draft.targetKind)}
                ${option("association", "協會會員", draft.targetKind)}
                ${option("vendor", "廠商會員", draft.targetKind)}
                ${option("qualified", "會員資格 Y", draft.targetKind)}
                ${option("memberPrefix", "會員編號前綴", draft.targetKind)}
                ${option("manual", "手動輸入 UID", draft.targetKind)}
              </select>
            </div>
            <div class="push-row">
              <div class="field">
                <label>會員編號前綴</label>
                <input name="memberNoPrefix" value="${esc(draft.memberNoPrefix)}" placeholder="例如：A109 或 Z109">
              </div>
              <label style="display:flex;align-items:center;gap:8px;font-weight:700;margin-top:28px">
                <input type="checkbox" name="notificationDisabled" value="1" ${draft.notificationDisabled ? "checked" : ""}>
                靜音推播
              </label>
            </div>
            <div class="field">
              <label>手動 UID</label>
              <textarea name="manualUids" placeholder="每行一個 LINE UID，也可用逗號或空白分隔">${esc(draft.manualUids)}</textarea>
            </div>
            <div class="field">
              <label>訊息類型</label>
              <select name="messageType">
                ${option("text", "純文字訊息", draft.messageType)}
                ${option("flex", "FLEX Message", draft.messageType)}
              </select>
            </div>
            <div class="push-row">
              <div class="field">
                <label>標題</label>
                <input name="title" value="${esc(draft.title)}" placeholder="後台辨識用">
              </div>
              <div class="field">
                <label>LINE 替代文字</label>
                <input name="altText" value="${esc(draft.altText)}" placeholder="手機通知或不支援 FLEX 時顯示">
              </div>
            </div>
            <div class="field">
              <label>文字內容</label>
              <textarea name="text" placeholder="純文字推播內容">${esc(draft.text)}</textarea>
            </div>
            <div class="field">
              <label>選擇 FLEX</label>
              <select name="flexRuleId">
                <option value="">自行貼上 FLEX JSON</option>
                ${rules.map((rule) => `<option value="${esc(rule.id)}" ${rule.id === draft.flexRuleId ? "selected" : ""}>${esc(rule.title || rule.keyword)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>FLEX JSON</label>
              <textarea name="flexJson" style="min-height:220px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace" placeholder="選擇 FLEX 或貼上 LINE Flex JSON">${esc(draft.flexJson)}</textarea>
            </div>
            <div class="actions">
              <button class="btn" type="button" data-push-resolve>試算人數</button>
              <button class="btn primary" type="submit">送出推播</button>
            </div>
          </form>
        </section>
        <aside class="panel push-preview">
          <div class="panel-head">
            <h2 class="panel-title">預覽區</h2>
            <span class="muted">LINE 手機畫面</span>
          </div>
          <div style="padding:18px">${preview()}</div>
        </aside>
      </div>
      <div class="toast" id="push-toast"></div>`;
  }

  function option(value, label, selected) {
    return `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
  }

  function segmentSummary() {
    const counts = lastSegments?.counts || {};
    return `
      <div class="push-kpis">
        <div><span>已知 UID</span><strong>${n(counts.known)}</strong></div>
        <div><span>協會會員</span><strong>${n(counts.association)}</strong></div>
        <div><span>廠商會員</span><strong>${n(counts.vendor)}</strong></div>
        <div><span>資格 Y</span><strong>${n(counts.qualified)}</strong></div>
      </div>`;
  }

  function analytics() {
    const logs = (lastSegments?.logs || []).filter((log) => !log.dryRun);
    const multicastRecipients = logs
      .filter((log) => log.mode !== "broadcast")
      .reduce((sum, log) => sum + Number(log.count || 0), 0);
    const successCount = logs.filter((log) => logSuccess(log)).length;
    const failCount = logs.length - successCount;
    const flexCount = logs.filter((log) => log.messageType === "flex").length;
    return `
      <div class="push-analytics">
        <div><span>正式推播</span><strong>${n(logs.length)}</strong></div>
        <div><span>分眾收件數</span><strong>${multicastRecipients ? n(multicastRecipients) : "全體另計"}</strong></div>
        <div><span>成功</span><strong>${n(successCount)}</strong></div>
        <div><span>失敗</span><strong>${n(failCount)}</strong></div>
        <div><span>FLEX 比例</span><strong>${logs.length ? Math.round((flexCount / logs.length) * 100) : 0}%</strong></div>
      </div>`;
  }

  function logsTable() {
    const logs = lastSegments?.logs || [];
    if (!logs.length) return `<div class="empty">目前沒有推播紀錄</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>時間</th><th>發送方式</th><th>對象</th><th>訊息</th><th>人數</th><th>回應</th><th>狀態</th></tr>
          </thead>
          <tbody>
            ${logs.map((log) => `
              <tr>
                <td>${esc(formatTime(log.createdAt))}</td>
                <td>${esc(modeLabel(log.mode))}</td>
                <td>${esc(targetSummary(log.target))}</td>
                <td>${esc(messageLabel(log))}</td>
                <td>${log.mode === "broadcast" ? "全體好友" : n(log.count)}</td>
                <td>${n((log.responses || []).length)}</td>
                <td>${statusHtml(log)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function preview() {
    return `
      <div class="push-phone">
        <div class="push-screen">
          <div class="push-chat">
            <div class="push-avatar">T</div>
            <div class="push-bubble" data-push-preview></div>
          </div>
        </div>
      </div>`;
  }

  function formatTime(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-TW", { hour12: false });
  }

  function readDraft() {
    const form = document.querySelector("#push-form");
    if (!form) return draft;
    const data = Object.fromEntries(new FormData(form));
    draft = {
      targetKind: String(data.targetKind || "broadcast"),
      memberNoPrefix: String(data.memberNoPrefix || ""),
      manualUids: String(data.manualUids || ""),
      notificationDisabled: data.notificationDisabled === "1",
      messageType: String(data.messageType || "text"),
      title: String(data.title || ""),
      altText: String(data.altText || ""),
      text: String(data.text || ""),
      flexRuleId: String(data.flexRuleId || ""),
      flexJson: String(data.flexJson || "")
    };
    return draft;
  }

  function formPayload(dryRun = false) {
    const data = readDraft();
    return {
      dryRun,
      target: {
        kind: data.targetKind,
        memberNoPrefix: data.memberNoPrefix,
        manualUids: data.manualUids
      },
      messageType: data.messageType,
      title: data.title,
      altText: data.altText,
      text: data.text,
      flexJson: data.flexJson,
      notificationDisabled: data.notificationDisabled
    };
  }

  async function loadSegments(options = {}) {
    const email = adminEmail();
    if (!email) {
      toast("尚未取得管理者 Email，請先登入或設定管理者");
      return;
    }
    const response = await fetch(api + "/api/push/segments", {
      headers: { "x-admin-email": email },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      toast(result.message || "分眾資料讀取失敗");
      return;
    }
    lastSegments = result.data || {};
    if (options.rerenderList && view === "list") render();
  }

  async function resolveTargets() {
    const email = adminEmail();
    if (!email) {
      toast("尚未取得管理者 Email，請先登入或設定管理者");
      return;
    }
    const payload = formPayload(true);
    const response = await fetch(api + "/api/push/resolve", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      toast(result.message || "人數試算失敗");
      return;
    }
    lastResolve = result.data || {};
    const text = lastResolve.mode === "broadcast" ? "全體 LINE 好友" : `預估 ${n(lastResolve.count)} 人`;
    const label = document.querySelector("[data-push-resolve-label]");
    if (label) label.textContent = text;
    toast(text);
  }

  async function sendPush(event) {
    event.preventDefault();
    const email = adminEmail();
    if (!email) {
      toast("尚未取得管理者 Email，請先登入或設定管理者");
      return;
    }
    const payload = formPayload(false);
    if (!validatePayload(payload)) return;
    const targetLabel = payload.target.kind === "broadcast" ? "全體 LINE 好友" : "指定分眾";
    if (!confirm(`確定送出推播給「${targetLabel}」？送出後不能收回。`)) return;
    const response = await fetch(api + "/api/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      toast(result.message || "推播失敗");
      return;
    }
    toast(result.message || "推播已送出");
    view = "list";
    lastResolve = null;
    draft = { ...draft, title: "", altText: "", text: "", flexRuleId: "", flexJson: "" };
    await loadSegments({ rerenderList: false });
    render();
  }

  function validatePayload(payload) {
    if (payload.messageType === "flex") {
      try {
        const parsed = JSON.parse(payload.flexJson || "{}");
        if (!parsed.type) throw new Error("missing type");
      } catch (_) {
        toast("FLEX JSON 格式不正確");
        return false;
      }
      if (!payload.altText && !payload.title) {
        toast("FLEX 推播請填 LINE 替代文字或標題");
        return false;
      }
    } else if (!String(payload.text || "").trim()) {
      toast("請填寫文字內容");
      return false;
    }
    if (payload.target.kind === "manual" && !String(payload.target.manualUids || "").trim()) {
      toast("手動發送請填寫 UID");
      return false;
    }
    return true;
  }

  function updatePreview() {
    const target = document.querySelector("[data-push-preview]");
    const form = document.querySelector("#push-form");
    if (!target || !form) return;
    const data = readDraft();
    if (data.messageType === "flex") {
      target.innerHTML = `<div class="push-flex-note">FLEX Message</div><div style="color:#475467;margin-top:8px">${esc(data.altText || data.title || "TDEA 推播訊息")}</div>`;
      return;
    }
    const text = [data.title, data.text].filter(Boolean).join("\n\n") || "文字推播預覽";
    target.textContent = text;
  }

  function applyFlexSelection() {
    const form = document.querySelector("#push-form");
    const id = form?.elements.flexRuleId?.value || "";
    const rule = flexRules().find((item) => item.id === id);
    if (!rule || !form) {
      readDraft();
      updatePreview();
      return;
    }
    form.elements.messageType.value = "flex";
    form.elements.title.value = rule.title || rule.keyword || "";
    form.elements.altText.value = rule.altText || rule.title || "TDEA 推播訊息";
    form.elements.flexJson.value = rule.flexJson || "";
    readDraft();
    updatePreview();
  }

  function logSuccess(log) {
    if (log.dryRun) return false;
    const responses = Array.isArray(log.responses) ? log.responses : [];
    return responses.length > 0 && responses.every((item) => item && item.ok);
  }

  function statusHtml(log) {
    if (log.dryRun) return `<span class="push-status-dry">試算</span>`;
    const responses = Array.isArray(log.responses) ? log.responses : [];
    if (!responses.length) return `<span class="push-status-bad">未送出</span>`;
    const failed = responses.filter((item) => !item?.ok);
    if (!failed.length) return `<span class="push-status-ok">成功</span>`;
    return `<span class="push-status-bad">失敗 ${failed.map((item) => item?.status || "-").join(", ")}</span>`;
  }

  function modeLabel(mode) {
    return mode === "broadcast" ? "Broadcast" : "Multicast";
  }

  function messageLabel(log) {
    const type = log.messageType === "flex" ? "FLEX" : "文字";
    return `${type}${log.title ? `：${log.title}` : ""}`;
  }

  function targetSummary(target = {}) {
    const kind = target.kind || "known";
    if (kind === "broadcast") return "全體 LINE 好友";
    if (kind === "association") return "協會會員";
    if (kind === "vendor") return "廠商會員";
    if (kind === "qualified") return "會員資格 Y";
    if (kind === "memberPrefix") return `會員編號前綴 ${target.memberNoPrefix || "-"}`;
    if (kind === "manual") return "手動 UID";
    return "全部已知 UID";
  }

  function bind() {
    document.querySelector("[data-push-refresh]")?.addEventListener("click", () => loadSegments({ rerenderList: true }));
    document.querySelector("[data-push-create]")?.addEventListener("click", () => show("create"));
    document.querySelector("[data-push-list]")?.addEventListener("click", () => show("list"));
    document.querySelector("[data-push-resolve]")?.addEventListener("click", resolveTargets);
    document.querySelector("#push-form")?.addEventListener("submit", sendPush);
    document.querySelector("#push-form")?.addEventListener("input", updatePreview);
    document.querySelector("[name='flexRuleId']")?.addEventListener("change", applyFlexSelection);
  }

  function toast(message) {
    const el = document.querySelector("#push-toast") || document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function schedule() {
    ensureNav();
    if (active) setActiveNav();
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    const navButton = event.target.closest(".nav button");
    if (navButton && !event.target.closest('[data-line-item="push"]') && !event.target.closest("[data-line-parent]") && !event.target.closest("[data-push-parent]") && !event.target.closest("[data-push-view]")) {
      active = false;
      setActiveNav();
    }
  }, true);
  schedule();
})();
