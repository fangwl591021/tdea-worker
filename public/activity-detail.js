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

  function ensureStyle() {
    if (document.querySelector("#activity-detail-style")) return;
    const style = document.createElement("style");
    style.id = "activity-detail-style";
    style.textContent = `
      .activity-detail-preview{margin:10px 0 0;color:#475467;line-height:1.6;white-space:pre-wrap;font-size:14px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
    `;
    document.head.appendChild(style);
  }

  function fieldHtml(value = "") {
    return `<div class="field" data-activity-detail-field><label>詳細說明</label><textarea name="detailText" placeholder="活動介紹、課程內容、地點、費用、注意事項...">${esc(value)}</textarea></div>`;
  }

  function enhanceCreator() {
    const form = document.querySelector("#activity-form");
    if (!form || form.querySelector("[data-activity-detail-field]")) return;
    const googleBlock = form.querySelector(".form-builder-block");
    const submit = form.querySelector("button[type='submit']");
    const holder = document.createElement("div");
    holder.innerHTML = fieldHtml();
    const field = holder.firstElementChild;
    if (googleBlock) googleBlock.insertAdjacentElement("beforebegin", field);
    else submit?.insertAdjacentElement("beforebegin", field);
  }

  function enhanceDrawer() {
    const form = document.querySelector("#drawer-activity");
    if (!form || form.querySelector("[data-activity-detail-field]")) return;
    const id = form.querySelector("input[name='id']")?.value || "";
    const data = load();
    const activity = data.activities?.find((item) => item.id === id) || {};
    const formUrlField = form.querySelector("input[name='formUrl']")?.closest(".field");
    const submit = form.querySelector("button[type='submit']");
    const holder = document.createElement("div");
    holder.innerHTML = fieldHtml(activity.detailText || "");
    const field = holder.firstElementChild;
    if (formUrlField) formUrlField.insertAdjacentElement("beforebegin", field);
    else submit?.insertAdjacentElement("beforebegin", field);
  }

  function annotatePreviewCards() {
    const data = load();
    const map = new Map((data.activities || []).map((item) => [item.id, item]));
    document.querySelectorAll("[data-register]").forEach((button) => {
      const card = button.closest(".activity-card");
      if (!card || card.querySelector(".activity-detail-preview")) return;
      const activity = map.get(button.dataset.register || "");
      if (!activity?.detailText) return;
      button.insertAdjacentHTML("beforebegin", `<div class="activity-detail-preview">${esc(activity.detailText)}</div>`);
    });
  }

  function persistNewDetail() {
    const detail = pendingNewDetail.trim();
    pendingNewDetail = "";
    if (!detail) return;
    const data = load();
    const latest = data.activities?.[0];
    if (!latest) return;
    latest.detailText = detail;
    save(data);
  }

  function persistDrawerDetail(id, detail) {
    const data = load();
    const activity = data.activities?.find((item) => item.id === id);
    if (!activity) return;
    activity.detailText = detail.trim();
    save(data);
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
    enhanceCreator();
    enhanceDrawer();
    annotatePreviewCards();
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  run();
})();
