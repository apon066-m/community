ALTER TABLE "authorization_audit_log" RENAME TO "workspace_audit_log";--> statement-breakpoint
ALTER TABLE "workspace_audit_log" DROP CONSTRAINT "authorization_audit_log_actor_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "authorization_audit_actor_idx";--> statement-breakpoint
DROP INDEX "authorization_audit_target_idx";--> statement-breakpoint
ALTER TABLE "workspace_audit_log" ADD CONSTRAINT "workspace_audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_audit_created_idx" ON "workspace_audit_log" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "workspace_audit_actor_created_idx" ON "workspace_audit_log" USING btree ("actor_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "workspace_audit_target_created_idx" ON "workspace_audit_log" USING btree ("target_type","target_id","created_at","id");--> statement-breakpoint
CREATE INDEX "workspace_audit_action_created_idx" ON "workspace_audit_log" USING btree ("action","created_at","id");