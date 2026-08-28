import test from "node:test";
import assert from "node:assert/strict";
import { removeDeletedFields, removeDeletedOptions } from "../src/activity-field-deletions.ts";

const roomField = {
  key:"fld_aebd8dc3159544c1aac9cddbd4ed695d",
  label:"房型選擇",
  type:"radio",
  options:["3300/人(4人房,房-共8名額)", "3500/人(2人房-共12名額)"],
  required:true
};

test("右側叉號可依欄位 ID 精確刪除單一房型選項", () => {
  const result = removeDeletedOptions([roomField], [{
    fieldKey:roomField.key,
    fieldLabel:roomField.label,
    option:"3300/人(4人房,房-共8名額)"
  }]);
  assert.deepEqual(result[0].options, ["3500/人(2人房-共12名額)"]);
});

test("連續刪除兩個房型選項後不會由舊資料補回", () => {
  const result = removeDeletedOptions([roomField], roomField.options.map((option) => ({
    fieldKey:roomField.key,
    fieldLabel:roomField.label,
    option
  })));
  assert.deepEqual(result[0].options, []);
});

test("下方刪除按鈕仍可刪除整個房型欄位", () => {
  const result = removeDeletedFields([roomField], [{ key:roomField.key, label:roomField.label }]);
  assert.deepEqual(result, []);
});
