(() => {
  const params = new URLSearchParams(location.search);
  if (!params.has("memberHome")) return;

  function install() {
    const menu = document.querySelector(".tm-menu");
    if (!menu || menu.querySelector("[data-registration-query]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.registrationQuery = "1";
    button.textContent = "報名查詢";
    button.addEventListener("click", () => {
      location.href = `${location.origin}/?query=1`;
    });

    const activities = menu.querySelector('[data-page="activities"]');
    if (activities) activities.insertAdjacentElement("afterend", button);
    else menu.appendChild(button);
  }

  new MutationObserver(install).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  install();
})();
