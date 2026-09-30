import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";

export function throwCatalogItemNotFound(): never {
  throw new AppError({
    statusCode: StatusCodes.NOT_FOUND,
    code: "CATALOG_ITEM_NOT_FOUND",
    message: "Catalog item not found",
  });
}

export function throwCatalogCategoryNotFound(): never {
  throw new AppError({
    statusCode: StatusCodes.NOT_FOUND,
    code: "CATALOG_CATEGORY_NOT_FOUND",
    message: "Catalog category not found",
  });
}

export function throwCatalogSlugConflict(): never {
  throw new AppError({
    statusCode: StatusCodes.CONFLICT,
    code: "CATALOG_ITEM_SLUG_EXISTS",
    message: "A catalog item with this slug already exists",
  });
}

export function throwCatalogImageRequired(): never {
  throw new AppError({
    statusCode: StatusCodes.BAD_REQUEST,
    code: "CATALOG_IMAGE_REQUIRED",
    message: "A catalog image file is required",
  });
}

export function throwCatalogImageContentTypeUnsupported(): never {
  throw new AppError({
    statusCode: StatusCodes.UNSUPPORTED_MEDIA_TYPE,
    code: "CATALOG_IMAGE_CONTENT_TYPE_UNSUPPORTED",
    message: "Catalog images require multipart/form-data or application/json",
  });
}

export function throwCatalogImageUrlInvalid(): never {
  throw new AppError({
    statusCode: StatusCodes.BAD_REQUEST,
    code: "CATALOG_IMAGE_URL_INVALID",
    message: "Image URL must be an HTTP(S) URL or a root-relative path",
  });
}

export function throwCatalogPersistenceFailure(cause?: unknown): never {
  throw new AppError({
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: "CATALOG_PERSISTENCE_FAILED",
    message: "Unable to complete the catalog operation",
    cause,
  });
}
