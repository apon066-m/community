export const customerTemperatures = ["any", "hot", "iced"] as const;

export const customerMenuSizes = ["small", "medium", "large"] as const;

export const customerDietaryPreferences = [
  "dairyFree",
  "vegan",
  "sugarFree",
] as const;

export const customerMenuSortOptions = [
  "featured",
  "priceAsc",
  "priceDesc",
  "nameAsc",
] as const;

export type CustomerTemperature = (typeof customerTemperatures)[number];

export type CustomerMenuSize = (typeof customerMenuSizes)[number];

export type CustomerDietaryPreference =
  (typeof customerDietaryPreferences)[number];

export type CustomerMenuSort = (typeof customerMenuSortOptions)[number];

export type CustomerFilterState = {
  categorySlug: string;
  temperature: CustomerTemperature;
  sizes: CustomerMenuSize[];
  priceRange: [number, number];
  dietary: CustomerDietaryPreference[];
  availableOnly: boolean;
};

export type CustomerMenuQuery = {
  search?: string;
  categorySlug?: string;
  temperature?: Exclude<CustomerTemperature, "any">;
  sizes?: CustomerMenuSize[];
  minPrice?: number;
  maxPrice?: number;
  dietary?: CustomerDietaryPreference[];
  availableOnly?: boolean;
  sort?: CustomerMenuSort;
};

export type CustomerMenuItem = {
  catalogItemId: string;
  id: string;
  categorySlug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  sizes: CustomerMenuSize[];
  temperatures: Exclude<CustomerTemperature, "any">[];
  dietary: CustomerDietaryPreference[];
  available: boolean;
  imageUrl?: string;
};

export type CustomerMenuResponse = {
  items: CustomerMenuItem[];
  total: number;
};
