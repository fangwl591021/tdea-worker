import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveMemberIdentity } from "../src/member-identity-resolver.ts";

const UID = "U0123456789abcdef0123456789abcdef";

test("resolves each of the three TDEA membership types", () => {
  for (const type of ["general", "association", "vendor"]) {
    const row = {
      id: `${type}-1`,
      memberNo: `${type.slice(0, 1).toUpperCase()}001`,
      lineUserId: UID,
      name: type === "vendor" ? undefined : `${type} member`,
      companyName: type === "vendor" ? "vendor company" : undefined,
      qualification: "Y"
    };
    const result = resolveMemberIdentity({ [type]: [row] }, UID);
    assert.equal(result.status, "found");
    assert.equal(result.identity.memberships[0].type, type);
    assert.equal(result.identity.memberships[0].memberNo, row.memberNo);
  }
});

test("deduplicates repeated rows for the same membership and prefers the newest row", () => {
  const result = resolveMemberIdentity({
    association: [
      { memberNo: "A001", lineUserId: UID, name: "old name", updatedAt: "2026-01-01T00:00:00.000Z" },
      { memberNo: "A001", LINE_user_id: UID, name: "new name", updatedAt: "2026-02-01T00:00:00.000Z" }
    ]
  }, UID);

  assert.equal(result.status, "found");
  assert.equal(result.identity.displayName, "new name");
  assert.equal(result.identity.memberships.length, 1);
});

test("merges multiple memberships only when they share an explicit TDEA person id", () => {
  const result = resolveMemberIdentity({
    association: [{ memberNo: "A001", lineUserId: UID, name: "member", tdeaDesignUserId: "member-123" }],
    vendor: [{ memberNo: "V001", lineUserId: UID, companyName: "company", tdeaDesignUserId: "member-123" }]
  }, UID);

  assert.equal(result.status, "found");
  assert.equal(result.identity.memberId, "member-123");
  assert.deepEqual(result.identity.memberships.map((item) => item.type), ["association", "vendor"]);
});

test("fails closed when one LINE UID points to distinct member records", () => {
  const result = resolveMemberIdentity({
    general: [{ memberNo: "G001", lineUserId: UID, name: "first person" }],
    association: [{ memberNo: "A002", lineUserId: UID, name: "second person", tdeaDesignUserId: "member-456" }]
  }, UID);

  assert.equal(result.status, "conflict");
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map((item) => item.memberNo), ["G001", "A002"]);
});

test("does not match an unknown LINE UID", () => {
  assert.deepEqual(resolveMemberIdentity({ general: [] }, UID), { status: "not_found" });
});

test("internal route is restricted to the service-binding hostname", async () => {
  const source = await readFile(new URL("../src/roster-single-crud-entry.ts", import.meta.url), "utf8");
  assert.match(source, /\/api\/internal\/v1\/member-identity\/resolve/);
  assert.match(source, /hostname\.toLowerCase\(\) === "tdea-member\.internal"/);
});
