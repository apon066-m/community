import { and, eq, inArray, sql } from "drizzle-orm";

import { db, type DbExecutor } from "../../db";
import { role, user } from "../auth/auth.schema";
import {
  permission,
  rolePermission,
  userPermissionOverride,
} from "./authorization.schema";
import { adminMutationLockId } from "./authorization-policy";
import { resolvePermissions } from "./permissions";

export async function getAuthorization(
  userId: string,
  executor: DbExecutor = db,
) {
  const [currentUser] = await executor
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser || currentUser.banned) return null;

  const [roleRows, overrideRows] = await Promise.all([
    executor
      .select({ permissionId: rolePermission.permissionId })
      .from(rolePermission)
      .where(eq(rolePermission.role, currentUser.role)),
    currentUser.role === "admin"
      ? Promise.resolve([])
      : executor
          .select({
            permissionId: userPermissionOverride.permissionId,
            effect: userPermissionOverride.effect,
          })
          .from(userPermissionOverride)
          .where(eq(userPermissionOverride.userId, userId)),
  ]);

  return {
    role: currentUser.role,
    permissions: resolvePermissions(
      roleRows.map(({ permissionId }) => permissionId),
      overrideRows,
    ),
  };
}

export async function lockAdminMutations(executor: DbExecutor) {
  await executor.execute(sql`select pg_advisory_xact_lock(${adminMutationLockId})`);
}

export async function findAdmin(executor: DbExecutor, userId: string) {
  const [actor] = await executor
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return actor ?? null;
}

export async function listPermissions(executor: DbExecutor) {
  return executor.select().from(permission).orderBy(permission.id);
}

export async function createPermission(
  executor: DbExecutor,
  input: { id: string; description: string },
) {
  const [created] = await executor
    .insert(permission)
    .values(input)
    .onConflictDoNothing()
    .returning();

  return created ?? null;
}
export async function createRole(
  executor: DbExecutor,
  input: { id: string; name: string; description: string },
) {
  const [created] = await executor
    .insert(role)
    .values({ ...input, system: false })
    .onConflictDoNothing()
    .returning();

  return created ?? null;
}

export async function findRole(executor: DbExecutor, roleId: string) {
  const [result] = await executor
    .select({
      id: role.id,
      name: role.name,
      description: role.description,
      system: role.system,
    })
    .from(role)
    .where(eq(role.id, roleId))
    .limit(1);

  return result ?? null;
}

export async function addRolePermission(
  executor: DbExecutor,
  roleId: string,
  permissionId: string,
) {
  await executor
    .insert(rolePermission)
    .values({ role: roleId, permissionId });
}

export async function listRoles(executor: DbExecutor) {
  return executor
    .select({
      id: role.id,
      name: role.name,
      description: role.description,
      system: role.system,
      permissionId: rolePermission.permissionId,
    })
    .from(role)
    .leftJoin(rolePermission, eq(rolePermission.role, role.id))
    .orderBy(role.id, rolePermission.permissionId);
}

export async function findPermissions(
  executor: DbExecutor,
  permissionIds: readonly string[],
) {
  if (!permissionIds.length) return [];

  return executor
    .select({ id: permission.id })
    .from(permission)
    .where(inArray(permission.id, permissionIds));
}

export async function listRolePermissionIds(
  executor: DbExecutor,
  roleId: string,
) {
  return executor
    .select({ permissionId: rolePermission.permissionId })
    .from(rolePermission)
    .where(eq(rolePermission.role, roleId));
}

export async function replaceRolePermissions(
  executor: DbExecutor,
  roleId: string,
  permissionIds: readonly string[],
) {
  await executor
    .delete(rolePermission)
    .where(eq(rolePermission.role, roleId));
  if (permissionIds.length) {
    await executor.insert(rolePermission).values(
      permissionIds.map((permissionId) => ({
        role: roleId,
        permissionId,
      })),
    );
  }
}

export async function clearUserOverrides(
  executor: DbExecutor,
  userId: string,
) {
  return executor
    .delete(userPermissionOverride)
    .where(eq(userPermissionOverride.userId, userId))
    .returning({ permissionId: userPermissionOverride.permissionId });
}

export async function listUserOverrides(executor: DbExecutor, userId: string) {
  return executor
    .select()
    .from(userPermissionOverride)
    .where(eq(userPermissionOverride.userId, userId))
    .orderBy(userPermissionOverride.permissionId);
}

export async function findUserRole(executor: DbExecutor, userId: string) {
  const [result] = await executor
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result ?? null;
}

export async function findPermission(executor: DbExecutor, permissionId: string) {
  const [result] = await executor
    .select({ id: permission.id })
    .from(permission)
    .where(eq(permission.id, permissionId))
    .limit(1);

  return result ?? null;
}

export async function upsertUserOverride(
  executor: DbExecutor,
  input: {
    userId: string;
    permissionId: string;
    effect: "allow" | "deny";
    grantedBy: string;
  },
) {
  const [override] = await executor
    .insert(userPermissionOverride)
    .values(input)
    .onConflictDoUpdate({
      target: [userPermissionOverride.userId, userPermissionOverride.permissionId],
      set: {
        effect: input.effect,
        grantedBy: input.grantedBy,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!override) throw new Error("Unable to save permission override");
  return override;
}

export async function deleteUserOverride(
  executor: DbExecutor,
  userId: string,
  permissionId: string,
) {
  return executor
    .delete(userPermissionOverride)
    .where(
      and(
        eq(userPermissionOverride.userId, userId),
        eq(userPermissionOverride.permissionId, permissionId),
      ),
    )
    .returning();
}
