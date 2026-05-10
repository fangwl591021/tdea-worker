(() => {
  const key = "tdea-manager-v3";
  if (window.__tdeaDetailStorageGuard) return;
  window.__tdeaDetailStorageGuard = true;
  const nativeSetItem = localStorage.setItem.bind(localStorage);

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    nativeSetItem(key, JSON.stringify(data));
  }

  function activeForm() {
    return document.querySelector("#drawer-activity") || document.querySelector("#activity-form");
  }

  function merge(data) {
    data.activities ||= [];
    const form = activeForm();
    const textarea = form?.querySelector("textarea[name='detailText']");
    if (!textarea) return data;
    const id = form.querySelector("input[name='id']")?.value || "";
    const name = form.querySelector("input[name='name']")?.value?.trim() || "";
    const activity = (id && data.activities.find((item) => item.id === id)) || (name && data.activities.find((item) => String(item.name || "").trim() === name)) || data.activities[0];
    if (activity) {
      activity.detailText = textarea.value;
      data.formSettings ||= {};
      [activity.id, activity.activityNo, activity.name].map((value) => String(value || "").trim()).filter(Boolean).forEach((key) => {
        data.formSettings[key] ||= {};
        data.formSettings[key].detailText = textarea.value;
      });
    }
    return data;
  }

  localStorage.setItem = function patchedSetItem(name, value) {
    if (name !== key) return nativeSetItem(name, value);
    try { return nativeSetItem(name, JSON.stringify(merge(JSON.parse(value)))); }
    catch (_) { return nativeSetItem(name, value); }
  };

  function persist() {
    const form = activeForm();
    if (!form?.querySelector("textarea[name='detailText']")) return;
    save(merge(load()));
  }

  function install() {
    document.querySelectorAll("textarea[name='detailText']").forEach((textarea) => {
      if (textarea.dataset.detailGuardReady) return;
      textarea.dataset.detailGuardReady = "true";
      textarea.addEventListener("input", persist);
      textarea.addEventListener("change", persist);
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button && /儲存|建立/.test(button.textContent || "")) persist();
  }, true);
  document.addEventListener("submit", persist, true);
  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
})();
