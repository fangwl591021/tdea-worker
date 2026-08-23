import test from "node:test";
import assert from "node:assert/strict";
import { calculateCatalogQuote } from "../src/catalog-pricing.ts";

const pricing = {
  items:[
    {id:"registration",name:"活動報名費",type:"product",quantityMode:"person",required:true,variants:[{id:"member",name:"會員方案",unitPrice:800}]},
    {id:"materials",name:"材料費",type:"product",quantityMode:"unit",required:false,variants:[{id:"standard",name:"標準材料包",unitPrice:300}]},
    {id:"service",name:"行政處理費",type:"product",quantityMode:"fixed",required:true,variants:[{id:"fixed",name:"單次收費",unitPrice:100}]}
  ]
};

test("協會活動可依報名方案乘人數", () => {
  const quote = calculateCatalogQuote(pricing, [
    {itemId:"registration",variantId:"member",quantity:3},
    {itemId:"service",variantId:"fixed",quantity:999,total:1}
  ]);
  assert.equal(quote.total, 2500);
  assert.equal(quote.lines[0].quantityMode, "person");
});

test("每份項目依數量計算", () => {
  const quote = calculateCatalogQuote(pricing, [
    {itemId:"registration",variantId:"member",quantity:1},
    {itemId:"materials",variantId:"standard",quantity:2},
    {itemId:"service",variantId:"fixed",quantity:99}
  ]);
  assert.equal(quote.total, 1500);
});

test("固定金額不接受前端放大數量", () => {
  const quote = calculateCatalogQuote({items:[pricing.items[2]]}, [
    {itemId:"service",variantId:"fixed",quantity:999999,total:99999999}
  ]);
  assert.equal(quote.total, 100);
  assert.equal(quote.lines[0].quantity, 1);
});
