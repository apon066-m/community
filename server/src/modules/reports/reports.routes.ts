import { Hono } from "hono";
import { salesReportQuerySchema } from "shared";

import type { AppEnv } from "../../app-env";
import { validateQuery } from "../../middleware/validation";
import { requireAuth, sessionMiddleware } from "../auth/auth.middleware";
import { requirePermission } from "../authorization/authorization.middleware";
import {
  getSalesByDayHandler,
  getSalesByProductHandler,
  getSalesSummaryHandler,
} from "./reports.handlers";

export const reportsRoutes = new Hono<AppEnv>()
  .use("*", sessionMiddleware, requireAuth)
  .get(
    "/sales/summary",
    requirePermission("reports:read"),
    validateQuery(salesReportQuerySchema),
    getSalesSummaryHandler,
  )
  .get(
    "/sales/by-day",
    requirePermission("reports:read"),
    validateQuery(salesReportQuerySchema),
    getSalesByDayHandler,
  )
  .get(
    "/sales/products",
    requirePermission("reports:read"),
    validateQuery(salesReportQuerySchema),
    getSalesByProductHandler,
  );
