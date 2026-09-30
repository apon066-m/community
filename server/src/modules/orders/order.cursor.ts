import type { OrderListQuery, OrderStatus } from "shared";

import {
  decodeCursor,
  encodeCursor,
  isCursorRecord,
} from "../../lib/pagination/cursor";

type OrderCursorRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderCursorPosition =
  | { sort: "createdAt"; createdAt: string; id: string }
  | { sort: "updatedAt"; updatedAt: string; id: string }
  | { sort: "orderNumber"; orderNumber: string; id: string }
  | { sort: "status"; status: OrderStatus; id: string };

function isCursorPosition(value: unknown): value is OrderCursorPosition {
  if (!isCursorRecord(value) || typeof value.sort !== "string") return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;

  switch (value.sort) {
    case "createdAt":
      return (
        typeof value.createdAt === "string" &&
        !Number.isNaN(new Date(value.createdAt).getTime())
      );
    case "updatedAt":
      return (
        typeof value.updatedAt === "string" &&
        !Number.isNaN(new Date(value.updatedAt).getTime())
      );
    case "orderNumber":
      return typeof value.orderNumber === "string";
    case "status":
      return (
        typeof value.status === "string" &&
        [
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "completed",
          "cancelled",
        ].includes(value.status)
      );
    default:
      return false;
  }
}

function orderQueryKey(input: OrderListQuery, scopeKey: string) {
  return JSON.stringify({
    scopeKey,
    search: input.search ?? null,
    status: input.status ?? null,
    channel: input.channel ?? null,
    sort: input.sort,
    order: input.order,
  });
}

export function encodeOrderCursor(
  input: OrderListQuery,
  row: OrderCursorRow,
  scopeKey: string,
) {
  let position: OrderCursorPosition;

  switch (input.sort) {
    case "createdAt":
      position = {
        sort: "createdAt",
        createdAt: row.createdAt.toISOString(),
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
    case "orderNumber":
      position = {
        sort: "orderNumber",
        orderNumber: row.orderNumber,
        id: row.id,
      };
      break;
    case "status":
      position = { sort: "status", status: row.status, id: row.id };
      break;
  }

  return encodeCursor(orderQueryKey(input, scopeKey), position);
}

export function decodeOrderCursor(
  value: string | undefined,
  input: OrderListQuery,
  scopeKey: string,
) {
  return decodeCursor(
    value,
    orderQueryKey(input, scopeKey),
    (position): position is OrderCursorPosition =>
      isCursorPosition(position) && position.sort === input.sort,
  );
}
