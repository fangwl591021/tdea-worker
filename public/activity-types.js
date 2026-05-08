(() => {
  const extraTypes = ["企業參訪", "年度會議", "自訂"];

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
      custom.innerHTML = '<label>自訂活動類型</label><input name="customType" type="text" placeholder="選自訂時填寫">';
      field?.insertAdjacentElement("afterend", custom);
    });
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const select = form.querySelector("select[name='type']");
    const custom = form.querySelector("input[name='customType']");
    if (!select || !custom || select.value !== "自訂") return;

    const value = custom.value.trim();
    if (!value) return;

    let option = [...select.options].find(item => item.value === value);
    if (!option) {
      option = new Option(value, value);
      select.appendChild(option);
    }
    select.value = value;
  }, true);

  new MutationObserver(() => ensureTypeControls()).observe(document.body, { childList: true, subtree: true });
  ensureTypeControls();
})();
