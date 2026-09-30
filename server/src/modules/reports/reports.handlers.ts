import { StatusCodes } from "http-status-codes";
import type { Context } from "hono";
import type { SalesReportQuery } from "shared";

import type { AppEnv } from "../../app-env";
import { getValidatedQuery } from "../../middleware/validation";
import * as reportsService from "./reports.service";

export async function getSalesSummaryHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<SalesReportQuery>(c);
  return c.json(await reportsService.getSalesSummary(query), StatusCodes.OK);
}

export async function getSalesByDayHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<SalesReportQuery>(c);
  return c.json(await reportsService.getSalesByDay(query), StatusCodes.OK);
}

export async function getSalesByProductHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<SalesReportQuery>(c);
  return c.json(await reportsService.getSalesByProduct(query), StatusCodes.OK);
}
