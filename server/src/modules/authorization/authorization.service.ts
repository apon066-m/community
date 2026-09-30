import { db, type DbExecutor } from "../../db";
import {
  type CreateRoleInput,
  type PermissionEffect,
  type RoleDefinition,
  type UserRole,
} from "shared";

import { canDelegatePermission } from "./authorization-policy";
import { isPrivilegedPermission } from "./permissions";
import * as auditRepository from "../audit/audit.repository";
import { auditEvents } from "../audit/audit.events";
import * as repository from "./authorization.repository";

async function isActiveAdmin(executor: DbExecutor, userId: string) {
  const actor = await repository.findAdmin(executor, userId);
  return Boolean(actor && actor.role === "admin" && !actor.banned);
}

export async function listPermissions() {
  return repository.listPermissions(db);
}

export type CreatePermissionResult =
  | { status: "forbidden" }
  | { status: "exists" }
  | {
      status: "created";
      permission: NonNullable<
        Awaited<ReturnType<typeof repository.createPermission>>
      >;
    };

export async function createPermission(input: {
  actorUserId: string;
  id: string;
  description: string;
}): Promise<CreatePermissionResult> {
  return db.transaction(async (tx) => {
    await repository.lockAdminMutations(tx);
    if (!(await isActiveAdmin(tx, input.actorUserId))) {
      return { status: "forbidden" };
    }

    const created = await repository.createPermission(tx, {
      id: input.id,
      description: input.description,
    });
    if (!created) return { status: "exists" };

    await repository.addRolePermission(tx, "admin", input.id);
    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.permissionCreated,
      targetId: input.id,
      details: { description: input.description },
    });

    return { status: "created", permission: created };
  });
}

export async function listRoles(): Promise<RoleDefinition[]> {
  const rows = await repository.listRoles(db);
  const definitions = new Map<string, RoleDefinition>();

  for (const row of rows) {
    const existing = definitions.get(row.id);
    if (existing) {
      if (row.permissionId) existing.permissions.push(row.permissionId);
      continue;
    }

    definitions.set(row.id, {
      id: row.id,
      name: row.name,
      description: row.description,
      system: row.system,
      permissions: row.permissionId ? [row.permissionId] : [],
    });
  }

  return [...definitions.values()];
}

export type CreateRoleResult =
  | { status: "forbidden" }
  | { status: "exists" }
  | {
      status: "created";
      role: NonNullable<Awaited<ReturnType<typeof repository.createRole>>>;
    };

export async function createRole(
  input: CreateRoleInput & { actorUserId: string },
): Promise<CreateRoleResult> {
  return db.transaction(async (tx) => {
    await repository.lockAdminMutations(tx);
    if (!(await isActiveAdmin(tx, input.actorUserId))) {
      return { status: "forbidden" };
    }

    const created = await repository.createRole(tx, {
      id: input.id,
      name: input.name,
      description: input.description,
    });
    if (!created) return { status: "exists" };

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.roleCreated,
      targetId: input.id,
      details: {
        name: input.name,
        description: input.description,
      },
    });

    return { status: "created", role: created };
  });
}

export type ReplaceRolePermissionsResult =
  | { status: "forbidden" }
  | { status: "invalid-role" }
  | { status: "role-not-found" }
  | { status: "privileged-permission" }
  | { status: "unknown-permission" }
  | { status: "updated"; role: UserRole; permissions: string[] };

export async function replaceRolePermissions(input: {
  actorUserId: string;
  role: UserRole;
  permissions: string[];
}): Promise<ReplaceRolePermissionsResult> {
  if (input.role === "admin") return { status: "invalid-role" };

  return db.transaction(async (tx) => {
    await repository.lockAdminMutations(tx);
    if (!(await isActiveAdmin(tx, input.actorUserId))) {
      return { status: "forbidden" };
    }

    if (!(await repository.findRole(tx, input.role))) {
      return { status: "role-not-found" };
    }
    if (input.permissions.some(isPrivilegedPermission)) {
      return { status: "privileged-permission" };
    }

    const existingPermissions = await repository.findPermissions(
      tx,
      input.permissions,
    );
    if (existingPermissions.length !== input.permissions.length) {
      return { status: "unknown-permission" };
    }

    const previous = await repository.listRolePermissionIds(tx, input.role);
    await repository.replaceRolePermissions(tx, input.role, input.permissions);
    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.rolePermissionsReplaced,
      targetId: input.role,
      details: {
        previous: previous.map(({ permissionId }) => permissionId),
        next: input.permissions,
      },
    });

    return {
      status: "updated",
      role: input.role,
      permissions: input.permissions,
    };
  });
}

export type ListUserOverridesResult =
  | { status: "not-found" }
  | {
      status: "listed";
      overrides: Awaited<ReturnType<typeof repository.listUserOverrides>>;
    };

export async function listUserOverrides(
  userId: string,
): Promise<ListUserOverridesResult> {
  const targetUser = await repository.findUserRole(db, userId);
  if (!targetUser) return { status: "not-found" };

  return {
    status: "listed",
    overrides: await repository.listUserOverrides(db, userId),
  };
}

export type SetUserOverrideResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "not-delegable" }
  | { status: "updated"; override: NonNullable<Awaited<ReturnType<typeof repository.upsertUserOverride>>> };

export async function setUserOverride(input: {
  actorUserId: string;
  userId: string;
  permissionId: string;
  effect: PermissionEffect;
}): Promise<SetUserOverrideResult> {
  return db.transaction(async (tx) => {
    await repository.lockAdminMutations(tx);
    if (!(await isActiveAdmin(tx, input.actorUserId))) {
      return { status: "forbidden" };
    }

    const [targetUser, existingPermission] = await Promise.all([
      repository.findUserRole(tx, input.userId),
      repository.findPermission(tx, input.permissionId),
    ]);

    if (!targetUser || !existingPermission) return { status: "not-found" };
    if (
      !canDelegatePermission({
        actorRole: "admin",
        targetRole: targetUser.role,
        permissionId: input.permissionId,
      })
    ) {
      return { status: "not-delegable" };
    }

    const override = await repository.upsertUserOverride(tx, {
      userId: input.userId,
      permissionId: input.permissionId,
      effect: input.effect,
      grantedBy: input.actorUserId,
    });

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.userPermissionOverrideSet,
      targetId: input.userId,
      details: { permissionId: input.permissionId, effect: input.effect },
    });

    return { status: "updated", override };
  });
}

export type DeleteUserOverrideResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "deleted" };

export async function deleteUserOverride(input: {
  actorUserId: string;
  userId: string;
  permissionId: string;
}): Promise<DeleteUserOverrideResult> {
  return db.transaction(async (tx) => {
    await repository.lockAdminMutations(tx);
    if (!(await isActiveAdmin(tx, input.actorUserId))) {
      return { status: "forbidden" };
    }

    const deleted = await repository.deleteUserOverride(
      tx,
      input.userId,
      input.permissionId,
    );
    if (!deleted.length) return { status: "not-found" };

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.userPermissionOverrideRemoved,
      targetId: input.userId,
      details: { permissionId: input.permissionId },
    });

    return { status: "deleted" };
  });
}
