import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";

type CursorPayload<Position> = {
  version: 1;
  queryKey: string;
  position: Position;
};

export function isCursorRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function throwInvalidCursor(): never {
  throw new AppError({
    statusCode: StatusCodes.BAD_REQUEST,
    code: "INVALID_CURSOR",
    message: "The pagination cursor is invalid or expired",
  });
}

export function encodeCursor<Position>(queryKey: string, position: Position) {
  const payload: CursorPayload<Position> = {
    version: 1,
    queryKey,
    position,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor<Position>(
  value: string | undefined,
  queryKey: string,
  isPosition: (value: unknown) => value is Position,
) {
  if (!value) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return throwInvalidCursor();
  }

  if (
    !isCursorRecord(payload) ||
    payload.version !== 1 ||
    payload.queryKey !== queryKey ||
    !isPosition(payload.position)
  ) {
    return throwInvalidCursor();
  }

  return payload.position;
}
