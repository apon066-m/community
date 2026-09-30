import { describe, expect, test } from "bun:test";

import {
  indexSalesItemCounts,
  salesMetricKey,
  toSalesAggregateNumber,
} from "../utils/sales-report-aggregation";

describe("sales report aggregation", () => {
  test("normalizes database aggregate values", () => {
    expect(toSalesAggregateNumber("120")).toBe(120);
    expect(toSalesAggregateNumber(null)).toBe(0);
    expect(toSalesAggregateNumber(undefined)).toBe(0);
  });

  test("rejects non-integer aggregate values", () => {
    expect(() => toSalesAggregateNumber("not-a-number")).toThrow();
    expect(() => toSalesAggregateNumber(1.5)).toThrow();
  });

  test("indexes item counts by currency and optional report date", () => {
    const counts = indexSalesItemCounts([
      { currency: "USD", itemCount: "7" },
      { currency: "PHP", date: "2026-01-01", itemCount: 4 },
    ]);

    expect(counts.get(salesMetricKey("USD"))).toBe(7);
    expect(counts.get(salesMetricKey("PHP", "2026-01-01"))).toBe(4);
  });
});
