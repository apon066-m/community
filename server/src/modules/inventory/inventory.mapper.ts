import type { InventoryItem, InventoryMovement } from "shared";

import type {
  InventoryItemRow,
  InventoryMovementRow,
} from "./inventory.schema";

export function toInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    stockOnHand: row.stockOnHand,
    reorderLevel: row.reorderLevel,
    active: row.active,
    lowStock: row.stockOnHand <= row.reorderLevel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toInventoryMovement(
  row: InventoryMovementRow,
): InventoryMovement {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    type: row.type,
    quantityDelta: row.quantityDelta,
    balanceAfter: row.balanceAfter,
    reason: row.reason,
    actorUserId: row.actorUserId,
    occurredAt: row.occurredAt.toISOString(),
  };
}
