import type { CatalogItem } from "shared";

import type { CatalogItemWithCategory } from "./catalog.repository";

export function toCatalogItem(
  row: CatalogItemWithCategory,
): CatalogItem {
  return {
    id: row.item.id,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      description: row.category.description,
      active: row.category.active,
      sortOrder: row.category.sortOrder,
      createdAt: row.category.createdAt.toISOString(),
      updatedAt: row.category.updatedAt.toISOString(),
    },
    slug: row.item.slug,
    name: row.item.name,
    description: row.item.description,
    priceMinor: row.item.priceMinor,
    currency: row.item.currency,
    attributes: row.item.attributes,
    available: row.item.available,
    featured: row.item.featured,
    sortOrder: row.item.sortOrder,
    imageUrl: row.item.imageUrl,
    archivedAt: row.item.archivedAt?.toISOString() ?? null,
    createdAt: row.item.createdAt.toISOString(),
    updatedAt: row.item.updatedAt.toISOString(),
  };
}
