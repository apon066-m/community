import { describe, expect, test } from "bun:test";
import type { CreateOrderLineInput } from "shared";

import type { CatalogItemForOrder } from "../../catalog/catalog.repository";
import { calculateCheckoutPayment } from "../utils/order-payment";
import { calculateOrderPricing } from "../utils/order-pricing";
import { createOrderNumber } from "../utils/order-number";

const latte: CatalogItemForOrder = {
  id: "catalog-latte",
  slug: "cafe-latte",
  name: "Cafe Latte",
  priceMinor: 14000,
  currency: "PHP",
  attributes: {
    sizes: ["medium", "large"],
    temperatures: ["hot", "iced"],
  },
  available: true,
};

const latteLine: CreateOrderLineInput = {
  itemSlug: "cafe-latte",
  quantity: 2,
  size: "large",
  temperature: "iced",
};

describe("order utilities", () => {
  test("prices lines from catalog values and resolves selected options", () => {
    expect(calculateOrderPricing([latteLine], [latte])).toEqual({
      status: "priced",
      currency: "PHP",
      subtotalMinor: 28000,
      lines: [
        {
          catalogItemId: "catalog-latte",
          itemSlug: "cafe-latte",
          name: "Cafe Latte",
          quantity: 2,
          size: "large",
          temperature: "iced",
          unitPriceMinor: 14000,
          lineTotalMinor: 28000,
          currency: "PHP",
        },
      ],
    });
  });

  test("rejects unavailable and invalid catalog options", () => {
    expect(
      calculateOrderPricing(
        [{ ...latteLine, size: "small" }],
        [latte],
      ),
    ).toEqual({
      status: "invalid-option",
      itemSlug: "cafe-latte",
      option: "size",
    });

    expect(
      calculateOrderPricing([latteLine], [{ ...latte, available: false }]),
    ).toEqual({ status: "item-unavailable", itemSlug: "cafe-latte" });
  });

  test("calculates cash change and rejects invalid payments", () => {
    expect(
      calculateCheckoutPayment(
        { paymentMethod: "cash", amountTenderedMinor: 30000 },
        28000,
      ),
    ).toEqual({
      status: "accepted",
      amountTenderedMinor: 30000,
      changeMinor: 2000,
    });
    expect(
      calculateCheckoutPayment(
        { paymentMethod: "cash", amountTenderedMinor: 27000 },
        28000,
      ),
    ).toEqual({ status: "underpaid" });
    expect(
      calculateCheckoutPayment(
        {
          paymentMethod: "digital",
          paymentReference: "QR-27000",
          amountTenderedMinor: 27000,
        },
        28000,
      ),
    ).toEqual({ status: "invalid-payment-amount" });
  });

  test("creates a stable display order number format", () => {
    expect(
      createOrderNumber(new Date("2026-01-02T12:00:00.000Z"), "abcdef123456"),
    ).toBe("ORD-20260102-ABCDEF12");
  });
});
