export type SalesAggregateValue = number | string | null | undefined;

export type SalesItemCountAggregate = {
  date?: string;
  currency: string;
  itemCount: SalesAggregateValue;
};

export function toSalesAggregateNumber(value: SalesAggregateValue) {
  const normalized = Number(value ?? 0);
  if (!Number.isFinite(normalized) || !Number.isInteger(normalized)) {
    throw new Error("Sales aggregate value must be a finite integer");
  }

  return normalized;
}

export function salesMetricKey(currency: string, date?: string) {
  return date ? `${date}:${currency}` : currency;
}

export function indexSalesItemCounts(
  rows: readonly SalesItemCountAggregate[],
) {
  return new Map(
    rows.map((row) => [
      salesMetricKey(row.currency, row.date),
      toSalesAggregateNumber(row.itemCount),
    ]),
  );
}
