import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type { CatalogItemIdParams } from "shared";

import type { AppEnv } from "../../app-env";
import { getValidatedParams } from "../../middleware/validation";
import {
  throwListCustomerFavoritesError,
  throwRemoveCustomerFavoriteError,
  throwSaveCustomerFavoriteError,
} from "./favorites.errors";
import * as favoritesService from "./favorites.service";

export async function listCustomerFavoritesHandler(c: Context<AppEnv>) {
  const result = await favoritesService.listCustomerFavorites(c.get("user")!.id);
  if (result.status !== "listed") throwListCustomerFavoritesError(result);

  return c.json({ items: result.items }, StatusCodes.OK);
}

export async function saveCustomerFavoriteHandler(c: Context<AppEnv>) {
  const { itemId } = getValidatedParams<CatalogItemIdParams>(c);
  const result = await favoritesService.saveCustomerFavorite(
    c.get("user")!.id,
    itemId,
  );
  if (result.status !== "saved") throwSaveCustomerFavoriteError(result);

  return c.json({ favorite: result.favorite }, StatusCodes.OK);
}

export async function removeCustomerFavoriteHandler(c: Context<AppEnv>) {
  const { itemId } = getValidatedParams<CatalogItemIdParams>(c);
  const result = await favoritesService.removeCustomerFavorite(
    c.get("user")!.id,
    itemId,
  );
  if (result.status !== "removed") throwRemoveCustomerFavoriteError(result);

  return c.body(null, StatusCodes.NO_CONTENT);
}
