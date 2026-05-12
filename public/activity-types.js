(() => {
  const dataKey = "tdea-manager-v3";
  const baseTypes = ["講座類", "教學類", "聯誼類", "企業參訪", "年度會議"];
  const displayNames = ["講座類", "教學類", "聯誼類", "企業參訪", "年度會議"];

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(dataKey) || "{}"); } catch (_) { return {}; }
  }

  function currentActivity(form) {
    const data = load();
    const id = form.querySelector("input[name='id']")?.value || "";
    if (!id || !Array.isArray(data.activities)) return null;
    return data.activities.find((item) => item.id === id) || null;
  }

  function selectedDisplayValue(form, typeSelect) {
    const activity = currentActivity(form);
    const label = String(activity?.typeLabel || "").trim();
    if (label && label !== typeSelect.value) return label;
    return "";
  }

  function ensureTypeControls(root = document) {
    root.querySelectorAll("select[name='type']").forEach(typeSelect => {
      baseTypes.forEach(type => {
        if (![...typeSelect.options].some(option => option.value === type || option.textContent === type)) {
          typeSelect.appendChild(new Option(type, type));
        }
      });

      if (typeSelect.dataset.typeLabelReady) return;
      typeSelect.dataset.typeLabelReady = "true";

      const form = typeSelect.closest("form");
      const field = typeSelect.closest(".field");
      const currentLabel = form ? selectedDisplayValue(form, typeSelect) : "";
      const isKnown = displayNames.includes(currentLabel);
      const custom = document.createElement("div");
      custom.className = "field custom-type-field";
      custom.innerHTML = `
        <label>活動類型顯示名稱</label>
        <select name="activityTypeLabel">
          <option value="">同活動類型</option>
          ${displayNames.map(type => `<option value="${esc(type)}" ${currentLabel === type ? "selected" : ""}>${esc(type)}</option>`).join("")}
          <option value="__custom" ${currentLabel && !isKnown ? "selected" : ""}>自訂...</option>
        </select>
        <input name="activityTypeLabelOther" type="text" value="${esc(currentLabel && !isKnown ? currentLabel : "")}" placeholder="輸入自訂顯示名稱" ${currentLabel && !isKnown ? "" : "hidden"}>
      `;
      field?.insertAdjacentElement("afterend", custom);
      const labelSelect = custom.querySelector("select[name='activityTypeLabel']");
      const labelInput = custom.querySelector("input[name='activityTypeLabelOther']");
      labelSelect?.addEventListener("change", () => {
        labelInput.hidden = labelSelect.value !== "__custom";
        if (!labelInput.hidden) labelInput.focus();
      });
    });
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const typeSelect = form.querySelector("select[name='type']");
    const labelSelect = form.querySelector("select[name='activityTypeLabel']");
    if (!typeSelect || !labelSelect) return;
    const other = form.querySelector("input[name='activityTypeLabelOther']")?.value?.trim() || "";
    const label = labelSelect.value === "__custom" ? other : labelSelect.value.trim();
    if (!label) return;

    const data = load();
    data.activityTypeLabels ||= {};
    data.activityTypeLabels[label] = typeSelect.value;
    localStorage.setItem(dataKey, JSON.stringify(data));
  }, true);

  new MutationObserver(() => ensureTypeControls()).observe(document.body, { childList: true, subtree: true });
  ensureTypeControls();
})();
