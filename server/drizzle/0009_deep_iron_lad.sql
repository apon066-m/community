CREATE TABLE "customer_favorites" (
	"user_id" text NOT NULL,
	"catalog_item_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_favorites_user_item_unique" ON "customer_favorites" USING btree ("user_id","catalog_item_id");--> statement-breakpoint
CREATE INDEX "customer_favorites_user_saved_idx" ON "customer_favorites" USING btree ("user_id","saved_at","catalog_item_id");