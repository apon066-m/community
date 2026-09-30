import { describe, expect, test } from "bun:test";

import {
  canDelegatePermission,
  canTransitionRole,
} from "../authorization-policy";

describe("permission delegation", () => {
  test("allows an admin to grant an operational manager permission", () => {
    expect(
      canDelegatePermission({
        actorRole: "admin",
        targetRole: "staff",
        permissionId: "menu:delete",
      }),
    ).toBe(true);
  });

  test("supports custom role IDs for operational permissions", () => {
    expect(
      canDelegatePermission({
        actorRole: "admin",
        targetRole: "manager",
        permissionId: "reports:read",
      }),
    ).toBe(true);
  });

  test("does not grant administrative permissions to non-admins", () => {
    expect(
      canDelegatePermission({
        actorRole: "admin",
        targetRole: "staff",
        permissionId: "rbac:manage",
      }),
    ).toBe(false);
  });

  test("does not create overrides for admin users", () => {
    expect(
      canDelegatePermission({
        actorRole: "admin",
        targetRole: "admin",
        permissionId: "menu:delete",
      }),
    ).toBe(false);
  });

  test("does not allow non-admin actors to delegate permissions", () => {
    expect(
      canDelegatePermission({
        actorRole: "staff",
        targetRole: "staff",
        permissionId: "menu:delete",
      }),
    ).toBe(false);
  });
});

describe("role transitions", () => {
  test("allows an admin to promote staff", () => {
    expect(
      canTransitionRole({
        actorRole: "admin",
        currentRole: "staff",
        nextRole: "admin",
        activeAdminCount: 1,
      }),
    ).toBe(true);
  });

  test("protects the final active admin from demotion", () => {
    expect(
      canTransitionRole({
        actorRole: "admin",
        currentRole: "admin",
        nextRole: "staff",
        activeAdminCount: 1,
      }),
    ).toBe(false);
  });
});
