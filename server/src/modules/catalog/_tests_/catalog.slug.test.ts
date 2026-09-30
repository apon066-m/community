import { describe, expect, test } from "bun:test";

import {
  addCatalogSlugSuffix,
  catalogSlugMaxLength,
  slugifyCatalogName,
} from "../utils/catalog.slug";

describe("catalog slugs", () => {
  test("normalizes catalog names", () => {
    expect(slugifyCatalogName("  Crème brûlée  ")).toBe("creme-brulee");
    expect(slugifyCatalogName("!!!")).toBe("item");
  });

  test("keeps suffixed slugs within the maximum length", () => {
    const baseSlug = "a".repeat(catalogSlugMaxLength);
    const suffixedSlug = addCatalogSlugSuffix(baseSlug, 2);

    expect(suffixedSlug).toBe(`${"a".repeat(catalogSlugMaxLength - 2)}-2`);
    expect(suffixedSlug).toHaveLength(catalogSlugMaxLength);
  });
});
