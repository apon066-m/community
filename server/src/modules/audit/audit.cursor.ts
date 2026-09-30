import type { AuditLogQuery } from "shared";

import {
  decodeCursor,
  encodeCursor,
  isCursorRecord,
} from "../../lib/pagination/cursor";

type AuditCursorRow = {
  id: string;
  createdAt: Date;
};

export type AuditCursorPosition = {
  createdAt: string;
  id: string;
};

function isAuditCursorPosition(value: unknown): value is AuditCursorPosition {
  if (!isCursorRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(new Date(value.createdAt).getTime())
  );
}

export function auditQueryKey(input: AuditLogQuery) {
  return JSON.stringify({
    actorUserId: input.actorUserId ?? null,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    action: input.action ?? null,
    search: input.search ?? null,
    from: input.from ?? null,
    to: input.to ?? null,
  });
}

export function encodeAuditCursor(input: AuditLogQuery, row: AuditCursorRow) {
  return encodeCursor(auditQueryKey(input), {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  });
}

export function decodeAuditCursor(
  value: string | undefined,
  input: AuditLogQuery,
) {
  return decodeCursor(
    value,
    auditQueryKey(input),
    (position): position is AuditCursorPosition =>
      isAuditCursorPosition(position),
  );
}
