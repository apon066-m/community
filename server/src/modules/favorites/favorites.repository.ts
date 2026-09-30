import { and, desc, eq } from "drizzle-orm";
import type { DbExecutor } from "../../db";
import { catalogCategory, catalogItem } from "../catalog/catalog.schema";
import { customerFavorite } from "./favorites.schema";

export type CustomerFavoriteWithItem = Awaited<
  ReturnType<typeof findCustomerFavorites>
>[number];

export async function findCustomerFavorites(
  executor: DbExecutor,
  userId: string,
) {
  return executor
    .select({
      favorite: customerFavorite,
      item: catalogItem,
      category: catalogCategory,
    })
    .from(customerFavorite)
    .innerJoin(
      catalogItem,
      eq(customerFavorite.catalogItemId, catalogItem.id),
    )
    .innerJoin(catalogCategory, eq(catalogItem.categoryId, catalogCategory.id))
    .where(eq(customerFavorite.userId, userId))
    .orderBy(desc(customerFavorite.savedAt), desc(customerFavorite.catalogItemId));
}

export async function findCustomerFavorite(
  executor: DbExecutor,
  userId: string,
  catalogItemId: string,
) {
  const [favorite] = await executor
    .select({
      favorite: customerFavorite,
      item: catalogItem,
      category: catalogCategory,
    })
    .from(customerFavorite)
    .innerJoin(
      catalogItem,
      eq(customerFavorite.catalogItemId, catalogItem.id),
    )
    .innerJoin(catalogCategory, eq(catalogItem.categoryId, catalogCategory.id))
    .where(
      and(
        eq(customerFavorite.userId, userId),
        eq(customerFavorite.catalogItemId, catalogItemId),
      ),
    )
    .limit(1);

  return favorite ?? null;
}

export async function saveCustomerFavorite(
  executor: DbExecutor,
  userId: string,
  catalogItemId: string,
) {
  await executor
    .insert(customerFavorite)
    .values({ userId, catalogItemId })
    .onConflictDoNothing();
}

export async function removeCustomerFavorite(
  executor: DbExecutor,
  userId: string,
  catalogItemId: string,
) {
  await executor
    .delete(customerFavorite)
    .where(
      and(
        eq(customerFavorite.userId, userId),
        eq(customerFavorite.catalogItemId, catalogItemId),
      ),
    );
}
