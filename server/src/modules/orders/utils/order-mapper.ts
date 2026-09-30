import type { Order } from "shared";
import {
  orderItemSizeOptions,
  orderItemTemperatureOptions,
} from "shared";

import type { OrderDetailsRow } from "../order.repository";
import type { SalesOrderItemRow } from "../order.schema";

function mapNullableOption<T extends string>(
  value: string | null,
  options: readonly T[],
): T | null {
  return value && options.includes(value as T) ? (value as T) : null;
}

function mapOrderItem(item: SalesOrderItemRow): Order["items"][number] {
  return {
    id: item.id,
    catalogItemId: item.catalogItemId,
    itemSlug: item.itemSlug,
    name: item.name,
    quantity: item.quantity,
    size: mapNullableOption(item.size, orderItemSizeOptions),
    temperature: mapNullableOption(item.temperature, orderItemTemperatureOptions),
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: item.lineTotalMinor,
    currency: item.currency,
  };
}

function mapPaymentMethod(
  method: "cash" | "card" | "gcash" | "digital" | null,
): Order["payment"]["method"] {
  if (method === "card" || method === "gcash") return "digital";
  return method;
}

export function toOrder(row: OrderDetailsRow): Order {
  return {
    id: row.order.id,
    orderNumber: row.order.orderNumber,
    customerId: row.order.customerId,
    createdByUserId: row.order.createdByUserId,
    callName: row.order.callName,
    channel: row.order.channel,
    status: row.order.status,
    currency: row.order.currency,
    subtotalMinor: row.order.subtotalMinor,
    totalMinor: row.order.totalMinor,
    notes: row.order.notes,
    customer: row.customer,
    items: row.items.map(mapOrderItem),
    payment: {
      status: row.order.paymentStatus,
      method: mapPaymentMethod(row.order.paymentMethod),
      reference: row.order.paymentReference,
      amountTenderedMinor: row.order.amountTenderedMinor,
      changeMinor: row.order.changeMinor,
    },
    createdAt: row.order.createdAt.toISOString(),
    updatedAt: row.order.updatedAt.toISOString(),
    cancelledAt: row.order.cancelledAt?.toISOString() ?? null,
    completedAt: row.order.completedAt?.toISOString() ?? null,
  };
}
