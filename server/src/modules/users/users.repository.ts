import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  lt,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { DbExecutor } from "../../db";
import { session, user } from "../auth/auth.schema";
import type { UserCursorPosition } from "./users.cursor";
import type { TeamListQuery, UserListQuery } from "shared";

export type UserListRepositoryInput =
  | (UserListQuery & {
      scope: "role";
      cursorPosition: UserCursorPosition | null;
    })
  | (TeamListQuery & {
      scope: "team";
      cursorPosition: UserCursorPosition | null;
    });

export type CustomerSummary = Pick<typeof user.$inferSelect, "id" | "name" | "email">;

export async function findUser(executor: DbExecutor, userId: string) {
  const [result] = await executor
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result ?? null;
}

export async function findUserAccessContext(
  executor: DbExecutor,
  userId: string,
) {
  const [result] = await executor
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result ?? null;
}

export async function findActiveCustomer(
  executor: DbExecutor,
  customerId: string,
): Promise<CustomerSummary | null> {
  const [result] = await executor
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(
      and(
        eq(user.id, customerId),
        eq(user.role, "customer"),
        eq(user.banned, false),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function findAdminMutationUser(
  executor: DbExecutor,
  userId: string,
) {
  return findUserAccessContext(executor, userId);
}

export async function countActiveAdmins(executor: DbExecutor) {
  const [result] = await executor
    .select({ value: count() })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.banned, false)));

  return Number(result?.value ?? 0);
}

function buildCursorCondition(
  input: UserListRepositoryInput,
): SQL | undefined {
  const position = input.cursorPosition;
  if (!position) return undefined;

  switch (position.sort) {
    case "name":
      return input.order === "asc"
        ? or(
            gt(user.name, position.name),
            and(eq(user.name, position.name), gt(user.id, position.id)),
          )
        : or(
            lt(user.name, position.name),
            and(eq(user.name, position.name), lt(user.id, position.id)),
          );
    case "email":
      return input.order === "asc"
        ? or(
            gt(user.email, position.email),
            and(eq(user.email, position.email), gt(user.id, position.id)),
          )
        : or(
            lt(user.email, position.email),
            and(eq(user.email, position.email), lt(user.id, position.id)),
          );
    case "createdAt":
      return input.order === "asc"
        ? or(
            gt(user.createdAt, new Date(position.createdAt)),
            and(
              eq(user.createdAt, new Date(position.createdAt)),
              gt(user.id, position.id),
            ),
          )
        : or(
            lt(user.createdAt, new Date(position.createdAt)),
            and(
              eq(user.createdAt, new Date(position.createdAt)),
              lt(user.id, position.id),
            ),
          );
  }
}

function buildOrderBy(input: UserListRepositoryInput) {
  switch (input.sort) {
    case "name":
      return input.order === "asc"
        ? ([asc(user.name), asc(user.id)] as const)
        : ([desc(user.name), desc(user.id)] as const);
    case "email":
      return input.order === "asc"
        ? ([asc(user.email), asc(user.id)] as const)
        : ([desc(user.email), desc(user.id)] as const);
    case "createdAt":
      return input.order === "asc"
        ? ([asc(user.createdAt), asc(user.id)] as const)
        : ([desc(user.createdAt), desc(user.id)] as const);
  }
}

export async function listUsers(
  executor: DbExecutor,
  input: UserListRepositoryInput,
) {
  const conditions: SQL[] =
    input.scope === "role"
      ? [eq(user.role, input.role)]
      : [ne(user.role, "customer")];

  if (input.scope === "team") {
    if (input.role) conditions.push(eq(user.role, input.role));
    if (input.banned !== undefined) conditions.push(eq(user.banned, input.banned));
  }

  if (input.search) {
    const searchPattern = `%${input.search}%`;
    const searchCondition = or(
      ilike(user.name, searchPattern),
      ilike(user.email, searchPattern),
      ilike(user.phone, searchPattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const cursorCondition = buildCursorCondition(input);
  if (cursorCondition) conditions.push(cursorCondition);

  return executor
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      phone: user.phone,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(and(...conditions))
    .orderBy(...buildOrderBy(input))
    .limit(input.limit + 1);
}

export async function updateRole(
  executor: DbExecutor,
  userId: string,
  role: string,
) {
  await executor
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function updateBan(
  executor: DbExecutor,
  userId: string,
  input: { banned: boolean; banReason: string | null; banExpires: Date | null },
) {
  await executor
    .update(user)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function deleteSessions(executor: DbExecutor, userId: string) {
  await executor.delete(session).where(eq(session.userId, userId));
}
