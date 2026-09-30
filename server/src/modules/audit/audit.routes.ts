import { Hono } from "hono";
import { auditLogQuerySchema } from "shared";

import type { AppEnv } from "../../app-env";
import { validateQuery } from "../../middleware/validation";
import { requireAdmin } from "../authorization/authorization.middleware";
import { listAuditLogHandler } from "./audit.handlers";

export const auditRoutes = new Hono<AppEnv>()
  .use("*", requireAdmin)
  .get("/", validateQuery(auditLogQuerySchema), listAuditLogHandler);
