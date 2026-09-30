import { afterEach, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { customerFavoriteListResponseSchema } from "shared";

import { auditLog } from "../../audit/audit.schema";
import { user } from "../../auth/auth.schema";
import { catalogCategory, catalogItem } from "../../catalog/catalog.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdCatalogItemIds: string[] = [];

afterEach(async () => {
  if (process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  if (createdCatalogItemIds.length) {
    await db
      .delete(catalogItem)
      .where(inArray(catalogItem.id, createdCatalogItemIds.splice(0)));
  }
  if (createdCategoryIds.length) {
    await db
      .delete(catalogCategory)
      .where(inArray(catalogCategory.id, createdCategoryIds.splice(0)));
  }
  if (createdUserIds.length) {
    await db
      .delete(auditLog)
      .where(inArray(auditLog.actorUserId, createdUserIds));
  }
  while (createdUserIds.length) {
    await db.delete(user).where(eq(user.id, createdUserIds.pop()!));
  }
});

describeDatabase("customer favorites HTTP flow", () => {
  test("isolates account lists and preserves sold-out, archived, and inactive items", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const origin = process.env.CLIENT_ORIGIN!;
    const token = crypto.randomUUID();

    async function signUp(name: string, role: "customer" | "admin" = "customer") {
      const email = `${crypto.randomUUID()}@example.test`;
      const response = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({
          name,
          email,
          password: "correct-horse-battery-staple",
        }),
      });
      expect(response.status).toBe(StatusCodes.OK);

      const [createdUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email));
      expect(createdUser).toBeTruthy();
      createdUserIds.push(createdUser!.id);
      if (role === "admin") {
        await db.update(user).set({ role }).where(eq(user.id, createdUser!.id));
      }

      return {
        id: createdUser!.id,
        cookie: response.headers.get("set-cookie")!.split(";", 1)[0]!,
      };
    }

    async function createCategory(slug: string, name: string) {
      const id = crypto.randomUUID();
      await db.insert(catalogCategory).values({ id, slug, name, active: true });
      createdCategoryIds.push(id);
      return { id, slug };
    }

    async function createItem(
      adminCookie: string,
      categorySlug: string,
      name: string,
      available = true,
    ) {
      const response = await app.request("/api/v1/catalog-items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin,
        },
        body: JSON.stringify({
          categorySlug,
          name: `${name} ${token}`,
          description: "Favorites integration fixture",
          priceMinor: 300,
          available,
        }),
      });
      expect(response.status).toBe(StatusCodes.CREATED);
      const body = (await response.json()) as { item: { id: string } };
      createdCatalogItemIds.push(body.item.id);
      return body.item.id;
    }

    const customer = await signUp("Favorite Customer");
    const otherCustomer = await signUp("Other Favorite Customer");
    const admin = await signUp("Favorite Admin", "admin");
    const activeCategory = await createCategory(
      `favorite-active-${token.slice(0, 8)}`,
      "Favorite Test Menu",
    );
    const inactiveCategory = await createCategory(
      `favorite-inactive-${token.slice(0, 8)}`,
      "Inactive Favorite Test Menu",
    );
    const soldOutItemId = await createItem(
      admin.cookie,
      activeCategory.slug,
      "Sold Out Favorite",
      false,
    );
    const archivedItemId = await createItem(
      admin.cookie,
      activeCategory.slug,
      "Archived Favorite",
    );
    const inactiveItemId = await createItem(
      admin.cookie,
      inactiveCategory.slug,
      "Inactive Category Favorite",
    );

    expect(
      (
        await app.request("/api/v1/users/me/favorites")
      ).status,
    ).toBe(StatusCodes.UNAUTHORIZED);
    expect(
      (
        await app.request("/api/v1/users/me/favorites/bad!id", {
          method: "PUT",
          headers: { cookie: customer.cookie, origin },
        })
      ).status,
    ).toBe(StatusCodes.BAD_REQUEST);

    const adminListResponse = await app.request(
      "/api/v1/users/me/favorites",
      { headers: { cookie: admin.cookie } },
    );
    expect(adminListResponse.status).toBe(StatusCodes.FORBIDDEN);

    const invalidItemResponse = await app.request(
      "/api/v1/users/me/favorites/missing-favorite-item",
      { method: "PUT", headers: { cookie: customer.cookie, origin } },
    );
    expect(invalidItemResponse.status).toBe(StatusCodes.NOT_FOUND);

    const duplicateSaves = await Promise.all([
      app.request(`/api/v1/users/me/favorites/${soldOutItemId}`, {
        method: "PUT",
        headers: { cookie: customer.cookie, origin },
      }),
      app.request(`/api/v1/users/me/favorites/${soldOutItemId}`, {
        method: "PUT",
        headers: { cookie: customer.cookie, origin },
      }),
    ]);
    expect(duplicateSaves.map(({ status }) => status)).toEqual([
      StatusCodes.OK,
      StatusCodes.OK,
    ]);
    const savedResponses = await Promise.all(
      duplicateSaves.map((response) => response.json()),
    ) as Array<{ favorite: { savedAt: string; onMenu: boolean; item: { available: boolean } } }>;
    expect(savedResponses[0]?.favorite.savedAt).toBe(
      savedResponses[1]?.favorite.savedAt,
    );
    expect(savedResponses[0]?.favorite).toMatchObject({
      onMenu: true,
      item: { available: false },
    });

    for (const itemId of [archivedItemId, inactiveItemId]) {
      const response = await app.request(
        `/api/v1/users/me/favorites/${itemId}`,
        { method: "PUT", headers: { cookie: customer.cookie, origin } },
      );
      expect(response.status).toBe(StatusCodes.OK);
    }

    const otherListResponse = await app.request(
      "/api/v1/users/me/favorites",
      { headers: { cookie: otherCustomer.cookie } },
    );
    expect(otherListResponse.status).toBe(StatusCodes.OK);
    expect(await otherListResponse.json()).toEqual({ items: [] });

    await app.request(`/api/v1/catalog-items/${archivedItemId}`, {
      method: "DELETE",
      headers: { cookie: admin.cookie, origin },
    });
    await db
      .update(catalogCategory)
      .set({ active: false })
      .where(eq(catalogCategory.id, inactiveCategory.id));

    for (const itemId of [archivedItemId, inactiveItemId]) {
      const unavailableSave = await app.request(
        `/api/v1/users/me/favorites/${itemId}`,
        { method: "PUT", headers: { cookie: customer.cookie, origin } },
      );
      expect(unavailableSave.status).toBe(StatusCodes.NOT_FOUND);
    }

    const listResponse = await app.request("/api/v1/users/me/favorites", {
      headers: { cookie: customer.cookie },
    });
    expect(listResponse.status).toBe(StatusCodes.OK);
    const favoriteList = customerFavoriteListResponseSchema.parse(
      await listResponse.json(),
    );
    expect(favoriteList.items).toHaveLength(3);
    expect(favoriteList.items.find((favorite) => favorite.catalogItemId === soldOutItemId))
      ?.toMatchObject({ onMenu: true, item: { available: false } });
    expect(favoriteList.items.find((favorite) => favorite.catalogItemId === archivedItemId))
      ?.toMatchObject({ onMenu: false, item: { archivedAt: expect.any(String) } });
    expect(favoriteList.items.find((favorite) => favorite.catalogItemId === inactiveItemId))
      ?.toMatchObject({ onMenu: false, item: { category: { active: false } } });

    for (const _attempt of [1, 2]) {
      const removal = await app.request(
        `/api/v1/users/me/favorites/${soldOutItemId}`,
        { method: "DELETE", headers: { cookie: customer.cookie, origin } },
      );
      expect(removal.status).toBe(StatusCodes.NO_CONTENT);
    }
    const remainingList = await app.request("/api/v1/users/me/favorites", {
      headers: { cookie: customer.cookie },
    });
    const remainingBody = customerFavoriteListResponseSchema.parse(
      await remainingList.json(),
    );
    expect(remainingBody.items.map(({ catalogItemId }) => catalogItemId)).toEqual(
      expect.arrayContaining([archivedItemId, inactiveItemId]),
    );
    expect(remainingBody.items).toHaveLength(2);
  });
});
