CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "role_name_unique" ON "role" USING btree ("name");
--> statement-breakpoint
INSERT INTO "role" ("id", "name", "description", "system") VALUES
	('admin', 'Administrator', 'Full access to workspace administration', true),
	('staff', 'Staff', 'Standard café operations access', true),
	('customer', 'Customer', 'Customer ordering access', true);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;
--> statement-breakpoint
ALTER TABLE "role_permission" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;
--> statement-breakpoint
DROP TYPE "public"."user_role";
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'customer';
--> statement-breakpoint
ALTER TABLE "user"
	ADD CONSTRAINT "user_role_role_id_fk"
	FOREIGN KEY ("role") REFERENCES "public"."role"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permission"
	ADD CONSTRAINT "role_permission_role_role_id_fk"
	FOREIGN KEY ("role") REFERENCES "public"."role"("id")
	ON DELETE cascade ON UPDATE no action;
