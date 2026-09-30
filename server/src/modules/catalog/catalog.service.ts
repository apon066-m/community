import type {
  CatalogListQuery,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
} from "shared";

import { db, type DbExecutor } from "../../db";
import { isDatabaseUniqueViolation } from "../../errors/database-error";
import { auditEvents } from "../audit/audit.events";
import * as auditRepository from "../audit/audit.repository";
import {
  deleteCatalogImage as deleteStoredCatalogImage,
  saveCatalogImage,
} from "./catalog.assets";
import {
  throwCatalogCategoryNotFound,
  throwCatalogPersistenceFailure,
  throwCatalogSlugConflict,
} from "./catalog.errors";
import {
  decodeCatalogCursor,
  encodeCatalogCursor,
} from "./utils/catalog.cursor";
import { toCatalogItem } from "./catalog.mapper";
import * as catalogRepository from "./catalog.repository";
import {
  addCatalogSlugSuffix,
  slugifyCatalogName,
} from "./utils/catalog.slug";

const maxGeneratedSlugAttempts = 5;

async function getActiveCategoryOrThrow(
  executor: DbExecutor,
  categorySlug: string,
) {
  const category = await catalogRepository.findActiveCategoryBySlug(
    executor,
    categorySlug,
  );

  if (!category) throwCatalogCategoryNotFound();
  return category;
}

async function createGeneratedSlug(executor: DbExecutor, name: string) {
  const baseSlug = slugifyCatalogName(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (await catalogRepository.findAnyCatalogItemBySlug(executor, candidate)) {
    candidate = addCatalogSlugSuffix(baseSlug, suffix);
    suffix += 1;
  }

  return candidate;
}

async function insertCatalogItem(
  executor: DbExecutor,
  input: CreateCatalogItemInput,
  categoryId: string,
  slug: string,
) {
  return catalogRepository.createCatalogItem(executor, {
    categoryId,
    slug,
    name: input.name,
    description: input.description,
    priceMinor: input.priceMinor,
    currency: input.currency,
    attributes: input.attributes,
    available: input.available,
    featured: input.featured,
    sortOrder: await catalogRepository.findNextCatalogSortOrder(
      executor,
      categoryId,
    ),
    imageUrl: input.imageUrl ?? null,
  });
}

export async function listCatalogItems(input: CatalogListQuery) {
  const cursorPosition = decodeCatalogCursor(input.cursor, input);
  const rows = await catalogRepository.listCatalogItems(db, {
    ...input,
    cursorPosition,
  });
  const hasNextPage = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const lastItem = items.at(-1);

  return {
    items: items.map((row) => toCatalogItem(row)),
    pagination: {
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? encodeCatalogCursor(input, lastItem.item)
          : null,
    },
  };
}

export async function getCatalogItemBySlug(slug: string) {
  const result = await catalogRepository.findCatalogItemBySlug(db, slug);
  return result ? toCatalogItem(result) : null;
}

export async function createCatalogItem(
  input: CreateCatalogItemInput,
  actorUserId: string,
) {
  for (let attempt = 0; attempt < maxGeneratedSlugAttempts; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const category = await getActiveCategoryOrThrow(tx, input.categorySlug);
        const slug =
          input.slug ?? (await createGeneratedSlug(tx, input.name));

        if (
          await catalogRepository.findAnyCatalogItemBySlug(tx, slug)
        ) {
          throwCatalogSlugConflict();
        }

        const created = await insertCatalogItem(tx, input, category.id, slug);
        const result = await catalogRepository.findCatalogItemById(tx, created.id);

        if (!result) throwCatalogPersistenceFailure();

        await auditRepository.recordAudit(tx, {
          actorUserId,
          ...auditEvents.catalogItemCreated,
          targetId: created.id,
          details: {
            slug: created.slug,
            name: created.name,
            categoryId: created.categoryId,
          },
        });

        return toCatalogItem(result);
      });
    } catch (error) {
      if (input.slug || !isDatabaseUniqueViolation(error)) throw error;
      if (attempt === maxGeneratedSlugAttempts - 1) {
        throwCatalogSlugConflict();
      }
    }
  }

  throwCatalogPersistenceFailure();
}

export async function uploadCatalogImage(file: File) {
  return saveCatalogImage(file);
}

async function removeCatalogImageIfUnused(imageUrl: string) {
  if (await catalogRepository.isCatalogImageReferenced(db, imageUrl)) return;

  try {
    await deleteStoredCatalogImage(imageUrl);
  } catch (error) {
    console.error("Unable to delete catalog image", { imageUrl, error });
  }
}

export async function deleteCatalogImage(imageUrl: string) {
  await removeCatalogImageIfUnused(imageUrl);
}

export async function updateCatalogItem(
  id: string,
  input: UpdateCatalogItemInput,
  actorUserId: string,
) {
  const result = await db.transaction(async (tx) => {
    const existing = await catalogRepository.findCatalogItemById(tx, id);
    if (!existing) return null;

    let categoryId = existing.category.id;
    if (input.categorySlug && input.categorySlug !== existing.category.slug) {
      const category = await getActiveCategoryOrThrow(tx, input.categorySlug);
      categoryId = category.id;
    }

    if (input.slug && input.slug !== existing.item.slug) {
      const slugOwner = await catalogRepository.findAnyCatalogItemBySlug(
        tx,
        input.slug,
      );
      if (slugOwner && slugOwner.id !== id) throwCatalogSlugConflict();
    }

    const { categorySlug: _categorySlug, ...itemInput } = input;
    const updated = await catalogRepository.updateCatalogItem(tx, id, {
      ...itemInput,
      categoryId,
    });
    if (!updated) return null;

    const item = await catalogRepository.findCatalogItemById(tx, id);
    if (!item) throwCatalogPersistenceFailure();

    await auditRepository.recordAudit(tx, {
      actorUserId,
      ...auditEvents.catalogItemUpdated,
      targetId: id,
      details: {
        changedFields: Object.keys(input),
      },
    });

    return {
      item: toCatalogItem(item),
      previousImageUrl: existing.item.imageUrl,
    };
  });

  if (!result) return null;
  if (
    result.previousImageUrl &&
    input.imageUrl !== undefined &&
    input.imageUrl !== result.previousImageUrl
  ) {
    await removeCatalogImageIfUnused(result.previousImageUrl);
  }

  return result.item;
}

export async function archiveCatalogItem(id: string, actorUserId: string) {
  const result = await db.transaction(async (tx) => {
    const existing = await catalogRepository.findCatalogItemById(tx, id);
    if (!existing) return null;

    const archived = await catalogRepository.archiveCatalogItem(tx, id);
    if (!archived) return null;

    await auditRepository.recordAudit(tx, {
      actorUserId,
      ...auditEvents.catalogItemArchived,
      targetId: id,
      details: {
        slug: existing.item.slug,
        name: existing.item.name,
      },
    });

    return { imageUrl: existing.item.imageUrl };
  });

  if (!result) return false;

  if (result.imageUrl) {
    await removeCatalogImageIfUnused(result.imageUrl);
  }

  return true;
}
