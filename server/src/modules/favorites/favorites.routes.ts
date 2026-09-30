import { Hono } from "hono";
import { catalogItemIdParamsSchema } from "shared";

import type { AppEnv } from "../../app-env";
import { validateParams } from "../../middleware/validation";
import {
  listCustomerFavoritesHandler,
  removeCustomerFavoriteHandler,
  saveCustomerFavoriteHandler,
} from "./favorites.handlers";

export const customerFavoriteRoutes = new Hono<AppEnv>()
  .get("/", listCustomerFavoritesHandler)
  .put(
    "/:itemId",
    validateParams(catalogItemIdParamsSchema),
    saveCustomerFavoriteHandler,
  )
  .delete(
    "/:itemId",
    validateParams(catalogItemIdParamsSchema),
    removeCustomerFavoriteHandler,
  );
