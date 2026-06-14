(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const adminKey = "tdea-admin-email";
  const adminMemberKey = "tdea-admin-member-no";
  const adminLineUserKey = "tdea-admin-line-user-id";
  const fixedKeyword = "TDEA每月活動";
  const defaultLiffBase = "https://liff.line.me/2005868456-2jmxqyFU?monthlyDetail={id}";
  const publicLiffUrl = "https://liff.line.me/2005868456-2jmxqyFU";
  const defaultImageUrl = "https://fangwl591021.github.io/tdea-worker/public/assets/kooler-free-course.png";
  const dataKey = "tdea-manager-v3";
  let active = false;
  let config = null;
  let selected = 0;
  let autoPublishTimer = 0;
  let autoPublishBusy = false;
  let lastAutoPublishSignature = "";
  let remoteActivities = [];
  const previewCollapseKey = "tdea-monthly-preview-collapsed";

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const id = () => "monthly-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const trim = (value) => String(value ?? "").trim();
  const meaningfulText = (value) => {
    const text = trim(value);
    return text.replace(/[,\s/\\|._\-，、。；;:：]+/g, "").length ? text : "";
  };

  function storedValue(...keys) {
    for (const key of keys) {
      const value = sessionStorage.getItem(key) || localStorage.getItem(key) || "";
      if (trim(value)) return trim(value);
    }
    return "";
  }
  function adminEmail() { return storedValue(adminKey).toLowerCase(); }
  function adminIdentity() {
    return {
      email: adminEmail(),
      memberNo: storedValue(adminMemberKey, "tdea-member-no").toUpperCase(),
      lineUserId: storedValue(adminLineUserKey, "tdea-line-user-id", "lineUserId")
    };
  }
  function hasAdminIdentity() {
    const identity = adminIdentity();
    return Boolean(identity.email || identity.memberNo || identity.lineUserId);
  }
  function adminHeaders(extra = {}) {
    const identity = adminIdentity();
    return {
      ...extra,
      ...(identity.email ? { "x-admin-email": identity.email } : {}),
      ...(identity.memberNo ? { "x-admin-member-no": identity.memberNo } : {}),
      ...(identity.lineUserId ? { "x-line-user-id": identity.lineUserId } : {})
    };
  }
  function previewCollapsed() { return localStorage.getItem(previewCollapseKey) === "Y"; }
  function setPreviewCollapsed(value) { localStorage.setItem(previewCollapseKey, value ? "Y" : "N"); }

  function localData() {
    try { return JSON.parse(localStorage.getItem(dataKey) || "{}"); } catch (_) { return {}; }
  }

  function activities() {
    const rows = remoteActivities.length ? remoteActivities : localData().activities;
    return Array.isArray(rows) ? rows.filter((item) => item && (item.name || item.activityNo || item.id)) : [];
  }

  async function loadRemoteActivities() {
    try {
      const res = await fetch(`${api}/api/activities`, { cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      const rows = Array.isArray(result?.data?.activities) ? result.data.activities : Array.isArray(result?.activities) ? result.activities : [];
      if (!result.success || !Array.isArray(rows)) return remoteActivities;
      remoteActivities = rows.filter((item) => item && (item.name || item.activityNo || item.id));
      const data = localData();
      data.activities = remoteActivities;
      saveLocalData(data);
    } catch (_) {}
    return remoteActivities;
  }

  function normalizeStatus(value) {
    return trim(value).replace(/\s+/g, "");
  }

  function isLiveActivity(activity) {
    const status = normalizeStatus(activity?.status);
    return status.includes("上架") && !status.includes("下架");
  }

  function activityMonth(activity) {
    const text = [activity?.courseTime, activity?.deadline, activity?.activityDate, activity?.date, activity?.activityNo, activity?.name, activity?.id].map((value) => trim(value)).join(" ");
    const match = text.match(/(20\d{2})[\/.\-年](\d{1,2})/) || text.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
    if (!match) return "";
    return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;
  }

  function autoMonthlyActivities() {
    const liveRows = activities().filter(isLiveActivity);
    return liveRows
      .sort((a, b) => {
        const aTime = trim(a.courseTime);
        const bTime = trim(b.courseTime);
        return aTime.localeCompare(bTime, "zh-Hant");
      })
      .slice(0, 12);
  }

  function findActivity(value) {
    const key = trim(value);
    if (!key) return null;
    return activities().find((item) => String(item.activityNo || "") === key || String(item.id || "") === key || String(item.name || "") === key) || null;
  }

  function formSettingsFor(activity) {
    const data = localData();
    const settings = data.formSettings || {};
    return settings[activity?.id] || settings[activity?.activityNo] || settings[activity?.name] || {};
  }

  function allFormSettingsFor(activity) {
    const data = localData();
    const settings = data.formSettings || {};
    return [activity?.id, activity?.activityNo, activity?.name]
      .map((key) => settings[String(key || "").trim()])
      .filter((item) => item && typeof item === "object");
  }

  function firstText(...values) {
    for (const value of values.flat()) {
      const text = meaningfulText(value);
      if (text) return text;
    }
    return "";
  }

  function firstUrl(...values) {
    for (const value of values.flat()) {
      const text = trim(value);
      if (/^https?:\/\//i.test(text)) return text;
    }
    return "";
  }

  function uniqueUrls(values) {
    const seen = new Set();
    return values
      .flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[\n,]+/))
      .map((value) => trim(value))
      .filter((value) => /^https?:\/\//i.test(value))
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
  }

  function galleryUrlsFor(activity) {
    if (!activity) return [];
    const settingsRows = allFormSettingsFor(activity);
    return uniqueUrls([
      activity.galleryUrls,
      activity.galleryUrl,
      activity.gallery,
      settingsRows.map((settings) => [settings.galleryUrls, settings.galleryUrl, settings.gallery])
    ]);
  }

  function pageGallery(page) {
    const activity = findActivity(page.activityNo || page.activityId);
    return uniqueUrls([page.imageUrl, page.galleryUrls, galleryUrlsFor(activity)]);
  }

  function formUrlFor(activity) {
    if (!activity) return "";
    const settings = formSettingsFor(activity);
    return firstUrl(
      activity.formUrl,
      activity.nativeFormUrl,
      activity.opnformFormUrl,
      activity.googleFormUrl,
      activity.googleFormPublishedUrl,
      activity.registrationFormUrl,
      activity.formLink,
      activity.form_url,
      activity.signupUrl,
      activity.registerUrl,
      activity.registrationUrl,
      activity.googleForm?.url,
      activity.googleForm?.publishedUrl,
      activity.googleForm?.responderUri,
      settings.formUrl,
      settings.nativeFormUrl,
      settings.opnformFormUrl,
      settings.googleFormUrl,
      settings.googleFormPublishedUrl,
      settings.registrationFormUrl,
      settings.formLink,
      settings.signupUrl,
      settings.registerUrl,
      settings.googleForm?.url,
      settings.googleForm?.publishedUrl,
      settings.googleForm?.responderUri
    );
  }

  function detailTextFor(activity) {
    if (!activity) return "";
    const settingsRows = allFormSettingsFor(activity);
    return firstText(
      activity.detailText,
      activity.description,
      activity.detail,
      activity.details,
      activity.detailDescription,
      activity.activityDetail,
      activity.eventDetail,
      activity.content,
      activity.introduction,
      settingsRows.map((settings) => [
        settings.detailText,
        settings.description,
        settings.detail,
        settings.details,
        settings.detailDescription,
        settings.activityDetail,
        settings.eventDetail,
        settings.content,
        settings.introduction
      ])
    );
  }

  function posterUrlFor(activity) {
    if (!activity) return "";
    const settings = formSettingsFor(activity);
    return firstUrl(activity.posterUrl, activity.imageUrl, activity.coverUrl, settings.posterUrl, settings.imageUrl, settings.coverUrl);
  }

  function fallbackDetailText(activity) {
    return [
      activity?.name || "TDEA 活動",
      "",
      activity?.courseTime ? `活動時間：${activity.courseTime}` : "",
      activity?.deadline ? `報名截止：${activity.deadline}` : "",
      Number(activity?.capacity || 0) ? `名額：${Number(activity.capacity || 0)}` : "",
      "",
      "請至活動編輯補上完整活動介紹、地點、費用與注意事項。"
    ].filter((line) => line !== "").join("\n");
  }

  function pageFromActivity(activity, existing = {}) {
    const imageUrl = firstUrl(existing.imageUrl, posterUrlFor(activity), defaultImageUrl);
    return {
      ...existing,
      id: existing.id || id(),
      activityNo: activity.activityNo || existing.activityNo || "",
      activityId: activity.id || existing.activityId || "",
      activityName: activity.name || existing.activityName || "",
      detailTitle: activity.name || existing.detailTitle || "詳細說明",
      detailText: detailTextFor(activity) || existing.detailText || fallbackDetailText(activity),
      formUrl: formUrlFor(activity) || existing.formUrl || "",
      imageUrl,
      galleryUrls: uniqueUrls([existing.galleryUrls, galleryUrlsFor(activity)]),
      shareUrl: existing.shareUrl || ""
    };
  }

  function pagesSignature(pages = config?.pages || []) {
    return JSON.stringify(pages.map((page) => {
      const hydrated = hydratePage(page);
      return {
        activityNo: trim(hydrated.activityNo),
        activityId: trim(hydrated.activityId),
        activityName: trim(hydrated.activityName),
        detailText: trim(hydrated.detailText),
        formUrl: trim(hydrated.formUrl),
        imageUrl: trim(hydrated.imageUrl),
        galleryUrls: uniqueUrls([hydrated.galleryUrls])
      };
    }));
  }

  function syncPagesFromPublishedActivities(options = {}) {
    const rows = autoMonthlyActivities();
    const before = pagesSignature();
    const existing = new Map();
    (config.pages || []).forEach((page) => {
      [page.activityNo, page.activityId, page.activityName].map((value) => trim(value)).filter(Boolean).forEach((key) => existing.set(key, page));
    });
    const nextPages = rows.map((activity) => {
      const keys = [activity.activityNo, activity.id, activity.name].map((value) => trim(value)).filter(Boolean);
      const matched = keys.map((key) => existing.get(key)).find(Boolean) || {};
      return pageFromActivity(activity, matched);
    });
    if (nextPages.length || options.allowEmpty) {
      config.pages = nextPages;
      selected = Math.max(0, Math.min(selected, Math.max(config.pages.length - 1, 0)));
    }
    const changed = before !== pagesSignature();
    if (changed && options.autoPublish !== false) scheduleAutoPublish();
    return nextPages.length;
  }

  function blankConfig() {
    return { enabled: true, keyword: fixedKeyword, month: new Date().toISOString().slice(0, 7), altText: "TDEA 每月活動", detailBaseUrl: defaultLiffBase, pages: [blankPage()] };
  }

  function blankPage() {
    return { id: id(), activityNo: "", activityId: "", imageUrl: defaultImageUrl, shareUrl: "" };
  }

  function ensureConfigShape() {
    if (!config) config = blankConfig();
    config.keyword = fixedKeyword;
    config.altText = config.altText || "TDEA 每月活動";
    config.detailBaseUrl = config.detailBaseUrl || defaultLiffBase;
    if (!Array.isArray(config.pages) || !config.pages.length) config.pages = [blankPage()];
    config.pages = config.pages.map((page) => {
      const next = { ...blankPage(), ...page, id: page.id || id() };
      if (!next.activityNo && page.detailUrl && !String(page.detailUrl).startsWith("http")) next.activityNo = page.detailUrl;
      const activity = findActivity(next.activityNo || next.activityId);
      if (activity) applyActivityToPage(next, activity);
      return next;
    });
  }

  function applyActivityToPage(page, activity) {
    page.activityNo = activity.activityNo || page.activityNo || "";
    page.activityId = activity.id || page.activityId || "";
    page.activityName = activity.name || page.activityName || "";
    page.detailTitle = activity.name || page.detailTitle || "詳細說明";
    page.detailText = detailTextFor(activity);
    page.formUrl = formUrlFor(activity);
    if (!page.imageUrl) page.imageUrl = posterUrlFor(activity);
    if (!Array.isArray(page.galleryUrls) || !page.galleryUrls.length) page.galleryUrls = galleryUrlsFor(activity);
  }

  function hydratePage(page) {
    const activity = findActivity(page.activityNo || page.activityId);
    const next = { ...page };
    if (activity) applyActivityToPage(next, activity);
    next.detailTitle = next.detailTitle || next.activityName || "詳細說明";
    next.detailText = next.detailText || "";
    next.formUrl = next.formUrl || "";
    next.galleryUrls = pageGallery(next);
    return next;
  }

  function appendIdToUrl(baseUrl, activityNo, pageId) {
    const raw = trim(baseUrl || defaultLiffBase);
    const target = trim(activityNo) || pageId || "";
    const encoded = encodeURIComponent(target);
    if (raw.includes("{id}")) return raw.replaceAll("{id}", encoded);
    if (raw.includes("{activityNo}")) return raw.replaceAll("{activityNo}", encoded);
    return raw + (raw.includes("?") ? "&" : "?") + "monthlyDetail=" + encoded;
  }

  function detailUrlForPage(page) {
    const hydrated = hydratePage(page);
    return appendIdToUrl(config.detailBaseUrl, hydrated.activityNo || hydrated.activityId, hydrated.id);
  }

  function registerUrlForPage(page) {
    const hydrated = hydratePage(page);
    const target = trim(hydrated.activityNo) || trim(hydrated.activityId) || trim(hydrated.id);
    const current = trim(hydrated.formUrl);
    if (target && (!current || (/liff\.line\.me/i.test(current) && /[?&]register=/.test(current)))) {
      return `${publicLiffUrl}?register=${encodeURIComponent(target)}`;
    }
    return current || (target ? `${publicLiffUrl}?register=${encodeURIComponent(target)}` : "");
  }

  function shareUrlForPage(page) { return trim(page.shareUrl) || detailUrlForPage(page); }

  function activityPayloadForPage(page, activity) {
    const imageUrl = firstUrl(page.imageUrl, posterUrlFor(activity));
    return {
      ...activity,
      detailText: firstText(page.detailText, detailTextFor(activity)),
      posterUrl: imageUrl,
      imageUrl,
      coverUrl: imageUrl,
      galleryUrls: pageGallery(page)
    };
  }

  function ensureNav() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector("[data-monthly-zone]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.monthlyZone = "1";
    button.textContent = "每月活動";
    button.addEventListener("click", show);
    nav.appendChild(button);
  }

  function setActiveNav() {
    document.querySelectorAll(".nav button").forEach((button) => button.classList.remove("active"));
    document.querySelector("[data-monthly-zone]")?.classList.add("active");
  }

  async function show() {
    active = true;
    setActiveNav();
    if (!config) await load();
    render();
  }

  async function load() {
    await loadRemoteActivities();
    try {
      const res = await fetch(`${api}/api/monthly-activity`, { cache: "no-store" });
      const result = await res.json();
      config = result.data || blankConfig();
    } catch (_) {
      config = blankConfig();
    }
    ensureConfigShape();
  }

  function ensureStyles() {
    if (document.querySelector("#monthly-activity-style")) return;
    const style = document.createElement("style");
    style.id = "monthly-activity-style";
    style.textContent = `.monthly-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,42%);gap:18px;align-items:start}.monthly-left{display:grid;gap:18px;min-width:0}.monthly-preview-panel{position:sticky;top:24px}.monthly-pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:14px}.monthly-page-btn{border:1px solid #d0d5dd;background:#fff;border-radius:8px;min-height:64px;padding:10px 12px;text-align:left;font-weight:800;display:grid;gap:4px}.monthly-page-btn span{color:#667085;font-size:13px}.monthly-page-btn strong{color:#111827;line-height:1.35;word-break:break-word}.monthly-page-btn.active{border-color:#06c755;background:#eafff1}.monthly-form{display:grid;gap:14px;padding:18px}.monthly-basic-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end}.monthly-keyword-pill{border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;padding:10px 12px;display:grid;gap:4px}.monthly-keyword-pill span{color:#667085;font-size:12px}.monthly-keyword-pill strong{color:#111827}.monthly-enabled{display:inline-flex;align-items:center;gap:8px;font-weight:800}.monthly-phone{width:min(100%,430px);margin:0 auto;border-radius:28px;background:#111827;padding:14px;box-shadow:0 18px 42px rgba(15,23,42,.18)}.monthly-screen{min-height:650px;border-radius:20px;background:#8fb7df;padding:18px 14px;overflow:hidden}.monthly-carousel{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}.monthly-card{flex:0 0 260px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,.12)}.monthly-image{position:relative;background:#e5e7eb;aspect-ratio:2/3;display:grid;place-items:center;color:#667085;font-weight:800}.monthly-image img{width:100%;height:100%;object-fit:cover}.monthly-share{position:absolute;top:18px;left:18px;background:#ff334b;color:#fff;border-radius:20px;width:53px;height:25px;display:grid;place-items:center;font-size:12px}.monthly-footer{display:flex;gap:8px;padding:10px}.monthly-footer button{flex:1;border:0;border-radius:6px;background:#06c755;color:#fff;font-weight:800;min-height:34px}.monthly-detail-pop{white-space:pre-wrap;line-height:1.6;color:#344054;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:10px;max-height:290px;overflow:auto}.monthly-warning{color:#b42318;background:#fff3f0;border:1px solid #fecdca;border-radius:8px;padding:10px;font-weight:700}.monthly-link-note{font-size:13px;color:#667085;line-height:1.5}.monthly-linked-box{border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;padding:12px;display:grid;gap:8px}.monthly-linked-box strong{display:block;color:#111827}.monthly-linked-box span{color:#667085;font-size:13px;line-height:1.5}.monthly-empty-link{background:#fffdf5;border-color:#fedf89}.monthly-status-row{display:flex;flex-wrap:wrap;gap:8px}.monthly-status{border-radius:999px;padding:5px 10px;font-weight:800}.monthly-status.ok{background:#dcfae6!important;color:#067647!important}.monthly-status.bad{background:#fee4e2!important;color:#b42318!important}.monthly-detail-pop p{margin:10px 0 0;white-space:pre-wrap}.monthly-image-empty{padding:16px;text-align:center}@media(max-width:1100px){.monthly-workspace{grid-template-columns:1fr}.monthly-preview-panel{position:static}.monthly-phone{width:min(100%,460px)}}@media(max-width:720px){.monthly-basic-grid{grid-template-columns:1fr}}`;
    style.textContent += `.monthly-slide-count{position:absolute;right:12px;bottom:12px;background:rgba(17,24,39,.78);color:#fff;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800}`;
    style.textContent += `.monthly-workspace{display:block}.monthly-left{max-width:980px}.monthly-preview-panel{position:fixed;right:24px;bottom:24px;top:auto;width:min(520px,calc(100vw - 48px));max-height:calc(100vh - 96px);z-index:35;box-shadow:0 18px 48px rgba(15,23,42,.24)}.monthly-preview-panel .panel-head{min-height:52px;background:#3f3f3f;color:#fff;border-bottom:0}.monthly-preview-panel .panel-title{color:#fff}.monthly-preview-panel .muted{color:#d1d5db}.monthly-preview-body{padding:18px;max-height:calc(100vh - 148px);overflow:auto}.monthly-preview-panel .monthly-screen{min-height:auto}.monthly-preview-toggle{width:30px;height:30px;border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font-size:18px;font-weight:900;line-height:1}.monthly-preview-panel.is-collapsed{width:260px;max-height:52px;overflow:hidden}.monthly-preview-panel.is-collapsed .monthly-preview-body,.monthly-preview-panel.is-collapsed .muted{display:none}.monthly-preview-panel.is-collapsed .panel-head{cursor:pointer}@media(max-width:720px){.monthly-preview-panel{right:12px;bottom:12px;width:calc(100vw - 24px)}.monthly-phone{width:min(100%,360px)}.monthly-preview-panel .monthly-screen{min-height:auto}.monthly-card{flex-basis:230px}}`;
    document.head.appendChild(style);
  }

  function render() {
    ensureStyles();
    ensureConfigShape();
    syncPagesFromPublishedActivities();
    const main = document.querySelector(".main");
    if (!main || !config) return;
    selected = Math.min(selected, config.pages.length - 1);
    const page = config.pages[selected];
    main.innerHTML = `<div class="topbar"><div><h1>每月活動</h1></div><div class="actions"><button class="btn" data-monthly-json>複製 FLEX JSON</button><button class="btn primary" data-monthly-publish>發布</button></div></div><div class="monthly-workspace"><div class="monthly-left"><section class="panel"><div class="panel-head"><h2 class="panel-title">基本設定</h2></div><div class="monthly-form">${basicFields()}</div></section><section class="panel"><div class="panel-head"><h2 class="panel-title">活動頁數</h2><div class="actions"><button class="btn" data-monthly-add>新增頁</button><button class="btn danger" data-monthly-delete>刪除頁</button></div></div><div class="monthly-pages">${pageButtons()}</div></section><section class="panel"><div class="panel-head"><h2 class="panel-title">第 ${selected + 1} 頁設定</h2></div>${pageForm(page)}</section></div><aside class="panel monthly-preview-panel ${previewCollapsed() ? "is-collapsed" : ""}"><div class="panel-head" data-monthly-preview-head><div class="actions" style="justify-content:flex-start"><button class="monthly-preview-toggle" type="button" data-monthly-preview-toggle>${previewCollapsed() ? "▴" : "▾"}</button><h2 class="panel-title">預覽</h2></div><span class="muted">橫式多頁 FLEX</span></div><div class="monthly-preview-body" data-monthly-preview-wrap>${preview()}</div></aside></div><div class="toast" id="monthly-toast"></div>`;
    bind();
  }

  function pageButtons() {
    return config.pages.map((item, index) => {
      const page = hydratePage(item);
      const rawLabel = page.activityName || page.activityNo || "";
      const label = rawLabel && !String(rawLabel).startsWith("id-") ? rawLabel : "未選活動";
      return `<button class="monthly-page-btn ${index === selected ? "active" : ""}" data-monthly-select="${index}"><span>第 ${index + 1} 頁</span><strong>${esc(label)}</strong></button>`;
    }).join("");
  }

  function formIdFor(activity) {
    if (!activity) return "";
    const settings = formSettingsFor(activity);
    return trim(activity.formId) || trim(activity.nativeFormId) || trim(activity.opnformFormId) || trim(activity.googleFormId) || trim(settings.formId) || trim(settings.nativeFormId) || trim(settings.opnformFormId) || trim(settings.googleFormId);
  }
  function basicFields() {
    const liveCount = activities().filter(isLiveActivity).length;
    const syncedCount = autoMonthlyActivities().length;
    return `<div class="monthly-basic-grid"><div class="field"><label>月份</label><input name="month" data-monthly-basic value="${esc(config.month || "")}" placeholder="2026-05"></div><div class="monthly-keyword-pill"><span>觸發關鍵字</span><strong>${fixedKeyword}</strong></div><label class="monthly-enabled"><input type="checkbox" name="enabled" data-monthly-enabled ${config.enabled ? "checked" : ""}> 啟用此關鍵字</label></div><div class="monthly-link-note">目前可同步 ${syncedCount} 個活動；全部上架活動 ${liveCount} 個。規則：活動總覽狀態為「上架」就會自動加入每月活動。</div>`;
  }
  function activitySelect(page) {
    const current = page.activityNo || page.activityId || "";
    const rows = activities();
    if (!rows.length) return `<div class="monthly-warning">目前沒有可連動的活動。請先到「創建活動」建立活動，並儲存詳細說明與表單連結。</div>`;
    return `<select name="activityNo" data-monthly-activity><option value="">請選擇活動</option>${rows.map((activity) => {
      const value = activity.activityNo || activity.id || activity.name;
      const label = `${activity.name || "未命名活動"}${activity.activityNo ? `（${activity.activityNo}）` : ""}`;
      return `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
    }).join("")}</select>`;
  }

  function linkedInfo(page) {
    const hydrated = hydratePage(page);
    if (!hydrated.activityName && !hydrated.activityNo) return `<div class="monthly-linked-box monthly-empty-link"><strong>請先選擇活動</strong><span>選擇後會自動帶入詳細說明與報名表，不需要填 LIFF 網址。</span></div>`;
    return `<div class="monthly-linked-box"><strong>${esc(hydrated.activityName || hydrated.activityNo)}</strong><div class="monthly-status-row"><span class="monthly-status ${meaningfulText(hydrated.detailText) ? "ok" : "bad"}">詳細說明：${meaningfulText(hydrated.detailText) ? "已帶入" : "未填"}</span><span class="monthly-status ${trim(hydrated.formUrl) ? "ok" : "bad"}">報名表：${trim(hydrated.formUrl) ? "已連動" : "未連動"}</span></div></div>`;
  }
  function pageForm(page) {
    const hydrated = hydratePage(page);
    const linked = trim(hydrated.activityNo || hydrated.activityId);
    return `<div class="monthly-form"><div class="field"><label>連動活動</label>${activitySelect(page)}<div class="monthly-link-note">只要選活動即可。詳細說明走 LIFF，報名按鈕走該活動的報名表。</div></div>${linkedInfo(page)}<div class="field"><label>活動圖片</label><input type="file" accept="image/*" data-monthly-file><div class="muted">上傳後會自動更新預覽圖片。</div></div><div class="field"><label>圖片網址</label><input name="imageUrl" data-monthly-page value="${esc(page.imageUrl)}" placeholder="上傳後自動填入，也可貼既有海報網址"></div>${!linked ? `<div class="monthly-warning">這頁尚未選擇活動，發布前請先選擇活動。</div>` : ""}${linked && !trim(hydrated.formUrl) ? `<div class="monthly-warning">這個活動還沒有報名表；發布時系統會自動產生並寫回活動。</div>` : ""}${linked && !meaningfulText(hydrated.detailText) ? `<div class="monthly-warning">此活動沒有詳細說明，請回到活動編輯補上「詳細說明」。</div>` : ""}</div>`;
  }
  function pageForm(page) {
    const hydrated = hydratePage(page);
    const linked = trim(hydrated.activityNo || hydrated.activityId);
    return `<div class="monthly-form"><div class="field"><label>連動活動</label>${activitySelect(page)}<div class="monthly-link-note">只要選活動即可。LINE Flex 使用主圖；詳細說明 LIFF 會顯示多張活動圖片輪播。</div></div>${linkedInfo(page)}<div class="field"><label>主圖 / LINE Flex 圖片</label><input type="file" accept="image/*" data-monthly-file><div class="muted">主圖會用在 LINE Flex 卡片與第一張輪播圖。</div></div><div class="field"><label>主圖網址</label><input name="imageUrl" data-monthly-page value="${esc(page.imageUrl)}" placeholder="上傳後自動填入，也可貼既有海報網址"></div><div class="field"><label>活動圖集</label><input type="file" accept="image/*" multiple data-monthly-gallery-file><div class="muted">可一次選多張；LIFF 詳細頁會每 3 秒自動左移換圖。</div></div><div class="field"><label>圖集網址</label><textarea name="galleryUrls" data-monthly-gallery placeholder="每行一張圖片網址">${esc((page.galleryUrls || []).join("\n"))}</textarea></div>${!linked ? `<div class="monthly-warning">這頁尚未選擇活動，發布前請先選擇活動。</div>` : ""}${linked && !trim(hydrated.formUrl) ? `<div class="monthly-warning">這個活動還沒有報名表；發布時系統會自動產生並寫回活動。</div>` : ""}${linked && !meaningfulText(hydrated.detailText) ? `<div class="monthly-warning">此活動沒有詳細說明，請回到活動編輯補上「詳細說明」。</div>` : ""}</div>`;
  }

  function preview() {
    return `<div class="monthly-phone"><div class="monthly-screen"><div class="monthly-carousel">${config.pages.map((rawPage, index) => {
      const page = hydratePage(rawPage);
      const imageUrl = page.imageUrl || defaultImageUrl;
      return `<div class="monthly-card"><div class="monthly-image"><img src="${esc(imageUrl)}" alt=""><div class="monthly-share">分享</div></div><div class="monthly-footer"><button>詳細說明</button><button>點我報名</button></div></div>`;
    }).join("")}</div></div></div>`;
  }
  function preview() {
    return `<div class="monthly-phone"><div class="monthly-screen"><div class="monthly-carousel">${config.pages.map((rawPage, index) => {
      const page = hydratePage(rawPage);
      const images = pageGallery(page);
      const imageUrl = images[0] || defaultImageUrl;
      return `<div class="monthly-card"><div class="monthly-image"><img src="${esc(imageUrl)}" alt=""><div class="monthly-share">分享</div>${images.length > 1 ? `<div class="monthly-slide-count">${images.length} 張</div>` : ""}</div><div class="monthly-footer"><button>詳細說明</button><button>點我報名</button></div></div>`;
    }).join("")}</div></div></div>`;
  }

  function updatePreview() {
    const wrap = document.querySelector("[data-monthly-preview-wrap]");
    if (wrap) wrap.innerHTML = preview();
  }

  function updatePageLabels() {
    const wrap = document.querySelector(".monthly-pages");
    if (wrap) wrap.innerHTML = pageButtons();
    bindPageButtons();
  }

  function formPayloadForActivity(activity) {
    const settings = formSettingsFor(activity);
    settings.registrationMode = activity.registrationMode || settings.registrationMode || "form";
    const fields = Array.isArray(settings.fields) && settings.fields.length ? settings.fields : [
      { key: "name", label: "姓名", type: "text", required: true },
      { key: "phone", label: "手機", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "company", label: "公司/單位", type: "text", required: false },
      { key: "memberNo", label: "會員編號", type: "text", required: false },
      { key: "gender", label: "性別", type: "choice", options: ["男", "女", "不透露"], required: true },
      { key: "isMember", label: "是否為會員", type: "choice", options: ["是", "否", "不確定"], required: true },
      { key: "meal", label: "用餐選項", type: "choice", options: ["葷", "素"], required: true },
      { key: "note", label: "備註", type: "paragraph", required: false }
    ];
    return {
      activity: {
        id: activity.id || "",
        activityNo: activity.activityNo || "",
        name: activity.name || "未命名活動",
        type: activity.typeLabel || activity.type || "",
        courseTime: activity.courseTime || "",
        deadline: activity.deadline || "",
        capacity: Number(activity.capacity || 0),
        checkinPoints: Number(activity.checkinPoints || 0),
        feePoints: Number(activity.feePoints || 0),
        detailText: detailTextFor(activity),
        posterUrl: posterUrlFor(activity),
        imageUrl: posterUrlFor(activity),
        youtubeUrl: activity.youtubeUrl || settings.youtubeUrl || ""
      },
      settings: { ...settings, fields }
    };
  }

  function generatedProviderMeta(formUrl, meta = {}) {
    const data = meta.data || {};
    const provider = meta.provider || data.provider || "native_form";
    const formId = meta.formId || meta.nativeFormId || meta.opnformFormId || data.formId || data.nativeFormId || data.opnformFormId || "";
    return {
      provider,
      formId,
      formUrl,
      editUrl: meta.editUrl || data.editUrl || "",
      sheetUrl: meta.sheetUrl || data.sheetUrl || "",
      nativeFormId: meta.nativeFormId || (provider === "native_form" ? formId : ""),
      nativeFormUrl: meta.nativeFormUrl || (provider === "native_form" ? formUrl : ""),
      googleFormId: meta.googleFormId || (provider === "google_form" ? formId : ""),
      googleFormUrl: meta.googleFormUrl || (provider === "google_form" ? formUrl : ""),
      opnformFormId: meta.opnformFormId || (provider === "opnform" ? formId : ""),
      opnformFormUrl: meta.opnformFormUrl || (provider === "opnform" ? formUrl : "")
    };
  }

  function persistGeneratedFormUrl(activity, formUrl, meta = {}) {
    const data = localData();
    data.formSettings ||= {};
    const row = Array.isArray(data.activities)
      ? data.activities.find((item) => String(item.id || "") === String(activity.id || "") || String(item.activityNo || "") === String(activity.activityNo || "") || String(item.name || "") === String(activity.name || ""))
      : null;
    const target = row || activity;
    const normalized = generatedProviderMeta(formUrl, meta);
    target.formMode = normalized.provider;
    target.registrationMode = activity.registrationMode || target.registrationMode || data.formSettings[target.id]?.registrationMode || "form";
    target.formUrl = formUrl;
    target.formId = normalized.formId || target.formId || "";
    target.nativeFormUrl = normalized.nativeFormUrl || target.nativeFormUrl || "";
    target.nativeFormId = normalized.nativeFormId || target.nativeFormId || "";
    target.googleFormUrl = normalized.googleFormUrl || target.googleFormUrl || "";
    target.googleFormId = normalized.googleFormId || target.googleFormId || "";
    target.googleFormEditUrl = normalized.provider === "google_form" ? (normalized.editUrl || target.googleFormEditUrl || "") : (target.googleFormEditUrl || "");
    target.googleSheetUrl = normalized.sheetUrl || target.googleSheetUrl || "";
    target.opnformFormUrl = normalized.opnformFormUrl || target.opnformFormUrl || "";
    target.opnformFormId = normalized.opnformFormId || target.opnformFormId || "";
    data.formSettings[target.id] ||= {};
    Object.assign(data.formSettings[target.id], formSettingsFor(activity), { registrationMode: target.registrationMode, formUrl, formMode: target.formMode, formId: target.formId, nativeFormUrl: target.nativeFormUrl, nativeFormId: target.nativeFormId, googleFormUrl: target.googleFormUrl, googleFormId: target.googleFormId, opnformFormUrl: target.opnformFormUrl, opnformFormId: target.opnformFormId, editUrl: target.googleFormEditUrl, sheetUrl: target.googleSheetUrl });
    if (target.activityNo) {
      data.formSettings[target.activityNo] ||= {};
      Object.assign(data.formSettings[target.activityNo], data.formSettings[target.id]);
    }
    saveLocalData(data);
    return target;
  }

  function saveLocalData(data) {
    localStorage.setItem(dataKey, JSON.stringify(data));
  }

  async function generateFormForActivity(activity) {
    const response = await fetch(`${api}/api/google-forms/create`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(formPayloadForActivity(activity))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Google 報名表自動產生失敗");
    }
    const formUrl = result.formUrl || result.responderUri || result.data?.formUrl || result.data?.responderUri;
    if (!formUrl) throw new Error("Google 報名表已建立，但沒有收到公開報名網址");
    return { formUrl, formId: result.formId || result.data?.formId || "", editUrl: result.editUrl || result.data?.editUrl || "", sheetUrl: result.sheetUrl || result.data?.sheetUrl || "" };
  }

  async function generateManagedFormForActivity(activity) {
    const payload = formPayloadForActivity(activity);
    const native = await fetch(`${api}/api/native-forms/create`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload)
    });
    const nativeResult = await native.json().catch(() => ({}));
    if (!native.ok || !nativeResult.success) throw new Error(nativeResult.message || "自建報名表產生失敗");
    const nativeUrl = nativeResult.formUrl || nativeResult.nativeFormUrl || nativeResult.data?.formUrl || nativeResult.data?.nativeFormUrl || "";
    if (!nativeUrl) throw new Error("報名表已建立，但沒有取得公開網址。");
    return {
      provider: "native_form",
      formUrl: nativeUrl,
      formId: nativeResult.formId || nativeResult.nativeFormId || nativeResult.data?.formId || "",
      nativeFormId: nativeResult.nativeFormId || nativeResult.formId || nativeResult.data?.nativeFormId || "",
      nativeFormUrl: nativeUrl
    };

    const opnform = await fetch(`${api}/api/opnform/create`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload)
    });
    const opnformResult = await opnform.json().catch(() => ({}));
    if (opnform.ok && opnformResult.success) {
      return {
        provider: "opnform",
        formUrl: opnformResult.formUrl || opnformResult.opnformFormUrl || opnformResult.data?.formUrl || opnformResult.data?.opnformFormUrl || "",
        formId: opnformResult.formId || opnformResult.opnformFormId || opnformResult.data?.formId || opnformResult.data?.opnformFormId || "",
        opnformFormId: opnformResult.opnformFormId || opnformResult.formId || opnformResult.data?.opnformFormId || "",
        opnformFormUrl: opnformResult.opnformFormUrl || opnformResult.formUrl || opnformResult.data?.opnformFormUrl || ""
      };
    }
    if (opnform.status && opnform.status !== 404 && opnform.status !== 503 && opnformResult.code !== "opnform_not_configured") {
      throw new Error(opnformResult.message || "OpnForm 報名表產生失敗");
    }

    const response = await fetch(`${api}/api/google-forms/create`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Google 報名表產生失敗");
    const formUrl = result.formUrl || result.responderUri || result.data?.formUrl || result.data?.responderUri;
    if (!formUrl) throw new Error("報名表已建立，但沒有取得公開網址。");
    return { provider: "google_form", formUrl, formId: result.formId || result.data?.formId || "", editUrl: result.editUrl || result.data?.editUrl || "", sheetUrl: result.sheetUrl || result.data?.sheetUrl || "" };
  }

  async function generateFormForActivity(activity) {
    return generateManagedFormForActivity(activity);
  }

  async function ensureFormUrls() {
    for (let index = 0; index < config.pages.length; index += 1) {
      const page = hydratePage(config.pages[index]);
      const currentImageUrl = trim(page.imageUrl);
      const activity = findActivity(page.activityNo || page.activityId);
      if (!activity) return `第 ${index + 1} 頁尚未選擇活動`;
      toast(`第 ${index + 1} 頁正在自動產生報名表...`);
      try {
        const generated = await generateFormForActivity(activityPayloadForPage(page, activity));
        const saved = persistGeneratedFormUrl(activity, generated.formUrl, generated);
        applyActivityToPage(config.pages[index], saved);
        config.pages[index].formImageUrl = currentImageUrl;
      } catch (error) {
        return `第 ${index + 1} 頁報名表自動產生失敗：${error.message}`;
      }
    }
    return "";
  }

  function buildFlex() {
    return { type: "carousel", contents: config.pages.slice(0, 12).map((rawPage) => {
      const page = hydratePage(rawPage);
      const detailUri = detailUrlForPage(page);
      const formUri = registerUrlForPage(page);
      const shareUri = shareUrlForPage(page);
      return { type: "bubble", size: "kilo", body: { type: "box", layout: "vertical", paddingAll: "0px", contents: [{ type: "image", url: page.imageUrl || defaultImageUrl, size: "full", aspectMode: "cover", aspectRatio: "2:3", gravity: "top", action: { type: "uri", label: "報名", uri: formUri } }, { type: "box", layout: "vertical", position: "absolute", cornerRadius: "20px", offsetTop: "18px", backgroundColor: "#ff334b", offsetStart: "18px", height: "25px", width: "53px", action: { type: "uri", label: "分享", uri: shareUri }, contents: [{ type: "text", text: "分享", color: "#ffffff", align: "center", size: "xs", offsetTop: "3px", action: { type: "uri", label: "分享", uri: shareUri } }] }] }, footer: { type: "box", layout: "horizontal", contents: [{ type: "button", action: { type: "uri", label: "詳細說明", uri: detailUri }, height: "sm", style: "primary" }, { type: "button", action: { type: "uri", label: "點我報名", uri: formUri }, height: "sm", style: "primary", margin: "md" }] } };
    }) };
  }

  function validateForPublish() {
    for (let index = 0; index < config.pages.length; index += 1) {
      const page = hydratePage(config.pages[index]);
      if (!trim(page.activityNo) && !trim(page.activityId)) return `第 ${index + 1} 頁尚未選擇活動`;
      if (!meaningfulText(page.detailText)) return `第 ${index + 1} 頁連動活動缺少詳細說明`;
    }
    return "";
  }

  function canAutoPublish() {
    if (!config || !Array.isArray(config.pages) || !config.pages.length) return false;
    if (validateForPublish()) return false;
    return config.pages.every((page) => trim(hydratePage(page).formUrl));
  }

  function prepareMonthlyPayload() {
    config.keyword = fixedKeyword;
    config.pages = config.pages.map((page, order) => {
      const hydrated = hydratePage(page);
      return { ...hydrated, detailUrl: detailUrlForPage(hydrated), formUrl: registerUrlForPage(hydrated), order };
    }).slice(0, 12);
    config.enabled = config.pages.length > 0;
    return config;
  }

  function scheduleAutoPublish() {
    if (!hasAdminIdentity() || !canAutoPublish()) return;
    clearTimeout(autoPublishTimer);
    autoPublishTimer = setTimeout(autoPublish, 800);
  }

  async function autoPublish() {
    if (!hasAdminIdentity() || autoPublishBusy || !canAutoPublish()) return;
    const signature = pagesSignature();
    if (signature === lastAutoPublishSignature) return;
    autoPublishBusy = true;
    try {
      const payload = prepareMonthlyPayload();
      const res = await fetch(`${api}/api/monthly-activity`, { method: "PUT", headers: adminHeaders({ "content-type": "application/json" }), body: JSON.stringify(payload) });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.success) {
        config = result.data;
        ensureConfigShape();
        lastAutoPublishSignature = pagesSignature();
        toast("每月活動已自動同步到 LINE 觸發內容");
      }
    } finally {
      autoPublishBusy = false;
    }
  }

  function bindPageButtons() {
    document.querySelectorAll("[data-monthly-select]").forEach((button) => button.addEventListener("click", () => { selected = Number(button.dataset.monthlySelect || 0); render(); }));
  }

  function bind() {
    const togglePreview = () => {
      setPreviewCollapsed(!previewCollapsed());
      render();
    };
    document.querySelector("[data-monthly-preview-toggle]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePreview();
    });
    document.querySelector("[data-monthly-preview-head]")?.addEventListener("click", () => {
      if (previewCollapsed()) togglePreview();
    });
    document.querySelectorAll("[data-monthly-basic]").forEach((input) => input.addEventListener("input", () => { config[input.name] = input.value; if (input.name === "month") render(); else updatePreview(); }));
    document.querySelector("[data-monthly-enabled]")?.addEventListener("change", (event) => { config.enabled = event.target.checked; });
    bindPageButtons();
    document.querySelector("[data-monthly-add]")?.addEventListener("click", () => { if (config.pages.length >= 12) return toast("LINE carousel 最多 12 頁"); config.pages.push(blankPage()); selected = config.pages.length - 1; render(); });
    document.querySelector("[data-monthly-delete]")?.addEventListener("click", () => { if (config.pages.length <= 1) return toast("至少保留 1 頁"); config.pages.splice(selected, 1); selected = Math.max(0, selected - 1); render(); });
    document.querySelector("[data-monthly-activity]")?.addEventListener("change", (event) => { const page = config.pages[selected]; const activity = findActivity(event.target.value); page.activityNo = activity?.activityNo || ""; page.activityId = activity?.id || event.target.value || ""; if (activity) applyActivityToPage(page, activity); updatePreview(); updatePageLabels(); render(); });
    document.querySelectorAll("[data-monthly-page]").forEach((input) => input.addEventListener("input", () => { const page = config.pages[selected]; page[input.name] = input.value; updatePreview(); if (input.name === "imageUrl") updatePageLabels(); }));
    document.querySelectorAll("[data-monthly-gallery]").forEach((input) => input.addEventListener("input", () => { const page = config.pages[selected]; page.galleryUrls = uniqueUrls([input.value]); updatePreview(); }));
    document.querySelector("[data-monthly-file]")?.addEventListener("change", uploadImage);
    document.querySelector("[data-monthly-gallery-file]")?.addEventListener("change", uploadGalleryImages);
    document.querySelector("[data-monthly-json]")?.addEventListener("click", async () => { if (!hasAdminIdentity()) return toast("尚未登入，暫不能產生 FLEX JSON。"); const autoCount = syncPagesFromPublishedActivities({ allowEmpty: true, autoPublish: false }); if (!autoCount) return toast("目前沒有狀態為上架的活動。"); const formError = await ensureFormUrls(); if (formError) return toast(formError); const validation = validateForPublish(); if (validation) return toast(validation); await navigator.clipboard.writeText(JSON.stringify(buildFlex(), null, 2)); toast("FLEX JSON 已複製"); });
    document.querySelector("[data-monthly-publish]")?.addEventListener("click", publish);
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!hasAdminIdentity()) return toast("尚未登入，暫不能上傳。請重新登入管理中心。");
    const page = hydratePage(config.pages[selected]);
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "monthly");
    form.append("activityId", page.activityNo || page.activityId || config.month || "draft");
    const res = await fetch(`${api}/api/uploads`, { method: "POST", headers: adminHeaders(), body: form });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.url) return toast(result.message || "上傳失敗");
    config.pages[selected].imageUrl = result.url.startsWith("http") ? result.url : api + result.url;
    render();
    toast("圖片已上傳");
  }

  async function uploadGalleryImages(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (!hasAdminIdentity()) return toast("請先登入管理者，才能上傳活動圖集");
    const page = hydratePage(config.pages[selected]);
    const uploadedUrls = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "monthly-gallery");
      form.append("activityId", page.activityNo || page.activityId || config.month || "draft");
      const res = await fetch(`${api}/api/uploads`, { method: "POST", headers: adminHeaders(), body: form });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.url) uploadedUrls.push(result.url.startsWith("http") ? result.url : api + result.url);
    }
    if (!uploadedUrls.length) return toast("圖集上傳失敗");
    const rawPage = config.pages[selected];
    rawPage.galleryUrls = uniqueUrls([rawPage.galleryUrls, uploadedUrls]);
    if (!rawPage.imageUrl) rawPage.imageUrl = rawPage.galleryUrls[0];
    render();
    toast(`已上傳 ${uploadedUrls.length} 張圖集圖片`);
  }

  async function publish() {
    if (!hasAdminIdentity()) return toast("尚未登入，暫不能發布。請重新登入管理中心。");
    const autoCount = syncPagesFromPublishedActivities({ allowEmpty: true, autoPublish: false });
    if (!autoCount) return toast("目前沒有狀態為上架的活動，無法發布每月活動。");
    const formError = await ensureFormUrls();
    if (formError) return toast(formError);
    const validation = validateForPublish();
    if (validation) return toast(validation);
    const res = await fetch(`${api}/api/monthly-activity`, { method: "PUT", headers: adminHeaders({ "content-type": "application/json" }), body: JSON.stringify(prepareMonthlyPayload()) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.success) return toast(result.message || "發布失敗");
    config = result.data;
    ensureConfigShape();
    lastAutoPublishSignature = pagesSignature();
    render();
    toast("已發布，關鍵字 TDEA每月活動 已啟用");
  }

  function toast(message) {
    const el = document.querySelector("#monthly-toast") || document.querySelector("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2600);
  }

  function schedule() { ensureNav(); if (active) setActiveNav(); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => { if (event.target.closest(".nav button:not([data-monthly-zone])")) active = false; }, true);
  schedule();
})();
