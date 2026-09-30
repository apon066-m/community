import type { SalesReportQuery } from "shared";

export type SalesReportRange = {
  from: Date;
  to: Date;
  currency?: string;
};

export function toSalesReportRange(input: SalesReportQuery): SalesReportRange {
  return {
    from: new Date(`${input.from}T00:00:00.000Z`),
    to: new Date(`${input.to}T00:00:00.000Z`),
    currency: input.currency,
  };
}
