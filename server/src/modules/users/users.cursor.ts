import type { TeamListQuery, UserListQuery } from "shared";

import {
  decodeCursor,
  encodeCursor,
  isCursorRecord,
} from "../../lib/pagination/cursor";

type UserCursorRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export type UserDirectoryQuery = UserListQuery | TeamListQuery;

export type UserCursorPosition =
  | { sort: "name"; name: string; id: string }
  | { sort: "email"; email: string; id: string }
  | { sort: "createdAt"; createdAt: string; id: string };

function isCursorPosition(value: unknown): value is UserCursorPosition {
  if (!isCursorRecord(value) || typeof value.sort !== "string") return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;

  switch (value.sort) {
    case "name":
      return typeof value.name === "string";
    case "email":
      return typeof value.email === "string";
    case "createdAt":
      return (
        typeof value.createdAt === "string" &&
        !Number.isNaN(new Date(value.createdAt).getTime())
      );
    default:
      return false;
  }
}

export function userQueryKey(
  input: UserDirectoryQuery,
  scope: "role" | "team" = "role",
) {
  return JSON.stringify({
    scope,
    role: scope === "role" ? input.role : "role" in input ? input.role : null,
    banned:
      scope === "team" && "banned" in input ? input.banned ?? null : null,
    search: input.search ?? null,
    sort: input.sort,
    order: input.order,
  });
}

export function encodeUserCursor(
  input: UserDirectoryQuery,
  row: UserCursorRow,
  scope: "role" | "team" = "role",
) {
  let position: UserCursorPosition;

  switch (input.sort) {
    case "name":
      position = { sort: "name", name: row.name, id: row.id };
      break;
    case "email":
      position = { sort: "email", email: row.email, id: row.id };
      break;
    case "createdAt":
      position = {
        sort: "createdAt",
        createdAt: row.createdAt.toISOString(),
        id: row.id,
      };
      break;
  }

  return encodeCursor(userQueryKey(input, scope), position);
}

export function decodeUserCursor(
  value: string | undefined,
  input: UserDirectoryQuery,
  scope: "role" | "team" = "role",
) {
  return decodeCursor(
    value,
    userQueryKey(input, scope),
    (position): position is UserCursorPosition =>
      isCursorPosition(position) && position.sort === input.sort,
  );
}
