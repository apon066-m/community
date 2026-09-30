import type { CheckoutOrderInput } from "shared";

export type CheckoutPaymentResult =
  | {
      status: "accepted";
      amountTenderedMinor: number;
      changeMinor: number;
    }
  | { status: "underpaid" }
  | { status: "invalid-payment-amount" };

export function calculateCheckoutPayment(
  input: CheckoutOrderInput,
  totalMinor: number,
): CheckoutPaymentResult {
  const amountTenderedMinor =
    input.paymentMethod === "cash"
      ? (input.amountTenderedMinor ?? totalMinor)
      : totalMinor;

  if (
    input.paymentMethod !== "cash" &&
    input.amountTenderedMinor !== undefined &&
    input.amountTenderedMinor !== totalMinor
  ) {
    return { status: "invalid-payment-amount" };
  }

  if (amountTenderedMinor < totalMinor) {
    return { status: "underpaid" };
  }

  return {
    status: "accepted",
    amountTenderedMinor,
    changeMinor: amountTenderedMinor - totalMinor,
  };
}
