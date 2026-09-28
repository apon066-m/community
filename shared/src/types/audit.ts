import { z } from "zod";

import { listQuerySchema } from "./list-query";

export const auditTargetTypeOptions = [
  "permission",
  "role",
  "user",
  "catalog-item",
  "inventory-item",
  "order",
] as const;

export const auditActionOptions = [
  "create",
  "update",
  "archive",
  "record-movement",
  "set-role",
  "ban",
  "unban",
  "set-permission-override",
  "remove-permission-override",
  "replace-permissions",
  "status-change",
  "checkout",
  "cancel",
] as const;

export type AuditTargetType = (typeof auditTargetTypeOptions)[number];
export type AuditAction = (typeof auditActionOptions)[number];

const auditIdSchema = z
  .string({ error: "Audit identifier is required" })
  .trim()
  .min(1, "Audit identifier is required")
  .max(120, "Audit identifier is too long");

function isCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const auditDateSchema = z
  .string({ error: "Audit date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Audit date must use YYYY-MM-DD format")
  .refine(isCalendarDate, "Audit date is not valid");

export const auditLogQuerySchema = listQuerySchema
  .pick({ cursor: true, limit: true, search: true })
  .extend({
    actorUserId: auditIdSchema.optional(),
    targetType: z.enum(auditTargetTypeOptions).optional(),
    targetId: auditIdSchema.optional(),
    action: z.enum(auditActionOptions).optional(),
    from: auditDateSchema.optional(),
    to: auditDateSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.from && input.to && input.from >= input.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Audit end date must be after the start date",
      });
    }
  });

const auditActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
});

const auditEntrySchema = z.object({
  id: z.string(),
  actor: auditActorSchema,
  targetType: z.string(),
  targetId: z.string(),
  action: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const auditLogResponseSchema = z.object({
  items: z.array(auditEntrySchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type AuditActor = z.infer<typeof auditActorSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
