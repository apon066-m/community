import { db, type DbExecutor } from "../../db";
import type {
  TeamListQuery,
  UserListItem,
  UserListQuery,
  UserRole,
} from "shared";

import * as authorizationRepository from "../authorization/authorization.repository";
import { canTransitionRole } from "../authorization/authorization-policy";
import { auditEvents } from "../audit/audit.events";
import * as auditRepository from "../audit/audit.repository";
import { decodeUserCursor, encodeUserCursor } from "./users.cursor";
import * as userRepository from "./users.repository";

async function loadAdminMutationContext(
  executor: DbExecutor,
  actorUserId: string,
  userId: string,
) {
  const [actorUser, targetUser, adminCount] = await Promise.all([
    userRepository.findAdminMutationUser(executor, actorUserId),
    userRepository.findAdminMutationUser(executor, userId),
    userRepository.countActiveAdmins(executor),
  ]);

  return { actorUser, targetUser, adminCount };
}

export async function getCurrentUser(userId: string) {
  return userRepository.findUser(db, userId);
}

function canListUsers(actor: { role: UserRole; banned: boolean }, requestedRole: UserListQuery["role"]) {
  if (actor.banned) return false;
  if (actor.role === "admin") return true;
  return actor.role === "staff" && requestedRole === "customer";
}

export type ListUsersResult =
  | { status: "forbidden" }
  | {
      status: "listed";
      items: UserListItem[];
      pagination: {
        hasNextPage: boolean;
        nextCursor: string | null;
      };
    };

type ListDirectoryInput =
  | { actorUserId: string; query: UserListQuery; scope: "role" }
  | { actorUserId: string; query: TeamListQuery; scope: "team" };

async function listDirectory(input: ListDirectoryInput): Promise<ListUsersResult> {
  const actor = await userRepository.findUserAccessContext(db, input.actorUserId);
  const canList =
    input.scope === "team"
      ? actor?.role === "admin" && !actor.banned
      : actor
        ? canListUsers(actor, input.query.role)
        : false;

  if (!actor || !canList) {
    return { status: "forbidden" };
  }

  const cursorPosition = decodeUserCursor(
    input.query.cursor,
    input.query,
    input.scope,
  );
  const rows =
    input.scope === "team"
      ? await userRepository.listUsers(db, {
          ...input.query,
          scope: "team",
          cursorPosition,
        })
      : await userRepository.listUsers(db, {
          ...input.query,
          scope: "role",
          cursorPosition,
        });
  const hasNextPage = rows.length > input.query.limit;
  const items = rows.slice(0, input.query.limit);
  const lastItem = items.at(-1);

  return {
    status: "listed",
    items: items.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      image: row.image,
      phone: row.phone,
      role: row.role,
      banned: row.banned,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: {
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? encodeUserCursor(input.query, lastItem, input.scope)
          : null,
    },
  };
}

export function listUsers(input: {
  actorUserId: string;
  query: UserListQuery;
}): Promise<ListUsersResult> {
  return listDirectory({ ...input, scope: "role" });
}

export function listTeamUsers(input: {
  actorUserId: string;
  query: TeamListQuery;
}): Promise<ListUsersResult> {
  return listDirectory({ ...input, scope: "team" });
}

export type RoleChangeResult =
  | { status: "actor-forbidden" }
  | { status: "not-found" }
  | { status: "role-not-found" }
  | { status: "final-admin" }
  | { status: "updated" };

export async function changeRole(input: {
  actorUserId: string;
  userId: string;
  nextRole: UserRole;
}): Promise<RoleChangeResult> {
  return db.transaction(async (tx) => {
    await authorizationRepository.lockAdminMutations(tx);

    const { actorUser, targetUser, adminCount } =
      await loadAdminMutationContext(tx, input.actorUserId, input.userId);

    if (!actorUser || actorUser.role !== "admin" || actorUser.banned) {
      return { status: "actor-forbidden" };
    }
    if (!targetUser) return { status: "not-found" };
    if (!(await authorizationRepository.findRole(tx, input.nextRole))) {
      return { status: "role-not-found" };
    }

    if (
      !canTransitionRole({
        actorRole: "admin",
        currentRole: targetUser.role,
        nextRole: input.nextRole,
        activeAdminCount: targetUser.banned ? adminCount + 1 : adminCount,
      })
    ) {
      return { status: "final-admin" };
    }

    const clearedOverrides =
      input.nextRole === "admin"
        ? await authorizationRepository.clearUserOverrides(tx, input.userId)
        : [];

    await userRepository.updateRole(tx, input.userId, input.nextRole);
    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...auditEvents.userRoleChanged,
      targetId: input.userId,
      details: {
        previous: targetUser.role,
        next: input.nextRole,
        clearedOverrides: clearedOverrides.map(
          ({ permissionId }) => permissionId,
        ),
      },
    });

    return { status: "updated" };
  });
}

export type BanChangeResult =
  | { status: "actor-forbidden" }
  | { status: "not-found" }
  | { status: "final-admin" }
  | { status: "updated" };

export async function changeBan(input: {
  actorUserId: string;
  userId: string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
}): Promise<BanChangeResult> {
  return db.transaction(async (tx) => {
    await authorizationRepository.lockAdminMutations(tx);

    const { actorUser, targetUser, adminCount } =
      await loadAdminMutationContext(tx, input.actorUserId, input.userId);

    if (!actorUser || actorUser.role !== "admin" || actorUser.banned) {
      return { status: "actor-forbidden" };
    }
    if (!targetUser) return { status: "not-found" };
    if (
      input.banned &&
      !targetUser.banned &&
      targetUser.role === "admin" &&
      adminCount <= 1
    ) {
      return { status: "final-admin" };
    }

    await userRepository.updateBan(tx, input.userId, {
      banned: input.banned,
      banReason: input.banned ? input.banReason : null,
      banExpires: input.banned ? input.banExpires : null,
    });

    if (input.banned) {
      await userRepository.deleteSessions(tx, input.userId);
    }

    await auditRepository.recordAudit(tx, {
      actorUserId: input.actorUserId,
      ...(input.banned
        ? auditEvents.userBanned
        : auditEvents.userUnbanned),
      targetId: input.userId,
      details: {
        reason: input.banReason,
        expiresAt: input.banExpires?.toISOString(),
      },
    });

    return { status: "updated" };
  });
}
