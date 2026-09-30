import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth.schema";
import { catalogItem } from "../catalog/catalog.schema";

const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const orderChannelEnum = pgEnum("order_channel", ["online", "pos"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "gcash",
  "digital",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["unpaid", "paid"]);

export const salesOrder = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    customerId: text("customer_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id")
      .references(() => user.id, { onDelete: "set null" }),
    channel: orderChannelEnum("channel").default("online").notNull(),
    status: orderStatusEnum("status").default("pending").notNull(),
    currency: text("currency").notNull(),
    subtotalMinor: integer("subtotal_minor").notNull(),
    totalMinor: integer("total_minor").notNull(),
    notes: text("notes"),
    callName: text("call_name"),
    guestTokenHash: text("guest_token_hash"),
    paymentStatus: paymentStatusEnum("payment_status")
      .default("unpaid")
      .notNull(),
    paymentMethod: paymentMethodEnum("payment_method"),
    paymentReference: text("payment_reference"),
    amountTenderedMinor: integer("amount_tendered_minor"),
    changeMinor: integer("change_minor").default(0).notNull(),
    cancelledAt: timestampColumn("cancelled_at"),
    completedAt: timestampColumn("completed_at"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    index("orders_customer_created_at_idx").on(
      table.customerId,
      table.createdAt,
      table.id,
    ),
    index("orders_status_created_at_idx").on(
      table.status,
      table.createdAt,
      table.id,
    ),
    index("orders_channel_status_idx").on(table.channel, table.status),
    uniqueIndex("orders_guest_token_hash_unique").on(table.guestTokenHash),
    check(
      "orders_amounts_non_negative_check",
      sql`${table.subtotalMinor} >= 0 AND ${table.totalMinor} >= 0 AND (${table.amountTenderedMinor} IS NULL OR ${table.amountTenderedMinor} >= 0)`,
    ),
  ],
);

export const salesOrderItem = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => salesOrder.id, { onDelete: "cascade" }),
    catalogItemId: text("catalog_item_id")
      .notNull()
      .references(() => catalogItem.id, { onDelete: "restrict" }),
    itemSlug: text("item_slug").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    size: text("size"),
    temperature: text("temperature"),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
    currency: text("currency").notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId, table.id),
    check("order_items_quantity_positive_check", sql`${table.quantity} > 0`),
    check(
      "order_items_amounts_non_negative_check",
      sql`${table.unitPriceMinor} >= 0 AND ${table.lineTotalMinor} >= 0`,
    ),
  ],
);

export const salesOrderRelations = relations(
  salesOrder,
  ({ one, many }) => ({
    customer: one(user, {
      fields: [salesOrder.customerId],
      references: [user.id],
      relationName: "customerOrders",
    }),
    createdBy: one(user, {
      fields: [salesOrder.createdByUserId],
      references: [user.id],
      relationName: "createdOrders",
    }),
    items: many(salesOrderItem),
  }),
);

export const salesOrderItemRelations = relations(
  salesOrderItem,
  ({ one }) => ({
    order: one(salesOrder, {
      fields: [salesOrderItem.orderId],
      references: [salesOrder.id],
    }),
    catalogItem: one(catalogItem, {
      fields: [salesOrderItem.catalogItemId],
      references: [catalogItem.id],
    }),
  }),
);

export type SalesOrderRow = typeof salesOrder.$inferSelect;
export type SalesOrderItemRow = typeof salesOrderItem.$inferSelect;
