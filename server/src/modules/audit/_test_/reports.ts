import { z } from "zod";

function isCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const reportDateSchema = z
  .string({ error: "Report date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Report date must use YYYY-MM-DD format")
  .refine(isCalendarDate, "Report date is not valid");

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter code");

export const salesReportQuerySchema = z
  .object({
    from: reportDateSchema,
    to: reportDateSchema,
    currency: currencySchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.from >= input.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Report end date must be after the start date",
      });
    }
  });

const salesMetricSchema = z.object({
  currency: z.string(),
  orderCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  grossSalesMinor: z.number().int().nonnegative(),
});

const salesDaySchema = salesMetricSchema.extend({
  date: reportDateSchema,
});

const salesProductSchema = z.object({
  catalogItemId: z.string(),
  itemSlug: z.string(),
  name: z.string(),
  currency: z.string(),
  quantitySold: z.number().int().nonnegative(),
  grossSalesMinor: z.number().int().nonnegative(),
});

export const salesSummaryResponseSchema = z.object({
  from: reportDateSchema,
  to: reportDateSchema,
  metrics: z.array(salesMetricSchema),
});

export const salesByDayResponseSchema = z.object({
  from: reportDateSchema,
  to: reportDateSchema,
  days: z.array(salesDaySchema),
});

export const salesProductsResponseSchema = z.object({
  from: reportDateSchema,
  to: reportDateSchema,
  products: z.array(salesProductSchema),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type SalesMetric = z.infer<typeof salesMetricSchema>;
export type SalesDay = z.infer<typeof salesDaySchema>;
export type SalesProduct = z.infer<typeof salesProductSchema>;
export type SalesSummaryResponse = z.infer<typeof salesSummaryResponseSchema>;
export type SalesByDayResponse = z.infer<typeof salesByDayResponseSchema>;
export type SalesProductsResponse = z.infer<typeof salesProductsResponseSchema>;
