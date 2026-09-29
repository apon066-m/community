import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";

import type { AppEnv } from "../app-env";
import { isProduction } from "../config/runtime";
import { AppError } from "../errors/app-error";
import { toDatabaseAppError } from "../errors/database-error";
import { ValidationError } from "../errors/validation-error";

function getDebugDetails(error: Error, c: Parameters<ErrorHandler<AppEnv>>[1]) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    method: c.req.method,
    path: c.req.path,
  };
}

export function createErrorHandler(
  production: boolean,
): ErrorHandler<AppEnv> {
  return (error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    if (error instanceof ValidationError) {
      return c.json(
        {
          error: error.message,
          code: error.code,
          fields: error.fields,
        },
        error.statusCode,
      );
    }

    const applicationError =
      error instanceof AppError ? error : toDatabaseAppError(error);

    if (applicationError) {
      return c.json(
        { error: applicationError.message, code: applicationError.code },
        applicationError.statusCode,
      );
    }

    console.error("Unhandled server error", {
      method: c.req.method,
      path: c.req.path,
      error,
    });

    return c.json(
      {
        error: "Internal server error",
        ...(production ? {} : { debug: getDebugDetails(error, c) }),
      },
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  };
}

export function createNotFoundHandler(production: boolean): NotFoundHandler<AppEnv> {
  return (c) =>
    c.json(
      {
        error: "Not found",
        ...(production
          ? {}
          : {
              debug: {
                method: c.req.method,
                path: c.req.path,
              },
            }),
      },
      StatusCodes.NOT_FOUND,
    );
}

export const handleError = createErrorHandler(isProduction);
export const handleNotFound = createNotFoundHandler(isProduction);
