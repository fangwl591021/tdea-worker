(() => {
  const key = "tdea-manager-v3";

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) { localStorage.setItem(key, JSON.stringify(data)); }
  function uid() { return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function todayCode() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }

  function nextActivityNo(data) {
    const prefix = `ACT-${todayCode()}`;
    const count = (data.activities || []).filter((item) => String(item.activityNo || "").startsWith(prefix)).length + 1;
    return `${prefix}-${String(count).padStart(3, "0")}`;
  }

  function ensureData(data) {
    data.activities ||= [];
    data.association ||= [];
    data.vendor ||= [];
    return data;
  }

  function findActivity(data, form) {
    ensureData(data);
    const id = form?.querySelector("input[name='id']")?.value || "";
    if (id) return data.activities.find((item) => item.id === id) || null;
    const name = form?.querySelector("input[name='name']")?.value?.trim() || "";
    if (name) return data.activities.find((item) => String(item.name || "").trim() === name) || null;
    return null;
  }

  function readForm(form) {
    const get = (selector) => form.querySelector(selector)?.value || "";
    return {
      name: get("input[name='name']").trim() || "未命名活動",
      type: get("select[name='type']") || "講座類",
      courseTime: get("input[name='courseTime']"),
      deadline: get("input[name='deadline']"),
      capacity: Number(get("input[name='capacity']") || 0),
      reg: Number(get("input[name='reg']") || 0),
      check: Number(get("input[name='check']") || 0),
      status: get("select[name='status']") || "下架",
      formUrl: get("input[name='formUrl']"),
      detailText: get("textarea[name='detailText']"),
      posterUrl: get("input[name='posterUrl']"),
      youtubeUrl: get("input[name='youtubeUrl']")
    };
  }

  function persistForm(form) {
    const data = ensureData(load());
    let activity = findActivity(data, form);
    if (!activity) {
      activity = { id: uid(), activityNo: nextActivityNo(data), reg: 0, check: 0, formUrl: "" };
      data.activities.unshift(activity);
    }
    Object.assign(activity, readForm(form));
    if (!activity.activityNo) activity.activityNo = nextActivityNo(data);
    save(data);
  }

  function fill(textarea) {
    if (textarea.value.trim()) return;
    const activity = findActivity(load(), textarea.closest("form"));
    if (activity?.detailText) textarea.value = activity.detailText;
  }

  function install() {
    document.querySelectorAll("textarea[name='detailText']").forEach((textarea) => {
      if (textarea.dataset.legacyDetailAutosaveReady) return;
      textarea.dataset.legacyDetailAutosaveReady = "true";
      fill(textarea);
      textarea.addEventListener("input", () => {
        const form = textarea.closest("form");
        if (form?.id === "drawer-activity") persistForm(form);
      });
      const note = document.createElement("div");
      note.className = "activity-save-note muted";
      note.style.marginTop = "6px";
      note.textContent = "詳細說明會在儲存時寫入。";
      textarea.closest(".field")?.appendChild(note);
    });
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id !== "activity-form" && form.id !== "drawer-activity") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    persistForm(form);
    setTimeout(() => location.reload(), 120);
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !/儲存|建立/.test(button.textContent || "")) return;
    const form = button.closest("form");
    if (form?.id === "activity-form" || form?.id === "drawer-activity") persistForm(form);
  }, true);

  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
})();
