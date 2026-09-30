import { Hono } from "hono";
import { dashboardQuerySchema } from "shared";

import type { AppEnv } from "../../app-env";
import { validateQuery } from "../../middleware/validation";
import { requireAuth, sessionMiddleware } from "../auth/auth.middleware";
import { requireAnyPermission } from "../authorization/authorization.middleware";
import { getDashboardSummaryHandler } from "./dashboard.handlers";

export const dashboardRoutes = new Hono<AppEnv>()
  .use("*", sessionMiddleware, requireAuth)
  .get("/summary", requireAnyPermission(["reports:read", "order:read-all", "inventory:read"]),
    validateQuery(dashboardQuerySchema), getDashboardSummaryHandler);
