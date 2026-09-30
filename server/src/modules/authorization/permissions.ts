import {
  permissionKeySchema,
  type PermissionEffect,
  type SystemRole,
} from "shared";

export const permissionCatalog = [
  "menu:read",
  "menu:create",
  "menu:update",
  "menu:delete",
  "order:create",
  "order:read-own",
  "order:read-all",
  "order:update-status",
  "order:cancel-own",
  "inventory:read",
  "inventory:manage",
  "reports:read",
  "user:create",
  "user:list",
  "user:read",
  "user:set-role",
  "user:ban",
  "session:revoke",
  "rbac:manage",
] as const;

export type PermissionKey = (typeof permissionCatalog)[number];

export type PermissionOverride = {
  permissionId: string;
  effect: PermissionEffect;
};

export const initialRolePermissions = {
  admin: permissionCatalog,
  staff: [
    "menu:read",
    "menu:create",
    "menu:update",
    "order:create",
    "order:read-own",
    "order:read-all",
    "order:update-status",
    "inventory:read",
    "inventory:manage",
    "reports:read",
  ],
  customer: [
    "menu:read",
    "order:create",
    "order:read-own",
    "order:cancel-own",
  ],
} as const satisfies Record<SystemRole, readonly PermissionKey[]>;

const privilegedPermissions = new Set<string>([
  "rbac:manage",
  "user:create",
  "user:list",
  "user:read",
  "user:set-role",
  "user:ban",
  "session:revoke",
]);

export function isPermissionKey(value: string): boolean {
  return permissionKeySchema.safeParse(value).success;
}

export function isPrivilegedPermission(permissionId: string): boolean {
  return privilegedPermissions.has(permissionId);
}

export function resolvePermissions(
  rolePermissions: readonly string[],
  overrides: readonly PermissionOverride[],
): Set<string> {
  const permissions = new Set(rolePermissions);
  const denied = new Set(
    overrides
      .filter(({ effect }) => effect === "deny")
      .map(({ permissionId }) => permissionId),
  );

  for (const { permissionId, effect } of overrides) {
    if (effect === "allow" && !denied.has(permissionId)) {
      permissions.add(permissionId);
    }
  }

  for (const permissionId of denied) {
    permissions.delete(permissionId);
  }

  return permissions;
}
