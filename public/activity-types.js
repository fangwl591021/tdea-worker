(() => {
  const extraTypes = ["企業參訪", "年度會議", "其他"];

  function ensureTypeControls(root = document) {
    root.querySelectorAll("select[name='type']").forEach(select => {
      extraTypes.forEach(type => {
        if (![...select.options].some(option => option.value === type || option.textContent === type)) {
          select.appendChild(new Option(type, type));
        }
      });

      if (select.dataset.customReady) return;
      select.dataset.customReady = "true";

      const field = select.closest(".field");
      const custom = document.createElement("div");
      custom.className = "field custom-type-field";
      custom.innerHTML = '<label>活動類型顯示名稱</label><input name="customType" type="text" placeholder="例如：台中智慧製造企業參訪">';
      field?.insertAdjacentElement("afterend", custom);
    });
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const select = form.querySelector("select[name='type']");
    const custom = form.querySelector("input[name='customType']");
    if (!select || !custom) return;
    const label = custom.value.trim();
    if (!label) return;

    const data = JSON.parse(localStorage.getItem("tdea-manager-v3") || "{}");
    data.activityTypeLabels ||= {};
    data.activityTypeLabels[label] = select.value;
    localStorage.setItem("tdea-manager-v3", JSON.stringify(data));
  }, true);

  new MutationObserver(() => ensureTypeControls()).observe(document.body, { childList: true, subtree: true });
  ensureTypeControls();
})();
