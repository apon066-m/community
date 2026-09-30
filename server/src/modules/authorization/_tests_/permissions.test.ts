import { describe, expect, test } from "bun:test";

import {
  initialRolePermissions,
  isPermissionKey,
  isPrivilegedPermission,
  resolvePermissions,
} from "../permissions";

describe("permission identifiers", () => {
  test("accepts lowercase resource and action identifiers", () => {
    expect(isPermissionKey("order:create")).toBe(true);
    expect(isPermissionKey("order:update-status")).toBe(true);
  });

  test("rejects malformed identifiers", () => {
    expect(isPermissionKey("order")).toBe(false);
    expect(isPermissionKey("Order:create")).toBe(false);
    expect(isPermissionKey("order:create:any")).toBe(false);
  });
});

describe("initial role permissions", () => {
  test("customers only receive customer capabilities", () => {
    expect(initialRolePermissions.customer).toContain("order:create");
    expect(initialRolePermissions.customer).toContain("order:read-own");
    expect(initialRolePermissions.customer).not.toContain("order:read-all");
    expect(initialRolePermissions.customer).not.toContain("menu:update");
  });

  test("staff can operate the menu and order queue", () => {
    expect(initialRolePermissions.staff).toContain("menu:update");
    expect(initialRolePermissions.staff).toContain("order:read-all");
    expect(initialRolePermissions.staff).toContain("order:update-status");
    expect(initialRolePermissions.staff).toContain("inventory:read");
    expect(initialRolePermissions.staff).toContain("inventory:manage");
    expect(initialRolePermissions.staff).toContain("reports:read");
    expect(initialRolePermissions.staff).not.toContain("rbac:manage");
  });

  test("admins receive the complete initial catalog", () => {
    expect(initialRolePermissions.admin).toContain("rbac:manage");
    expect(initialRolePermissions.admin).toContain("user:set-role");
    expect(initialRolePermissions.admin).toContain("menu:delete");
  });
});

describe("permission resolution", () => {
  test("adds manager-level permissions to a staff member", () => {
    const permissions = resolvePermissions(initialRolePermissions.staff, [
      { permissionId: "menu:delete", effect: "allow" },
    ]);

    expect(permissions.has("menu:delete")).toBe(true);
  });

  test("deny overrides both role and user allows", () => {
    const permissions = resolvePermissions(initialRolePermissions.staff, [
      { permissionId: "menu:update", effect: "allow" },
      { permissionId: "menu:update", effect: "deny" },
    ]);

    expect(permissions.has("menu:update")).toBe(false);
  });

  test("identifies permissions that cannot be delegated to non-admins", () => {
    expect(isPrivilegedPermission("rbac:manage")).toBe(true);
    expect(isPrivilegedPermission("user:set-role")).toBe(true);
    expect(isPrivilegedPermission("user:create")).toBe(true);
    expect(isPrivilegedPermission("menu:delete")).toBe(false);
  });
});
