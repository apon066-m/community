CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'customer');--> statement-breakpoint
CREATE TYPE "public"."permission_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"role" "user_role" NOT NULL,
	"permission_id" text NOT NULL,
	CONSTRAINT "role_permission_role_permission_id_pk" PRIMARY KEY("role","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_permission_override" (
	"user_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"effect" "permission_effect" NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_permission_override_user_id_permission_id_pk" PRIMARY KEY("user_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_audit_log" ADD CONSTRAINT "authorization_audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_override" ADD CONSTRAINT "user_permission_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_override" ADD CONSTRAINT "user_permission_override_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_override" ADD CONSTRAINT "user_permission_override_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "authorization_audit_actor_idx" ON "authorization_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "authorization_audit_target_idx" ON "authorization_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "user_permission_override_granted_by_idx" ON "user_permission_override" USING btree ("granted_by");--> statement-breakpoint
INSERT INTO "permission" ("id", "description") VALUES
	('profile:read-own', 'Read the current user profile'),
	('profile:update-own', 'Update the current user profile'),
	('menu:read', 'Read menu items'),
	('menu:create', 'Create menu items'),
	('menu:update', 'Update menu items and availability'),
	('menu:delete', 'Delete menu items'),
	('order:create', 'Create orders'),
	('order:read-own', 'Read orders owned by the current user'),
	('order:read-all', 'Read all customer orders'),
	('order:update-status', 'Update order workflow status'),
	('order:cancel-own', 'Cancel an order owned by the current user'),
	('user:create', 'Create user accounts'),
	('user:list', 'List user accounts'),
	('user:read', 'Read a user account'),
	('user:set-role', 'Change a user primary role'),
	('user:ban', 'Ban or unban a user'),
	('session:revoke', 'Revoke user sessions'),
	('rbac:manage', 'Manage roles and permission assignments');--> statement-breakpoint
INSERT INTO "role_permission" ("role", "permission_id") VALUES
	('customer', 'profile:read-own'),
	('customer', 'profile:update-own'),
	('customer', 'menu:read'),
	('customer', 'order:create'),
	('customer', 'order:read-own'),
	('customer', 'order:cancel-own'),
	('staff', 'profile:read-own'),
	('staff', 'profile:update-own'),
	('staff', 'menu:read'),
	('staff', 'menu:create'),
	('staff', 'menu:update'),
	('staff', 'order:create'),
	('staff', 'order:read-own'),
	('staff', 'order:read-all'),
	('staff', 'order:update-status'),
	('admin', 'profile:read-own'),
	('admin', 'profile:update-own'),
	('admin', 'menu:read'),
	('admin', 'menu:create'),
	('admin', 'menu:update'),
	('admin', 'menu:delete'),
	('admin', 'order:create'),
	('admin', 'order:read-own'),
	('admin', 'order:read-all'),
	('admin', 'order:update-status'),
	('admin', 'order:cancel-own'),
	('admin', 'user:create'),
	('admin', 'user:list'),
	('admin', 'user:read'),
	('admin', 'user:set-role'),
	('admin', 'user:ban'),
	('admin', 'session:revoke'),
	('admin', 'rbac:manage');
