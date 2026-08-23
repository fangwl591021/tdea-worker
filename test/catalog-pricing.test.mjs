import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};
await import("../public/catalog-pricing.js");

const { normalize, calculate } = window.TDEACatalogPricing;

test("商品依規格單價乘數量", () => {
  const pricing = normalize({items:[{
    id:"shirt", name:"紀念衫", type:"product", required:true,
    variants:[{id:"xl",name:"XL",unitPrice:500,priceUnit:"per_item"}]
  }]});
  const quote = calculate(pricing, [{itemId:"shirt",variantId:"xl",quantity:2}]);
  assert.equal(quote.total, 1000);
});

test("住宿可依房數與晚數計價並驗證入住上限", () => {
  const pricing = normalize({items:[{
    id:"stay", name:"住宿", type:"accommodation", required:true,
    variants:[{id:"double",name:"雙人房",unitPrice:1200,priceUnit:"per_room_per_night",maxOccupancy:2}]
  }]});
  assert.equal(calculate(pricing, [{itemId:"stay",variantId:"double",rooms:2,people:4,nights:3}]).total, 7200);
  assert.throws(() => calculate(pricing, [{itemId:"stay",variantId:"double",rooms:1,people:3,nights:1}]), /超過房型可入住人數/);
});

test("住宿也可依人數與晚數計價", () => {
  const pricing = normalize({items:[{
    id:"stay", name:"住宿", type:"accommodation", required:true,
    variants:[{id:"bed",name:"床位",unitPrice:800,priceUnit:"per_person_per_night",maxOccupancy:4}]
  }]});
  assert.equal(calculate(pricing, [{itemId:"stay",variantId:"bed",rooms:1,people:3,nights:2}]).total, 4800);
});
