import { z } from "zod";

import { salesReportQuerySchema } from "./reports";

export const dashboardQuerySchema = salesReportQuerySchema;

const dashboardDaySchema = z.object({
  date: z.string(),
  orderCount: z.number().int().nonnegative(),
  grossSalesMinor: z.number().int().nonnegative(),
});

export const dashboardResponseSchema = z.object({
  generatedAt: z.string(),
  from: z.string(),
  to: z.string(),
  availableCurrencies: z.array(z.string()),
  selectedCurrency: z.string().nullable(),
  canCreateOrder: z.boolean(),
  sales: z.object({
    grossSalesMinor: z.number().int().nonnegative(),
    orderCount: z.number().int().nonnegative(),
    days: z.array(dashboardDaySchema),
    products: z.array(z.object({
      catalogItemId: z.string(),
      name: z.string(),
      quantitySold: z.number().int().nonnegative(),
      grossSalesMinor: z.number().int().nonnegative(),
    })),
  }).nullable(),
  orders: z.object({
    counts: z.object({
      pending: z.number().int().nonnegative(),
      confirmed: z.number().int().nonnegative(),
      preparing: z.number().int().nonnegative(),
      ready: z.number().int().nonnegative(),
    }),
    oldest: z.array(z.object({
      id: z.string(),
      orderNumber: z.string(),
      channel: z.enum(["online", "pos"]),
      status: z.enum(["pending", "confirmed", "preparing", "ready"]),
      createdAt: z.string(),
    })),
  }).nullable(),
  inventory: z.object({
    lowStockCount: z.number().int().nonnegative(),
    outOfStockCount: z.number().int().nonnegative(),
    alerts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      stockOnHand: z.number().int().nonnegative(),
      reorderLevel: z.number().int().nonnegative(),
    })),
  }).nullable(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
