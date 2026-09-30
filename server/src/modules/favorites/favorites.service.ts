import type { CustomerFavorite } from "shared";

import { db } from "../../db";
import * as catalogRepository from "../catalog/catalog.repository";
import { toCatalogItem } from "../catalog/catalog.mapper";
import * as userRepository from "../users/users.repository";
import * as favoritesRepository from "./favorites.repository";

export type ListCustomerFavoritesResult =
  | { status: "forbidden" }
  | { status: "listed"; items: CustomerFavorite[] };

export type SaveCustomerFavoriteResult =
  | { status: "forbidden" }
  | { status: "item-not-found" }
  | { status: "persistence-failed" }
  | { status: "saved"; favorite: CustomerFavorite };

export type RemoveCustomerFavoriteResult =
  | { status: "forbidden" }
  | { status: "removed" };

function mapFavorite(
  row: favoritesRepository.CustomerFavoriteWithItem,
): CustomerFavorite {
  return {
    catalogItemId: row.favorite.catalogItemId,
    savedAt: row.favorite.savedAt.toISOString(),
    onMenu: row.item.archivedAt === null && row.category.active,
    item: toCatalogItem({ item: row.item, category: row.category }),
  };
}

export async function listCustomerFavorites(
  userId: string,
): Promise<ListCustomerFavoritesResult> {
  const customer = await userRepository.findActiveCustomer(db, userId);
  if (!customer) return { status: "forbidden" };

  const rows = await favoritesRepository.findCustomerFavorites(db, userId);
  return { status: "listed", items: rows.map(mapFavorite) };
}

export async function saveCustomerFavorite(
  userId: string,
  catalogItemId: string,
): Promise<SaveCustomerFavoriteResult> {
  return db.transaction(async (tx) => {
    const customer = await userRepository.findActiveCustomer(tx, userId);
    if (!customer) return { status: "forbidden" };

    const item = await catalogRepository.findCatalogItemById(tx, catalogItemId);
    if (!item) return { status: "item-not-found" };

    await favoritesRepository.saveCustomerFavorite(tx, userId, catalogItemId);
    const row = await favoritesRepository.findCustomerFavorite(
      tx,
      userId,
      catalogItemId,
    );
    if (!row) return { status: "persistence-failed" };

    return { status: "saved", favorite: mapFavorite(row) };
  });
}

export async function removeCustomerFavorite(
  userId: string,
  catalogItemId: string,
): Promise<RemoveCustomerFavoriteResult> {
  const customer = await userRepository.findActiveCustomer(db, userId);
  if (!customer) return { status: "forbidden" };

  await favoritesRepository.removeCustomerFavorite(db, userId, catalogItemId);
  return { status: "removed" };
}
