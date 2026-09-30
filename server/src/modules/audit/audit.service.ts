import type { AuditLogQuery, AuditLogResponse } from "shared";

import { db } from "../../db";
import {
  decodeAuditCursor,
  encodeAuditCursor,
} from "./audit.cursor";
import * as repository from "./audit.repository";

export async function listAuditLog(
  input: AuditLogQuery,
): Promise<AuditLogResponse> {
  const cursorPosition = decodeAuditCursor(input.cursor, input);
  const rows = await repository.listAuditLog(db, {
    ...input,
    cursorPosition,
  });
  const hasNextPage = rows.length > input.limit;
  const items = rows.slice(0, input.limit);
  const lastItem = items.at(-1);

  return {
    items: items.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    pagination: {
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? encodeAuditCursor(input, lastItem)
          : null,
    },
  };
}
