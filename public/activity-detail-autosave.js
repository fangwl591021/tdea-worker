(() => {
  const key = "tdea-manager-v3";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) { localStorage.setItem(key, JSON.stringify(data)); }

  function formActivityId(form) {
    return form?.querySelector("input[name='id']")?.value || "";
  }

  function findActivity(data, form) {
    data.activities ||= [];
    const id = formActivityId(form);
    if (id) return data.activities.find((item) => item.id === id) || null;
    const name = form?.querySelector("input[name='name']")?.value?.trim();
    if (name) return data.activities.find((item) => String(item.name || "").trim() === name) || null;
    return null;
  }

  function persist(textarea) {
    const form = textarea.closest("form");
    const data = load();
    const activity = findActivity(data, form);
    if (!activity) return;
    activity.detailText = textarea.value;
    save(data);
  }

  function fill(textarea) {
    if (textarea.value.trim()) return;
    const form = textarea.closest("form");
    const data = load();
    const activity = findActivity(data, form);
    if (activity?.detailText) textarea.value = activity.detailText;
  }

  function install() {
    document.querySelectorAll("textarea[name='detailText']").forEach((textarea) => {
      if (textarea.dataset.detailAutosaveReady) return;
      textarea.dataset.detailAutosaveReady = "true";
      fill(textarea);
      textarea.addEventListener("input", () => persist(textarea));
      textarea.addEventListener("change", () => persist(textarea));
    });
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const textarea = form.querySelector("textarea[name='detailText']");
    if (textarea) persist(textarea);
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !/儲存|建立/.test(button.textContent || "")) return;
    const form = button.closest("form");
    const textarea = form?.querySelector("textarea[name='detailText']");
    if (textarea) persist(textarea);
  }, true);

  function showDebugValue() {
    document.querySelectorAll("textarea[name='detailText']").forEach((textarea) => {
      const form = textarea.closest("form");
      const data = load();
      const activity = findActivity(data, form);
      if (!activity || textarea.dataset.detailDebugReady) return;
      textarea.dataset.detailDebugReady = "true";
      const note = document.createElement("div");
      note.className = "muted";
      note.style.marginTop = "6px";
      note.textContent = activity.detailText ? "已讀取已儲存的詳細說明。" : "輸入後會即時儲存。";
      textarea.closest(".field")?.appendChild(note);
    });
  }

  function run() {
    install();
    showDebugValue();
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  run();
})();
