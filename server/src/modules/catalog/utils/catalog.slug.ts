export const catalogSlugMaxLength = 120;

export function truncateCatalogSlug(value: string) {
  return value.slice(0, catalogSlugMaxLength).replace(/-+$/, "");
}

export function slugifyCatalogName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return truncateCatalogSlug(slug || "item");
}

export function addCatalogSlugSuffix(baseSlug: string, suffix: number) {
  const suffixText = `-${suffix}`;
  const truncatedBase = truncateCatalogSlug(
    baseSlug.slice(0, catalogSlugMaxLength - suffixText.length),
  );

  return `${truncatedBase}${suffixText}`;
}
