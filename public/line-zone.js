(() => {
  const items = new Map();
  let open = true;

  function ensureStyles() {
    if (document.querySelector("#tdea-line-zone-style")) return;
    const style = document.createElement("style");
    style.id = "tdea-line-zone-style";
    style.textContent = `
      .line-nav-group{margin-top:2px}
      .line-nav-parent{gap:10px}
      .line-nav-icon{width:22px;color:#06c755;font-weight:900}
      .line-nav-caret{margin-left:auto;color:#06c755;transition:transform .16s ease}
      .line-nav-group.open .line-nav-caret{transform:rotate(180deg)}
      .line-nav-children{display:none;margin-left:36px;border-left:1px solid rgba(255,255,255,.16);padding:4px 0 6px}
      .line-nav-group.open .line-nav-children{display:block}
      .line-nav-children button{min-height:44px!important;padding-left:22px!important;border-left:3px solid transparent!important;background:transparent!important;color:#d7dce5!important}
      .line-nav-children button:hover{background:#3b4352!important;color:#fff!important}
      .line-nav-children button.active{border-left-color:#7c9cff!important;background:#f8fafc!important;color:#06a24b!important}
    `;
    document.head.appendChild(style);
  }

  function activeItemId() {
    for (const item of [...items.values()].sort(byOrder)) {
      if (item.isActive?.()) return item.id;
    }
    return "";
  }

  function byOrder(a, b) {
    return (Number(a.order || 100) - Number(b.order || 100)) || String(a.label).localeCompare(String(b.label), "zh-Hant");
  }

  function ensureGroup() {
    ensureStyles();
    const nav = document.querySelector(".nav");
    if (!nav) return null;
    let group = nav.querySelector("[data-line-zone]");
    if (group) return group;
    group = document.createElement("div");
    group.className = "line-nav-group";
    group.dataset.lineZone = "1";
    group.innerHTML = `
      <button type="button" class="line-nav-parent" data-line-parent>
        <span class="line-nav-icon">◎</span>
        <span>LINE專區</span>
        <span class="line-nav-caret">▾</span>
      </button>
      <div class="line-nav-children" data-line-children></div>
    `;
    const anchor = nav.querySelector('[data-nav="redeem"]');
    if (anchor && anchor.nextSibling) nav.insertBefore(group, anchor.nextSibling);
    else if (anchor) nav.appendChild(group);
    else nav.appendChild(group);
    group.querySelector("[data-line-parent]")?.addEventListener("click", () => {
      open = !open;
      refresh();
    });
    return group;
  }

  function refresh() {
    const group = ensureGroup();
    if (!group) return;
    const children = group.querySelector("[data-line-children]");
    const current = activeItemId();
    group.classList.toggle("active", Boolean(current));
    group.classList.toggle("open", open || Boolean(current));
    group.querySelector("[data-line-parent]")?.classList.toggle("active", Boolean(current));
    const nextHtml = [...items.values()].sort(byOrder).map((item) => `
      <button type="button" data-line-item="${escapeAttr(item.id)}" class="${item.id === current ? "active" : ""}">
        ${escapeHtml(item.label)}
      </button>
    `).join("");
    if (children.dataset.rendered === nextHtml) return;
    children.dataset.rendered = nextHtml;
    children.innerHTML = nextHtml;
    children.querySelectorAll("[data-line-item]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = items.get(button.dataset.lineItem || "");
        if (!item) return;
        open = true;
        item.onClick?.();
        refresh();
      });
    });
  }

  function register(item) {
    if (!item?.id || !item?.label || typeof item.onClick !== "function") return;
    items.set(item.id, item);
    refresh();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  window.TDEALineNav = {
    register,
    refresh,
    setOpen(value) {
      open = Boolean(value);
      refresh();
    }
  };

  function registerKeywords() {
    if (!window.TDEAApp) return;
    register({
      id: "keywords",
      label: "關鍵字",
      order: 10,
      onClick: () => window.TDEAApp.navigate("keywords"),
      isActive: () => window.TDEAApp.isView("keywords")
    });
  }

  new MutationObserver(() => {
    registerKeywords();
    refresh();
  }).observe(document.body, { childList: true, subtree: true });
  registerKeywords();
  refresh();
})();
