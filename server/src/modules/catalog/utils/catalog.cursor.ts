import type { CatalogListQuery } from "shared";

import {
  decodeCursor,
  encodeCursor,
  isCursorRecord,
} from "../../../lib/pagination/cursor";

type CatalogCursorRow = {
  id: string;
  featured: boolean;
  sortOrder: number;
  name: string;
  priceMinor: number;
  createdAt: Date;
};

export type CatalogCursorPosition =
  | {
      sort: "featured";
      featured: boolean;
      sortOrder: number;
      id: string;
    }
  | { sort: "name"; name: string; id: string }
  | { sort: "price"; priceMinor: number; id: string }
  | { sort: "createdAt"; createdAt: string; id: string };

function isCursorPosition(value: unknown): value is CatalogCursorPosition {
  if (!isCursorRecord(value) || typeof value.sort !== "string") return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;

  switch (value.sort) {
    case "featured":
      return (
        typeof value.featured === "boolean" &&
        typeof value.sortOrder === "number" &&
        Number.isInteger(value.sortOrder)
      );
    case "name":
      return typeof value.name === "string";
    case "price":
      return (
        typeof value.priceMinor === "number" &&
        Number.isInteger(value.priceMinor)
      );
    case "createdAt":
      return (
        typeof value.createdAt === "string" &&
        !Number.isNaN(new Date(value.createdAt).getTime())
      );
    default:
      return false;
  }
}

export function catalogQueryKey(input: CatalogListQuery) {
  return JSON.stringify({
    categorySlug: input.categorySlug ?? null,
    search: input.search ?? null,
    sort: input.sort,
    order: input.sort === "featured" ? null : input.order,
    available: input.available ?? null,
    minPriceMinor: input.minPriceMinor ?? null,
    maxPriceMinor: input.maxPriceMinor ?? null,
  });
}

export function encodeCatalogCursor(
  input: CatalogListQuery,
  row: CatalogCursorRow,
) {
  let position: CatalogCursorPosition;

  switch (input.sort) {
    case "featured":
      position = {
        sort: "featured",
        featured: row.featured,
        sortOrder: row.sortOrder,
        id: row.id,
      };
      break;
    case "name":
      position = { sort: "name", name: row.name, id: row.id };
      break;
    case "price":
      position = {
        sort: "price",
        priceMinor: row.priceMinor,
        id: row.id,
      };
      break;
    case "createdAt":
      position = {
        sort: "createdAt",
        createdAt: row.createdAt.toISOString(),
        id: row.id,
      };
      break;
  }

  return encodeCursor(catalogQueryKey(input), position);
}

export function decodeCatalogCursor(
  value: string | undefined,
  input: CatalogListQuery,
) {
  return decodeCursor(
    value,
    catalogQueryKey(input),
    (position): position is CatalogCursorPosition =>
      isCursorPosition(position) && position.sort === input.sort,
  );
}
