export type CatalogPriceUnit = "per_item" | "per_room_per_night" | "per_person_per_night";
export type CatalogQuantityMode = "person" | "unit" | "fixed";

export type CatalogVariant = {
  id: string;
  name: string;
  unitPrice: number;
  priceUnit: CatalogPriceUnit;
  maxOccupancy?: number;
  enabled: boolean;
};

export type CatalogItem = {
  id: string;
  name: string;
  type: "product" | "accommodation";
  required: boolean;
  enabled: boolean;
  variants: CatalogVariant[];
  quantityMode?: CatalogQuantityMode;
};

export type CatalogPricing = {
  schemaVersion: 1;
  currency: "TWD";
  items: CatalogItem[];
};

export type CatalogSelection = {
  itemId: string;
  variantId: string;
  quantity?: number;
  rooms?: number;
  people?: number;
  nights?: number;
};

export type CatalogQuoteLine = CatalogSelection & {
  itemName: string;
  itemType: CatalogItem["type"];
  variantName: string;
  priceUnit: CatalogPriceUnit;
  quantityMode?: CatalogQuantityMode;
  unitPrice: number;
  amount: number;
};

export type CatalogQuote = {
  schemaVersion: 1;
  currency: "TWD";
  total: number;
  lines: CatalogQuoteLine[];
  quotedAt: string;
};

const text = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const integer = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
};
const money = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
};

export function normalizeCatalogPricing(value: unknown): CatalogPricing {
  const source = record(value);
  const rawItems = Array.isArray(source.items) ? source.items.slice(0, 50) : [];
  const seenItems = new Set<string>();
  const items: CatalogItem[] = [];

  rawItems.forEach((rawItem, itemIndex) => {
    const item = record(rawItem);
    const type = text(item.type, 40) === "accommodation" ? "accommodation" : "product";
    const requestedQuantityMode = text(item.quantityMode, 40);
    const quantityMode: CatalogQuantityMode = requestedQuantityMode === "person"
      ? "person"
      : requestedQuantityMode === "fixed" ? "fixed" : "unit";

    const id = text(item.id, 100) || `item_${itemIndex + 1}`;
    const name = text(item.name, 200);
    if (!name || seenItems.has(id)) return;
    seenItems.add(id);

    const seenVariants = new Set<string>();
    const variants: CatalogVariant[] = [];
    const rawVariants = Array.isArray(item.variants) ? item.variants.slice(0, 50) : [];
    rawVariants.forEach((rawVariant, variantIndex) => {
      const variant = record(rawVariant);
      const variantId = text(variant.id, 100) || `${id}_variant_${variantIndex + 1}`;
      const variantName = text(variant.name, 200);
      if (!variantName || seenVariants.has(variantId)) return;
      seenVariants.add(variantId);
      const requestedUnit = text(variant.priceUnit, 60);
      const priceUnit: CatalogPriceUnit = type === "product"
        ? "per_item"
        : requestedUnit === "per_person_per_night"
          ? "per_person_per_night"
          : "per_room_per_night";
      variants.push({
        id: variantId,
        name: variantName,
        unitPrice: money(variant.unitPrice),
        priceUnit,
        ...(type === "accommodation" ? { maxOccupancy: Math.max(1, integer(variant.maxOccupancy, 1)) } : {}),
        enabled: variant.enabled !== false
      });
    });

    if (!variants.length) return;
    items.push({ id, name, type, ...(type === "product" ? {quantityMode} : {}), required: item.required === true, enabled: item.enabled !== false, variants });
  });

  return { schemaVersion: 1, currency: "TWD", items };
}

export function calculateCatalogQuote(pricingInput: unknown, selectionsInput: unknown): CatalogQuote {
  const pricing = normalizeCatalogPricing(pricingInput);
  if (!pricing.items.length) throw new Error("活動收費項目尚未設定");
  const rawSelections = Array.isArray(selectionsInput) ? selectionsInput : [];
  const selectionMap = new Map<string, Record<string, unknown>>();
  for (const rawSelection of rawSelections) {
    const selection = record(rawSelection);
    const itemId = text(selection.itemId, 100);
    if (!itemId) continue;
    if (selectionMap.has(itemId)) throw new Error("同一品項不可重複送出");
    selectionMap.set(itemId, selection);
  }

  const knownIds = new Set(pricing.items.map((item) => item.id));
  if ([...selectionMap.keys()].some((id) => !knownIds.has(id))) throw new Error("包含無效的品項選擇");

  const lines: CatalogQuoteLine[] = [];
  for (const item of pricing.items.filter((candidate) => candidate.enabled)) {
    const selection = selectionMap.get(item.id);
    if (!selection) {
      if (item.required) throw new Error(`${item.name} 為必選品項`);
      continue;
    }
    const variantId = text(selection.variantId, 100);
    const variant = item.variants.find((candidate) => candidate.id === variantId && candidate.enabled);
    if (!variant) throw new Error(`${item.name} 的規格無效`);

    if (item.type === "product") {
      const quantity = item.quantityMode === "fixed" ? 1 : integer(selection.quantity);
      if (quantity < 1) {
        if (item.required) throw new Error(`${item.name} ${item.quantityMode === "person" ? "人數" : "數量"}至少為 1`);
        continue;
      }
      lines.push({ itemId:item.id, variantId, itemName:item.name, itemType:item.type, variantName:variant.name, priceUnit:variant.priceUnit, quantityMode:item.quantityMode, unitPrice:variant.unitPrice, quantity, amount:variant.unitPrice * quantity });
      continue;
    }

    const rooms = integer(selection.rooms);
    const people = integer(selection.people);
    const nights = Math.max(1, integer(selection.nights, 1));
    if (rooms < 1 || people < 1) {
      if (item.required) throw new Error(`${item.name} 的房數與人數至少為 1`);
      continue;
    }
    const maxOccupancy = Math.max(1, integer(variant.maxOccupancy, 1));
    if (people > rooms * maxOccupancy) throw new Error(`${item.name} 超過房型可入住人數`);
    const multiplier = variant.priceUnit === "per_person_per_night" ? people * nights : rooms * nights;
    lines.push({ itemId:item.id, variantId, itemName:item.name, itemType:item.type, variantName:variant.name, priceUnit:variant.priceUnit, unitPrice:variant.unitPrice, rooms, people, nights, amount:variant.unitPrice * multiplier });
  }

  if (!lines.length) throw new Error("請至少選擇一個收費項目");
  return { schemaVersion:1, currency:"TWD", total:lines.reduce((sum, line) => sum + line.amount, 0), lines, quotedAt:new Date().toISOString() };
}
