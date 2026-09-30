import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type { AuditLogQuery } from "shared";

import type { AppEnv } from "../../app-env";
import { getValidatedQuery } from "../../middleware/validation";
import * as service from "./audit.service";

export async function listAuditLogHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<AuditLogQuery>(c);
  return c.json(await service.listAuditLog(query), StatusCodes.OK);
}
