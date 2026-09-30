import { Hono } from "hono";
import {
  cancelOrderSchema,
  checkoutOrderSchema,
  createOrderSchema,
  guestCreateOrderSchema,
  guestOrderTokenParamsSchema,
  orderIdParamsSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
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
  cancelOrderHandler,
  checkoutOrderHandler,
  createGuestOrderHandler,
  createOrderHandler,
  getGuestOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
} from "./order.handlers";

const orderReadRoutes = new Hono<AppEnv>()
  .use("*", sessionMiddleware, requireAuth)
  .get(
    "/",
    requireAnyPermission(["order:read-own", "order:read-all"]),
    validateQuery(orderListQuerySchema),
    listOrdersHandler,
  )
  .get(
    "/:orderId",
    requireAnyPermission(["order:read-own", "order:read-all"]),
    validateParams(orderIdParamsSchema),
    getOrderHandler,
  );

const orderMutationRoutes = new Hono<AppEnv>()
  .use(
    "*",
    sessionMiddleware,
    requireAuth,
    trustedMutationOrigin(env.clientOrigin),
  )
  .post(
    "/",
    requirePermission("order:create"),
    validateJson(createOrderSchema),
    createOrderHandler,
  )
  .post(
    "/:orderId/checkout",
    requirePermission("order:update-status"),
    validateParams(orderIdParamsSchema),
    validateJson(checkoutOrderSchema),
    checkoutOrderHandler,
  )
  .patch(
    "/:orderId/status",
    requirePermission("order:update-status"),
    validateParams(orderIdParamsSchema),
    validateJson(updateOrderStatusSchema),
    updateOrderStatusHandler,
  )
  .post(
    "/:orderId/cancel",
    requirePermission("order:cancel-own"),
    validateParams(orderIdParamsSchema),
    validateJson(cancelOrderSchema),
    cancelOrderHandler,
  );

const guestOrderRoutes = new Hono<AppEnv>()
  .use("*", trustedMutationOrigin(env.clientOrigin))
  .post(
    "/",
    validateJson(guestCreateOrderSchema),
    createGuestOrderHandler,
  )
  .get(
    "/:guestToken",
    validateParams(guestOrderTokenParamsSchema),
    getGuestOrderHandler,
  );

export const orderRoutes = new Hono<AppEnv>()
  .route("/guest", guestOrderRoutes)
  .route("/", orderReadRoutes)
  .route("/", orderMutationRoutes);
