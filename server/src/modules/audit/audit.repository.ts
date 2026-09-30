import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import type { AuditLogQuery } from "shared";

import type { DbExecutor } from "../../db";
import { user } from "../auth/auth.schema";
import type { AuditCursorPosition } from "./audit.cursor";
import type { AuditRecordInput } from "./audit.events";
import { auditLog } from "./audit.schema";

export type AuditListRepositoryInput = AuditLogQuery & {
  cursorPosition: AuditCursorPosition | null;
};

function dateAtUtcStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function buildCursorCondition(
  input: AuditListRepositoryInput,
): SQL | undefined {
  if (!input.cursorPosition) return undefined;

  const positionDate = new Date(input.cursorPosition.createdAt);
  return or(
    lt(auditLog.createdAt, positionDate),
    and(
      eq(auditLog.createdAt, positionDate),
      lt(auditLog.id, input.cursorPosition.id),
    ),
  );
}

function buildListConditions(input: AuditListRepositoryInput) {
  const conditions: SQL[] = [];

  if (input.actorUserId) {
    conditions.push(eq(auditLog.actorUserId, input.actorUserId));
  }
  if (input.targetType) {
    conditions.push(eq(auditLog.targetType, input.targetType));
  }
  if (input.targetId) {
    conditions.push(eq(auditLog.targetId, input.targetId));
  }
  if (input.action) {
    conditions.push(eq(auditLog.action, input.action));
  }
  if (input.from) {
    conditions.push(gte(auditLog.createdAt, dateAtUtcStart(input.from)));
  }
  if (input.to) {
    conditions.push(lt(auditLog.createdAt, dateAtUtcStart(input.to)));
  }
  if (input.search) {
    const pattern = `%${input.search}%`;
    conditions.push(
      or(
        ilike(user.name, pattern),
        ilike(user.email, pattern),
        ilike(auditLog.targetType, pattern),
        ilike(auditLog.targetId, pattern),
        ilike(auditLog.action, pattern),
      )!,
    );
  }

  const cursorCondition = buildCursorCondition(input);
  if (cursorCondition) conditions.push(cursorCondition);

  return conditions;
}

export async function listAuditLog(
  executor: DbExecutor,
  input: AuditListRepositoryInput,
) {
  return executor
    .select({
      id: auditLog.id,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      action: auditLog.action,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.actorUserId, user.id))
    .where(and(...buildListConditions(input)))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(input.limit + 1);
}

export async function recordAudit(
  executor: DbExecutor,
  input: AuditRecordInput,
) {
  await executor.insert(auditLog).values({
    id: crypto.randomUUID(),
    ...input,
  });
}
