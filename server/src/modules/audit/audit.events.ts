import type { AuditAction, AuditTargetType } from "shared";

export type AuditEvent = {
  targetType: AuditTargetType;
  action: AuditAction;
};

export type AuditRecordInput = AuditEvent & {
  actorUserId: string;
  targetId: string;
  details: Record<string, unknown>;
};

export const auditEvents = {
  permissionCreated: { targetType: "permission", action: "create" },
  roleCreated: { targetType: "role", action: "create" },
  rolePermissionsReplaced: {
    targetType: "role",
    action: "replace-permissions",
  },
  userRoleChanged: { targetType: "user", action: "set-role" },
  userBanned: { targetType: "user", action: "ban" },
  userUnbanned: { targetType: "user", action: "unban" },
  userPermissionOverrideSet: {
    targetType: "user",
    action: "set-permission-override",
  },
  userPermissionOverrideRemoved: {
    targetType: "user",
    action: "remove-permission-override",
  },
  catalogItemCreated: { targetType: "catalog-item", action: "create" },
  catalogItemUpdated: { targetType: "catalog-item", action: "update" },
  catalogItemArchived: { targetType: "catalog-item", action: "archive" },
  inventoryItemCreated: { targetType: "inventory-item", action: "create" },
  inventoryItemUpdated: { targetType: "inventory-item", action: "update" },
  inventoryMovementRecorded: {
    targetType: "inventory-item",
    action: "record-movement",
  },
  orderCreated: { targetType: "order", action: "create" },
  orderStatusChanged: { targetType: "order", action: "status-change" },
  orderCheckedOut: { targetType: "order", action: "checkout" },
  orderCancelled: { targetType: "order", action: "cancel" },
} as const satisfies Record<string, AuditEvent>;
