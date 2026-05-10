(() => {
  const key = "tdea-manager-v3";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const nativeSetItem = localStorage.setItem.bind(localStorage);

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    nativeSetItem(key, JSON.stringify(data));
  }

  function ensureData(data) {
    data.activities ||= [];
    return data;
  }

  function activeActivityForm() {
    return document.querySelector("#drawer-activity") || document.querySelector("#activity-form");
  }

  function activityId(form) {
    return form?.querySelector("input[name='id']")?.value || "";
  }

  function activityName(form) {
    return form?.querySelector("input[name='name']")?.value?.trim() || "";
  }

  function detailText(form) {
    return form?.querySelector("textarea[name='detailText']")?.value || "";
  }

  function findActivity(data, form) {
    ensureData(data);
    const id = activityId(form);
    if (id) return data.activities.find((item) => item.id === id) || null;
    const name = activityName(form);
    if (name) return data.activities.find((item) => String(item.name || "").trim() === name) || data.activities[0] || null;
    return data.activities[0] || null;
  }

  function mergeVisibleDetail(data) {
    const form = activeActivityForm();
    const textarea = form?.querySelector("textarea[name='detailText']");
    if (!form || !textarea) return data;
    const activity = findActivity(data, form);
    if (!activity) return data;
    activity.detailText = textarea.value;
    data.formSettings ||= {};
    const detail = textarea.value;
    const keys = [activity.id, activity.activityNo, activity.name].map((value) => String(value || "").trim()).filter(Boolean);
    keys.forEach((key) => {
      data.formSettings[key] ||= {};
      data.formSettings[key].detailText = detail;
    });
    return data;
  }

  localStorage.setItem = function patchedSetItem(name, value) {
    if (name !== key) return nativeSetItem(name, value);
    try {
      const data = mergeVisibleDetail(JSON.parse(value));
      return nativeSetItem(name, JSON.stringify(data));
    } catch (_) {
      return nativeSetItem(name, value);
    }
  };

  function ensureStyle() {
    if (document.querySelector("#activity-detail-style")) return;
    const style = document.createElement("style");
    style.id = "activity-detail-style";
    style.textContent = `
      .activity-detail-preview{margin:10px 0 0;color:#475467;line-height:1.6;white-space:pre-wrap;font-size:14px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
      .activity-number-chip{display:inline-flex;align-items:center;width:max-content;min-height:36px;padding:0 12px;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#344054;font-weight:800}
      .activity-save-note{margin-top:6px;color:#027a48;font-size:13px;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function injectDetailField(form) {
    if (!form || form.querySelector("textarea[name='detailText']")) return;
    const data = ensureData(load());
    const activity = findActivity(data, form) || {};
    const field = document.createElement("div");
    field.className = "field";
    field.dataset.activityDetailField = "true";
    field.innerHTML = `<label>詳細說明</label><textarea name="detailText" placeholder="活動介紹、課程內容、地點、費用、注意事項...">${esc(activity.detailText || "")}</textarea><div class="activity-save-note">詳細說明會隨儲存寫入</div>`;
    const formUrlField = form.querySelector("input[name='formUrl']")?.closest(".field");
    const submit = form.querySelector("button[type='submit']");
    (formUrlField || submit)?.insertAdjacentElement("beforebegin", field);
  }

  function persistCurrentDetail() {
    const form = activeActivityForm();
    if (!form?.querySelector("textarea[name='detailText']")) return;
    const data = mergeVisibleDetail(ensureData(load()));
    save(data);
  }

  function annotatePreviewCards() {
    const data = ensureData(load());
    const map = new Map(data.activities.map((item) => [item.id, item]));
    document.querySelectorAll("[data-register]").forEach((button) => {
      const card = button.closest(".activity-card");
      if (!card || card.querySelector(".activity-detail-preview")) return;
      const activity = map.get(button.dataset.register || "");
      if (activity?.detailText) button.insertAdjacentHTML("beforebegin", `<div class="activity-detail-preview">${esc(activity.detailText)}</div>`);
    });
  }

  function install() {
    ensureStyle();
    document.querySelectorAll("#activity-form, #drawer-activity").forEach(injectDetailField);
    document.querySelectorAll("textarea[name='detailText']").forEach((textarea) => {
      if (textarea.dataset.detailSaveReady) return;
      textarea.dataset.detailSaveReady = "true";
      textarea.addEventListener("input", persistCurrentDetail);
      textarea.addEventListener("change", persistCurrentDetail);
    });
    annotatePreviewCards();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button && /儲存|建立/.test(button.textContent || "")) persistCurrentDetail();
  }, true);

  document.addEventListener("submit", persistCurrentDetail, true);
  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
})();
