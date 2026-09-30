import type { DashboardQuery, DashboardResponse } from "shared";

import { db } from "../../db";
import { getSalesByDay, getSalesByProduct, getSalesSummary } from "../reports/reports.service";
import * as repository from "./dashboard.repository";
import { fillDashboardDays } from "./dashboard.utils";

export async function getDashboardSummary(
  query: DashboardQuery,
  permissions: Set<string>,
): Promise<DashboardResponse> {
  const canReadSales = permissions.has("reports:read");
  const canReadOrders = permissions.has("order:read-all");
  const canReadInventory = permissions.has("inventory:read");

  const [summary, orders, inventory] = await Promise.all([
    canReadSales ? getSalesSummary({ from: query.from, to: query.to }) : null,
    canReadOrders ? repository.summarizeActiveOrders(db) : null,
    canReadInventory ? repository.summarizeStockAlerts(db) : null,
  ]);
  const availableCurrencies = summary?.metrics.map((metric) => metric.currency).sort() ?? [];
  const selectedCurrency = canReadSales ? (query.currency && availableCurrencies.includes(query.currency) ? query.currency : availableCurrencies[0]) ?? null : null;
  const metric = summary?.metrics.find((item) => item.currency === selectedCurrency);
  const [daily, products] = canReadSales && selectedCurrency
    ? await Promise.all([
        getSalesByDay({ ...query, currency: selectedCurrency }),
        getSalesByProduct({ ...query, currency: selectedCurrency }, 5),
      ])
    : [null, null];
  const days = fillDashboardDays(query.from, query.to, daily?.days ?? []);
  const counts = { pending: 0, confirmed: 0, preparing: 0, ready: 0 };
  for (const row of orders?.counts ?? []) {
    if (row.status in counts) counts[row.status as keyof typeof counts] = Number(row.count);
  }

  return {
    generatedAt: new Date().toISOString(), from: query.from, to: query.to,
    availableCurrencies, selectedCurrency,
    canCreateOrder: permissions.has("order:create"),
    sales: canReadSales ? {
      grossSalesMinor: metric?.grossSalesMinor ?? 0,
      orderCount: metric?.orderCount ?? 0,
      days,
      products: (products?.products ?? []).map((product) => ({
        catalogItemId: product.catalogItemId, name: product.name,
        quantitySold: product.quantitySold, grossSalesMinor: product.grossSalesMinor,
      })),
    } : null,
    orders: orders ? {
      counts,
      oldest: orders.oldest.map((order) => ({
        ...order, status: order.status as "pending" | "confirmed" | "preparing" | "ready",
        createdAt: order.createdAt.toISOString(),
      })),
    } : null,
    inventory: inventory ? {
      lowStockCount: Number(inventory.counts?.lowStockCount ?? 0),
      outOfStockCount: Number(inventory.counts?.outOfStockCount ?? 0),
      alerts: inventory.alerts,
    } : null,
  };
}
