CREATE TYPE "public"."order_channel" AS ENUM('online', 'pos');
--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'gcash');
--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid');
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" text,
	"created_by_user_id" text NOT NULL,
	"channel" "order_channel" DEFAULT 'online' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"notes" text,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" "payment_method",
	"amount_tendered_minor" integer,
	"change_minor" integer DEFAULT 0 NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_amounts_non_negative_check" CHECK ("subtotal_minor" >= 0 AND "total_minor" >= 0 AND ("amount_tendered_minor" IS NULL OR "amount_tendered_minor" >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" USING btree ("order_number");
--> statement-breakpoint
CREATE INDEX "orders_customer_created_at_idx" ON "orders" USING btree ("customer_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status", "created_at", "id");
--> statement-breakpoint
CREATE INDEX "orders_channel_status_idx" ON "orders" USING btree ("channel", "status");
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"catalog_item_id" text NOT NULL,
	"item_slug" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"size" text,
	"temperature" text,
	"unit_price_minor" integer NOT NULL,
	"line_total_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive_check" CHECK ("quantity" > 0),
	CONSTRAINT "order_items_amounts_non_negative_check" CHECK ("unit_price_minor" >= 0 AND "line_total_minor" >= 0)
);
--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id", "id");
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE restrict ON UPDATE no action;
