import type {
  CreateOrderLineInput,
  OrderItemSize,
  OrderItemTemperature,
} from "shared";
import {
  orderItemSizeOptions,
  orderItemTemperatureOptions,
} from "shared";

import type { CatalogItemForOrder } from "../../catalog/catalog.repository";

export type PricedOrderLine = {
  catalogItemId: string;
  itemSlug: string;
  name: string;
  quantity: number;
  size: OrderItemSize | null;
  temperature: OrderItemTemperature | null;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: string;
};

export type OrderPricingResult =
  | {
      status: "priced";
      lines: PricedOrderLine[];
      currency: string;
      subtotalMinor: number;
    }
  | { status: "catalog-item-not-found"; itemSlug: string }
  | { status: "item-unavailable"; itemSlug: string }
  | {
      status: "invalid-option";
      itemSlug: string;
      option: "size" | "temperature";
    }
  | { status: "mixed-currency" }
  | { status: "persistence-failed" };

function readOptions<T extends string>(
  attributes: Record<string, unknown>,
  key: string,
  allowedOptions: readonly T[],
) {
  const value = attributes[key];
  if (!Array.isArray(value)) return [] as T[];

  return value.filter(
    (entry): entry is T =>
      typeof entry === "string" && allowedOptions.includes(entry as T),
  );
}

export function calculateOrderPricing(
  lines: readonly CreateOrderLineInput[],
  catalogItems: readonly CatalogItemForOrder[],
): OrderPricingResult {
  const catalogBySlug = new Map(catalogItems.map((item) => [item.slug, item]));
  const pricedLines: PricedOrderLine[] = [];
  let currency: string | undefined;
  let subtotalMinor = 0;

  for (const line of lines) {
    const catalogItem = catalogBySlug.get(line.itemSlug);
    if (!catalogItem) {
      return { status: "catalog-item-not-found", itemSlug: line.itemSlug };
    }
    if (!catalogItem.available) {
      return { status: "item-unavailable", itemSlug: line.itemSlug };
    }

    const sizes = readOptions(
      catalogItem.attributes,
      "sizes",
      orderItemSizeOptions,
    );
    const temperatures = readOptions(
      catalogItem.attributes,
      "temperatures",
      orderItemTemperatureOptions,
    );
    if (line.size && !sizes.includes(line.size)) {
      return {
        status: "invalid-option",
        itemSlug: line.itemSlug,
        option: "size",
      };
    }
    if (line.temperature && !temperatures.includes(line.temperature)) {
      return {
        status: "invalid-option",
        itemSlug: line.itemSlug,
        option: "temperature",
      };
    }

    if (currency && currency !== catalogItem.currency) {
      return { status: "mixed-currency" };
    }
    currency = catalogItem.currency;

    const lineTotalMinor = catalogItem.priceMinor * line.quantity;
    subtotalMinor += lineTotalMinor;
    if (
      !Number.isSafeInteger(lineTotalMinor) ||
      !Number.isSafeInteger(subtotalMinor)
    ) {
      return { status: "persistence-failed" };
    }

    pricedLines.push({
      catalogItemId: catalogItem.id,
      itemSlug: catalogItem.slug,
      name: catalogItem.name,
      quantity: line.quantity,
      size: line.size ?? sizes[0] ?? null,
      temperature: line.temperature ?? temperatures[0] ?? null,
      unitPriceMinor: catalogItem.priceMinor,
      lineTotalMinor,
      currency: catalogItem.currency,
    });
  }

  return currency
    ? {
        status: "priced",
        lines: pricedLines,
        currency,
        subtotalMinor,
      }
    : { status: "persistence-failed" };
}
