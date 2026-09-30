import { afterEach, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { user } from "../../auth/auth.schema";
import { auditLog } from "../../audit/audit.schema";
import { catalogItem } from "../catalog.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdCatalogItemIds: string[] = [];
const createdUserIds: string[] = [];
const createdImageUrls: string[] = [];

afterEach(async () => {
  if (process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  if (createdCatalogItemIds.length) {
    await db
      .delete(catalogItem)
      .where(inArray(catalogItem.id, createdCatalogItemIds.splice(0)));
  }
  if (createdImageUrls.length) {
    const { deleteCatalogImage } = await import("../catalog.assets");
    for (const imageUrl of createdImageUrls.splice(0)) {
      await deleteCatalogImage(imageUrl);
    }
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

describeDatabase("catalog item HTTP flow", () => {
  test("creates, filters, reads, updates, and archives a pastry item", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const origin = process.env.CLIENT_ORIGIN!;
    const token = crypto.randomUUID();

    const signupResponse = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        name: "Catalog Admin",
        email: `${token}@example.test`,
        password: "correct-horse-battery-staple",
      }),
    });
    expect(signupResponse.status).toBe(StatusCodes.OK);

    const cookie = signupResponse.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toBeTruthy();

    const [createdUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, `${token}@example.test`));
    expect(createdUser).toBeTruthy();
    createdUserIds.push(createdUser!.id);
    await db.update(user).set({ role: "admin" }).where(eq(user.id, createdUser!.id));

    const createResponse = await app.request("/api/v1/catalog-items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookie!,
        origin,
      },
      body: JSON.stringify({
        categorySlug: "pastry",
        name: `Test Tart ${token}`,
        description: "A test pastry",
        priceMinor: 18000,
        attributes: { containsNuts: false },
        imageUrl: "/images/catalog-items/catalog-image-guide.svg",
      }),
    });
    expect(createResponse.status).toBe(StatusCodes.CREATED);

    const createdBody = (await createResponse.json()) as {
      item: { id: string; slug: string; category: { slug: string } };
    };
    createdCatalogItemIds.push(createdBody.item.id);
    expect(createdBody.item.category.slug).toBe("pastry");

    const listResponse = await app.request(
      `/api/v1/catalog-items?categorySlug=pastry&search=${token}`,
    );
    expect(listResponse.status).toBe(StatusCodes.OK);
    const listBody = (await listResponse.json()) as {
      items: Array<{ id: string }>;
    };
    expect(listBody.items.map(({ id }) => id)).toContain(createdBody.item.id);

    const detailResponse = await app.request(
      `/api/v1/catalog-items/${createdBody.item.slug}`,
    );
    expect(detailResponse.status).toBe(StatusCodes.OK);

    const updateResponse = await app.request(
      `/api/v1/catalog-items/${createdBody.item.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: cookie!,
          origin,
        },
        body: JSON.stringify({ available: false }),
      },
    );
    expect(updateResponse.status).toBe(StatusCodes.OK);

    const archiveResponse = await app.request(
      `/api/v1/catalog-items/${createdBody.item.id}`,
      { method: "DELETE", headers: { cookie: cookie!, origin } },
    );
    expect(archiveResponse.status).toBe(StatusCodes.NO_CONTENT);
  });

  test("protects catalog assets and removes archived item images", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const origin = process.env.CLIENT_ORIGIN!;

    async function signUp(name: string) {
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

      return {
        id: createdUser!.id,
        cookie: response.headers.get("set-cookie")!.split(";", 1)[0]!,
      };
    }

    const admin = await signUp("Catalog Asset Admin");
    const customer = await signUp("Catalog Asset Customer");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, admin.id));

    const pngHeader = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const uploadImage = (cookie: string) => {
      const form = new FormData();
      form.set(
        "file",
        new File([pngHeader], "catalog.png", { type: "image/png" }),
      );

      return app.request("/api/v1/catalog-items/assets", {
        method: "POST",
        headers: { cookie, origin },
        body: form,
      });
    };

    expect((await uploadImage(customer.cookie)).status).toBe(StatusCodes.FORBIDDEN);

    const uploadResponse = await uploadImage(admin.cookie);
    expect(uploadResponse.status).toBe(StatusCodes.CREATED);
    const { imageUrl } = (await uploadResponse.json()) as { imageUrl: string };
    createdImageUrls.push(imageUrl);
    expect((await app.request(imageUrl)).status).toBe(StatusCodes.OK);

    const createResponse = await app.request("/api/v1/catalog-items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: admin.cookie,
        origin,
      },
      body: JSON.stringify({
        categorySlug: "pastry",
        name: `Asset Tart ${crypto.randomUUID()}`,
        description: "A test pastry with an uploaded image",
        priceMinor: 18000,
        imageUrl,
      }),
    });
    expect(createResponse.status).toBe(StatusCodes.CREATED);
    const createdBody = (await createResponse.json()) as { item: { id: string } };
    createdCatalogItemIds.push(createdBody.item.id);

    const referencedDelete = await app.request(
      "/api/v1/catalog-items/assets",
      {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: admin.cookie,
          origin,
        },
        body: JSON.stringify({ imageUrl }),
      },
    );
    expect(referencedDelete.status).toBe(StatusCodes.NO_CONTENT);
    expect((await app.request(imageUrl)).status).toBe(StatusCodes.OK);

    const archiveResponse = await app.request(
      `/api/v1/catalog-items/${createdBody.item.id}`,
      { method: "DELETE", headers: { cookie: admin.cookie, origin } },
    );
    expect(archiveResponse.status).toBe(StatusCodes.NO_CONTENT);
    expect((await app.request(imageUrl)).status).toBe(StatusCodes.NOT_FOUND);
  });

  test("retries generated slugs when concurrent creates collide", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const origin = process.env.CLIENT_ORIGIN!;
    const email = `${crypto.randomUUID()}@example.test`;
    const signupResponse = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        name: "Slug Admin",
        email,
        password: "correct-horse-battery-staple",
      }),
    });
    expect(signupResponse.status).toBe(StatusCodes.OK);
    const adminCookie = signupResponse.headers.get("set-cookie")!.split(";", 1)[0]!;
    const [createdUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));
    expect(createdUser).toBeTruthy();
    createdUserIds.push(createdUser!.id);
    await db.update(user).set({ role: "admin" }).where(eq(user.id, createdUser!.id));

    const itemInput = {
      categorySlug: "pastry",
      name: `Concurrent Tart ${crypto.randomUUID()}`,
      description: "A concurrent slug test pastry",
      priceMinor: 19000,
    };
    const createItem = () =>
      app.request("/api/v1/catalog-items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin,
        },
        body: JSON.stringify(itemInput),
      });

    const responses = await Promise.all([createItem(), createItem()]);
    expect(responses.map(({ status }) => status)).toEqual([
      StatusCodes.CREATED,
      StatusCodes.CREATED,
    ]);

    for (const response of responses) {
      const body = (await response.json()) as { item: { id: string; slug: string } };
      createdCatalogItemIds.push(body.item.id);
    }
    const createdItems = await db
      .select({ id: catalogItem.id, slug: catalogItem.slug })
      .from(catalogItem)
      .where(inArray(catalogItem.id, createdCatalogItemIds.slice(-2)));
    expect(new Set(createdItems.map(({ slug }) => slug)).size).toBe(2);
  });
});
