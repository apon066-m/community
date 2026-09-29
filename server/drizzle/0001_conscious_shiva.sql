DROP TABLE "profile" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
DELETE FROM "role_permission" WHERE "permission_id" IN ('profile:read-own', 'profile:update-own');--> statement-breakpoint
DELETE FROM "permission" WHERE "id" IN ('profile:read-own', 'profile:update-own');
