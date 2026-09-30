import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import {
  catalogImageDeleteSchema,
  catalogImageUploadJsonSchema,
  catalogItemIdParamsSchema,
  catalogListQuerySchema,
  catalogSlugParamsSchema,
  createCatalogItemSchema,
  type CatalogImageDeleteInput,
  updateCatalogItemSchema,
} from "shared";
import type { z } from "zod";
import type {
  CatalogItemIdParams,
  CatalogListQuery,
  CatalogSlugParams,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
} from "shared";

import type { AppEnv } from "../../app-env";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  type ValidatedContext,
} from "../../middleware/validation";
import {
  throwCatalogImageContentTypeUnsupported,
  throwCatalogImageRequired,
  throwCatalogItemNotFound,
  throwCatalogImageUrlInvalid,
} from "./catalog.errors";
import * as catalogService from "./catalog.service";

export async function listCatalogItemsHandler(
  c: ValidatedContext<
    { query: z.input<typeof catalogListQuerySchema> },
    { query: CatalogListQuery }
  >,
) {
  const query = getValidatedQuery<CatalogListQuery>(c);
  return c.json(await catalogService.listCatalogItems(query), StatusCodes.OK);
}

export async function getCatalogItemBySlugHandler(
  c: ValidatedContext<
    { param: z.input<typeof catalogSlugParamsSchema> },
    { param: CatalogSlugParams }
  >,
) {
  const { slug } = getValidatedParams<CatalogSlugParams>(c);
  const result = await catalogService.getCatalogItemBySlug(slug);
  if (!result) throwCatalogItemNotFound();

  return c.json({ item: result }, StatusCodes.OK);
}

export async function createCatalogItemHandler(
  c: ValidatedContext<
    { json: z.input<typeof createCatalogItemSchema> },
    { json: CreateCatalogItemInput }
  >,
) {
  const input = getValidatedBody<CreateCatalogItemInput>(c);
  const result = await catalogService.createCatalogItem(
    input,
    c.get("user")!.id,
  );

  return c.json({ item: result }, StatusCodes.CREATED);
}

export async function uploadCatalogImageHandler(c: Context<AppEnv>) {
  const contentType = c.req.header("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throwCatalogImageRequired();

    const result = await catalogService.uploadCatalogImage(file);
    return c.json(result, StatusCodes.CREATED);
  }

  if (contentType.includes("application/json")) {
    const parsed = catalogImageUploadJsonSchema.safeParse(await c.req.json());
    if (!parsed.success) throwCatalogImageUrlInvalid();

    return c.json(parsed.data, StatusCodes.OK);
  }

  throwCatalogImageContentTypeUnsupported();
}

export async function deleteCatalogImageHandler(
  c: ValidatedContext<
    { json: z.input<typeof catalogImageDeleteSchema> },
    { json: CatalogImageDeleteInput }
  >,
) {
  const { imageUrl } = getValidatedBody<CatalogImageDeleteInput>(c);
  await catalogService.deleteCatalogImage(imageUrl);

  return c.body(null, StatusCodes.NO_CONTENT);
}

export async function updateCatalogItemHandler(
  c: ValidatedContext<
    {
      param: z.input<typeof catalogItemIdParamsSchema>;
      json: z.input<typeof updateCatalogItemSchema>;
    },
    {
      param: CatalogItemIdParams;
      json: UpdateCatalogItemInput;
    }
  >,
) {
  const { itemId } = getValidatedParams<CatalogItemIdParams>(c);
  const input = getValidatedBody<UpdateCatalogItemInput>(c);
  const result = await catalogService.updateCatalogItem(
    itemId,
    input,
    c.get("user")!.id,
  );
  if (!result) throwCatalogItemNotFound();

  return c.json({ item: result }, StatusCodes.OK);
}

export async function archiveCatalogItemHandler(
  c: ValidatedContext<
    { param: z.input<typeof catalogItemIdParamsSchema> },
    { param: CatalogItemIdParams }
  >,
) {
  const { itemId } = getValidatedParams<CatalogItemIdParams>(c);
  const archived = await catalogService.archiveCatalogItem(
    itemId,
    c.get("user")!.id,
  );
  if (!archived) throwCatalogItemNotFound();

  return c.body(null, StatusCodes.NO_CONTENT);
}
