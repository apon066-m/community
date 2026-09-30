import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  max,
  or,
  type SQL,
} from "drizzle-orm";
import type { CatalogListQuery } from "shared";

import type { DbExecutor } from "../../db";
import { throwCatalogPersistenceFailure } from "./catalog.errors";
import { catalogCategory, catalogItem } from "./catalog.schema";
import type { CatalogCursorPosition } from "./utils/catalog.cursor";

export type CatalogListRepositoryInput = CatalogListQuery & {
  cursorPosition: CatalogCursorPosition | null;
};

export type CatalogItemRow = typeof catalogItem.$inferSelect;
export type CatalogCategoryRow = typeof catalogCategory.$inferSelect;
export type CatalogItemWithCategory = {
  item: CatalogItemRow;
  category: CatalogCategoryRow;
};

type CatalogItemMutableFields = Pick<
  CatalogItemRow,
  | "categoryId"
  | "slug"
  | "name"
  | "description"
  | "priceMinor"
  | "currency"
  | "attributes"
  | "available"
  | "featured"
  | "sortOrder"
  | "imageUrl"
>;

export type CatalogItemInsertInput = CatalogItemMutableFields;
export type CatalogItemUpdateInput = Partial<CatalogItemMutableFields>;

export type CatalogItemForOrder = Pick<
  CatalogItemRow,
  | "id"
  | "slug"
  | "name"
  | "priceMinor"
  | "currency"
  | "attributes"
  | "available"
>;

function buildCursorCondition(
  input: CatalogListRepositoryInput,
): SQL | undefined {
  const position = input.cursorPosition;
  if (!position) return undefined;

  switch (position.sort) {
    case "featured":
      return or(
        lt(catalogItem.featured, position.featured),
        and(
          eq(catalogItem.featured, position.featured),
          gt(catalogItem.sortOrder, position.sortOrder),
        ),
        and(
          eq(catalogItem.featured, position.featured),
          eq(catalogItem.sortOrder, position.sortOrder),
          gt(catalogItem.id, position.id),
        ),
      );
    case "name":
      return input.order === "asc"
        ? or(
            gt(catalogItem.name, position.name),
            and(
              eq(catalogItem.name, position.name),
              gt(catalogItem.id, position.id),
            ),
          )
        : or(
            lt(catalogItem.name, position.name),
            and(
              eq(catalogItem.name, position.name),
              lt(catalogItem.id, position.id),
            ),
          );
    case "price":
      return input.order === "asc"
        ? or(
            gt(catalogItem.priceMinor, position.priceMinor),
            and(
              eq(catalogItem.priceMinor, position.priceMinor),
              gt(catalogItem.id, position.id),
            ),
          )
        : or(
            lt(catalogItem.priceMinor, position.priceMinor),
            and(
              eq(catalogItem.priceMinor, position.priceMinor),
              lt(catalogItem.id, position.id),
            ),
          );
    case "createdAt":
      return input.order === "asc"
        ? or(
            gt(catalogItem.createdAt, new Date(position.createdAt)),
            and(
              eq(catalogItem.createdAt, new Date(position.createdAt)),
              gt(catalogItem.id, position.id),
            ),
          )
        : or(
            lt(catalogItem.createdAt, new Date(position.createdAt)),
            and(
              eq(catalogItem.createdAt, new Date(position.createdAt)),
              lt(catalogItem.id, position.id),
            ),
          );
  }
}

function buildOrderBy(input: CatalogListRepositoryInput) {
  switch (input.sort) {
    case "featured":
      return [
        desc(catalogItem.featured),
        asc(catalogItem.sortOrder),
        asc(catalogItem.id),
      ] as const;
    case "name":
      return input.order === "asc"
        ? ([asc(catalogItem.name), asc(catalogItem.id)] as const)
        : ([desc(catalogItem.name), desc(catalogItem.id)] as const);
    case "price":
      return input.order === "asc"
        ? ([asc(catalogItem.priceMinor), asc(catalogItem.id)] as const)
        : ([desc(catalogItem.priceMinor), desc(catalogItem.id)] as const);
    case "createdAt":
      return input.order === "asc"
        ? ([asc(catalogItem.createdAt), asc(catalogItem.id)] as const)
        : ([desc(catalogItem.createdAt), desc(catalogItem.id)] as const);
  }
}

export async function listCatalogItems(
  executor: DbExecutor,
  input: CatalogListRepositoryInput,
) {
  const conditions: SQL[] = [
    isNull(catalogItem.archivedAt),
    eq(catalogCategory.active, true),
  ];

  if (input.categorySlug) {
    conditions.push(eq(catalogCategory.slug, input.categorySlug));
  }
  if (input.search) {
    const searchPattern = `%${input.search}%`;
    const searchCondition = or(
      ilike(catalogItem.name, searchPattern),
      ilike(catalogItem.description, searchPattern),
      ilike(catalogItem.slug, searchPattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (input.available !== undefined) {
    conditions.push(eq(catalogItem.available, input.available));
  }
  if (input.minPriceMinor !== undefined) {
    conditions.push(gte(catalogItem.priceMinor, input.minPriceMinor));
  }
  if (input.maxPriceMinor !== undefined) {
    conditions.push(lte(catalogItem.priceMinor, input.maxPriceMinor));
  }
  const cursorCondition = buildCursorCondition(input);
  if (cursorCondition) conditions.push(cursorCondition);

  return executor
    .select({ item: catalogItem, category: catalogCategory })
    .from(catalogItem)
    .innerJoin(catalogCategory, eq(catalogItem.categoryId, catalogCategory.id))
    .where(and(...conditions))
    .orderBy(...buildOrderBy(input))
    .limit(input.limit + 1);
}

export async function findCatalogItemBySlug(
  executor: DbExecutor,
  slug: string,
) {
  const [result] = await executor
    .select({ item: catalogItem, category: catalogCategory })
    .from(catalogItem)
    .innerJoin(catalogCategory, eq(catalogItem.categoryId, catalogCategory.id))
    .where(
      and(
        eq(catalogItem.slug, slug),
        isNull(catalogItem.archivedAt),
        eq(catalogCategory.active, true),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function findCatalogItemById(
  executor: DbExecutor,
  id: string,
) {
  const [result] = await executor
    .select({ item: catalogItem, category: catalogCategory })
    .from(catalogItem)
    .innerJoin(catalogCategory, eq(catalogItem.categoryId, catalogCategory.id))
    .where(
      and(
        eq(catalogItem.id, id),
        isNull(catalogItem.archivedAt),
        eq(catalogCategory.active, true),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function findActiveCatalogItemsBySlugs(
  executor: DbExecutor,
  slugs: readonly string[],
): Promise<CatalogItemForOrder[]> {
  if (!slugs.length) return [];

  return executor
    .select({
      id: catalogItem.id,
      slug: catalogItem.slug,
      name: catalogItem.name,
      priceMinor: catalogItem.priceMinor,
      currency: catalogItem.currency,
      attributes: catalogItem.attributes,
      available: catalogItem.available,
    })
    .from(catalogItem)
    .innerJoin(catalogCategory, eq(catalogItem.categoryId, catalogCategory.id))
    .where(
      and(
        inArray(catalogItem.slug, slugs),
        isNull(catalogItem.archivedAt),
        eq(catalogCategory.active, true),
      ),
    );
}

export async function findAnyCatalogItemBySlug(
  executor: DbExecutor,
  slug: string,
) {
  const [result] = await executor
    .select({ id: catalogItem.id })
    .from(catalogItem)
    .where(eq(catalogItem.slug, slug))
    .limit(1);

  return result ?? null;
}

export async function findNextCatalogSortOrder(
  executor: DbExecutor,
  categoryId: string,
) {
  const [result] = await executor
    .select({ maxSortOrder: max(catalogItem.sortOrder) })
    .from(catalogItem)
    .where(
      and(
        eq(catalogItem.categoryId, categoryId),
        isNull(catalogItem.archivedAt),
      ),
    );

  return (result?.maxSortOrder ?? -1) + 1;
}

export async function findActiveCategoryBySlug(
  executor: DbExecutor,
  slug: string,
) {
  const [result] = await executor
    .select()
    .from(catalogCategory)
    .where(and(eq(catalogCategory.slug, slug), eq(catalogCategory.active, true)))
    .limit(1);

  return result ?? null;
}

export async function createCatalogItem(
  executor: DbExecutor,
  input: CatalogItemInsertInput,
) {
  const [created] = await executor
    .insert(catalogItem)
    .values({ id: crypto.randomUUID(), ...input })
    .returning();

  if (!created) throwCatalogPersistenceFailure();
  return created;
}

export async function updateCatalogItem(
  executor: DbExecutor,
  id: string,
  input: CatalogItemUpdateInput,
) {
  const [updated] = await executor
    .update(catalogItem)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(catalogItem.id, id), isNull(catalogItem.archivedAt)))
    .returning();

  return updated ?? null;
}

export async function isCatalogImageReferenced(
  executor: DbExecutor,
  imageUrl: string,
) {
  const [reference] = await executor
    .select({ id: catalogItem.id })
    .from(catalogItem)
    .where(eq(catalogItem.imageUrl, imageUrl))
    .limit(1);

  return Boolean(reference);
}

export async function archiveCatalogItem(executor: DbExecutor, id: string) {
  const [archived] = await executor
    .update(catalogItem)
    .set({
      archivedAt: new Date(),
      imageUrl: null,
      updatedAt: new Date(),
    })
    .where(and(eq(catalogItem.id, id), isNull(catalogItem.archivedAt)))
    .returning({ id: catalogItem.id });

  return archived ?? null;
}
