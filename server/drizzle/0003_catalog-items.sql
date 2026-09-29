CREATE TABLE "catalog_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_slug_unique" ON "catalog_categories" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "catalog_categories_active_sort_idx" ON "catalog_categories" USING btree ("active","sort_order","id");
--> statement-breakpoint
INSERT INTO "catalog_categories" ("id", "slug", "name", "description")
VALUES
	('coffee', 'coffee', 'Coffee', 'Coffee and espresso drinks'),
	('pastry', 'pastry', 'Pastry', 'Fresh pastries and baked goods'),
	('cake', 'cake', 'Cake', 'Cakes and celebratory desserts'),
	('souvenir', 'souvenir', 'Souvenir', 'Cafe merchandise and souvenirs')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "coffee" RENAME TO "catalog_items";
--> statement-breakpoint
DROP INDEX "coffee_slug_unique";
--> statement-breakpoint
DROP INDEX "coffee_featured_sort_idx";
--> statement-breakpoint
DROP INDEX "coffee_name_id_idx";
--> statement-breakpoint
DROP INDEX "coffee_price_id_idx";
--> statement-breakpoint
DROP INDEX "coffee_created_at_id_idx";
--> statement-breakpoint
DROP INDEX "coffee_sizes_gin_idx";
--> statement-breakpoint
DROP INDEX "coffee_temperatures_gin_idx";
--> statement-breakpoint
DROP INDEX "coffee_dietary_gin_idx";
--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "category_id" text;
--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "catalog_items"
SET
	"category_id" = 'coffee',
	"attributes" = jsonb_build_object(
		'sizes', to_jsonb("sizes"),
		'temperatures', to_jsonb("temperatures"),
		'dietary', to_jsonb("dietary")
	);
--> statement-breakpoint
ALTER TABLE "catalog_items" ALTER COLUMN "category_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "catalog_items"
	ADD CONSTRAINT "catalog_items_category_id_catalog_categories_id_fk"
	FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "catalog_items" DROP COLUMN "sizes";
--> statement-breakpoint
ALTER TABLE "catalog_items" DROP COLUMN "temperatures";
--> statement-breakpoint
ALTER TABLE "catalog_items" DROP COLUMN "dietary";
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_items_slug_unique" ON "catalog_items" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "catalog_items_category_idx" ON "catalog_items" USING btree ("category_id","archived_at");
--> statement-breakpoint
CREATE INDEX "catalog_items_featured_sort_idx" ON "catalog_items" USING btree ("archived_at","featured","sort_order","id");
--> statement-breakpoint
CREATE INDEX "catalog_items_name_id_idx" ON "catalog_items" USING btree ("archived_at","name","id");
--> statement-breakpoint
CREATE INDEX "catalog_items_price_id_idx" ON "catalog_items" USING btree ("archived_at","price_minor","id");
--> statement-breakpoint
CREATE INDEX "catalog_items_created_at_id_idx" ON "catalog_items" USING btree ("archived_at","created_at","id");
--> statement-breakpoint
CREATE INDEX "catalog_items_attributes_gin_idx" ON "catalog_items" USING gin ("attributes");
