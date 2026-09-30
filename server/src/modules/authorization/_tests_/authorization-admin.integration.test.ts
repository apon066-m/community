import { afterEach, describe, expect, test } from "bun:test";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { user } from "../../auth/auth.schema";
import { auditLog } from "../../audit/audit.schema";
import { userPermissionOverride } from "../authorization.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdUserIds: string[] = [];

afterEach(async () => {
  if (!createdUserIds.length || process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  const userIds = createdUserIds.splice(0);
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorUserId, userIds));
  await db
    .delete(userPermissionOverride)
    .where(
      or(
        inArray(userPermissionOverride.userId, userIds),
        inArray(userPermissionOverride.grantedBy, userIds),
      ),
    );

  for (const userId of userIds.reverse()) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

describeDatabase("administrative authorization HTTP flow", () => {
  test("audits grants, blocks escalation, clears promotion overrides, and preserves an admin", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const { getAuthorization } = await import("../authorization.repository");
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

    const actor = await signUp("Authorization Admin");
    const target = await signUp("Authorization Staff");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, actor.id));
    await db.update(user).set({ role: "staff" }).where(eq(user.id, target.id));

    async function setOverride(permissionId: string, effect: "allow" | "deny") {
      return app.request(
        `/api/v1/admin/rbac/users/${target.id}/permissions/${permissionId}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            cookie: actor.cookie,
            origin,
          },
          body: JSON.stringify({ effect }),
        },
      );
    }

    expect((await setOverride("menu:delete", "allow")).status).toBe(StatusCodes.OK);
    expect((await getAuthorization(target.id))?.permissions.has("menu:delete")).toBe(
      true,
    );
    expect((await setOverride("rbac:manage", "allow")).status).toBe(StatusCodes.BAD_REQUEST);
    expect((await setOverride("menu:update", "deny")).status).toBe(StatusCodes.OK);

    const promotion = await app.request(`/api/v1/admin/users/${target.id}/role`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: actor.cookie,
        origin,
      },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(promotion.status).toBe(StatusCodes.OK);
    expect((await getAuthorization(target.id))?.permissions.has("menu:update")).toBe(
      true,
    );
    expect(
      await db
        .select()
        .from(userPermissionOverride)
        .where(eq(userPermissionOverride.userId, target.id)),
    ).toHaveLength(0);

    const demote = (userId: string) =>
      app.request(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: actor.cookie,
          origin,
        },
        body: JSON.stringify({ role: "staff" }),
      });
    const demotions = await Promise.all([demote(actor.id), demote(target.id)]);
    expect(
      demotions.every(
        ({ status }) =>
          status === StatusCodes.OK ||
          status === StatusCodes.CONFLICT ||
          status === StatusCodes.FORBIDDEN,
      ),
    ).toBe(true);

    const [activeAdmins] = await db
      .select({ value: count() })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.banned, false)));
    expect(Number(activeAdmins?.value)).toBeGreaterThanOrEqual(1);

    const auditRows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.actorUserId, actor.id));
    expect(auditRows.some(({ action }) => action === "set-permission-override")).toBe(
      true,
    );
    expect(auditRows.some(({ action }) => action === "set-role")).toBe(true);
  });
});
