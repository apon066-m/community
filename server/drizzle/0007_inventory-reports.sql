CREATE TYPE "public"."inventory_movement_type" AS ENUM('receipt', 'adjustment', 'waste');
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_quantities_non_negative_check" CHECK ("stock_on_hand" >= 0 AND "reorder_level" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_name_unique" ON "inventory_items" USING btree (lower("name"));
--> statement-breakpoint
CREATE INDEX "inventory_items_active_name_idx" ON "inventory_items" USING btree ("active","name","id");
--> statement-breakpoint
CREATE INDEX "inventory_items_stock_idx" ON "inventory_items" USING btree ("active","stock_on_hand","reorder_level","id");
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_item_id" text NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text,
	"actor_user_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_balance_non_negative_check" CHECK ("balance_after" >= 0),
	CONSTRAINT "inventory_movements_delta_non_zero_check" CHECK ("quantity_delta" <> 0)
);
--> statement-breakpoint
CREATE INDEX "inventory_movements_item_occurred_idx" ON "inventory_movements" USING btree ("inventory_item_id","occurred_at","id");
--> statement-breakpoint
CREATE INDEX "inventory_movements_occurred_idx" ON "inventory_movements" USING btree ("occurred_at","id");
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "permission" ("id", "description") VALUES
	('inventory:read', 'Read inventory stock and movement history'),
	('inventory:manage', 'Create and adjust inventory stock'),
	('reports:read', 'Read sales reports')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permission" ("role", "permission_id") VALUES
	('staff', 'inventory:read'),
	('staff', 'inventory:manage'),
	('staff', 'reports:read'),
	('admin', 'inventory:read'),
	('admin', 'inventory:manage'),
	('admin', 'reports:read')
ON CONFLICT ("role", "permission_id") DO NOTHING;
