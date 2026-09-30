import { z } from "zod";

export const userRoles = ["admin", "staff", "customer"] as const;

export type SystemRole = (typeof userRoles)[number];
export type RoleId = string;
export type UserRole = RoleId;

export const roleIdSchema = z
  .string({ error: "Role is required" })
  .trim()
  .regex(/^[a-z][a-z0-9-]*$/, "Invalid role ID");

const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

const passwordSchema = z
  .string({ error: "Password is required" })
  .max(128, "Password must be 128 characters or fewer.");

export const signInEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema.min(1, "Password is required."),
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;

export const signUpEmailSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  email: emailSchema,
  password: passwordSchema
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters."),
  phone: z
    .string({ error: "Phone must be text" })
    .trim()
    .max(32, "Phone number is too long.")
    .optional(),
});

export type SignUpEmailInput = z.infer<typeof signUpEmailSchema>;
