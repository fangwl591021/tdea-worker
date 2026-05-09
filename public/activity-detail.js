(() => {
  const key = "tdea-manager-v3";
  let pendingNewDetail = "";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }

  function save(data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function todayCode() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }

  function nextActivityNo(data) {
    const prefix = `ACT-${todayCode()}`;
    const count = (data.activities || []).filter((item) => String(item.activityNo || "").startsWith(prefix)).length + 1;
    return `${prefix}-${String(count).padStart(3, "0")}`;
  }

  function ensureStyle() {
    if (document.querySelector("#activity-detail-style")) return;
    const style = document.createElement("style");
    style.id = "activity-detail-style";
    style.textContent = `
      .activity-detail-preview{margin:10px 0 0;color:#475467;line-height:1.6;white-space:pre-wrap;font-size:14px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
      .activity-number-chip{display:inline-flex;align-items:center;width:max-content;min-height:36px;padding:0 12px;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#344054;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  function detailField(value = "") {
    return `<div class="field" data-activity-detail-field><label>詳細說明</label><textarea name="detailText" placeholder="活動介紹、課程內容、地點、費用、注意事項...">${esc(value)}</textarea></div>`;
  }

  function numberField(value = "建立後自動產生") {
    return `<div class="field" data-activity-number-field><label>活動編號</label><div class="activity-number-chip">${esc(value)}</div></div>`;
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
    const id = form.querySelector("input[name='id']")?.value || "";
    const data = load();
    const activity = data.activities?.find((item) => item.id === id) || {};
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

  function annotatePreviewCards() {
    const data = load();
    const map = new Map((data.activities || []).map((item) => [item.id, item]));
    document.querySelectorAll("[data-register]").forEach((button) => {
      const card = button.closest(".activity-card");
      if (!card) return;
      const activity = map.get(button.dataset.register || "");
      if (activity?.activityNo && !card.querySelector(".activity-number-chip")) {
        card.querySelector("h3")?.insertAdjacentHTML("afterend", `<div class="activity-number-chip">${esc(activity.activityNo)}</div>`);
      }
      if (activity?.detailText && !card.querySelector(".activity-detail-preview")) {
        button.insertAdjacentHTML("beforebegin", `<div class="activity-detail-preview">${esc(activity.detailText)}</div>`);
      }
    });
  }

  function persistNewDetail() {
    const detail = pendingNewDetail.trim();
    pendingNewDetail = "";
    const data = load();
    const latest = data.activities?.[0];
    if (!latest) return;
    if (!latest.activityNo) latest.activityNo = nextActivityNo(data);
    if (detail) latest.detailText = detail;
    save(data);
  }

  function persistDrawerDetail(id, detail) {
    const data = load();
    const activity = data.activities?.find((item) => item.id === id);
    if (!activity) return;
    if (!activity.activityNo) activity.activityNo = nextActivityNo(data);
    activity.detailText = detail.trim();
    save(data);
  }

  function backfillActivityNumbers() {
    const data = load();
    if (!Array.isArray(data.activities)) return;
    let changed = false;
    data.activities.forEach((activity) => {
      if (!activity.activityNo) {
        activity.activityNo = nextActivityNo(data);
        changed = true;
      }
    });
    if (changed) save(data);
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === "activity-form") {
      pendingNewDetail = form.detailText?.value || "";
      setTimeout(persistNewDetail, 0);
    }
    if (form.id === "drawer-activity") {
      const id = form.querySelector("input[name='id']")?.value || "";
      const detail = form.detailText?.value || "";
      setTimeout(() => persistDrawerDetail(id, detail), 0);
    }
  }, true);

  function run() {
    ensureStyle();
    backfillActivityNumbers();
    enhanceCreator();
    enhanceDrawer();
    annotatePreviewCards();
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  run();
})();
