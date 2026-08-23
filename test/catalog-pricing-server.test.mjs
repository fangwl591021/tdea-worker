import test from "node:test";
import assert from "node:assert/strict";
import { calculateCatalogQuote } from "../src/catalog-pricing.ts";

test("後端依送出規格重新計算，不接受前端總額", () => {
  const quote = calculateCatalogQuote({items:[{
    id:"ticket", name:"票券", type:"product", required:true,
    variants:[{id:"adult",name:"成人",unitPrice:350}]
  }]}, [{itemId:"ticket",variantId:"adult",quantity:3,total:1}]);
  assert.equal(quote.total, 1050);
});

test("後端拒絕未知規格", () => {
  assert.throws(() => calculateCatalogQuote({items:[{
    id:"ticket", name:"票券", type:"product", required:true,
    variants:[{id:"adult",name:"成人",unitPrice:350}]
  }]}, [{itemId:"ticket",variantId:"fake",quantity:1}]), /規格無效/);
});
