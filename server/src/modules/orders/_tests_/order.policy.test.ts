import { describe, expect, test } from "bun:test";

import { canTransitionOrderStatus } from "../order.policy";

describe("order status transitions", () => {
  test("allows the normal preparation workflow", () => {
    expect(canTransitionOrderStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionOrderStatus("confirmed", "preparing")).toBe(true);
    expect(canTransitionOrderStatus("preparing", "ready")).toBe(true);
    expect(canTransitionOrderStatus("ready", "completed")).toBe(true);
  });

  test("allows cancelling an active order but not terminal states", () => {
    expect(canTransitionOrderStatus("pending", "cancelled")).toBe(true);
    expect(canTransitionOrderStatus("preparing", "cancelled")).toBe(true);
    expect(canTransitionOrderStatus("completed", "cancelled")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "pending")).toBe(false);
  });

  test("treats a repeated status update as idempotent", () => {
    expect(canTransitionOrderStatus("ready", "ready")).toBe(true);
  });
});
