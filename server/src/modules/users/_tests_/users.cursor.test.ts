import { describe, expect, test } from "bun:test";
import {
  teamListQuerySchema,
  userListQuerySchema,
  type UserListQuery,
} from "shared";

import {
  decodeUserCursor,
  encodeUserCursor,
} from "../users.cursor";

function createQuery(overrides: Partial<UserListQuery> = {}): UserListQuery {
  return userListQuerySchema.parse({
    role: "customer",
    ...overrides,
  });
}

describe("user cursors", () => {
  test("round trips a cursor for the active role and query", () => {
    const query = createQuery({ search: "alice", sort: "name", order: "asc" });
    const cursor = encodeUserCursor(query, {
      id: "user-2",
      name: "Alice Example",
      email: "alice@example.test",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(decodeUserCursor(cursor, query)).toEqual({
      sort: "name",
      name: "Alice Example",
      id: "user-2",
    });
  });

  test("rejects a cursor when the role or filters change", () => {
    const query = createQuery({ sort: "email" });
    const cursor = encodeUserCursor(query, {
      id: "user-2",
      name: "Alice Example",
      email: "alice@example.test",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(() =>
      decodeUserCursor(cursor, createQuery({ role: "staff" })),
    ).toThrow("pagination cursor is invalid");
    expect(() =>
      decodeUserCursor(cursor, createQuery({ search: "bob", sort: "email" })),
    ).toThrow("pagination cursor is invalid");
  });

  test("rejects malformed cursors", () => {
    expect(() => decodeUserCursor("not-a-cursor", createQuery())).toThrow(
      "pagination cursor is invalid",
    );
  });

  test("round trips a cursor for the admin team scope", () => {
    const query = teamListQuerySchema.parse({ sort: "createdAt" });
    const cursor = encodeUserCursor(
      query,
      {
        id: "user-2",
        name: "Alice Example",
        email: "alice@example.test",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      "team",
    );

    expect(decodeUserCursor(cursor, query, "team")).toEqual({
      sort: "createdAt",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "user-2",
    });
  });
});
