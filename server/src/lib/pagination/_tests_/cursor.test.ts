import { describe, expect, test } from "bun:test";

import {
  decodeCursor,
  encodeCursor,
  isCursorRecord,
} from "../cursor";

type TestPosition = { sort: "name"; name: string; id: string };

function isTestPosition(value: unknown): value is TestPosition {
  return (
    isCursorRecord(value) &&
    value.sort === "name" &&
    typeof value.name === "string" &&
    typeof value.id === "string"
  );
}

describe("shared cursor codec", () => {
  test("round trips a validated position", () => {
    const position: TestPosition = {
      sort: "name",
      name: "Ada",
      id: "user-1",
    };
    const cursor = encodeCursor("users:name", position);

    expect(decodeCursor(cursor, "users:name", isTestPosition)).toEqual(
      position,
    );
  });

  test("rejects malformed or mismatched cursors", () => {
    expect(() =>
      decodeCursor("not-a-cursor", "users:name", isTestPosition),
    ).toThrow("pagination cursor is invalid");

    const cursor = encodeCursor("users:name", {
      sort: "name",
      name: "Ada",
      id: "user-1",
    });
    expect(() =>
      decodeCursor(cursor, "users:email", isTestPosition),
    ).toThrow("pagination cursor is invalid");
  });

  test("returns null when no cursor was supplied", () => {
    expect(decodeCursor(undefined, "users:name", isTestPosition)).toBeNull();
  });
});
