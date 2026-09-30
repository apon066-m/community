import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type { DashboardQuery } from "shared";

import type { AppEnv } from "../../app-env";
import { getValidatedQuery } from "../../middleware/validation";
import { getDashboardSummary } from "./dashboard.service";

export async function getDashboardSummaryHandler(c: Context<AppEnv>) {
  const permissions = c.get("authorization")!.permissions;
  return c.json(await getDashboardSummary(getValidatedQuery<DashboardQuery>(c), permissions), StatusCodes.OK);
}
