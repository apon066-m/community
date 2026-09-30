import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth.schema";
import { catalogItem } from "../catalog/catalog.schema";

const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const customerFavorite = pgTable(
  "customer_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    catalogItemId: text("catalog_item_id")
      .notNull()
      .references(() => catalogItem.id, { onDelete: "cascade" }),
    savedAt: timestampColumn("saved_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("customer_favorites_user_item_unique").on(
      table.userId,
      table.catalogItemId,
    ),
    index("customer_favorites_user_saved_idx").on(
      table.userId,
      table.savedAt,
      table.catalogItemId,
    ),
  ],
);

export type CustomerFavoriteRow = typeof customerFavorite.$inferSelect;
