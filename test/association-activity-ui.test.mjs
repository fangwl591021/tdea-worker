import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.window = {};
globalThis.document = { getElementById:() => ({}) };
await import(`../public/catalog-pricing.js?association-ui=${Date.now()}`);

test("公開報名顯示協會活動方案與報名人數", () => {
  const html = window.TDEACatalogPricing.registrationHtml({items:[{
    id:"registration",name:"活動報名費",type:"product",quantityMode:"person",required:true,
    variants:[{id:"member",name:"會員方案",unitPrice:800}]
  }]});
  assert.match(html, /選擇報名方案/);
  assert.match(html, /報名人數/);
  assert.doesNotMatch(html, /房數|晚數/);
});

test("管理端不再提供商品或住宿建立入口", async () => {
  const source = await readFile(new URL("../public/catalog-pricing-editor.js", import.meta.url), "utf8");
  assert.match(source, /新增收費項目/);
  assert.match(source, /每人/);
  assert.match(source, /每份/);
  assert.match(source, /固定金額/);
  assert.doesNotMatch(source, /新增商品品項|新增住宿品項|商品品項|住宿品項/);
});
