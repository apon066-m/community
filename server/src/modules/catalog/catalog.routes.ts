import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  catalogImageDeleteSchema,
  catalogItemIdParamsSchema,
  catalogListQuerySchema,
  catalogSlugParamsSchema,
  createCatalogItemSchema,
  updateCatalogItemSchema,
} from "shared";

import type { AppEnv } from "../../app-env";
import { env } from "../../config/env";
import { trustedMutationOrigin } from "../../middleware/security";
import {
  validateJson,
  validateParams,
  validateQuery,
} from "../../middleware/validation";
import { requireAuth, sessionMiddleware } from "../auth/auth.middleware";
import {
  requireAnyPermission,
  requirePermission,
} from "../authorization/authorization.middleware";
import {
  archiveCatalogItemHandler,
  createCatalogItemHandler,
  deleteCatalogImageHandler,
  getCatalogItemBySlugHandler,
  listCatalogItemsHandler,
  uploadCatalogImageHandler,
  updateCatalogItemHandler,
} from "./catalog.handlers";
import { catalogImageMaxBytes } from "./catalog.assets";

const catalogPublicRoutes = new Hono<AppEnv>()
  .get("/", validateQuery(catalogListQuerySchema), listCatalogItemsHandler)
  .get(
    "/:slug",
    validateParams(catalogSlugParamsSchema),
    getCatalogItemBySlugHandler,
  );

const catalogMutationRoutes = new Hono<AppEnv>()
  .use(
    "*",
    sessionMiddleware,
    requireAuth,
    trustedMutationOrigin(env.clientOrigin),
  )
  .post(
    "/",
    requirePermission("menu:create"),
    validateJson(createCatalogItemSchema),
    createCatalogItemHandler,
  )
  .post(
    "/assets",
    requireAnyPermission(["menu:create", "menu:update"]),
    bodyLimit({ maxSize: catalogImageMaxBytes }),
    uploadCatalogImageHandler,
  )
  .delete(
    "/assets",
    requireAnyPermission(["menu:create", "menu:update"]),
    validateJson(catalogImageDeleteSchema),
    deleteCatalogImageHandler,
  )
  .patch(
    "/:itemId",
    requirePermission("menu:update"),
    validateParams(catalogItemIdParamsSchema),
    validateJson(updateCatalogItemSchema),
    updateCatalogItemHandler,
  )
  .delete(
    "/:itemId",
    requirePermission("menu:delete"),
    validateParams(catalogItemIdParamsSchema),
    archiveCatalogItemHandler,
  );

export const catalogRoutes = new Hono<AppEnv>()
  .route("/", catalogPublicRoutes)
  .route("/", catalogMutationRoutes);
