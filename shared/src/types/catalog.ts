import { z } from "zod";

import { listQuerySchema } from "./list-query";

export const catalogSortOptions = [
  "featured",
  "name",
  "price",
  "createdAt",
] as const;

export type CatalogSort = (typeof catalogSortOptions)[number];

export const catalogDefaultCurrency = "USD" as const;

const catalogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const catalogSlugSchema = z
  .string({ error: "Slug is required" })
  .trim()
  .min(1, "Slug is required")
  .max(120, "Slug is too long")
  .regex(
    catalogSlugPattern,
    "Slug must contain lowercase letters, numbers, and hyphens only",
  );

export const catalogCategorySlugSchema = z
  .string({ error: "Category slug is required" })
  .trim()
  .min(1, "Category slug is required")
  .max(80, "Category slug is too long")
  .regex(
    catalogSlugPattern,
    "Category slug must contain lowercase letters, numbers, and hyphens only",
  );

export const catalogImageUrlSchema = z
  .string()
  .trim()
  .max(2048, "Image URL is too long")
  .refine(
    (value) => {
      if (value.startsWith("/") && !value.startsWith("//")) return true;

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    "Image URL must be an HTTP(S) URL or a root-relative path",
  );

export const catalogImageUploadJsonSchema = z.object({
  imageUrl: catalogImageUrlSchema,
});

export const catalogImageDeleteSchema = z.object({
  imageUrl: catalogImageUrlSchema,
});

export const catalogAttributesSchema = z.record(z.string(), z.unknown());

const catalogCurrencySchema = z
  .string({ error: "Currency is required" })
  .trim()
  .regex(/^[a-zA-Z]{3}$/, "Currency must be a three-letter code")
  .transform((value) => value.toUpperCase());

const catalogItemFields = {
  categorySlug: catalogCategorySlugSchema,
  slug: catalogSlugSchema.optional(),
  name: z
    .string({ error: "Catalog item name is required" })
    .trim()
    .min(1, "Catalog item name is required")
    .max(120, "Catalog item name is too long"),
  description: z
    .string({ error: "Catalog item description is required" })
    .trim()
    .min(1, "Catalog item description is required")
    .max(2000, "Catalog item description is too long"),
  priceMinor: z
    .number({ error: "Catalog item price is required" })
    .int("Catalog item price must be a whole number")
    .min(0, "Catalog item price cannot be negative")
    .max(100_000_000, "Catalog item price is too high"),
  currency: catalogCurrencySchema.default(catalogDefaultCurrency),
  attributes: catalogAttributesSchema.default({}),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z
    .number()
    .int("Sort order must be a whole number")
    .min(0, "Sort order cannot be negative")
    .max(1_000_000, "Sort order is too high")
    .default(0),
  imageUrl: catalogImageUrlSchema.nullable().optional(),
};

export const createCatalogItemSchema = z.object(catalogItemFields);

export const updateCatalogItemSchema = z
  .object({
    ...catalogItemFields,
    categorySlug: catalogCategorySlugSchema.optional(),
    currency: catalogCurrencySchema.optional(),
    attributes: catalogAttributesSchema.optional(),
    available: z.boolean().optional(),
    featured: z.boolean().optional(),
    sortOrder: z
      .number()
      .int("Sort order must be a whole number")
      .min(0, "Sort order cannot be negative")
      .max(1_000_000, "Sort order is too high")
      .optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one catalog item field is required",
  });

function parseBooleanQuery(value: unknown) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export const catalogListQuerySchema = listQuerySchema
  .extend({
    sort: z.enum(catalogSortOptions).default("featured"),
    categorySlug: catalogCategorySlugSchema.optional(),
    available: z.preprocess(parseBooleanQuery, z.boolean().optional()),
    minPriceMinor: z.coerce
      .number()
      .int("Minimum price must be a whole number")
      .min(0, "Minimum price cannot be negative")
      .max(100_000_000, "Minimum price is too high")
      .optional(),
    maxPriceMinor: z.coerce
      .number()
      .int("Maximum price must be a whole number")
      .min(0, "Maximum price cannot be negative")
      .max(100_000_000, "Maximum price is too high")
      .optional(),
  })
  .refine(
    ({ minPriceMinor, maxPriceMinor }) =>
      minPriceMinor === undefined ||
      maxPriceMinor === undefined ||
      minPriceMinor <= maxPriceMinor,
    {
      path: ["maxPriceMinor"],
      message: "Maximum price must be greater than or equal to minimum price",
    },
  );

export const catalogSlugParamsSchema = z.object({
  slug: catalogSlugSchema,
});

const catalogItemIdSchema = z
  .string({ error: "Catalog item ID is required" })
  .trim()
  .min(1, "Catalog item ID is required")
  .max(120, "Catalog item ID is too long")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Catalog item ID must contain letters, numbers, hyphens, or underscores only",
  );

export const catalogItemIdParamsSchema = z.object({
  itemId: catalogItemIdSchema,
});

const catalogCategoryResponseSchema = z.object({
  id: z.string(),
  slug: catalogCategorySlugSchema,
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const catalogItemSchema = z.object({
  id: z.string(),
  category: catalogCategoryResponseSchema,
  slug: catalogSlugSchema,
  name: z.string(),
  description: z.string(),
  priceMinor: z.number().int(),
  currency: z.string(),
  attributes: catalogAttributesSchema,
  available: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  imageUrl: catalogImageUrlSchema.nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const catalogItemResponseSchema = z.object({
  item: catalogItemSchema,
});

export const catalogItemListResponseSchema = z.object({
  items: z.array(catalogItemSchema),
  pagination: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const catalogImageUploadResponseSchema = z.object({
  imageUrl: catalogImageUrlSchema,
});

export type CatalogAttributes = z.infer<typeof catalogAttributesSchema>;
export type CatalogImageUploadJsonInput = z.infer<
  typeof catalogImageUploadJsonSchema
>;
export type CatalogImageDeleteInput = z.infer<typeof catalogImageDeleteSchema>;
export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;
export type CatalogListQuery = z.infer<typeof catalogListQuerySchema>;
export type CatalogSlugParams = z.infer<typeof catalogSlugParamsSchema>;
export type CatalogItemIdParams = z.infer<typeof catalogItemIdParamsSchema>;
export type CatalogCategory = z.infer<typeof catalogCategoryResponseSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type CatalogItemResponse = z.infer<typeof catalogItemResponseSchema>;
export type CatalogItemListResponse = z.infer<
  typeof catalogItemListResponseSchema
>;
export type CatalogImageUploadResponse = z.infer<
  typeof catalogImageUploadResponseSchema
>;
