import { afterEach, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { user } from "../../auth/auth.schema";
import { auditLog } from "../audit.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdUserIds: string[] = [];

afterEach(async () => {
  if (!createdUserIds.length || process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  const userIds = createdUserIds.splice(0);
  await db.delete(auditLog).where(inArray(auditLog.actorUserId, userIds));

  for (const userId of userIds.reverse()) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

describeDatabase("audit log HTTP flow", () => {
  test("requires admins and returns a filterable cursor page", async () => {
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

    const admin = await signUp("Audit Admin");
    const customer = await signUp("Audit Customer");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, admin.id));

    await db.insert(auditLog).values([
      {
        id: crypto.randomUUID(),
        actorUserId: admin.id,
        targetType: "user",
        targetId: customer.id,
        action: "set-role",
        details: { previous: "customer", next: "staff" },
        createdAt: new Date("2026-01-02T12:00:00.000Z"),
      },
      {
        id: crypto.randomUUID(),
        actorUserId: admin.id,
        targetType: "user",
        targetId: customer.id,
        action: "ban",
        details: { reason: "test" },
        createdAt: new Date("2026-01-01T12:00:00.000Z"),
      },
      {
        id: crypto.randomUUID(),
        actorUserId: admin.id,
        targetType: "order",
        targetId: "order-1",
        action: "status-change",
        details: { previousStatus: "pending", nextStatus: "ready" },
        createdAt: new Date("2025-12-01T12:00:00.000Z"),
      },
    ]);

    const unauthorized = await app.request("/api/v1/admin/audit-log");
    expect(unauthorized.status).toBe(StatusCodes.UNAUTHORIZED);

    const forbidden = await app.request("/api/v1/admin/audit-log", {
      headers: { cookie: customer.cookie },
    });
    expect(forbidden.status).toBe(StatusCodes.FORBIDDEN);

    const firstPage = await app.request(
      `/api/v1/admin/audit-log?targetType=user&targetId=${customer.id}&limit=1`,
      { headers: { cookie: admin.cookie } },
    );
    expect(firstPage.status).toBe(StatusCodes.OK);
    const firstBody = (await firstPage.json()) as {
      items: Array<{
        actor: { id: string; name: string; email: string; role: string };
        targetType: string;
        targetId: string;
        action: string;
        details: Record<string, unknown>;
      }>;
      pagination: { hasNextPage: boolean; nextCursor: string | null };
    };

    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.items[0]).toMatchObject({
      targetType: "user",
      targetId: customer.id,
      action: "set-role",
      actor: {
        id: admin.id,
        name: "Audit Admin",
        role: "admin",
      },
    });
    expect(firstBody.items[0]!.details).toEqual({
      previous: "customer",
      next: "staff",
    });
    expect(firstBody.pagination).toEqual({
      hasNextPage: true,
      nextCursor: expect.any(String),
    });

    const secondPage = await app.request(
      `/api/v1/admin/audit-log?targetType=user&targetId=${customer.id}&limit=1&cursor=${encodeURIComponent(firstBody.pagination.nextCursor!)}`,
      { headers: { cookie: admin.cookie } },
    );
    expect(secondPage.status).toBe(StatusCodes.OK);
    const secondBody = (await secondPage.json()) as typeof firstBody;

    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0]).toMatchObject({
      targetType: "user",
      targetId: customer.id,
      action: "ban",
    });
    expect(secondBody.pagination).toEqual({
      hasNextPage: false,
      nextCursor: null,
    });
  });
});
