import type {
  SalesByDayResponse,
  SalesProductsResponse,
  SalesReportQuery,
  SalesSummaryResponse,
} from "shared";

import { db } from "../../db";
import * as reportsRepository from "./reports.repository";
import {
  indexSalesItemCounts,
  salesMetricKey,
  toSalesAggregateNumber,
} from "./utils/sales-report-aggregation";
import { toSalesReportRange } from "./utils/sales-report-range";

export async function getSalesSummary(
  input: SalesReportQuery,
): Promise<SalesSummaryResponse> {
  const range = toSalesReportRange(input);
  const { orderRows, itemRows } = await reportsRepository.summarizeSales(
    db,
    range,
  );
  const itemCounts = indexSalesItemCounts(itemRows);

  return {
    from: input.from,
    to: input.to,
    metrics: orderRows.map((row) => ({
      currency: row.currency,
      orderCount: toSalesAggregateNumber(row.orderCount),
      itemCount: itemCounts.get(salesMetricKey(row.currency)) ?? 0,
      grossSalesMinor: toSalesAggregateNumber(row.grossSalesMinor),
    })),
  };
}

export async function getSalesByDay(
  input: SalesReportQuery,
): Promise<SalesByDayResponse> {
  const range = toSalesReportRange(input);
  const { orderRows, itemRows } = await reportsRepository.salesByDay(
    db,
    range,
  );
  const itemCounts = indexSalesItemCounts(itemRows);

  return {
    from: input.from,
    to: input.to,
    days: orderRows.map((row) => ({
      date: row.date,
      currency: row.currency,
      orderCount: toSalesAggregateNumber(row.orderCount),
      itemCount:
        itemCounts.get(salesMetricKey(row.currency, row.date)) ?? 0,
      grossSalesMinor: toSalesAggregateNumber(row.grossSalesMinor),
    })),
  };
}

export async function getSalesByProduct(
  input: SalesReportQuery,
  limit?: number,
): Promise<SalesProductsResponse> {
  const rows = await reportsRepository.salesByProduct(
    db,
    toSalesReportRange(input),
    limit,
  );

  return {
    from: input.from,
    to: input.to,
    products: rows.map((row) => ({
      catalogItemId: row.catalogItemId,
      itemSlug: row.itemSlug,
      name: row.name,
      currency: row.currency,
      quantitySold: toSalesAggregateNumber(row.quantitySold),
      grossSalesMinor: toSalesAggregateNumber(row.grossSalesMinor),
    })),
  };
}
