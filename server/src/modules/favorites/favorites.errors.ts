import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";
import type {
  ListCustomerFavoritesResult,
  RemoveCustomerFavoriteResult,
  SaveCustomerFavoriteResult,
} from "./favorites.service";

function favoritesError(
  message: string,
  code: string,
  statusCode: ContentfulStatusCode,
) {
  return new AppError({ message, code, statusCode });
}

export function throwListCustomerFavoritesError(
  result: Exclude<ListCustomerFavoritesResult, { status: "listed" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw favoritesError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
  }
}

export function throwSaveCustomerFavoriteError(
  result: Exclude<SaveCustomerFavoriteResult, { status: "saved" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw favoritesError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
    case "item-not-found":
      throw favoritesError(
        "Catalog item not found or no longer on the menu",
        "CATALOG_ITEM_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
    case "persistence-failed":
      throw favoritesError(
        "Unable to save this favorite",
        "CUSTOMER_FAVORITE_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}

export function throwRemoveCustomerFavoriteError(
  result: Exclude<RemoveCustomerFavoriteResult, { status: "removed" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw favoritesError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
  }
}
