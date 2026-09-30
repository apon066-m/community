import { describe, expect, test } from "bun:test";
import { dashboardQuerySchema } from "shared";

import { fillDashboardDays } from "../dashboard.utils";

describe("dashboard date contract", () => {
  test("keeps the inclusive start and exclusive end across a UTC month boundary", () => {
    expect(fillDashboardDays("2026-09-30", "2026-10-02", [
      { date: "2026-10-01", currency: "USD", orderCount: 2, itemCount: 3, grossSalesMinor: 550 },
    ])).toEqual([
      { date: "2026-09-30", orderCount: 0, grossSalesMinor: 0 },
      { date: "2026-10-01", orderCount: 2, grossSalesMinor: 550 },
    ]);
  });

  test("rejects invalid date ranges and normalizes currency", () => {
    expect(dashboardQuerySchema.safeParse({ from: "2026-02-30", to: "2026-03-02" }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ from: "2026-03-02", to: "2026-03-02" }).success).toBe(false);
    expect(dashboardQuerySchema.parse({ from: "2026-03-01", to: "2026-03-02", currency: "usd" }).currency).toBe("USD");
  });
});

test("dashboard endpoint requires a session before reading operational data", async () => {
  const { app } = await import("../../../app");
  const response = await app.request("/api/v1/dashboard/summary?from=2026-09-01&to=2026-09-02");
  expect(response.status).toBe(401);
});
