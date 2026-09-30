import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type {
  InventoryListQuery,
  RecordInventoryMovementInput,
} from "shared";

import type { DbExecutor } from "../../db";
import {
  inventoryItem,
  inventoryMovement,
  type InventoryItemRow,
} from "./inventory.schema";
import type { InventoryCursorPosition } from "./inventory.cursor";

export type InventoryListRepositoryInput = InventoryListQuery & {
  cursorPosition: InventoryCursorPosition | null;
};

function buildCursorCondition(
  input: InventoryListRepositoryInput,
): SQL | undefined {
  const position = input.cursorPosition;
  if (!position) return undefined;

  switch (position.sort) {
    case "name":
      return input.order === "asc"
        ? or(
            gt(inventoryItem.name, position.name),
            and(
              eq(inventoryItem.name, position.name),
              gt(inventoryItem.id, position.id),
            ),
          )
        : or(
            lt(inventoryItem.name, position.name),
            and(
              eq(inventoryItem.name, position.name),
              lt(inventoryItem.id, position.id),
            ),
          );
    case "stock":
      return input.order === "asc"
        ? or(
            gt(inventoryItem.stockOnHand, position.stockOnHand),
            and(
              eq(inventoryItem.stockOnHand, position.stockOnHand),
              gt(inventoryItem.id, position.id),
            ),
          )
        : or(
            lt(inventoryItem.stockOnHand, position.stockOnHand),
            and(
              eq(inventoryItem.stockOnHand, position.stockOnHand),
              lt(inventoryItem.id, position.id),
            ),
          );
    case "updatedAt":
      return input.order === "asc"
        ? or(
            gt(inventoryItem.updatedAt, new Date(position.updatedAt)),
            and(
              eq(inventoryItem.updatedAt, new Date(position.updatedAt)),
              gt(inventoryItem.id, position.id),
            ),
          )
        : or(
            lt(inventoryItem.updatedAt, new Date(position.updatedAt)),
            and(
              eq(inventoryItem.updatedAt, new Date(position.updatedAt)),
              lt(inventoryItem.id, position.id),
            ),
          );
  }
}

function buildOrderBy(input: InventoryListRepositoryInput) {
  switch (input.sort) {
    case "name":
      return input.order === "asc"
        ? ([asc(inventoryItem.name), asc(inventoryItem.id)] as const)
        : ([desc(inventoryItem.name), desc(inventoryItem.id)] as const);
    case "stock":
      return input.order === "asc"
        ? ([asc(inventoryItem.stockOnHand), asc(inventoryItem.id)] as const)
        : ([desc(inventoryItem.stockOnHand), desc(inventoryItem.id)] as const);
    case "updatedAt":
      return input.order === "asc"
        ? ([asc(inventoryItem.updatedAt), asc(inventoryItem.id)] as const)
        : ([desc(inventoryItem.updatedAt), desc(inventoryItem.id)] as const);
  }
}

function buildListConditions(input: InventoryListRepositoryInput) {
  const conditions: SQL[] = [];

  if (input.active !== undefined) {
    conditions.push(eq(inventoryItem.active, input.active));
  }
  if (input.search) {
    conditions.push(ilike(inventoryItem.name, `%${input.search}%`));
  }
  if (input.status === "low-stock") {
    conditions.push(
      and(
        gt(inventoryItem.stockOnHand, 0),
        lte(inventoryItem.stockOnHand, inventoryItem.reorderLevel),
      )!,
    );
  }
  if (input.status === "out-of-stock") {
    conditions.push(eq(inventoryItem.stockOnHand, 0));
  }

  const cursorCondition = buildCursorCondition(input);
  if (cursorCondition) conditions.push(cursorCondition);

  return conditions;
}

export async function listInventoryItems(
  executor: DbExecutor,
  input: InventoryListRepositoryInput,
) {
  return executor
    .select()
    .from(inventoryItem)
    .where(and(...buildListConditions(input)))
    .orderBy(...buildOrderBy(input))
    .limit(input.limit + 1);
}

export async function findInventoryItemById(
  executor: DbExecutor,
  itemId: string,
) {
  const [row] = await executor
    .select()
    .from(inventoryItem)
    .where(eq(inventoryItem.id, itemId))
    .limit(1);

  return row ?? null;
}

export async function findInventoryItemForUpdate(
  executor: DbExecutor,
  itemId: string,
) {
  const [row] = await executor
    .select()
    .from(inventoryItem)
    .where(eq(inventoryItem.id, itemId))
    .limit(1)
    .for("update");

  return row ?? null;
}

export async function findInventoryItemByName(
  executor: DbExecutor,
  name: string,
) {
  const [row] = await executor
    .select()
    .from(inventoryItem)
    .where(sql`lower(${inventoryItem.name}) = lower(${name})`)
    .limit(1);

  return row ?? null;
}

export async function createInventoryItem(
  executor: DbExecutor,
  input: {
    id: string;
    name: string;
    stockOnHand: number;
    reorderLevel: number;
  },
) {
  const [created] = await executor
    .insert(inventoryItem)
    .values(input)
    .returning();

  return created ?? null;
}

export async function updateInventoryItem(
  executor: DbExecutor,
  itemId: string,
  input: Partial<Pick<InventoryItemRow, "name" | "reorderLevel" | "active">>,
) {
  const [updated] = await executor
    .update(inventoryItem)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(inventoryItem.id, itemId))
    .returning();

  return updated ?? null;
}

export async function updateInventoryStock(
  executor: DbExecutor,
  itemId: string,
  stockOnHand: number,
) {
  const [updated] = await executor
    .update(inventoryItem)
    .set({ stockOnHand, updatedAt: new Date() })
    .where(eq(inventoryItem.id, itemId))
    .returning();

  return updated ?? null;
}

export async function createInventoryMovement(
  executor: DbExecutor,
  input: {
    id: string;
    inventoryItemId: string;
    type: RecordInventoryMovementInput["type"];
    quantityDelta: number;
    balanceAfter: number;
    reason: string | null;
    actorUserId: string;
  },
) {
  const [created] = await executor
    .insert(inventoryMovement)
    .values(input)
    .returning();

  return created ?? null;
}

export async function listInventoryMovements(
  executor: DbExecutor,
  itemId: string,
) {
  return executor
    .select()
    .from(inventoryMovement)
    .where(eq(inventoryMovement.inventoryItemId, itemId))
    .orderBy(desc(inventoryMovement.occurredAt), desc(inventoryMovement.id))
    .limit(100);
}
