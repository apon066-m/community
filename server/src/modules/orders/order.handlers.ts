import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type {
  CheckoutOrderInput,
  CreateOrderInput,
  GuestCreateOrderInput,
  GuestOrderTokenParams,
  OrderIdParams,
  OrderListQuery,
  UpdateOrderStatusInput,
} from "shared";

import type { AppEnv } from "../../app-env";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
} from "../../middleware/validation";
import {
  throwCancelOrderError,
  throwCheckoutOrderError,
  throwCreateOrderError,
  throwGetOrderError,
  throwUpdateOrderStatusError,
} from "./order.errors";
import * as orderService from "./order.service";

function canReadAllOrders(c: Context<AppEnv>) {
  return c.get("authorization")?.permissions.has("order:read-all") ?? false;
}

function canManageOrders(c: Context<AppEnv>) {
  return (
    c.get("authorization")?.permissions.has("order:update-status") ?? false
  );
}

export async function listOrdersHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<OrderListQuery>(c);
  const result = await orderService.listOrders({
    actorUserId: c.get("user")!.id,
    query,
    scope: canReadAllOrders(c) ? "all" : "own",
  });

  return c.json(result, StatusCodes.OK);
}

export async function getOrderHandler(c: Context<AppEnv>) {
  const { orderId } = getValidatedParams<OrderIdParams>(c);
  const result = await orderService.getOrder({
    actorUserId: c.get("user")!.id,
    orderId,
    scope: canReadAllOrders(c) ? "all" : "own",
  });

  if (result.status !== "found") throwGetOrderError(result);
  return c.json({ order: result.order }, StatusCodes.OK);
}

export async function createOrderHandler(c: Context<AppEnv>) {
  const input = getValidatedBody<CreateOrderInput>(c);
  const result = await orderService.createOrder(input, {
    userId: c.get("user")!.id,
    canManageOrders: canManageOrders(c),
  });

  if (result.status !== "created") throwCreateOrderError(result);
  return c.json({ order: result.order }, StatusCodes.CREATED);
}

export async function createGuestOrderHandler(c: Context<AppEnv>) {
  const input = getValidatedBody<GuestCreateOrderInput>(c);
  const result = await orderService.createGuestOrder(input);

  if (result.status !== "created") throwCreateOrderError(result);
  return c.json(
    { order: result.order, guestToken: result.guestToken },
    StatusCodes.CREATED,
  );
}

export async function getGuestOrderHandler(c: Context<AppEnv>) {
  const { guestToken } = getValidatedParams<GuestOrderTokenParams>(c);
  const result = await orderService.getGuestOrder({ guestToken });

  if (result.status !== "found") throwGetOrderError(result);
  return c.json({ order: result.order }, StatusCodes.OK);
}

export async function updateOrderStatusHandler(c: Context<AppEnv>) {
  const { orderId } = getValidatedParams<OrderIdParams>(c);
  const body = getValidatedBody<UpdateOrderStatusInput>(c);
  const result = await orderService.updateOrderStatus({
    orderId,
    body,
    actorUserId: c.get("user")!.id,
  });

  if (result.status !== "updated") throwUpdateOrderStatusError(result);
  return c.json({ order: result.order }, StatusCodes.OK);
}

export async function cancelOrderHandler(c: Context<AppEnv>) {
  const { orderId } = getValidatedParams<OrderIdParams>(c);
  const result = await orderService.cancelOrder({
    actorUserId: c.get("user")!.id,
    orderId,
  });

  if (result.status !== "cancelled") throwCancelOrderError(result);
  return c.json({ order: result.order }, StatusCodes.OK);
}

export async function checkoutOrderHandler(c: Context<AppEnv>) {
  const { orderId } = getValidatedParams<OrderIdParams>(c);
  const body = getValidatedBody<CheckoutOrderInput>(c);
  const result = await orderService.checkoutOrder({
    orderId,
    body,
    actorUserId: c.get("user")!.id,
  });

  if (result.status === "checked-out" || result.status === "already-paid") {
    return c.json({ order: result.order }, StatusCodes.OK);
  }

  throwCheckoutOrderError(result);
}
