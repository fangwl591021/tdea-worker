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

  function freshItem(type) {
    const itemId = id("item");
    return {id:itemId,name:type === "accommodation" ? "住宿" : "商品",type,required:false,enabled:true,variants:[{id:id("variant"),name:type === "accommodation" ? "雙人房" : "一般規格",unitPrice:0,priceUnit:type === "accommodation" ? "per_room_per_night" : "per_item",maxOccupancy:type === "accommodation" ? 2 : undefined,enabled:true}]};
  }

  function itemHtml(item) {
    return `<article class="catalog-editor-item" data-editor-item="${esc(item.id)}" data-item-type="${item.type}"><div class="catalog-editor-head"><strong>${item.type === "accommodation" ? "住宿品項" : "商品品項"}</strong><button type="button" class="btn danger" data-remove-item>移除品項</button></div><div class="catalog-editor-grid"><label>品項名稱<input data-item-name value="${esc(item.name)}" placeholder="例：紀念衫／住宿"></label><label class="catalog-check"><input type="checkbox" data-item-required ${item.required ? "checked" : ""}> 報名時必選</label></div><div data-variant-list>${item.variants.map((variant) => variantHtml(item.type, variant)).join("")}</div><button type="button" class="btn" data-add-variant>新增規格</button></article>`;
  }

  function variantHtml(type, variant) {
    return `<div class="catalog-editor-variant" data-editor-variant="${esc(variant.id)}"><label>規格／房型<input data-variant-name value="${esc(variant.name)}" placeholder="例：XL／雙人房"></label><label>單價 NT$<input type="number" min="0" step="1" data-variant-price value="${Number(variant.unitPrice || 0)}"></label>${type === "accommodation" ? `<label>計價方式<select data-variant-unit><option value="per_room_per_night" ${variant.priceUnit === "per_room_per_night" ? "selected" : ""}>每房／每晚</option><option value="per_person_per_night" ${variant.priceUnit === "per_person_per_night" ? "selected" : ""}>每人／每晚</option></select></label><label>每房最多人數<input type="number" min="1" step="1" data-variant-occupancy value="${Math.max(1,Number(variant.maxOccupancy || 1))}"></label>` : ""}<button type="button" class="btn danger" data-remove-variant>刪除規格</button></div>`;
  }

  function collect(panel) {
    return window.TDEACatalogPricing.normalize({items:[...panel.querySelectorAll("[data-editor-item]")].map((item) => ({
      id:item.dataset.editorItem,
      type:item.dataset.itemType,
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
    panel.closest("form").__tdeaCatalogPricing = pricing;
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
    host.innerHTML = `<div class="field"><label>活動收費規格</label><select name="catalogBillingMode"><option value="legacy">沿用既有活動規格</option><option value="catalog_paid">規格型品項付費（新）</option></select><div class="muted">新模式獨立運作，不會改動免費、單一收費或原多品項活動。</div></div><div data-catalog-editor-panel hidden><div class="catalog-editor-note">商品：規格 × 數量；住宿：房型 × 房數／人數／晚數。報名送出時由後端重新驗價。</div><div data-editor-items></div><div class="actions"><button type="button" class="btn" data-add-item="product">新增商品品項</button><button type="button" class="btn" data-add-item="accommodation">新增住宿品項</button></div></div>`;
    paymentField.insertAdjacentElement("afterend", host);
    const mode = host.querySelector("[name='catalogBillingMode']");
    const panel = host.querySelector("[data-catalog-editor-panel]");
    const updateMode = () => {
      panel.hidden = mode.value !== "catalog_paid";
      if (mode.value === "catalog_paid" && !panel.querySelector("[data-editor-item]")) render(panel, {schemaVersion:1,currency:"TWD",items:[freshItem("product")]});
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
        const pricing = collect(panel); pricing.items.push(freshItem(button.dataset.addItem)); render(panel, pricing);
      } else if (button.hasAttribute("data-remove-item")) {
        button.closest("[data-editor-item]")?.remove(); sync(form, panel);
      } else if (button.hasAttribute("data-add-variant")) {
        const item = button.closest("[data-editor-item]");
        const type = item.dataset.itemType;
        item.querySelector("[data-variant-list]").insertAdjacentHTML("beforeend", variantHtml(type, {id:id("variant"),name:"",unitPrice:0,priceUnit:type === "accommodation" ? "per_room_per_night" : "per_item",maxOccupancy:2})); sync(form, panel);
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
