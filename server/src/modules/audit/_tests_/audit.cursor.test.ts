import { describe, expect, test } from "bun:test";
import { auditLogQuerySchema } from "shared";

import {
  decodeAuditCursor,
  encodeAuditCursor,
} from "../audit.cursor";

function createQuery(overrides: Record<string, unknown> = {}) {
  return auditLogQuerySchema.parse(overrides);
}

describe("audit cursors", () => {
  test("round trips the newest-first position for the active filters", () => {
    const query = createQuery({
      actorUserId: "actor-1",
      targetType: "order",
      action: "status-change",
      search: "ready",
      from: "2026-01-01",
      to: "2026-02-01",
    });
    const cursor = encodeAuditCursor(query, {
      id: "audit-1",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
    });

    expect(decodeAuditCursor(cursor, query)).toEqual({
      id: "audit-1",
      createdAt: "2026-01-15T12:00:00.000Z",
    });
  });

  test("rejects a cursor when a filter changes", () => {
    const query = createQuery({ targetType: "user" });
    const cursor = encodeAuditCursor(query, {
      id: "audit-1",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
    });

    expect(() =>
      decodeAuditCursor(cursor, createQuery({ targetType: "order" })),
    ).toThrow("pagination cursor is invalid");
  });

  test("rejects malformed cursors", () => {
    expect(() => decodeAuditCursor("not-a-cursor", createQuery())).toThrow(
      "pagination cursor is invalid",
    );
  });
});
