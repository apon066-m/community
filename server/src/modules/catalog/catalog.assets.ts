import { mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";

import { AppError } from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";

export const catalogImageMaxBytes = 5 * 1024 * 1024;

const catalogImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const catalogImageDirectory = resolve(
  import.meta.dir,
  "../../../public/assets/catalog-items",
);
const catalogImageUrlPrefix = "/assets/catalog-items/";
const catalogImageFilePattern = /^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i;

function throwInvalidCatalogImage(message: string): never {
  throw new AppError({
    statusCode: StatusCodes.BAD_REQUEST,
    code: "CATALOG_IMAGE_INVALID",
    message,
  });
}

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer()).subarray(0, 12);

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }

  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export async function saveCatalogImage(file: File) {
  const extension = catalogImageTypes.get(file.type);

  if (!extension) {
    throwInvalidCatalogImage("Catalog images must be JPG, PNG, or WebP files");
  }

  if (file.size === 0) {
    throwInvalidCatalogImage("Catalog image cannot be empty");
  }

  if (file.size > catalogImageMaxBytes) {
    throwInvalidCatalogImage("Catalog images must be 5 MB or smaller");
  }

  if (!(await hasValidImageSignature(file))) {
    throwInvalidCatalogImage("Catalog image contents do not match the file type");
  }

  await mkdir(catalogImageDirectory, { recursive: true });

  const fileName = `${crypto.randomUUID()}.${extension}`;
  await Bun.write(resolve(catalogImageDirectory, fileName), file);

  return {
    imageUrl: `${catalogImageUrlPrefix}${fileName}`,
  };
}

function getStoredCatalogImagePath(imageUrl: string) {
  if (!imageUrl.startsWith(catalogImageUrlPrefix)) return null;

  const fileName = imageUrl.slice(catalogImageUrlPrefix.length);
  if (!catalogImageFilePattern.test(fileName)) return null;

  return resolve(catalogImageDirectory, fileName);
}

export async function deleteCatalogImage(imageUrl: string) {
  const filePath = getStoredCatalogImagePath(imageUrl);
  if (!filePath) return false;

  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
