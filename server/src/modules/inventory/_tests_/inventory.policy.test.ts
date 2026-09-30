import { describe, expect, test } from "bun:test";

import {
  calculateInventoryBalance,
  getInventoryMovementDelta,
} from "../inventory.policy";

describe("inventory movement policy", () => {
  test("maps receipts, waste, and adjustments to signed deltas", () => {
    expect(
      getInventoryMovementDelta({ type: "receipt", quantity: 12 }),
    ).toBe(12);
    expect(getInventoryMovementDelta({ type: "waste", quantity: 3 })).toBe(-3);
    expect(
      getInventoryMovementDelta({
        type: "adjustment",
        quantityDelta: -2,
      }),
    ).toBe(-2);
  });

  test("accepts a non-negative resulting balance", () => {
    expect(calculateInventoryBalance(4, -4)).toEqual({
      status: "accepted",
      nextBalance: 0,
    });
  });

  test("rejects movements that would make stock negative", () => {
    expect(calculateInventoryBalance(2, -3)).toEqual({
      status: "insufficient-stock",
    });
  });
});
