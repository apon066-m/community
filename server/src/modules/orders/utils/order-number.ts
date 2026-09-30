export function createOrderNumber(
  now = new Date(),
  randomId: string = crypto.randomUUID(),
) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${date}-${randomId.slice(0, 8).toUpperCase()}`;
}
