import { StatusCodes } from "http-status-codes";

import { AppError } from "./app-error";

type DatabaseErrorLike = {
  code?: unknown;
  cause?: unknown;
};

function getSqlState(error: unknown): string | null {
  let current: unknown = error;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") return null;

    const code = (current as DatabaseErrorLike).code;
    if (typeof code === "string") return code;

    current = (current as DatabaseErrorLike).cause;
  }

  return null;
}

export function isDatabaseUniqueViolation(error: unknown) {
  return getSqlState(error) === "23505";
}

export function toDatabaseAppError(error: unknown): AppError | null {
  switch (getSqlState(error)) {
    case "23505":
      return new AppError({
        statusCode: StatusCodes.CONFLICT,
        code: "RESOURCE_CONFLICT",
        message: "A resource with the same value already exists",
        cause: error,
      });
    case "23503":
      return new AppError({
        statusCode: StatusCodes.CONFLICT,
        code: "RESOURCE_RELATION_CONFLICT",
        message: "The resource cannot be changed because it is still in use",
        cause: error,
      });
    case "22P02":
      return new AppError({
        statusCode: StatusCodes.BAD_REQUEST,
        code: "INVALID_DATA",
        message: "The request contains invalid data",
        cause: error,
      });
    case "23514":
      return new AppError({
        statusCode: StatusCodes.BAD_REQUEST,
        code: "INVALID_DATA",
        message: "The request violates a data constraint",
        cause: error,
      });
    case "40001":
    case "40P01":
      return new AppError({
        statusCode: StatusCodes.SERVICE_UNAVAILABLE,
        code: "DATABASE_RETRY",
        message: "The database is temporarily unavailable",
        cause: error,
      });
    default:
      return null;
  }
}
