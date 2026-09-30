import { z } from "zod";

import { listOrderOptions, listQuerySchema } from "./list-query";
import { roleIdSchema, type UserRole } from "./auth";

export const userListRoles = ["staff", "customer"] as const;
export const userSortOptions = ["name", "email", "createdAt"] as const;

export type UserListRole = (typeof userListRoles)[number];
export type UserSort = (typeof userSortOptions)[number];
export type TeamListRole = UserRole;

export const userListQuerySchema = listQuerySchema.extend({
  role: z.enum(userListRoles, { error: "User role is required" }),
  sort: z.enum(userSortOptions).default("createdAt"),
  order: z.enum(listOrderOptions).default("desc"),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const teamListQuerySchema = listQuerySchema.extend({
  role: roleIdSchema.optional(),
  banned: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z.enum(userSortOptions).default("createdAt"),
  order: z.enum(listOrderOptions).default("desc"),
});

export type TeamListQuery = z.infer<typeof teamListQuerySchema>;

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  role: UserRole;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserListResponse = {
  items: UserListItem[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export type TeamListResponse = UserListResponse;
