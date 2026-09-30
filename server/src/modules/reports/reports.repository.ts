import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";

import type { DbExecutor } from "../../db";
import { salesOrder, salesOrderItem } from "../orders/order.schema";
import type { SalesReportRange } from "./utils/sales-report-range";

function completedSalesConditions(input: SalesReportRange): SQL[] {
  const conditions: SQL[] = [
    eq(salesOrder.status, "completed"),
    eq(salesOrder.paymentStatus, "paid"),
    isNotNull(salesOrder.completedAt),
    gte(salesOrder.completedAt, input.from),
    lt(salesOrder.completedAt, input.to),
  ];

  if (input.currency) conditions.push(eq(salesOrder.currency, input.currency));
  return conditions;
}

const completedDay = sql<string>`to_char(${salesOrder.completedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

export async function summarizeSales(
  executor: DbExecutor,
  input: SalesReportRange,
) {
  const orderRows = await executor
    .select({
      currency: salesOrder.currency,
      orderCount: sql<number>`count(*)::int`,
      grossSalesMinor: sql<number>`coalesce(sum(${salesOrder.totalMinor}), 0)::int`,
    })
    .from(salesOrder)
    .where(and(...completedSalesConditions(input)))
    .groupBy(salesOrder.currency)
    .orderBy(asc(salesOrder.currency));

  const itemRows = await executor
    .select({
      currency: salesOrder.currency,
      itemCount: sql<number>`coalesce(sum(${salesOrderItem.quantity}), 0)::int`,
    })
    .from(salesOrderItem)
    .innerJoin(salesOrder, eq(salesOrderItem.orderId, salesOrder.id))
    .where(and(...completedSalesConditions(input)))
    .groupBy(salesOrder.currency);

  return { orderRows, itemRows };
}

export async function salesByDay(
  executor: DbExecutor,
  input: SalesReportRange,
) {
  const orderRows = await executor
    .select({
      date: completedDay,
      currency: salesOrder.currency,
      orderCount: sql<number>`count(*)::int`,
      grossSalesMinor: sql<number>`coalesce(sum(${salesOrder.totalMinor}), 0)::int`,
    })
    .from(salesOrder)
    .where(and(...completedSalesConditions(input)))
    .groupBy(completedDay, salesOrder.currency)
    .orderBy(asc(completedDay), asc(salesOrder.currency));

  const itemRows = await executor
    .select({
      date: completedDay,
      currency: salesOrder.currency,
      itemCount: sql<number>`coalesce(sum(${salesOrderItem.quantity}), 0)::int`,
    })
    .from(salesOrderItem)
    .innerJoin(salesOrder, eq(salesOrderItem.orderId, salesOrder.id))
    .where(and(...completedSalesConditions(input)))
    .groupBy(completedDay, salesOrder.currency);

  return { orderRows, itemRows };
}

export async function salesByProduct(
  executor: DbExecutor,
  input: SalesReportRange,
  limit?: number,
) {
  const query = executor
    .select({
      catalogItemId: salesOrderItem.catalogItemId,
      itemSlug: salesOrderItem.itemSlug,
      name: salesOrderItem.name,
      currency: salesOrder.currency,
      quantitySold: sql<number>`coalesce(sum(${salesOrderItem.quantity}), 0)::int`,
      grossSalesMinor: sql<number>`coalesce(sum(${salesOrderItem.lineTotalMinor}), 0)::int`,
    })
    .from(salesOrderItem)
    .innerJoin(salesOrder, eq(salesOrderItem.orderId, salesOrder.id))
    .where(and(...completedSalesConditions(input)))
    .groupBy(
      salesOrderItem.catalogItemId,
      salesOrderItem.itemSlug,
      salesOrderItem.name,
      salesOrder.currency,
    )
    .orderBy(
      desc(sql`sum(${salesOrderItem.lineTotalMinor})`),
      asc(salesOrderItem.name),
      asc(salesOrderItem.catalogItemId),
    );
  return limit === undefined ? query : query.limit(limit);
}
