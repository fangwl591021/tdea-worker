(() => {
  const key = "tdea-manager-v3";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

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

  function detailField(value = "") {
    return `<div class="field" data-activity-detail-field><label>詳細說明</label><textarea name="detailText" placeholder="活動介紹、課程內容、地點、費用、注意事項...">${esc(value)}</textarea><div class="activity-save-note">即時儲存已啟用</div></div>`;
  }

  function numberField(value = "建立後自動產生") {
    return `<div class="field" data-activity-number-field><label>活動編號</label><div class="activity-number-chip">${esc(value)}</div></div>`;
  }

  function formActivityId(form) { return form?.querySelector("input[name='id']")?.value || ""; }
  function formActivityName(form) { return form?.querySelector("input[name='name']")?.value?.trim() || ""; }

  function findActivity(data, form) {
    ensureData(data);
    const id = formActivityId(form);
    if (id) return data.activities.find((item) => item.id === id) || null;
    const name = formActivityName(form);
    if (name) return data.activities.find((item) => String(item.name || "").trim() === name) || null;
    return null;
  }

  function currentActivityForForm(form) {
    const data = ensureData(load());
    return findActivity(data, form);
  }

  function enhanceCreator() {
    const form = document.querySelector("#activity-form");
    if (!form) return;
    const googleBlock = form.querySelector(".form-builder-block");
    const submit = form.querySelector("button[type='submit']");
    if (!form.querySelector("[data-activity-number-field]")) {
      const holder = document.createElement("div");
      holder.innerHTML = numberField();
      const field = holder.firstElementChild;
      const nameField = form.querySelector("input[name='name']")?.closest(".field");
      if (nameField) nameField.insertAdjacentElement("afterend", field);
      else (googleBlock || submit)?.insertAdjacentElement("beforebegin", field);
    }
    if (!form.querySelector("[data-activity-detail-field]")) {
      const holder = document.createElement("div");
      holder.innerHTML = detailField();
      const field = holder.firstElementChild;
      if (googleBlock) googleBlock.insertAdjacentElement("beforebegin", field);
      else submit?.insertAdjacentElement("beforebegin", field);
    }
  }

  function enhanceDrawer() {
    const form = document.querySelector("#drawer-activity");
    if (!form) return;
    const activity = currentActivityForForm(form) || {};
    const nameField = form.querySelector("input[name='name']")?.closest(".field");
    const formUrlField = form.querySelector("input[name='formUrl']")?.closest(".field");
    const submit = form.querySelector("button[type='submit']");
    if (!form.querySelector("[data-activity-number-field]")) {
      const holder = document.createElement("div");
      holder.innerHTML = numberField(activity.activityNo || "尚未產生");
      const field = holder.firstElementChild;
      if (nameField) nameField.insertAdjacentElement("afterend", field);
      else submit?.insertAdjacentElement("beforebegin", field);
    }
    if (!form.querySelector("[data-activity-detail-field]")) {
      const holder = document.createElement("div");
      holder.innerHTML = detailField(activity.detailText || "");
      const field = holder.firstElementChild;
      if (formUrlField) formUrlField.insertAdjacentElement("beforebegin", field);
      else submit?.insertAdjacentElement("beforebegin", field);
    }
  }

  function persistTextarea(textarea) {
    const form = textarea.closest("form");
    if (form?.id !== "drawer-activity") return;
    const data = ensureData(load());
    const activity = findActivity(data, form);
    if (!activity) return;
    if (!activity.activityNo) activity.activityNo = nextActivityNo(data);
    activity.detailText = textarea.value;
    save(data);
  }

  function installAutosave() {
    document.querySelectorAll("textarea[name='detailText']").forEach((textarea) => {
      if (textarea.dataset.detailAutosaveReady) return;
      textarea.dataset.detailAutosaveReady = "true";
      const activity = currentActivityForForm(textarea.closest("form"));
      if (!textarea.value.trim() && activity?.detailText) textarea.value = activity.detailText;
      textarea.addEventListener("input", () => persistTextarea(textarea));
      textarea.addEventListener("change", () => persistTextarea(textarea));
    });
  }

  function saveForm(form) {
    const data = ensureData(load());
    let activity = findActivity(data, form);
    if (!activity) {
      activity = { id: uid(), activityNo: nextActivityNo(data), reg: 0, check: 0, formUrl: "" };
      data.activities.unshift(activity);
    }
    if (!activity.activityNo) activity.activityNo = nextActivityNo(data);
    const get = (selector) => form.querySelector(selector)?.value || "";
    activity.name = get("input[name='name']").trim() || activity.name || "未命名活動";
    activity.type = get("select[name='type']") || activity.type || "講座類";
    activity.courseTime = get("input[name='courseTime']");
    activity.deadline = get("input[name='deadline']");
    activity.capacity = Number(get("input[name='capacity']") || activity.capacity || 0);
    activity.reg = Number(get("input[name='reg']") || activity.reg || 0);
    activity.check = Number(get("input[name='check']") || activity.check || 0);
    activity.status = get("select[name='status']") || activity.status || "下架";
    activity.formUrl = get("input[name='formUrl']") || activity.formUrl || "";
    activity.detailText = get("textarea[name='detailText']");
    activity.posterUrl = get("input[name='posterUrl']") || activity.posterUrl || "";
    activity.youtubeUrl = get("input[name='youtubeUrl']") || activity.youtubeUrl || "";
    save(data);
  }

  function finishActivitySave(form) {
    saveForm(form);
    setTimeout(() => location.reload(), 120);
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id !== "activity-form" && form.id !== "drawer-activity") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finishActivitySave(form);
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !/儲存|建立/.test(button.textContent || "")) return;
    const form = button.closest("form");
    if (form?.id !== "activity-form" && form?.id !== "drawer-activity") return;
    saveForm(form);
  }, true);

  function annotatePreviewCards() {
    const data = ensureData(load());
    const map = new Map(data.activities.map((item) => [item.id, item]));
    document.querySelectorAll("[data-register]").forEach((button) => {
      const card = button.closest(".activity-card");
      if (!card) return;
      const activity = map.get(button.dataset.register || "");
      if (activity?.activityNo && !card.querySelector(".activity-number-chip")) card.querySelector("h3")?.insertAdjacentHTML("afterend", `<div class="activity-number-chip">${esc(activity.activityNo)}</div>`);
      if (activity?.detailText && !card.querySelector(".activity-detail-preview")) button.insertAdjacentHTML("beforebegin", `<div class="activity-detail-preview">${esc(activity.detailText)}</div>`);
    });
  }

  function backfillActivityNumbers() {
    const data = ensureData(load());
    let changed = false;
    data.activities.forEach((activity) => {
      if (!activity.activityNo) {
        activity.activityNo = nextActivityNo(data);
        changed = true;
      }
    });
    if (changed) save(data);
  }

  function run() {
    ensureStyle();
    backfillActivityNumbers();
    enhanceCreator();
    enhanceDrawer();
    installAutosave();
    annotatePreviewCards();
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  run();
})();
