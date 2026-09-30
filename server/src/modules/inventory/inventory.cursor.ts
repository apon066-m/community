import type { InventoryItemSort, InventoryListQuery } from "shared";

import {
  decodeCursor,
  encodeCursor,
  isCursorRecord,
} from "../../lib/pagination/cursor";

type InventoryCursorRow = {
  id: string;
  name: string;
  stockOnHand: number;
  updatedAt: Date;
};

export type InventoryCursorPosition =
  | { sort: "name"; name: string; id: string }
  | { sort: "stock"; stockOnHand: number; id: string }
  | { sort: "updatedAt"; updatedAt: string; id: string };

function isCursorPosition(value: unknown): value is InventoryCursorPosition {
  if (!isCursorRecord(value) || typeof value.sort !== "string") return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;

  switch (value.sort) {
    case "name":
      return typeof value.name === "string";
    case "stock":
      return typeof value.stockOnHand === "number";
    case "updatedAt":
      return (
        typeof value.updatedAt === "string" &&
        !Number.isNaN(new Date(value.updatedAt).getTime())
      );
    default:
      return false;
  }
}

function inventoryQueryKey(input: InventoryListQuery) {
  return JSON.stringify({
    search: input.search ?? null,
    status: input.status,
    active: input.active ?? null,
    sort: input.sort,
    order: input.order,
  });
}

export function encodeInventoryCursor(
  input: InventoryListQuery,
  row: InventoryCursorRow,
) {
  let position: InventoryCursorPosition;

  switch (input.sort satisfies InventoryItemSort) {
    case "name":
      position = { sort: "name", name: row.name, id: row.id };
      break;
    case "stock":
      position = {
        sort: "stock",
        stockOnHand: row.stockOnHand,
        id: row.id,
      };
      break;
    case "updatedAt":
      position = {
        sort: "updatedAt",
        updatedAt: row.updatedAt.toISOString(),
        id: row.id,
      };
      break;
  }

  return encodeCursor(inventoryQueryKey(input), position);
}

export function decodeInventoryCursor(
  value: string | undefined,
  input: InventoryListQuery,
) {
  return decodeCursor(
    value,
    inventoryQueryKey(input),
    (position): position is InventoryCursorPosition =>
      isCursorPosition(position) && position.sort === input.sort,
  );
}
