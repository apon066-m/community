import { describe, expect, test } from "bun:test";

import { catalogListQuerySchema, type CatalogListQuery } from "shared";

import {
  decodeCatalogCursor,
  encodeCatalogCursor,
} from "../utils/catalog.cursor";

function createQuery(
  overrides: Partial<CatalogListQuery> = {},
): CatalogListQuery {
  return catalogListQuerySchema.parse({
    sort: "price",
    order: "asc",
    ...overrides,
  });
}

describe("catalog cursors", () => {
  test("round trips a cursor for the active query", () => {
    const query = createQuery({ categorySlug: "pastry", search: "tart" });
    const cursor = encodeCatalogCursor(query, {
      id: "catalog-item-2",
      featured: false,
      sortOrder: 0,
      name: "Fruit Tart",
      priceMinor: 15000,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(decodeCatalogCursor(cursor, query)).toEqual({
      sort: "price",
      priceMinor: 15000,
      id: "catalog-item-2",
    });
  });

  test("rejects a cursor when the category changes", () => {
    const query = createQuery({ categorySlug: "pastry" });
    const cursor = encodeCatalogCursor(query, {
      id: "catalog-item-2",
      featured: false,
      sortOrder: 0,
      name: "Fruit Tart",
      priceMinor: 15000,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(() =>
      decodeCatalogCursor(cursor, createQuery({ categorySlug: "cake" })),
    ).toThrow("pagination cursor is invalid");
  });

});
