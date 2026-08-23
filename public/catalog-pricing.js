(() => {
  const trim = (value) => String(value ?? "").trim();
  const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
  const money = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
  const esc = (value) => trim(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    const seenItems = new Set();
    const items = (Array.isArray(source.items) ? source.items : []).slice(0, 50).flatMap((rawItem, itemIndex) => {
      const item = rawItem && typeof rawItem === "object" ? rawItem : {};
      const type = item.type === "accommodation" ? "accommodation" : "product";
      const id = trim(item.id) || `item_${itemIndex + 1}`;
      if (!trim(item.name) || seenItems.has(id)) return [];
      seenItems.add(id);
      const seenVariants = new Set();
      const variants = (Array.isArray(item.variants) ? item.variants : []).slice(0, 50).flatMap((rawVariant, variantIndex) => {
        const variant = rawVariant && typeof rawVariant === "object" ? rawVariant : {};
        const variantId = trim(variant.id) || `${id}_variant_${variantIndex + 1}`;
        if (!trim(variant.name) || seenVariants.has(variantId)) return [];
        seenVariants.add(variantId);
        return [{
          id:variantId,
          name:trim(variant.name),
          unitPrice:money(variant.unitPrice),
          priceUnit:type === "product" ? "per_item" : variant.priceUnit === "per_person_per_night" ? "per_person_per_night" : "per_room_per_night",
          ...(type === "accommodation" ? {maxOccupancy:Math.max(1, integer(variant.maxOccupancy, 1))} : {}),
          enabled:variant.enabled !== false
        }];
      });
      return variants.length ? [{id,name:trim(item.name),type,required:item.required === true,enabled:item.enabled !== false,variants}] : [];
    });
    return {schemaVersion:1,currency:"TWD",items};
  }

  function calculate(pricingInput, selectionsInput) {
    const pricing = normalize(pricingInput);
    const selections = new Map((Array.isArray(selectionsInput) ? selectionsInput : []).map((item) => [trim(item?.itemId), item]));
    const lines = [];
    for (const item of pricing.items.filter((candidate) => candidate.enabled)) {
      const selection = selections.get(item.id);
      if (!selection) { if (item.required) throw new Error(`${item.name} 為必選品項`); continue; }
      const variant = item.variants.find((candidate) => candidate.id === trim(selection.variantId) && candidate.enabled);
      if (!variant) throw new Error(`${item.name} 的規格無效`);
      if (item.type === "product") {
        const quantity = integer(selection.quantity);
        if (quantity < 1) { if (item.required) throw new Error(`${item.name} 數量至少為 1`); continue; }
        lines.push({...selection,itemName:item.name,variantName:variant.name,unitPrice:variant.unitPrice,amount:variant.unitPrice * quantity});
      } else {
        const rooms = integer(selection.rooms), people = integer(selection.people), nights = Math.max(1, integer(selection.nights, 1));
        if (rooms < 1 || people < 1) { if (item.required) throw new Error(`${item.name} 的房數與人數至少為 1`); continue; }
        if (people > rooms * Math.max(1, integer(variant.maxOccupancy, 1))) throw new Error(`${item.name} 超過房型可入住人數`);
        const multiplier = variant.priceUnit === "per_person_per_night" ? people * nights : rooms * nights;
        lines.push({...selection,itemName:item.name,variantName:variant.name,unitPrice:variant.unitPrice,amount:variant.unitPrice * multiplier});
      }
    }
    if (!lines.length) throw new Error("請至少選擇一個付費品項");
    return {currency:"TWD",total:lines.reduce((sum, line) => sum + line.amount, 0),lines};
  }

  function registrationHtml(pricingInput) {
    if (!document.getElementById("catalog-pricing-style")) {
      const style = document.createElement("style");
      style.id = "catalog-pricing-style";
      style.textContent = `.nf-catalog{border:1px solid #c7d2fe;border-radius:14px;background:#f8faff;padding:16px}.nf-catalog h2{margin:0 0 12px;font-size:20px}.nf-catalog-item{display:grid;gap:8px;border-top:1px solid #dbe3ef;padding:14px 0}.nf-catalog-item:first-of-type{border-top:0}.nf-catalog-item>label{font-weight:900}.nf-catalog-item select,.nf-catalog-item input{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:8px}.nf-catalog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}.nf-catalog-grid label{display:grid;gap:5px;font-weight:800;color:#475569}.nf-catalog-total{margin-top:10px;border-top:2px solid #c7d2fe;padding-top:12px;font-size:18px}.nf-catalog-total strong{color:#1d4ed8}`;
      document.head.appendChild(style);
    }

    const pricing = normalize(pricingInput);
    if (!pricing.items.length) return "";
    return `<section class="nf-catalog" data-catalog-pricing><h2>選擇付費規格</h2>${pricing.items.filter((item) => item.enabled).map((item) => {
      const variants = item.variants.filter((variant) => variant.enabled);
      return `<div class="nf-catalog-item" data-catalog-item="${esc(item.id)}" data-catalog-type="${item.type}" data-catalog-required="${item.required ? "1" : "0"}"><label>${esc(item.name)}${item.required ? ' <span class="nf-required">*</span>' : ""}</label><select data-catalog-variant ${item.required ? "required" : ""}><option value="">${item.required ? "請選擇規格" : "不選購"}</option>${variants.map((variant) => `<option value="${esc(variant.id)}">${esc(variant.name)}｜NT$ ${variant.unitPrice.toLocaleString("zh-TW")}${variant.priceUnit === "per_person_per_night" ? "／人／晚" : variant.priceUnit === "per_room_per_night" ? "／房／晚" : "／件"}</option>`).join("")}</select>${item.type === "product" ? `<div class="nf-catalog-grid"><label>數量<input type="number" min="${item.required ? 1 : 0}" step="1" value="${item.required ? 1 : 0}" data-catalog-quantity></label></div>` : `<div class="nf-catalog-grid"><label>房數<input type="number" min="${item.required ? 1 : 0}" step="1" value="${item.required ? 1 : 0}" data-catalog-rooms></label><label>入住人數<input type="number" min="${item.required ? 1 : 0}" step="1" value="${item.required ? 1 : 0}" data-catalog-people></label><label>晚數<input type="number" min="1" step="1" value="1" data-catalog-nights></label></div>`}</div>`;
    }).join("")}<div class="nf-catalog-total">試算總額：<strong data-catalog-total>NT$ 0</strong></div><div class="nf-help" data-catalog-message>送出後由系統重新驗價，實際金額以報名紀錄為準。</div></section>`;
  }

  function collect(form, pricingInput, allowEmpty = false) {
    const selections = [...form.querySelectorAll("[data-catalog-item]")].flatMap((node) => {
      const variantId = trim(node.querySelector("[data-catalog-variant]")?.value);
      if (!variantId) return [];
      const base = {itemId:node.dataset.catalogItem,variantId};
      return node.dataset.catalogType === "accommodation"
        ? [{...base,rooms:integer(node.querySelector("[data-catalog-rooms]")?.value),people:integer(node.querySelector("[data-catalog-people]")?.value),nights:Math.max(1,integer(node.querySelector("[data-catalog-nights]")?.value,1))}]
        : [{...base,quantity:integer(node.querySelector("[data-catalog-quantity]")?.value)}];
    });
    if (!allowEmpty) calculate(pricingInput, selections);
    return selections;
  }

  function bind(form, pricingInput) {
    const update = () => {
      const total = form.querySelector("[data-catalog-total]");
      const message = form.querySelector("[data-catalog-message]");
      try {
        const quote = calculate(pricingInput, collect(form, pricingInput, true));
        if (total) total.textContent = `NT$ ${quote.total.toLocaleString("zh-TW")}`;
        if (message) message.textContent = "送出後由系統重新驗價，實際金額以報名紀錄為準。";
      } catch (error) {
        if (total) total.textContent = "NT$ 0";
        if (message) message.textContent = error?.message || "請選擇規格";
      }
    };
    form.querySelector("[data-catalog-pricing]")?.addEventListener("input", update);
    form.querySelector("[data-catalog-pricing]")?.addEventListener("change", update);
    update();
  }

  window.TDEACatalogPricing = { normalize, calculate, registrationHtml, collect, bind };
})();
