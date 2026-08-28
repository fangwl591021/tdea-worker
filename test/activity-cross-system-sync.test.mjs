import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");

test("activity writes synchronize canonical fields, form settings, and monthly snapshot", () => {
  assert.match(worker, /function synchronizeActivityFields\(/);
  assert.match(worker, /return synchronizeActivityFields\(\{/);
  assert.match(worker, /await syncActivitySettingsIndex\(env, record\)/);
  assert.match(worker, /updates\.detailText = detailText/);
  assert.match(worker, /updates\.galleryUrls = galleryUrls/);
  assert.match(worker, /updates\.nativeFormUrl = formUrl/);
  assert.match(worker, /await refreshMonthlySnapshot\(env\)\.catch\(\(\) => null\)/);
});

test("activity reads hydrate the API and manager views from the same canonical fields", () => {
  assert.match(worker, /return hydrateActivityRecord\(data, await readManagerDataRaw\(env\)\)/);
  assert.match(worker, /const hydrated = rows\.map\(\(record\) => hydrateActivityRecord\(record, manager\)\)/);
  assert.match(worker, /return \{ \.\.\.data, activities: await listActivityRecords\(env, raw\) \}/);
});
