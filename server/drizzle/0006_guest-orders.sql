ALTER TYPE "public"."payment_method" ADD VALUE IF NOT EXISTS 'digital';
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_by_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "call_name" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_token_hash" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_reference" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "orders_guest_token_hash_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_guest_token_hash_unique" ON "orders" USING btree ("guest_token_hash");
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
