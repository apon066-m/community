import { afterEach, describe, expect, test } from "bun:test";

import {
  deleteCatalogImage,
  saveCatalogImage,
} from "../catalog.assets";

const createdImageUrls: string[] = [];

afterEach(async () => {
  while (createdImageUrls.length > 0) {
    await deleteCatalogImage(createdImageUrls.pop()!);
  }
});

describe("catalog image assets", () => {
  test("stores and deletes a catalog image safely", async () => {
    const pngHeader = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const result = await saveCatalogImage(
      new File([pngHeader], "menu.png", { type: "image/png" }),
    );
    createdImageUrls.push(result.imageUrl);

    expect(result.imageUrl).toMatch(/^\/assets\/catalog-items\/[a-f0-9-]{36}\.png$/);
    expect(await deleteCatalogImage(result.imageUrl)).toBe(true);
    expect(await deleteCatalogImage(result.imageUrl)).toBe(false);
  });

  test("rejects unsupported image types", async () => {
    await expect(
      saveCatalogImage(
        new File(["not an image"], "menu.gif", { type: "image/gif" }),
      ),
    ).rejects.toThrow("JPG, PNG, or WebP");
  });

  test("rejects a file with a spoofed image type", async () => {
    await expect(
      saveCatalogImage(
        new File(["not an image"], "menu.png", { type: "image/png" }),
      ),
    ).rejects.toThrow("contents do not match");
  });
});
