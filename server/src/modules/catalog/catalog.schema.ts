import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const catalogCategory = pgTable(
  "catalog_categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("catalog_categories_slug_unique").on(table.slug),
    index("catalog_categories_active_sort_idx").on(
      table.active,
      table.sortOrder,
      table.id,
    ),
  ],
);

export const catalogItem = pgTable(
  "catalog_items",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => catalogCategory.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").default("USD").notNull(),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    available: boolean("available").default(true).notNull(),
    featured: boolean("featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    imageUrl: text("image_url"),
    archivedAt: timestampColumn("archived_at"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("catalog_items_slug_unique").on(table.slug),
    index("catalog_items_category_idx").on(table.categoryId, table.archivedAt),
    index("catalog_items_featured_sort_idx").on(
      table.archivedAt,
      table.featured,
      table.sortOrder,
      table.id,
    ),
    index("catalog_items_name_id_idx").on(
      table.archivedAt,
      table.name,
      table.id,
    ),
    index("catalog_items_price_id_idx").on(
      table.archivedAt,
      table.priceMinor,
      table.id,
    ),
    index("catalog_items_created_at_id_idx").on(
      table.archivedAt,
      table.createdAt,
      table.id,
    ),
    index("catalog_items_attributes_gin_idx").using("gin", table.attributes),
  ],
);
