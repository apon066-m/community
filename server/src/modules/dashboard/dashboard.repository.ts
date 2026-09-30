import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";

import type { DbExecutor } from "../../db";
import { inventoryItem } from "../inventory/inventory.schema";
import { salesOrder } from "../orders/order.schema";

const activeStatuses = ["pending", "confirmed", "preparing", "ready"] as const;
const activeStock = and(eq(inventoryItem.active, true), lte(inventoryItem.stockOnHand, inventoryItem.reorderLevel));

export async function summarizeActiveOrders(executor: DbExecutor) {
  const [counts, oldest] = await Promise.all([
    executor.select({ status: salesOrder.status, count: sql<number>`count(*)::int` })
      .from(salesOrder).where(inArray(salesOrder.status, activeStatuses)).groupBy(salesOrder.status),
    executor.select({ id: salesOrder.id, orderNumber: salesOrder.orderNumber,
      channel: salesOrder.channel, status: salesOrder.status, createdAt: salesOrder.createdAt })
      .from(salesOrder).where(inArray(salesOrder.status, activeStatuses))
      .orderBy(asc(salesOrder.createdAt), asc(salesOrder.id)).limit(5),
  ]);
  return { counts, oldest };
}

export async function summarizeStockAlerts(executor: DbExecutor) {
  const [counts, alerts] = await Promise.all([
    executor.select({
      outOfStockCount: sql<number>`count(*) filter (where ${inventoryItem.stockOnHand} = 0)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${inventoryItem.stockOnHand} > 0)::int`,
    }).from(inventoryItem).where(activeStock),
    executor.select({ id: inventoryItem.id, name: inventoryItem.name,
      stockOnHand: inventoryItem.stockOnHand, reorderLevel: inventoryItem.reorderLevel })
      .from(inventoryItem).where(activeStock)
      .orderBy(asc(inventoryItem.stockOnHand), asc(inventoryItem.name), asc(inventoryItem.id)).limit(5),
  ]);
  return { counts: counts[0], alerts };
}
