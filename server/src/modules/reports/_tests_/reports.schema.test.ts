import { describe, expect, test } from "bun:test";

import { salesReportQuerySchema } from "shared";

describe("sales report query", () => {
  test("accepts an exclusive date range and normalizes currency", () => {
    const result = salesReportQuerySchema.safeParse({
      from: "2026-01-01",
      to: "2026-02-01",
      currency: "usd",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("USD");
  });

  test("rejects reversed or invalid calendar dates", () => {
    expect(
      salesReportQuerySchema.safeParse({
        from: "2026-02-01",
        to: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      salesReportQuerySchema.safeParse({
        from: "2026-02-30",
        to: "2026-03-01",
      }).success,
    ).toBe(false);
  });
});
