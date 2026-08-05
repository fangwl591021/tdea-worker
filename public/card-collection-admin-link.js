(() => {
  const settingsUrl =
    "https://tdeawork.fangwl591021.workers.dev/card-collection-settings.html";

  function addLink() {
    if (document.querySelector("[data-card-collection-admin-link]")) return;

    const nodes = [...document.querySelectorAll("button,a")];
    const mother = nodes.find(node =>
      String(node.textContent || "").trim().includes("母站註冊資料")
    );

    if (!mother || !mother.parentElement) return;

    const link = document.createElement("a");
    link.href = settingsUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.cardCollectionAdminLink = "1";
    link.textContent = "名片收藏設定";
    link.style.display = "block";
    link.style.padding = "18px 22px";
    link.style.color = "#f8fafc";
    link.style.textDecoration = "none";
    link.style.fontSize = "18px";
    link.style.borderBottom = "1px solid rgba(255,255,255,.08)";

    mother.parentElement.insertBefore(link, mother.nextSibling);
  }

  addLink();

  new MutationObserver(addLink).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
