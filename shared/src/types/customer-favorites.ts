import { z } from "zod";

import { catalogItemSchema } from "./catalog";

export const customerFavoriteSchema = z.object({
  catalogItemId: z.string(),
  savedAt: z.string(),
  onMenu: z.boolean(),
  item: catalogItemSchema,
});

export const customerFavoriteListResponseSchema = z.object({
  items: z.array(customerFavoriteSchema),
});

export const customerFavoriteResponseSchema = z.object({
  favorite: customerFavoriteSchema,
});

export type CustomerFavorite = z.infer<typeof customerFavoriteSchema>;
export type CustomerFavoriteListResponse = z.infer<
  typeof customerFavoriteListResponseSchema
>;
export type CustomerFavoriteResponse = z.infer<
  typeof customerFavoriteResponseSchema
>;
