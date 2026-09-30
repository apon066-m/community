import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth.schema";

export const auditLog = pgTable(
  "workspace_audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workspace_audit_created_idx").on(table.createdAt, table.id),
    index("workspace_audit_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
      table.id,
    ),
    index("workspace_audit_target_created_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
      table.id,
    ),
    index("workspace_audit_action_created_idx").on(
      table.action,
      table.createdAt,
      table.id,
    ),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;
