import type {
  CheckoutOrderInput,
  CreateOrderInput,
  GuestCreateOrderInput,
  Order,
  OrderListQuery,
  OrderStatus,
  UpdateOrderStatusInput,
} from "shared";

import { db, type DbExecutor } from "../../db";
import { auditEvents } from "../audit/audit.events";
import * as auditRepository from "../audit/audit.repository";
import * as catalogRepository from "../catalog/catalog.repository";
import * as userRepository from "../users/users.repository";
import * as orderRepository from "./order.repository";
import { decodeOrderCursor, encodeOrderCursor } from "./order.cursor";
import { canTransitionOrderStatus } from "./order.policy";
import { calculateCheckoutPayment } from "./utils/order-payment";
import { calculateOrderPricing } from "./utils/order-pricing";
import { toOrder } from "./utils/order-mapper";
import { createOrderNumber } from "./utils/order-number";
import {
  createGuestOrderToken,
  hashGuestOrderToken,
} from "./utils/guest-order-token";

type OrderActor = {
  userId: string | null;
  canManageOrders: boolean;
  guestTokenHash?: string | null;
};

export type CreateOrderResult =
  | { status: "created"; order: Order }
  | { status: "channel-forbidden" }
  | { status: "customer-not-found" }
  | { status: "catalog-item-not-found"; itemSlug: string }
  | { status: "item-unavailable"; itemSlug: string }
  | {
      status: "invalid-option";
      itemSlug: string;
      option: "size" | "temperature";
    }
  | { status: "mixed-currency" }
  | { status: "persistence-failed" };

async function createOrderInTransaction(
  executor: DbExecutor,
  input: CreateOrderInput,
  actor: OrderActor,
): Promise<CreateOrderResult> {
  if (input.channel === "pos" && !actor.canManageOrders) {
    return { status: "channel-forbidden" };
  }

  if (actor.userId === null && input.channel !== "online") {
    return { status: "channel-forbidden" };
  }

  if (
    actor.userId !== null &&
    input.channel === "online" &&
    input.customerId !== undefined
  ) {
    if (input.customerId !== actor.userId) {
      return { status: "channel-forbidden" };
    }
  }

  const uniqueSlugs = [...new Set(input.lines.map(({ itemSlug }) => itemSlug))];
  const catalogRows = await catalogRepository.findActiveCatalogItemsBySlugs(
    executor,
    uniqueSlugs,
  );
  const pricing = calculateOrderPricing(input.lines, catalogRows);
  if (pricing.status !== "priced") return pricing;

  const orderId = crypto.randomUUID();

  const customerId =
    input.channel === "online" ? actor.userId : (input.customerId ?? null);
  if (customerId && !(await userRepository.findActiveCustomer(executor, customerId))) {
    return { status: "customer-not-found" };
  }

  const created = await orderRepository.createOrder(executor, {
    id: orderId,
    orderNumber: createOrderNumber(),
    customerId,
    createdByUserId: actor.userId,
    channel: input.channel,
    currency: pricing.currency,
    subtotalMinor: pricing.subtotalMinor,
    totalMinor: pricing.subtotalMinor,
    notes: input.notes ?? null,
    callName: input.callName ?? null,
    guestTokenHash: actor.guestTokenHash ?? null,
  });
  if (!created) return { status: "persistence-failed" };

  await orderRepository.createOrderItems(executor, orderId, pricing.lines);
  const result = await orderRepository.findOrderById(executor, created.id);
  if (!result) return { status: "persistence-failed" };

  if (actor.userId) {
    await auditRepository.recordAudit(executor, {
      actorUserId: actor.userId,
      ...auditEvents.orderCreated,
      targetId: created.id,
      details: {
        orderNumber: created.orderNumber,
        channel: created.channel,
        currency: created.currency,
        totalMinor: created.totalMinor,
      },
    });
  }

  return { status: "created", order: toOrder(result) };
}

export function createOrder(
  input: CreateOrderInput,
  actor: OrderActor,
): Promise<CreateOrderResult> {
  return db.transaction((tx) => createOrderInTransaction(tx, input, actor));
}

export type CreateGuestOrderResult =
  | Exclude<CreateOrderResult, { status: "created" }>
  | { status: "created"; order: Order; guestToken: string };

export async function createGuestOrder(
  input: GuestCreateOrderInput,
): Promise<CreateGuestOrderResult> {
  const guestToken = createGuestOrderToken();
  const guestTokenHash = await hashGuestOrderToken(guestToken);
  const result = await db.transaction((tx) =>
    createOrderInTransaction(tx, input, {
      userId: null,
      canManageOrders: false,
      guestTokenHash,
    }),
  );

  return result.status === "created" ? { ...result, guestToken } : result;
}

export type ListOrdersResult = {
  items: Order[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export async function listOrders(input: {
  actorUserId: string;
  query: OrderListQuery;
  scope: "all" | "own";
}): Promise<ListOrdersResult> {
  const scopeKey = input.scope === "all" ? "all" : `own:${input.actorUserId}`;
  const cursorPosition = decodeOrderCursor(
    input.query.cursor,
    input.query,
    scopeKey,
  );
  const page = await orderRepository.listOrderPage(db, {
    ...input.query,
    customerId: input.scope === "own" ? input.actorUserId : undefined,
    cursorPosition,
  });
  return {
    items: page.items.map(toOrder),
    pagination: {
      hasNextPage: page.hasNextPage,
      nextCursor:
        page.hasNextPage && page.lastOrder
          ? encodeOrderCursor(input.query, page.lastOrder, scopeKey)
          : null,
    },
  };
}

export type GetOrderResult =
  | { status: "found"; order: Order }
  | { status: "not-found" };

export async function getOrder(input: {
  actorUserId: string;
  orderId: string;
  scope: "all" | "own";
}): Promise<GetOrderResult> {
  const result = await orderRepository.findOrderById(
    db,
    input.orderId,
    input.scope === "own" ? input.actorUserId : undefined,
  );
  return result
    ? { status: "found", order: toOrder(result) }
    : { status: "not-found" };
}

export async function getGuestOrder(input: {
  guestToken: string;
}): Promise<GetOrderResult> {
  const guestTokenHash = await hashGuestOrderToken(input.guestToken);
  const result = await orderRepository.findOrderByGuestTokenHash(
    db,
    guestTokenHash,
  );

  return result
    ? { status: "found", order: toOrder(result) }
    : { status: "not-found" };
}

export type UpdateOrderStatusResult =
  | { status: "updated"; order: Order }
  | { status: "not-found" }
  | { status: "invalid-transition"; current: OrderStatus; next: OrderStatus }
  | { status: "payment-required" }
  | { status: "refund-required" }
  | { status: "persistence-failed" };

export async function updateOrderStatus(input: {
  orderId: string;
  body: UpdateOrderStatusInput;
  actorUserId: string;
}): Promise<UpdateOrderStatusResult> {
  return db.transaction(async (tx) => {
    const current = await orderRepository.findOrderById(tx, input.orderId);
    if (!current) return { status: "not-found" };

    const next = input.body.status;
    if (!canTransitionOrderStatus(current.order.status, next)) {
      return {
        status: "invalid-transition",
        current: current.order.status,
        next,
      };
    }
    if (next === "completed" && current.order.paymentStatus !== "paid") {
      return { status: "payment-required" };
    }
    if (next === "cancelled" && current.order.paymentStatus === "paid") {
      return { status: "refund-required" };
    }
    if (next === current.order.status) {
      return { status: "updated", order: toOrder(current) };
    }

    const updated = await orderRepository.updateOrderStatus(
      tx,
      input.orderId,
      next,
    );
    if (!updated) return { status: "persistence-failed" };

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.orderStatusChanged,
      targetId: input.orderId,
      details: {
        previousStatus: current.order.status,
        nextStatus: next,
      },
    });

    const result = await orderRepository.findOrderById(tx, input.orderId);
    return result
      ? { status: "updated", order: toOrder(result) }
      : { status: "persistence-failed" };
  });
}

export type CancelOrderResult =
  | { status: "cancelled"; order: Order }
  | { status: "not-found" }
  | { status: "invalid-transition" }
  | { status: "refund-required" }
  | { status: "persistence-failed" };

export async function cancelOrder(input: {
  actorUserId: string;
  orderId: string;
}): Promise<CancelOrderResult> {
  return db.transaction(async (tx) => {
    const current = await orderRepository.findOrderById(
      tx,
      input.orderId,
      input.actorUserId,
    );
    if (!current) return { status: "not-found" };
    if (
      current.order.status !== "pending" &&
      current.order.status !== "confirmed"
    ) {
      return { status: "invalid-transition" };
    }
    if (current.order.paymentStatus === "paid") {
      return { status: "refund-required" };
    }

    const updated = await orderRepository.updateOrderStatus(
      tx,
      input.orderId,
      "cancelled",
    );
    if (!updated) return { status: "persistence-failed" };

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.orderCancelled,
      targetId: input.orderId,
      details: {
        previousStatus: current.order.status,
        nextStatus: "cancelled",
      },
    });

    const result = await orderRepository.findOrderById(tx, input.orderId);
    return result
      ? { status: "cancelled", order: toOrder(result) }
      : { status: "persistence-failed" };
  });
}

export type CheckoutOrderResult =
  | { status: "checked-out"; order: Order }
  | { status: "already-paid"; order: Order }
  | { status: "not-found" }
  | { status: "invalid-state" }
  | { status: "underpaid" }
  | { status: "invalid-payment-amount" }
  | { status: "persistence-failed" };

export async function checkoutOrder(input: {
  orderId: string;
  body: CheckoutOrderInput;
  actorUserId: string;
}): Promise<CheckoutOrderResult> {
  return db.transaction(async (tx) => {
    const current = await orderRepository.findOrderById(tx, input.orderId);
    if (!current) return { status: "not-found" };
    if (current.order.paymentStatus === "paid") {
      return { status: "already-paid", order: toOrder(current) };
    }
    if (
      current.order.status === "cancelled" ||
      current.order.status === "completed"
    ) {
      return { status: "invalid-state" };
    }

    const payment = calculateCheckoutPayment(
      input.body,
      current.order.totalMinor,
    );
    if (payment.status !== "accepted") return payment;

    const updated = await orderRepository.checkoutOrder(tx, {
      orderId: input.orderId,
      paymentMethod: input.body.paymentMethod,
      paymentReference: input.body.paymentReference ?? null,
      amountTenderedMinor: payment.amountTenderedMinor,
      changeMinor: payment.changeMinor,
      status:
        current.order.status === "pending" ? "confirmed" : current.order.status,
    });
    if (!updated) return { status: "persistence-failed" };

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.orderCheckedOut,
      targetId: input.orderId,
      details: {
        paymentMethod: input.body.paymentMethod,
        previousStatus: current.order.status,
        nextStatus: updated.status,
      },
    });

    const result = await orderRepository.findOrderById(tx, input.orderId);
    return result
      ? { status: "checked-out", order: toOrder(result) }
      : { status: "persistence-failed" };
  });
}
