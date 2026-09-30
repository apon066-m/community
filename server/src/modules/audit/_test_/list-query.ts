import { z } from "zod";

export const listOrderOptions = ["asc", "desc"] as const;

export type ListOrder = (typeof listOrderOptions)[number];

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export const listQuerySchema = z.object({
  cursor: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(2048).optional(),
  ),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(100).optional(),
  ),
  sort: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(32).optional(),
  ),
  order: z.enum(listOrderOptions).default("asc"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
