import { Hono } from "hono";
import {
  createInventoryItemSchema,
  inventoryItemIdParamsSchema,
  inventoryListQuerySchema,
  recordInventoryMovementSchema,
  updateInventoryItemSchema,
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
import { requirePermission } from "../authorization/authorization.middleware";
import {
  createInventoryItemHandler,
  getInventoryItemHandler,
  listInventoryItemsHandler,
  recordInventoryMovementHandler,
  updateInventoryItemHandler,
} from "./inventory.handlers";

const inventoryReadRoutes = new Hono<AppEnv>()
  .use("*", sessionMiddleware, requireAuth)
  .get(
    "/items",
    requirePermission("inventory:read"),
    validateQuery(inventoryListQuerySchema),
    listInventoryItemsHandler,
  )
  .get(
    "/items/:itemId",
    requirePermission("inventory:read"),
    validateParams(inventoryItemIdParamsSchema),
    getInventoryItemHandler,
  );

const inventoryMutationRoutes = new Hono<AppEnv>()
  .use(
    "*",
    sessionMiddleware,
    requireAuth,
    trustedMutationOrigin(env.clientOrigin),
  )
  .post(
    "/items",
    requirePermission("inventory:manage"),
    validateJson(createInventoryItemSchema),
    createInventoryItemHandler,
  )
  .patch(
    "/items/:itemId",
    requirePermission("inventory:manage"),
    validateParams(inventoryItemIdParamsSchema),
    validateJson(updateInventoryItemSchema),
    updateInventoryItemHandler,
  )
  .post(
    "/items/:itemId/movements",
    requirePermission("inventory:manage"),
    validateParams(inventoryItemIdParamsSchema),
    validateJson(recordInventoryMovementSchema),
    recordInventoryMovementHandler,
  );

export const inventoryRoutes = new Hono<AppEnv>()
  .route("/", inventoryReadRoutes)
  .route("/", inventoryMutationRoutes);
