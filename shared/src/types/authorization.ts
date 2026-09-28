import { z } from "zod";

import { roleIdSchema } from "./auth";

export const permissionEffects = ["allow", "deny"] as const;

export type PermissionEffect = (typeof permissionEffects)[number];

export const changeRoleSchema = z.object({
  role: roleIdSchema,
});

export const changeBanSchema = z.object({
  banned: z.boolean({ error: "Banned status is required" }),
  reason: z
    .string({ error: "Ban reason must be text" })
    .trim()
    .max(500, "Ban reason is too long.")
    .nullable()
    .optional(),
  expiresAt: z
    .string({ error: "Expiration must be a date" })
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Enter a valid expiration date.",
    )
    .nullable()
    .optional(),
});

export const permissionKeySchema = z
  .string({ error: "Permission ID is required" })
  .trim()
  .regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/, "Invalid permission ID");

export const createRoleSchema = z.object({
  id: roleIdSchema,
  name: z
    .string({ error: "Role name is required" })
    .trim()
    .min(1, "Role name is required")
    .max(80, "Role name is too long"),
  description: z
    .string({ error: "Role description is required" })
    .trim()
    .min(1, "Role description is required")
    .max(200, "Role description is too long"),
});

export const createPermissionSchema = z.object({
  id: permissionKeySchema,
  description: z
    .string({ error: "Permission description is required" })
    .trim()
    .min(1, "Permission description is required")
    .max(200, "Permission description is too long"),
});

export const replaceRolePermissionsSchema = z.object({
  permissions: z
    .array(permissionKeySchema)
    .transform((permissions) => [...new Set(permissions)]),
});

export const setUserOverrideSchema = z.object({
  effect: z.enum(permissionEffects, {
    error: "Effect must be allow or deny",
  }),
});

export const roleParamsSchema = z.object({
  role: roleIdSchema,
});

export const userIdParamsSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
});

export const userPermissionParamsSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
  permissionId: permissionKeySchema,
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type ChangeBanInput = z.infer<typeof changeBanSchema>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type ReplaceRolePermissionsInput = z.infer<
  typeof replaceRolePermissionsSchema
>;
export type SetUserOverrideInput = z.infer<typeof setUserOverrideSchema>;
export type RoleParams = z.infer<typeof roleParamsSchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UserPermissionParams = z.infer<
  typeof userPermissionParamsSchema
>;

export type PermissionDefinition = {
  id: string;
  description: string;
};

export type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  system: boolean;
  permissions: string[];
};
