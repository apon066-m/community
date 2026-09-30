import type { OrderStatus } from "shared";

const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
) {
  return current === next || allowedOrderTransitions[current].includes(next);
}
