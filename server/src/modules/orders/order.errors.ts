import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";
import type {
  CancelOrderResult,
  CheckoutOrderResult,
  CreateOrderResult,
  GetOrderResult,
  UpdateOrderStatusResult,
} from "./order.service";

function orderError(
  message: string,
  code: string,
  statusCode: ContentfulStatusCode,
) {
  return new AppError({
    message,
    code,
    statusCode,
  });
}

export function throwCreateOrderError(
  result: Exclude<CreateOrderResult, { status: "created" }>,
): never {
  switch (result.status) {
    case "channel-forbidden":
      throw orderError(
        "You are not allowed to create this type of order",
        "ORDER_CHANNEL_FORBIDDEN",
        StatusCodes.FORBIDDEN,
      );
    case "customer-not-found":
      throw orderError(
        "Customer not found",
        "ORDER_CUSTOMER_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
    case "catalog-item-not-found":
      throw orderError(
        `Catalog item '${result.itemSlug}' was not found`,
        "ORDER_ITEM_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
    case "item-unavailable":
      throw orderError(
        `Catalog item '${result.itemSlug}' is unavailable`,
        "ORDER_ITEM_UNAVAILABLE",
        StatusCodes.CONFLICT,
      );
    case "invalid-option":
      throw orderError(
        `The selected ${result.option} is not available for '${result.itemSlug}'`,
        "ORDER_ITEM_OPTION_INVALID",
        StatusCodes.BAD_REQUEST,
      );
    case "mixed-currency":
      throw orderError(
        "All items in an order must use the same currency",
        "ORDER_CURRENCY_MISMATCH",
        StatusCodes.BAD_REQUEST,
      );
    case "persistence-failed":
      throw orderError(
        "Unable to create the order",
        "ORDER_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}

export function throwGetOrderError(
  result: Exclude<GetOrderResult, { status: "found" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw orderError("Order not found", "ORDER_NOT_FOUND", StatusCodes.NOT_FOUND);
  }
}

export function throwUpdateOrderStatusError(
  result: Exclude<UpdateOrderStatusResult, { status: "updated" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw orderError("Order not found", "ORDER_NOT_FOUND", StatusCodes.NOT_FOUND);
    case "invalid-transition":
      throw orderError(
        `Order cannot transition from ${result.current} to ${result.next}`,
        "ORDER_STATUS_TRANSITION_INVALID",
        StatusCodes.CONFLICT,
      );
    case "payment-required":
      throw orderError(
        "The order must be paid before it can be completed",
        "ORDER_PAYMENT_REQUIRED",
        StatusCodes.CONFLICT,
      );
    case "refund-required":
      throw orderError(
        "Paid orders require a refund before cancellation",
        "ORDER_REFUND_REQUIRED",
        StatusCodes.CONFLICT,
      );
    case "persistence-failed":
      throw orderError(
        "Unable to update the order",
        "ORDER_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}

export function throwCancelOrderError(
  result: Exclude<CancelOrderResult, { status: "cancelled" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw orderError("Order not found", "ORDER_NOT_FOUND", StatusCodes.NOT_FOUND);
    case "invalid-transition":
      throw orderError(
        "This order can no longer be cancelled",
        "ORDER_CANCELLATION_INVALID",
        StatusCodes.CONFLICT,
      );
    case "refund-required":
      throw orderError(
        "Paid orders require a refund before cancellation",
        "ORDER_REFUND_REQUIRED",
        StatusCodes.CONFLICT,
      );
    case "persistence-failed":
      throw orderError(
        "Unable to cancel the order",
        "ORDER_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}

export function throwCheckoutOrderError(
  result: Exclude<CheckoutOrderResult, { status: "checked-out" | "already-paid" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw orderError("Order not found", "ORDER_NOT_FOUND", StatusCodes.NOT_FOUND);
    case "invalid-state":
      throw orderError(
        "This order cannot be checked out",
        "ORDER_CHECKOUT_INVALID",
        StatusCodes.CONFLICT,
      );
    case "underpaid":
      throw orderError(
        "The amount tendered is less than the order total",
        "ORDER_PAYMENT_UNDERPAID",
        StatusCodes.BAD_REQUEST,
      );
    case "invalid-payment-amount":
      throw orderError(
        "The payment amount must match the order total",
        "ORDER_PAYMENT_AMOUNT_INVALID",
        StatusCodes.BAD_REQUEST,
      );
    case "persistence-failed":
      throw orderError(
        "Unable to complete checkout",
        "ORDER_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}
