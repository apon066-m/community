import type { RecordInventoryMovementInput } from "shared";

export type InventoryBalanceResult =
  | { status: "accepted"; nextBalance: number }
  | { status: "insufficient-stock" };

export function getInventoryMovementDelta(
  input: RecordInventoryMovementInput,
) {
  switch (input.type) {
    case "receipt":
      return input.quantity;
    case "waste":
      return -input.quantity;
    case "adjustment":
      return input.quantityDelta;
  }
}

export function calculateInventoryBalance(
  currentBalance: number,
  quantityDelta: number,
): InventoryBalanceResult {
  const nextBalance = currentBalance + quantityDelta;
  return nextBalance < 0
    ? { status: "insufficient-stock" }
    : { status: "accepted", nextBalance };
}
