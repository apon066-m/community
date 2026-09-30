import { relations, sql } from "drizzle-orm";
import {
  boolean,
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

const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "receipt",
  "adjustment",
  "waste",
]);

export const inventoryItem = pgTable(
  "inventory_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    stockOnHand: integer("stock_on_hand").default(0).notNull(),
    reorderLevel: integer("reorder_level").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("inventory_items_name_unique").on(
      sql`lower(${table.name})`,
    ),
    index("inventory_items_active_name_idx").on(
      table.active,
      table.name,
      table.id,
    ),
    index("inventory_items_stock_idx").on(
      table.active,
      table.stockOnHand,
      table.reorderLevel,
      table.id,
    ),
    check(
      "inventory_items_quantities_non_negative_check",
      sql`${table.stockOnHand} >= 0 AND ${table.reorderLevel} >= 0`,
    ),
  ],
);

export const inventoryMovement = pgTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "restrict" }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason"),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    occurredAt: timestampColumn("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    index("inventory_movements_item_occurred_idx").on(
      table.inventoryItemId,
      table.occurredAt,
      table.id,
    ),
    index("inventory_movements_occurred_idx").on(
      table.occurredAt,
      table.id,
    ),
    check(
      "inventory_movements_balance_non_negative_check",
      sql`${table.balanceAfter} >= 0`,
    ),
    check(
      "inventory_movements_delta_non_zero_check",
      sql`${table.quantityDelta} <> 0`,
    ),
  ],
);

export const inventoryItemRelations = relations(
  inventoryItem,
  ({ many }) => ({ movements: many(inventoryMovement) }),
);

export const inventoryMovementRelations = relations(
  inventoryMovement,
  ({ one }) => ({
    inventoryItem: one(inventoryItem, {
      fields: [inventoryMovement.inventoryItemId],
      references: [inventoryItem.id],
    }),
    actor: one(user, {
      fields: [inventoryMovement.actorUserId],
      references: [user.id],
    }),
  }),
);

export type InventoryItemRow = typeof inventoryItem.$inferSelect;
export type InventoryMovementRow = typeof inventoryMovement.$inferSelect;
