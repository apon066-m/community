import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import type { OrderListQuery } from "shared";

import type { DbExecutor } from "../../db";
import { user } from "../auth/auth.schema";
import {
  salesOrder,
  salesOrderItem,
  type SalesOrderRow,
} from "./order.schema";
import type { SalesOrderItemRow } from "./order.schema";
import type { OrderCursorPosition } from "./order.cursor";
import type { CustomerSummary } from "../users/users.repository";

export type OrderListRepositoryInput = OrderListQuery & {
  cursorPosition: OrderCursorPosition | null;
  customerId?: string;
};

export type OrderCustomerRow = CustomerSummary;

export type OrderHeaderRow = {
  order: SalesOrderRow;
  customer: OrderCustomerRow | null;
};

export type OrderDetailsRow = OrderHeaderRow & {
  items: SalesOrderItemRow[];
};

function buildCursorCondition(
  input: OrderListRepositoryInput,
): SQL | undefined {
  const position = input.cursorPosition;
  if (!position) return undefined;

  switch (position.sort) {
    case "createdAt":
      return input.order === "asc"
        ? or(
            gt(salesOrder.createdAt, new Date(position.createdAt)),
            and(
              eq(salesOrder.createdAt, new Date(position.createdAt)),
              gt(salesOrder.id, position.id),
            ),
          )
        : or(
            lt(salesOrder.createdAt, new Date(position.createdAt)),
            and(
              eq(salesOrder.createdAt, new Date(position.createdAt)),
              lt(salesOrder.id, position.id),
            ),
          );
    case "updatedAt":
      return input.order === "asc"
        ? or(
            gt(salesOrder.updatedAt, new Date(position.updatedAt)),
            and(
              eq(salesOrder.updatedAt, new Date(position.updatedAt)),
              gt(salesOrder.id, position.id),
            ),
          )
        : or(
            lt(salesOrder.updatedAt, new Date(position.updatedAt)),
            and(
              eq(salesOrder.updatedAt, new Date(position.updatedAt)),
              lt(salesOrder.id, position.id),
            ),
          );
    case "orderNumber":
      return input.order === "asc"
        ? or(
            gt(salesOrder.orderNumber, position.orderNumber),
            and(
              eq(salesOrder.orderNumber, position.orderNumber),
              gt(salesOrder.id, position.id),
            ),
          )
        : or(
            lt(salesOrder.orderNumber, position.orderNumber),
            and(
              eq(salesOrder.orderNumber, position.orderNumber),
              lt(salesOrder.id, position.id),
            ),
          );
    case "status":
      return input.order === "asc"
        ? or(
            gt(salesOrder.status, position.status),
            and(
              eq(salesOrder.status, position.status),
              gt(salesOrder.id, position.id),
            ),
          )
        : or(
            lt(salesOrder.status, position.status),
            and(
              eq(salesOrder.status, position.status),
              lt(salesOrder.id, position.id),
            ),
          );
  }
}

function buildOrderBy(input: OrderListRepositoryInput) {
  switch (input.sort) {
    case "createdAt":
      return input.order === "asc"
        ? ([asc(salesOrder.createdAt), asc(salesOrder.id)] as const)
        : ([desc(salesOrder.createdAt), desc(salesOrder.id)] as const);
    case "updatedAt":
      return input.order === "asc"
        ? ([asc(salesOrder.updatedAt), asc(salesOrder.id)] as const)
        : ([desc(salesOrder.updatedAt), desc(salesOrder.id)] as const);
    case "orderNumber":
      return input.order === "asc"
        ? ([asc(salesOrder.orderNumber), asc(salesOrder.id)] as const)
        : ([desc(salesOrder.orderNumber), desc(salesOrder.id)] as const);
    case "status":
      return input.order === "asc"
        ? ([asc(salesOrder.status), asc(salesOrder.id)] as const)
        : ([desc(salesOrder.status), desc(salesOrder.id)] as const);
  }
}

export async function createOrder(
  executor: DbExecutor,
  input: {
    id: string;
    orderNumber: string;
    customerId: string | null;
    createdByUserId: string | null;
    channel: "online" | "pos";
    currency: string;
    subtotalMinor: number;
    totalMinor: number;
    notes: string | null;
    callName: string | null;
    guestTokenHash: string | null;
  },
) {
  const [created] = await executor
    .insert(salesOrder)
    .values({
      ...input,
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: null,
      amountTenderedMinor: null,
      changeMinor: 0,
    })
    .returning();

  return created ?? null;
}

export async function createOrderItems(
  executor: DbExecutor,
  orderId: string,
  items: readonly Omit<SalesOrderItemRow, "id" | "orderId" | "createdAt">[],
) {
  if (!items.length) return;
  await executor.insert(salesOrderItem).values(
    items.map((item) => ({
      id: crypto.randomUUID(),
      orderId,
      ...item,
    })),
  );
}

async function listOrderHeaders(
  executor: DbExecutor,
  input: OrderListRepositoryInput,
) {
  const conditions: SQL[] = [];

  if (input.customerId) {
    conditions.push(eq(salesOrder.customerId, input.customerId));
  }
  if (input.status) conditions.push(eq(salesOrder.status, input.status));
  if (input.channel) conditions.push(eq(salesOrder.channel, input.channel));
  if (input.search) {
    const searchPattern = `%${input.search}%`;
    const searchCondition = or(
      ilike(salesOrder.orderNumber, searchPattern),
      ilike(salesOrder.callName, searchPattern),
      ilike(user.name, searchPattern),
      ilike(user.email, searchPattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const cursorCondition = buildCursorCondition(input);
  if (cursorCondition) conditions.push(cursorCondition);

  const query = executor
    .select({
      order: salesOrder,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(salesOrder)
    .leftJoin(user, eq(salesOrder.customerId, user.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...buildOrderBy(input))
    .limit(input.limit + 1);

  return query;
}

export type OrderPage = {
  items: OrderDetailsRow[];
  hasNextPage: boolean;
  lastOrder: SalesOrderRow | null;
};

export async function listOrderPage(
  executor: DbExecutor,
  input: OrderListRepositoryInput,
): Promise<OrderPage> {
  const rows = await listOrderHeaders(executor, input);
  const hasNextPage = rows.length > input.limit;
  const pageRows = rows.slice(0, input.limit);
  const orderItems = await findOrderItems(
    executor,
    pageRows.map(({ order }) => order.id),
  );
  const itemsByOrderId = new Map<string, SalesOrderItemRow[]>();

  for (const item of orderItems) {
    const items = itemsByOrderId.get(item.orderId);
    if (items) items.push(item);
    else itemsByOrderId.set(item.orderId, [item]);
  }

  return {
    items: pageRows.map((row) => ({
      ...row,
      items: itemsByOrderId.get(row.order.id) ?? [],
    })),
    hasNextPage,
    lastOrder: pageRows.at(-1)?.order ?? null,
  };
}

async function findOrderItems(
  executor: DbExecutor,
  orderIds: readonly string[],
) {
  if (!orderIds.length) return [];

  return executor
    .select()
    .from(salesOrderItem)
    .where(inArray(salesOrderItem.orderId, orderIds))
    .orderBy(asc(salesOrderItem.createdAt), asc(salesOrderItem.id));
}

export async function findOrderById(
  executor: DbExecutor,
  orderId: string,
  customerId?: string,
): Promise<OrderDetailsRow | null> {
  const conditions: SQL[] = [eq(salesOrder.id, orderId)];
  if (customerId) conditions.push(eq(salesOrder.customerId, customerId));

  const [header] = await executor
    .select({
      order: salesOrder,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(salesOrder)
    .leftJoin(user, eq(salesOrder.customerId, user.id))
    .where(and(...conditions))
    .limit(1);

  if (!header) return null;

  const items = await findOrderItems(executor, [orderId]);
  return { ...header, items };
}

export async function findOrderByGuestTokenHash(
  executor: DbExecutor,
  guestTokenHash: string,
): Promise<OrderDetailsRow | null> {
  const [header] = await executor
    .select({
      order: salesOrder,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(salesOrder)
    .leftJoin(user, eq(salesOrder.customerId, user.id))
    .where(eq(salesOrder.guestTokenHash, guestTokenHash))
    .limit(1);

  if (!header) return null;

  const items = await findOrderItems(executor, [header.order.id]);
  return { ...header, items };
}

export async function updateOrderStatus(
  executor: DbExecutor,
  orderId: string,
  status: SalesOrderRow["status"],
) {
  const now = new Date();
  const updates: Partial<SalesOrderRow> = {
    status,
    updatedAt: now,
  };

  if (status === "cancelled") updates.cancelledAt = now;
  if (status === "completed") updates.completedAt = now;

  const [updated] = await executor
    .update(salesOrder)
    .set(updates)
    .where(eq(salesOrder.id, orderId))
    .returning();

  return updated ?? null;
}

export async function checkoutOrder(
  executor: DbExecutor,
  input: {
    orderId: string;
    paymentMethod: "cash" | "digital";
    paymentReference: string | null;
    amountTenderedMinor: number;
    changeMinor: number;
    status: SalesOrderRow["status"];
  },
) {
  const [updated] = await executor
    .update(salesOrder)
    .set({
      paymentStatus: "paid",
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      amountTenderedMinor: input.amountTenderedMinor,
      changeMinor: input.changeMinor,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(salesOrder.id, input.orderId))
    .returning();

  return updated ?? null;
}
