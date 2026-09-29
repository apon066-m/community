CREATE TABLE "coffee" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"sizes" text[] DEFAULT '{}'::text[] NOT NULL,
	"temperatures" text[] DEFAULT '{}'::text[] NOT NULL,
	"dietary" text[] DEFAULT '{}'::text[] NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "coffee_slug_unique" ON "coffee" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "coffee_featured_sort_idx" ON "coffee" USING btree ("archived_at","featured","sort_order","id");--> statement-breakpoint
CREATE INDEX "coffee_name_id_idx" ON "coffee" USING btree ("archived_at","name","id");--> statement-breakpoint
CREATE INDEX "coffee_price_id_idx" ON "coffee" USING btree ("archived_at","price_minor","id");--> statement-breakpoint
CREATE INDEX "coffee_created_at_id_idx" ON "coffee" USING btree ("archived_at","created_at","id");--> statement-breakpoint
CREATE INDEX "coffee_sizes_gin_idx" ON "coffee" USING gin ("sizes");--> statement-breakpoint
CREATE INDEX "coffee_temperatures_gin_idx" ON "coffee" USING gin ("temperatures");--> statement-breakpoint
CREATE INDEX "coffee_dietary_gin_idx" ON "coffee" USING gin ("dietary");