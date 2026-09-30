import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { user } from "../../auth/auth.schema";
import { userPermissionOverride } from "../authorization.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdUserIds: string[] = [];

afterEach(async () => {
  if (!createdUserIds.length || process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  while (createdUserIds.length) {
    await db.delete(user).where(eq(user.id, createdUserIds.pop()!));
  }
});

describeDatabase("database authorization", () => {
  test("applies staff allow and deny overrides immediately", async () => {
    const { db } = await import("../../../db");
    const { getAuthorization } = await import("../authorization.repository");
    const adminId = crypto.randomUUID();
    const staffId = crypto.randomUUID();
    createdUserIds.push(adminId, staffId);

    await db.insert(user).values([
      {
        id: adminId,
        name: "Authorization Admin",
        email: `${adminId}@example.test`,
        role: "admin",
      },
      {
        id: staffId,
        name: "Authorization Staff",
        email: `${staffId}@example.test`,
        role: "staff",
      },
    ]);

    const baseline = await getAuthorization(staffId);
    expect(baseline?.permissions.has("menu:update")).toBe(true);
    expect(baseline?.permissions.has("menu:delete")).toBe(false);

    await db.insert(userPermissionOverride).values({
      userId: staffId,
      permissionId: "menu:delete",
      effect: "allow",
      grantedBy: adminId,
    });

    const promoted = await getAuthorization(staffId);
    expect(promoted?.permissions.has("menu:delete")).toBe(true);

    await db.insert(userPermissionOverride).values({
      userId: staffId,
      permissionId: "menu:update",
      effect: "deny",
      grantedBy: adminId,
    });

    const restricted = await getAuthorization(staffId);
    expect(restricted?.permissions.has("menu:update")).toBe(false);
  });
});
