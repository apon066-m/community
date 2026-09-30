import type {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryItemDetailResponse,
  InventoryListQuery,
  InventoryListResponse,
  RecordInventoryMovementInput,
  UpdateInventoryItemInput,
} from "shared";

import { db } from "../../db";
import { isDatabaseUniqueViolation } from "../../errors/database-error";
import { auditEvents } from "../audit/audit.events";
import * as auditRepository from "../audit/audit.repository";
import * as inventoryRepository from "./inventory.repository";
import {
  decodeInventoryCursor,
  encodeInventoryCursor,
} from "./inventory.cursor";
import {
  toInventoryItem,
  toInventoryMovement,
} from "./inventory.mapper";
import {
  calculateInventoryBalance,
  getInventoryMovementDelta,
} from "./inventory.policy";

export type CreateInventoryItemResult =
  | { status: "created"; response: InventoryItemDetailResponse }
  | { status: "name-conflict" }
  | { status: "persistence-failed" };

export type GetInventoryItemResult =
  | { status: "found"; response: InventoryItemDetailResponse }
  | { status: "not-found" };

export type UpdateInventoryItemResult =
  | { status: "updated"; item: InventoryItem }
  | { status: "not-found" }
  | { status: "name-conflict" }
  | { status: "persistence-failed" };

export type RecordInventoryMovementResult =
  | { status: "recorded"; response: InventoryItemDetailResponse }
  | { status: "not-found" }
  | { status: "insufficient-stock" }
  | { status: "persistence-failed" };

function getMovementReason(input: RecordInventoryMovementInput) {
  return input.reason?.trim() || null;
}

function requirePersistence<T>(value: T | null, operation: string): T {
  if (!value) throw new Error(`Inventory ${operation} did not persist`);
  return value;
}

async function getDetail(
  executor: Parameters<typeof inventoryRepository.findInventoryItemById>[0],
  itemId: string,
): Promise<InventoryItemDetailResponse | null> {
  const item = await inventoryRepository.findInventoryItemById(executor, itemId);
  if (!item) return null;

  const movements = await inventoryRepository.listInventoryMovements(
    executor,
    itemId,
  );
  return {
    item: toInventoryItem(item),
    movements: movements.map(toInventoryMovement),
  };
}

export async function listInventoryItems(
  input: InventoryListQuery,
): Promise<InventoryListResponse> {
  const cursorPosition = decodeInventoryCursor(input.cursor, input);
  const rows = await inventoryRepository.listInventoryItems(db, {
    ...input,
    active: input.active ?? true,
    cursorPosition,
  });
  const hasNextPage = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const lastItem = items.at(-1);

  return {
    items: items.map(toInventoryItem),
    pagination: {
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? encodeInventoryCursor(input, lastItem)
          : null,
    },
  };
}

export async function getInventoryItem(
  itemId: string,
): Promise<GetInventoryItemResult> {
  const response = await getDetail(db, itemId);
  return response
    ? { status: "found", response }
    : { status: "not-found" };
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
  actorUserId: string,
): Promise<CreateInventoryItemResult> {
  try {
    return await db.transaction(async (tx) => {
      if (await inventoryRepository.findInventoryItemByName(tx, input.name)) {
        return { status: "name-conflict" };
      }

      const itemId = crypto.randomUUID();
      const created = await inventoryRepository.createInventoryItem(tx, {
        id: itemId,
        name: input.name,
        stockOnHand: input.initialStock,
        reorderLevel: input.reorderLevel,
      });
      requirePersistence(created, "item creation");

      if (input.initialStock > 0) {
        const movement = await inventoryRepository.createInventoryMovement(tx, {
          id: crypto.randomUUID(),
          inventoryItemId: itemId,
          type: "receipt",
          quantityDelta: input.initialStock,
          balanceAfter: input.initialStock,
          reason: "Initial stock",
          actorUserId,
        });
        requirePersistence(movement, "initial movement creation");

        await auditRepository.recordAudit(tx, {
          actorUserId,
          ...auditEvents.inventoryMovementRecorded,
          targetId: itemId,
          details: {
            type: "receipt",
            quantityDelta: input.initialStock,
            balanceAfter: input.initialStock,
            reason: "Initial stock",
          },
        });
      }

      await auditRepository.recordAudit(tx, {
        actorUserId,
        ...auditEvents.inventoryItemCreated,
        targetId: itemId,
        details: {
          name: input.name,
          reorderLevel: input.reorderLevel,
          initialStock: input.initialStock,
        },
      });

      const response = await getDetail(tx, itemId);
      return {
        status: "created",
        response: requirePersistence(response, "item lookup"),
      };
    });
  } catch (error) {
    if (isDatabaseUniqueViolation(error)) return { status: "name-conflict" };
    throw error;
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: UpdateInventoryItemInput,
  actorUserId: string,
): Promise<UpdateInventoryItemResult> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await inventoryRepository.findInventoryItemById(
        tx,
        itemId,
      );
      if (!existing) return { status: "not-found" };

      if (
        input.name &&
        input.name.toLowerCase() !== existing.name.toLowerCase() &&
        (await inventoryRepository.findInventoryItemByName(tx, input.name))
      ) {
        return { status: "name-conflict" };
      }

      const updated = await inventoryRepository.updateInventoryItem(
        tx,
        itemId,
        {
          name: input.name,
          reorderLevel: input.reorderLevel,
          active: input.active,
        },
      );
      if (!updated) return { status: "persistence-failed" };

      await auditRepository.recordAudit(tx, {
        actorUserId,
        ...auditEvents.inventoryItemUpdated,
        targetId: itemId,
        details: {
          changedFields: Object.keys(input),
        },
      });

      return { status: "updated", item: toInventoryItem(updated) };
    });
  } catch (error) {
    if (isDatabaseUniqueViolation(error)) return { status: "name-conflict" };
    throw error;
  }
}

export async function recordInventoryMovement(input: {
  itemId: string;
  movement: RecordInventoryMovementInput;
  actorUserId: string;
}): Promise<RecordInventoryMovementResult> {
  return db.transaction(async (tx) => {
    const item = await inventoryRepository.findInventoryItemForUpdate(
      tx,
      input.itemId,
    );
    if (!item) return { status: "not-found" };

    const quantityDelta = getInventoryMovementDelta(input.movement);
    const balance = calculateInventoryBalance(item.stockOnHand, quantityDelta);
    if (balance.status !== "accepted") return balance;
    const nextBalance = balance.nextBalance;

    const updated = await inventoryRepository.updateInventoryStock(
      tx,
      item.id,
      nextBalance,
    );
    requirePersistence(updated, "stock update");

    const movement = await inventoryRepository.createInventoryMovement(tx, {
      id: crypto.randomUUID(),
      inventoryItemId: item.id,
      type: input.movement.type,
      quantityDelta,
      balanceAfter: nextBalance,
      reason: getMovementReason(input.movement),
      actorUserId: input.actorUserId,
    });
    requirePersistence(movement, "movement creation");

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.inventoryMovementRecorded,
      targetId: item.id,
      details: {
        type: input.movement.type,
        quantityDelta,
        balanceAfter: nextBalance,
        reason: getMovementReason(input.movement),
      },
    });

    const response = await getDetail(tx, item.id);
    return {
      status: "recorded",
      response: requirePersistence(response, "item lookup"),
    };
  });
}
