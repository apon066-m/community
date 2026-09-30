import { eq } from "drizzle-orm";

import { closeDatabase, db } from "../../db";
import { catalogCategory, catalogItem } from "./catalog.schema";

const mockCoffeeItems = [
  {
    slug: "espresso",
    name: "Espresso",
    description: "A short, concentrated shot with a rich crema finish.",
    priceMinor: 9000,
    attributes: {
      sizes: ["small"],
      temperatures: ["hot"],
      dietary: ["dairyFree", "vegan", "sugarFree"],
    },
    available: true,
  },
  {
    slug: "americano",
    name: "Americano",
    description:
      "Espresso opened up with hot water for a clean finish. Espresso opened up with hot water for a clean finish. Espresso opened up with hot water for a clean finish. Espresso opened up with hot water for a clean finish. Espresso opened up with hot water for a clean finish. Espresso opened up with hot water for a clean finish.",
    priceMinor: 11000,
    attributes: {
      sizes: ["small", "medium", "large"],
      temperatures: ["hot", "iced"],
      dietary: ["dairyFree", "vegan", "sugarFree"],
    },
    available: true,
  },
  {
    slug: "cappuccino",
    name: "Cappuccino",
    description: "Balanced espresso, steamed milk, and a soft foam cap.",
    priceMinor: 13500,
    attributes: {
      sizes: ["medium"],
      temperatures: ["hot"],
      dietary: ["sugarFree"],
    },
    available: true,
  },
  {
    slug: "cafe-latte",
    name: "Cafe Latte",
    description: "Silky steamed milk folded into a smooth espresso base.",
    priceMinor: 14000,
    attributes: {
      sizes: ["medium", "large"],
      temperatures: ["hot", "iced"],
      dietary: ["sugarFree"],
    },
    available: true,
  },
  {
    slug: "mocha",
    name: "Mocha",
    description: "Velvety chocolate, espresso, and steamed milk together.",
    priceMinor: 15500,
    attributes: {
      sizes: ["medium", "large"],
      temperatures: ["hot", "iced"],
      dietary: [],
    },
    available: true,
  },
  {
    slug: "cold-brew",
    name: "Cold Brew",
    description: "Slow-steeped coffee served cold with a naturally sweet body.",
    priceMinor: 14500,
    attributes: {
      sizes: ["medium", "large"],
      temperatures: ["iced"],
      dietary: ["dairyFree", "vegan", "sugarFree"],
    },
    available: true,
  },
  {
    slug: "iced-spanish-latte",
    name: "Iced Spanish Latte",
    description: "Chilled espresso with sweetened milk over fresh ice.",
    priceMinor: 16500,
    attributes: {
      sizes: ["medium", "large"],
      temperatures: ["iced"],
      dietary: [],
    },
    available: true,
  },
  {
    slug: "caramel-macchiato",
    name: "Caramel Macchiato",
    description: "Layered milk, espresso, and caramel with a bright finish.",
    priceMinor: 17500,
    attributes: {
      sizes: ["medium", "large"],
      temperatures: ["hot", "iced"],
      dietary: [],
    },
    available: true,
  },
  {
    slug: "cinnamon-latte",
    name: "Cinnamon Latte",
    description: "A warm latte finished with cinnamon and toasted spice.",
    priceMinor: 15000,
    attributes: {
      sizes: ["medium", "large"],
      temperatures: ["hot"],
      dietary: ["sugarFree"],
    },
    available: false,
  },
] as const;

async function seedCatalog() {
  const [coffeeCategory] = await db
    .select({ id: catalogCategory.id })
    .from(catalogCategory)
    .where(eq(catalogCategory.slug, "coffee"))
    .limit(1);

  if (!coffeeCategory) {
    throw new Error("The coffee category is missing. Run db:migrate first.");
  }

  await db
    .insert(catalogItem)
    .values(
      mockCoffeeItems.map((item, sortOrder) => ({
        id: `mock-coffee-${item.slug}`,
        categoryId: coffeeCategory.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        priceMinor: item.priceMinor,
        currency: "USD",
        attributes: item.attributes,
        available: item.available,
        featured: false,
        sortOrder,
        imageUrl: null,
      })),
    )
    .onConflictDoNothing({ target: catalogItem.slug });

  for (const [sortOrder, item] of mockCoffeeItems.entries()) {
    await db
      .update(catalogItem)
      .set({
        name: item.name,
        description: item.description,
        priceMinor: item.priceMinor,
        currency: "USD",
        attributes: item.attributes,
        available: item.available,
        featured: false,
        sortOrder,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(catalogItem.slug, item.slug));
  }

  console.log(`Seeded ${mockCoffeeItems.length} catalog items.`);
}

try {
  await seedCatalog();
} finally {
  await closeDatabase();
}
