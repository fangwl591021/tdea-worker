(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const dataKey = "tdea-manager-v3";
  const defaultCalendarId = "7d66f2a96f192dda6cca2b04e60a6e549c7adf74f57721845d5b7e03f8b7ca89@group.calendar.google.com";
  const defaultImageUrl = "https://fangwl591021.github.io/tdea-worker/public/assets/kooler-free-course.png";
  let active = false;
  let events = [];

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const uid = () => "cal-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const adminEmail = () => localStorage.getItem("tdea-admin-email") || sessionStorage.getItem("tdea-admin-email") || "";
  const loadData = () => { try { return JSON.parse(localStorage.getItem(dataKey) || "{}"); } catch (_) { return {}; } };
  const saveData = (data) => localStorage.setItem(dataKey, JSON.stringify(data));

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector("[data-calendar-zone]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.calendarZone = "1";
    button.textContent = "行事曆";
    button.addEventListener("click", show);
    nav.appendChild(button);
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    document.querySelector("[data-calendar-zone]")?.classList.add("active");
  }

  function ensureStyles() {
    if (document.querySelector("#tdea-calendar-manager-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-calendar-manager-style";
    style.textContent = `
      .calendar-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px;align-items:start}.calendar-form{display:grid;gap:14px;padding:18px}.calendar-event-title{display:grid;gap:4px}.calendar-event-title strong{font-size:16px}.calendar-event-title span{color:#667085;font-size:13px}.calendar-actions{display:flex;gap:8px;flex-wrap:wrap}.calendar-note{line-height:1.7;color:#344054}.calendar-card{position:sticky;top:24px}.calendar-stat{display:grid;gap:12px;padding:18px}.calendar-stat div{border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:12px}.calendar-stat span{display:block;color:#667085;font-size:13px}.calendar-stat strong{display:block;font-size:24px;margin-top:4px}@media(max-width:1050px){.calendar-grid{grid-template-columns:1fr}.calendar-card{position:static}}
    `;
    document.head.appendChild(style);
  }

  function show() {
    active = true;
    setActiveNav();
    render();
    loadEvents();
  }

  function render() {
    ensureStyles();
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = `
      <div class="topbar">
        <div><h1>行事曆</h1><div class="subtitle">從 Google Calendar 匯入協會年度活動，匯入後可在「每月活動」直接綁定。</div></div>
        <div class="actions"><button class="btn" data-calendar-refresh>重新讀取日曆</button><button class="btn primary" data-calendar-import-all>全部匯入活動</button></div>
      </div>
      <div class="calendar-grid">
        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">Google Calendar 匯入</h2></div>
          <div class="calendar-form">
            <div class="field"><label>日曆 ID</label><input data-calendar-id value="${esc(defaultCalendarId)}"></div>
            <div class="calendar-note">目前使用公開 iCal 讀取，不需要 Google OAuth。若讀不到，請確認 Google 日曆設定已開啟公開存取。</div>
          </div>
          ${table()}
        </section>
        <aside class="panel calendar-card">
          <div class="panel-head"><h2 class="panel-title">匯入狀態</h2></div>
          <div class="calendar-stat"><div><span>讀到活動</span><strong>${events.length}</strong></div><div><span>本機活動</span><strong>${(loadData().activities || []).length}</strong></div></div>
          <div class="calendar-note" style="padding:0 18px 18px">「匯入為活動」會寫入管理中心活動清單。接著到「每月活動」選擇該活動，就能生成 LINE carousel 的單頁。</div>
        </aside>
      </div>
      <div class="toast" id="calendar-toast"></div>`;
    bind();
  }

  function table() {
    if (!events.length) return `<div class="empty">尚未讀取到日曆活動</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>活動</th><th>時間</th><th>地點</th><th>操作</th></tr></thead><tbody>${events.map((event, index) => `<tr><td><div class="calendar-event-title"><strong>${esc(event.name)}</strong><span>${esc(event.id || event.uid || "")}</span></div></td><td>${esc(event.courseTime || event.start || "-")}</td><td>${esc(event.location || "-")}</td><td><div class="calendar-actions"><button class="link" data-calendar-import="${index}">匯入為活動</button><button class="link" data-calendar-monthly="${index}">加入每月活動</button></div></td></tr>`).join("")}</tbody></table></div>`;
  }

  async function loadEvents() {
    const calendarId = document.querySelector("[data-calendar-id]")?.value || defaultCalendarId;
    const response = await fetch(`${api}/api/calendar/events?calendarId=${encodeURIComponent(calendarId)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return toast(result.message || "日曆讀取失敗");
    events = Array.isArray(result.data) ? result.data : [];
    render();
    toast(`已讀取 ${events.length} 筆日曆活動`);
  }

  function toActivity(event) {
    const activityNo = `CAL-${String(event.start || event.id || uid()).replace(/[^0-9A-Za-z]/g, "").slice(0, 14)}`;
    return {
      id: `calendar-${event.id || uid()}`.replace(/[^0-9A-Za-z_-]/g, "-"),
      activityNo,
      calendarUid: event.uid || event.id || "",
      name: event.name || "未命名活動",
      type: "年度活動",
      typeLabel: "年度活動",
      courseTime: event.courseTime || event.start || "",
      deadline: "",
      capacity: 0,
      reg: 0,
      check: 0,
      status: "上架",
      formUrl: event.url || "",
      detailText: [event.description, event.location ? `地點：${event.location}` : ""].filter(Boolean).join("\n\n"),
      location: event.location || "",
      imageUrl: defaultImageUrl,
      posterUrl: defaultImageUrl,
      source: "google_calendar"
    };
  }

  function importEvent(event, quiet = false) {
    const data = loadData();
    data.activities ||= [];
    const activity = toActivity(event);
    const index = data.activities.findIndex((item) => item.calendarUid === activity.calendarUid || item.id === activity.id || item.activityNo === activity.activityNo);
    if (index >= 0) data.activities[index] = { ...data.activities[index], ...activity };
    else data.activities.unshift(activity);
    saveData(data);
    if (!quiet) {
      render();
      toast("已匯入活動，可到活動總覽或每月活動選取");
    }
    return activity;
  }

  async function addToMonthly(event) {
    const activity = importEvent(event, true);
    const email = adminEmail();
    if (!email) {
      render();
      return toast("已匯入活動；尚未設定管理者 Email，所以未寫入每月活動");
    }
    const current = await fetch(`${api}/api/monthly-activity`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    const config = current.data || { enabled: true, keyword: "TDEA每月活動", month: new Date().toISOString().slice(0, 7), altText: "TDEA 每月活動", pages: [] };
    config.pages ||= [];
    if (!config.pages.some((page) => page.activityNo === activity.activityNo || page.activityId === activity.id)) {
      config.pages.push({ id: uid(), activityNo: activity.activityNo, activityId: activity.id, activityName: activity.name, detailTitle: activity.name, detailText: activity.detailText, formUrl: activity.formUrl, imageUrl: activity.imageUrl || defaultImageUrl });
    }
    const response = await fetch(`${api}/api/monthly-activity`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-email": email },
      body: JSON.stringify(config)
    });
    const result = await response.json().catch(() => ({}));
    render();
    if (!response.ok || !result.success) return toast(result.message || "每月活動寫入失敗");
    toast("已匯入活動並加入每月活動");
  }

  function importAll() {
    events.forEach((event) => importEvent(event, true));
    render();
    toast(`已匯入 ${events.length} 筆活動`);
  }

  function bind() {
    document.querySelector("[data-calendar-refresh]")?.addEventListener("click", loadEvents);
    document.querySelector("[data-calendar-import-all]")?.addEventListener("click", importAll);
    document.querySelectorAll("[data-calendar-import]").forEach((button) => button.addEventListener("click", () => importEvent(events[Number(button.dataset.calendarImport)])));
    document.querySelectorAll("[data-calendar-monthly]").forEach((button) => button.addEventListener("click", () => addToMonthly(events[Number(button.dataset.calendarMonthly)])));
  }

  function toast(message) {
    const el = document.querySelector("#calendar-toast") || document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function schedule() { ensureNav(); if (active) setActiveNav(); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => { if (event.target.closest(".nav button:not([data-calendar-zone])")) active = false; }, true);
  schedule();
})();
