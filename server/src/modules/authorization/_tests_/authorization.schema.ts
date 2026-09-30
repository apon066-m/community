import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { role, user } from "../auth/auth.schema";

export const permissionEffectEnum = pgEnum("permission_effect", [
  "allow",
  "deny",
]);

export const permission = pgTable("permission", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const rolePermission = pgTable(
  "role_permission",
  {
    role: text("role")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.role, table.permissionId] })],
);

export const userPermissionOverride = pgTable(
  "user_permission_override",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
    effect: permissionEffectEnum("effect").notNull(),
    grantedBy: text("granted_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.permissionId] }),
    index("user_permission_override_granted_by_idx").on(table.grantedBy),
  ],
);

export const permissionRelations = relations(permission, ({ many }) => ({
  roles: many(rolePermission),
  userOverrides: many(userPermissionOverride),
}));

export const rolePermissionRelations = relations(
  rolePermission,
  ({ one }) => ({
    permission: one(permission, {
      fields: [rolePermission.permissionId],
      references: [permission.id],
    }),
  }),
);

export const userPermissionOverrideRelations = relations(
  userPermissionOverride,
  ({ one }) => ({
    user: one(user, {
      fields: [userPermissionOverride.userId],
      references: [user.id],
      relationName: "permissionOwner",
    }),
    grantedByUser: one(user, {
      fields: [userPermissionOverride.grantedBy],
      references: [user.id],
      relationName: "permissionGrantor",
    }),
    permission: one(permission, {
      fields: [userPermissionOverride.permissionId],
      references: [permission.id],
    }),
  }),
);
