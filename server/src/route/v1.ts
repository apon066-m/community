import { Hono } from "hono";

import type { AppEnv } from "../app-env";
import { env } from "../config/env";
import { trustedMutationOrigin } from "../middleware/security";
import { auditRoutes } from "../modules/audit/audit.routes";
import {
  requireAuth,
  sessionMiddleware,
} from "../modules/auth/auth.middleware";
import { authorizationRoutes } from "../modules/authorization/authorization.routes";
import { catalogRoutes } from "../modules/catalog/catalog.routes";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes";
import { inventoryRoutes } from "../modules/inventory/inventory.routes";
import { orderRoutes } from "../modules/orders/order.routes";
import { reportsRoutes } from "../modules/reports/reports.routes";
import { adminUserRoutes, userRoutes } from "../modules/users/user.routes";

export const v1Routes = new Hono<AppEnv>()
  .use("/users", sessionMiddleware, requireAuth)
  .use("/users/*", sessionMiddleware, requireAuth)
  .use("/users", trustedMutationOrigin(env.clientOrigin))
  .use("/admin/*", sessionMiddleware, requireAuth)
  .use("/users/*", trustedMutationOrigin(env.clientOrigin))
  .use("/admin/*", trustedMutationOrigin(env.clientOrigin))
  .route("/users", userRoutes)
  .route("/admin/audit-log", auditRoutes)
  .route("/admin/users", adminUserRoutes)
  .route("/admin/rbac", authorizationRoutes)
  .route("/catalog-items", catalogRoutes)
  .route("/dashboard", dashboardRoutes)
  .route("/inventory", inventoryRoutes)
  .route("/orders", orderRoutes)
  .route("/reports", reportsRoutes);
