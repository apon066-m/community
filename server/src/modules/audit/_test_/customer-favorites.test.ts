import { describe, expect, test } from "bun:test";

import {
  customerFavoriteListResponseSchema,
  customerFavoriteResponseSchema,
} from "./customer-favorites";

function createFavorite(overrides: Record<string, unknown> = {}) {
  return {
    catalogItemId: "item-espresso",
    savedAt: "2026-09-24T08:00:00.000Z",
    onMenu: true,
    item: {
      id: "item-espresso",
      category: {
        id: "category-coffee",
        slug: "coffee",
        name: "Coffee",
        description: null,
        active: true,
        sortOrder: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      slug: "espresso",
      name: "Espresso",
      description: "A short coffee.",
      priceMinor: 300,
      currency: "USD",
      attributes: { sizes: ["small"] },
      available: false,
      featured: false,
      sortOrder: 0,
      imageUrl: null,
      archivedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("customer favorite response schemas", () => {
  test("accepts a sold-out item that is still on the menu", () => {
    const result = customerFavoriteResponseSchema.parse({
      favorite: createFavorite(),
    });

    expect(result.favorite.onMenu).toBe(true);
    expect(result.favorite.item.available).toBe(false);
  });

  test("accepts an archived item from an inactive category", () => {
    const favorite = createFavorite({
      onMenu: false,
      item: {
        ...createFavorite().item,
        category: { ...createFavorite().item.category, active: false },
        archivedAt: "2026-09-24T09:00:00.000Z",
      },
    });

    expect(
      customerFavoriteListResponseSchema.parse({ items: [favorite] }).items[0]
        ?.onMenu,
    ).toBe(false);
  });

  test("rejects a response missing the catalog identity", () => {
    const favorite = createFavorite();
    const { catalogItemId: _omitted, ...invalidFavorite } = favorite;

    expect(() =>
      customerFavoriteListResponseSchema.parse({ items: [invalidFavorite] }),
    ).toThrow();
  });
});
