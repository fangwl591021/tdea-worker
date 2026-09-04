import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worker = await readFile(new URL("../src/monthly-entry.ts", import.meta.url), "utf8");
const form = await readFile(new URL("../public/native-form.js", import.meta.url), "utf8");
const legacyLineField = await readFile(new URL("../public/custom-line-id-field-fix.js", import.meta.url), "utf8");

test("activity registration trusts a verified LINE ID token instead of a submitted UID", () => {
  assert.match(worker, /verifyLineIdToken\(\{ LINE_LOGIN_CHANNEL_ID: "2005868456" \}, idToken\)/);
  assert.match(worker, /claimed && claimed !== verified\.lineUserId\.toLowerCase\(\)/);
  assert.match(form, /authorization: `Bearer \$\{idToken\}`/);
});

test("verified members do not re-enter profile fields stored by TDEA", () => {
  assert.match(form, /"gender", "sex", "性別"/);
  assert.match(worker, /if \(isNativeMemberAutoField\(field\)\) continue/);
  assert.match(worker, /"lineid", "lineuid", "lineuserid"[\s\S]*"性別"/);
});

test("legacy LINE ID compatibility field stays hidden after member verification", () => {
  assert.match(legacyLineField, /document\.querySelector\('\[data-login-member-preview\]'\)/);
  assert.match(legacyLineField, /document\.querySelector\('\[data-custom-line-id-fix="1"\]'\)\?\.remove\(\)/);
  assert.match(legacyLineField, /!document\.querySelector\('\[data-login-member-preview\]'\)/);
});
