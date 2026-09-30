import { describe, expect, test } from "bun:test";

import { toSalesReportRange } from "../utils/sales-report-range";

describe("sales report range", () => {
  test("converts report dates to UTC boundaries", () => {
    const range = toSalesReportRange({
      from: "2026-01-01",
      to: "2026-02-01",
    });

    expect(range.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(range.currency).toBeUndefined();
  });

  test("preserves the optional currency filter", () => {
    const range = toSalesReportRange({
      from: "2026-01-01",
      to: "2026-02-01",
      currency: "USD",
    });

    expect(range.currency).toBe("USD");
  });
});
