import { z } from "zod";

import { listQuerySchema } from "./list-query";

export const inventoryItemSortOptions = [
  "name",
  "stock",
  "updatedAt",
] as const;

export const inventoryItemStatusOptions = [
  "all",
  "low-stock",
  "out-of-stock",
] as const;

export const inventoryMovementTypeOptions = [
  "receipt",
  "adjustment",
  "waste",
] as const;

export type InventoryItemSort = (typeof inventoryItemSortOptions)[number];
export type InventoryItemStatus = (typeof inventoryItemStatusOptions)[number];
export type InventoryMovementType =
  (typeof inventoryMovementTypeOptions)[number];

const inventoryIdSchema = z
  .string({ error: "Inventory item ID is required" })
  .trim()
  .min(1, "Inventory item ID is required")
  .max(120, "Inventory item ID is too long")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Inventory item ID must contain letters, numbers, hyphens, or underscores only",
  );

const inventoryNameSchema = z
  .string({ error: "Inventory item name is required" })
  .trim()
  .min(1, "Inventory item name is required")
  .max(120, "Inventory item name cannot be longer than 120 characters");

const nonNegativeQuantitySchema = z
  .number({ error: "Quantity must be a number" })
  .int("Quantity must be a whole number")
  .min(0, "Quantity cannot be negative")
  .max(1_000_000_000, "Quantity is too high");

const positiveQuantitySchema = nonNegativeQuantitySchema
  .min(1, "Quantity must be at least one");

const reasonSchema = z
  .string()
  .trim()
  .max(240, "Reason cannot be longer than 240 characters")
  .optional();

export const inventoryItemIdParamsSchema = z.object({
  itemId: inventoryIdSchema,
});

export const inventoryListQuerySchema = listQuerySchema.extend({
  sort: z.enum(inventoryItemSortOptions).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(inventoryItemStatusOptions).default("all"),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

export const createInventoryItemSchema = z.object({
  name: inventoryNameSchema,
  reorderLevel: nonNegativeQuantitySchema.default(0),
  initialStock: nonNegativeQuantitySchema.default(0),
});

export const updateInventoryItemSchema = z.object({
  name: inventoryNameSchema.optional(),
  reorderLevel: nonNegativeQuantitySchema.optional(),
  active: z.boolean().optional(),
});

export const recordInventoryMovementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("receipt"),
    quantity: positiveQuantitySchema,
    reason: reasonSchema,
  }),
  z.object({
    type: z.literal("waste"),
    quantity: positiveQuantitySchema,
    reason: reasonSchema,
  }),
  z.object({
    type: z.literal("adjustment"),
    quantityDelta: z
      .number({ error: "Adjustment quantity must be a number" })
      .int("Adjustment quantity must be a whole number")
      .min(-1_000_000_000, "Adjustment quantity is too low")
      .max(1_000_000_000, "Adjustment quantity is too high")
      .refine((value) => value !== 0, "Adjustment quantity cannot be zero"),
    reason: reasonSchema,
  }),
]);

const inventoryMovementResponseSchema = z.object({
  id: z.string(),
  inventoryItemId: z.string(),
  type: z.enum(inventoryMovementTypeOptions),
  quantityDelta: z.number().int(),
  balanceAfter: z.number().int().nonnegative(),
  reason: z.string().nullable(),
  actorUserId: z.string().nullable(),
  occurredAt: z.string(),
});

const inventoryItemSchema = z.object({
  id: z.string(),
  name: inventoryNameSchema,
  stockOnHand: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  active: z.boolean(),
  lowStock: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const inventoryItemResponseSchema = z.object({
  item: inventoryItemSchema,
});

export const inventoryItemDetailResponseSchema = z.object({
  item: inventoryItemSchema,
  movements: z.array(inventoryMovementResponseSchema),
});

export const inventoryListResponseSchema = z.object({
  items: z.array(inventoryItemSchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type InventoryItemIdParams = z.infer<typeof inventoryItemIdParamsSchema>;
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof updateInventoryItemSchema
>;
export type RecordInventoryMovementInput = z.infer<
  typeof recordInventoryMovementSchema
>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryMovement = z.infer<typeof inventoryMovementResponseSchema>;
export type InventoryItemResponse = z.infer<
  typeof inventoryItemResponseSchema
>;
export type InventoryItemDetailResponse = z.infer<
  typeof inventoryItemDetailResponseSchema
>;
export type InventoryListResponse = z.infer<typeof inventoryListResponseSchema>;
