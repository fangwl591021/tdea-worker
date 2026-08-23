(() => {
  const api = "https://tdeawork.fangwl591021.workers.dev";
  const trim = (value) => String(value ?? "").trim();
  const esc = (value) => trim(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const stored = (...keys) => keys.map((key) => sessionStorage.getItem(key) || localStorage.getItem(key) || "").find(trim) || "";
  const headers = () => ({
    ...(stored("tdea-admin-email") ? {"x-admin-email":stored("tdea-admin-email").toLowerCase()} : {}),
    ...(stored("tdea-admin-member-no","tdea-member-no") ? {"x-admin-member-no":stored("tdea-admin-member-no","tdea-member-no").toUpperCase()} : {}),
    ...(stored("tdea-admin-line-user-id","tdea-line-user-id","lineUserId") ? {"x-line-user-id":stored("tdea-admin-line-user-id","tdea-line-user-id","lineUserId")} : {})
  });

  function freshItem() {
    const itemId = id("item");
    return {id:itemId,name:"活動報名費",type:"product",quantityMode:"person",required:false,enabled:true,variants:[{id:id("variant"),name:"會員方案",unitPrice:0,priceUnit:"per_item",enabled:true}]};
  }

  function itemHtml(item) {
    const quantityMode = item.quantityMode === "fixed" ? "fixed" : item.quantityMode === "unit" ? "unit" : "person";
    return `<article class="catalog-editor-item" data-editor-item="${esc(item.id)}" data-item-type="product"><div class="catalog-editor-head"><strong>收費項目</strong><button type="button" class="btn danger" data-remove-item>移除項目</button></div><div class="catalog-editor-grid"><label>收費項目名稱<input data-item-name value="${esc(item.name)}" placeholder="例：活動報名費／材料費／餐費"></label><label>計價單位<select data-item-quantity-mode><option value="person" ${quantityMode === "person" ? "selected" : ""}>每人</option><option value="unit" ${quantityMode === "unit" ? "selected" : ""}>每份</option><option value="fixed" ${quantityMode === "fixed" ? "selected" : ""}>固定金額</option></select></label><label class="catalog-check"><input type="checkbox" data-item-required ${item.required ? "checked" : ""}> 報名時必選</label></div><div data-variant-list>${item.variants.map(variantHtml).join("")}</div><button type="button" class="btn" data-add-variant>新增報名方案</button></article>`;
  }

  function variantHtml(variant) {
    return `<div class="catalog-editor-variant" data-editor-variant="${esc(variant.id)}"><label>報名方案／規格<input data-variant-name value="${esc(variant.name)}" placeholder="例：會員／非會員／全程方案"></label><label>金額 NT$<input type="number" min="0" step="1" data-variant-price value="${Number(variant.unitPrice || 0)}"></label><button type="button" class="btn danger" data-remove-variant>刪除方案</button></div>`;
  }

  function collect(panel) {
    return window.TDEACatalogPricing.normalize({items:[...panel.querySelectorAll("[data-editor-item]")].map((item) => ({
      id:item.dataset.editorItem,
      type:item.dataset.itemType,
      quantityMode:item.querySelector("[data-item-quantity-mode]")?.value || "person",
      name:trim(item.querySelector("[data-item-name]")?.value),
      required:Boolean(item.querySelector("[data-item-required]")?.checked),
      enabled:true,
      variants:[...item.querySelectorAll("[data-editor-variant]")].map((variant) => ({
        id:variant.dataset.editorVariant,
        name:trim(variant.querySelector("[data-variant-name]")?.value),
        unitPrice:Number(variant.querySelector("[data-variant-price]")?.value || 0),
        priceUnit:item.dataset.itemType === "accommodation" ? variant.querySelector("[data-variant-unit]")?.value : "per_item",
        maxOccupancy:item.dataset.itemType === "accommodation" ? Number(variant.querySelector("[data-variant-occupancy]")?.value || 1) : undefined,
        enabled:true
      }))
    }))});
  }

  function render(panel, pricing) {
    panel.querySelector("[data-editor-items]").innerHTML = pricing.items.map(itemHtml).join("");
    panel.closest("form").__tdeaCatalogPricing = collect(panel);
  }

  function sync(form, panel) {
    form.__tdeaCatalogPricing = collect(panel);
  }

  async function hydrate(form, panel, mode) {
    const activityId = trim(form.querySelector("[name='id']")?.value);
    if (!activityId) return;
    try {
      const response = await fetch(`${api}/api/admin-activities/${encodeURIComponent(activityId)}/canonical`, {headers:headers(),cache:"no-store"});
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) return;
      const settings = result.form?.settings || {};
      const activity = result.activity || {};
      if (settings.billingMode !== "catalog_paid" && activity.billingMode !== "catalog_paid") return;
      mode.value = "catalog_paid";
      panel.hidden = false;
      render(panel, window.TDEACatalogPricing.normalize(settings.catalogPricing || activity.catalogPricing));
    } catch (_error) {}
  }

  function enhance(form) {
    if (!window.TDEACatalogPricing || form.dataset.catalogEditorReady) return;
    form.dataset.catalogEditorReady = "true";
    const paymentField = form.querySelector("[name='paymentAmount']")?.closest(".field") || form.querySelector("button[type='submit']");
    if (!paymentField) return;
    const host = document.createElement("section");
    host.className = "catalog-editor";
    host.innerHTML = `<div class="field"><label>活動收費規格</label><select name="catalogBillingMode"><option value="legacy">沿用既有活動規格</option><option value="catalog_paid">規格型活動收費（新）</option></select><div class="muted">新模式專供協會活動報名計價，不會改動既有免費、單一收費或多品項活動。</div></div><div data-catalog-editor-panel hidden><div class="catalog-editor-note">建立收費項目與報名方案，可選擇每人、每份或固定金額；報名送出時由後端重新驗價。</div><div data-editor-items></div><div class="actions"><button type="button" class="btn" data-add-item="fee">新增收費項目</button></div></div>`;
    paymentField.insertAdjacentElement("afterend", host);
    const mode = host.querySelector("[name='catalogBillingMode']");
    const panel = host.querySelector("[data-catalog-editor-panel]");
    const updateMode = () => {
      panel.hidden = mode.value !== "catalog_paid";
      if (mode.value === "catalog_paid" && !panel.querySelector("[data-editor-item]")) render(panel, {schemaVersion:1,currency:"TWD",items:[freshItem()]});
      const payment = form.querySelector("[name='paymentAmount']");
      if (payment) { payment.disabled = mode.value === "catalog_paid"; if (payment.disabled) payment.value = "0"; }
      if (mode.value === "catalog_paid") sync(form, panel);
    };
    mode.addEventListener("change", updateMode);
    panel.addEventListener("input", () => sync(form, panel));
    panel.addEventListener("change", () => sync(form, panel));
    panel.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.addItem) {
        const pricing = collect(panel); pricing.items.push(freshItem()); render(panel, pricing);
      } else if (button.hasAttribute("data-remove-item")) {
        button.closest("[data-editor-item]")?.remove(); sync(form, panel);
      } else if (button.hasAttribute("data-add-variant")) {
        const item = button.closest("[data-editor-item]");
        item.querySelector("[data-variant-list]").insertAdjacentHTML("beforeend", variantHtml({id:id("variant"),name:"",unitPrice:0,priceUnit:"per_item"})); sync(form, panel);
      } else if (button.hasAttribute("data-remove-variant")) {
        button.closest("[data-editor-variant]")?.remove(); sync(form, panel);
      }
    });
    updateMode();
    hydrate(form, panel, mode);
  }

  if (!document.getElementById("catalog-editor-style")) {
    const style = document.createElement("style"); style.id = "catalog-editor-style";
    style.textContent = `.catalog-editor{grid-column:1/-1;border:1px solid #c7d2fe;border-radius:14px;padding:16px;background:#f8faff}.catalog-editor [hidden]{display:none!important}.catalog-editor-note{margin:8px 0 14px;color:#475569;font-weight:700}.catalog-editor-item{border:1px solid #dbe3ef;border-radius:12px;background:#fff;padding:14px;margin:12px 0}.catalog-editor-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.catalog-editor-grid,.catalog-editor-variant{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;align-items:end;margin-top:10px}.catalog-editor label{display:grid;gap:5px;font-weight:800;color:#334155}.catalog-editor input,.catalog-editor select{min-height:42px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:#fff}.catalog-editor .catalog-check{display:flex;align-items:center}.catalog-editor .catalog-check input{min-height:auto}`;
    document.head.appendChild(style);
  }
  const observer = new MutationObserver(() => document.querySelectorAll("#activity-form,#drawer-activity").forEach(enhance));
  observer.observe(document.documentElement, {childList:true,subtree:true});
  document.querySelectorAll("#activity-form,#drawer-activity").forEach(enhance);
})();
