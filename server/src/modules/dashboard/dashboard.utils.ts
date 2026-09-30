import type { SalesDay } from "shared";

export function fillDashboardDays(from: string, to: string, source: readonly SalesDay[]) {
  const byDate = new Map(source.map((day) => [day.date, day]));
  const days: { date: string; orderCount: number; grossSalesMinor: number }[] = [];
  for (
    let time = Date.parse(`${from}T00:00:00.000Z`), end = Date.parse(`${to}T00:00:00.000Z`);
    time < end;
    time += 86_400_000
  ) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = byDate.get(date);
    days.push({ date, orderCount: day?.orderCount ?? 0, grossSalesMinor: day?.grossSalesMinor ?? 0 });
  }
  return days;
}
