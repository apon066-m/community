import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import { changeRoleSchema, roleParamsSchema } from "shared";

import type { AppEnv } from "../../app-env";
import { AppError } from "../../errors/app-error";
import { validateJson, validateParams } from "../validation";
import {
  createErrorHandler,
  createNotFoundHandler,
} from "../error-handler";

function createTestApp(production: boolean) {
  const app = new Hono<AppEnv>()
    .get("/app-error", () => {
      throw new AppError({
        statusCode: StatusCodes.CONFLICT,
        code: "USER_EXISTS",
        message: "User already exists",
      });
    })
    .get("/http-error", () => {
      throw new HTTPException(StatusCodes.UNAUTHORIZED, {
        message: "Unauthorized",
      });
    })
    .get("/unexpected-error", () => {
      throw new Error("database password should not be exposed");
    })
    .get("/duplicate-error", () => {
      throw Object.assign(new Error("duplicate key value"), {
        code: "23505",
      });
    })
    .post(
      "/validated",
      validateJson(changeRoleSchema),
      (c) => c.json({ ok: true }),
    )
    .get(
      "/validated/:role",
      validateParams(roleParamsSchema),
      (c) => c.json({ ok: true }),
    );

  app.onError(createErrorHandler(production));
  app.notFound(createNotFoundHandler(production));
  return app;
}

const developmentApp = createTestApp(false);
const productionApp = createTestApp(true);

describe("global error handling", () => {
  test("serializes application errors with their status and code", async () => {
    const response = await productionApp.request("/app-error");

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(await response.json()).toEqual({
      error: "User already exists",
      code: "USER_EXISTS",
    });
  });

  test("serializes Zod validation errors with field messages", async () => {
    const response = await productionApp.request("/validated", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(await response.json()).toEqual({
      error: "Please fix the highlighted fields.",
      code: "VALIDATION_ERROR",
      fields: { role: "Role is required" },
    });
  });

  test("preserves Hono HTTPException responses", async () => {
    const response = await productionApp.request("/http-error");

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(await response.text()).toBe("Unauthorized");
  });

  test("serializes path validation errors with field messages", async () => {
    const response = await productionApp.request("/validated/NoRole");

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(await response.json()).toEqual({
      error: "Please fix the highlighted fields.",
      code: "VALIDATION_ERROR",
      fields: { role: "Invalid role ID" },
    });
  });

  test("maps duplicate database errors to a safe conflict response", async () => {
    const response = await productionApp.request("/duplicate-error");

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(await response.json()).toEqual({
      error: "A resource with the same value already exists",
      code: "RESOURCE_CONFLICT",
    });
  });

  test("hides unexpected error details", async () => {
    const originalConsoleError = console.error;
    console.error = () => undefined;

    let response: Response;
    try {
      response = await productionApp.request("/unexpected-error");
    } finally {
      console.error = originalConsoleError;
    }

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });

  test("includes debugging details in development", async () => {
    const originalConsoleError = console.error;
    console.error = () => undefined;

    let response: Response;
    try {
      response = await developmentApp.request("/unexpected-error");
    } finally {
      console.error = originalConsoleError;
    }

    const body = (await response.json()) as {
      error: string;
      debug: { name: string; message: string; method: string; path: string };
    };
    expect(body.error).toBe("Internal server error");
    expect(body.debug).toMatchObject({
      name: "Error",
      message: "database password should not be exposed",
      method: "GET",
      path: "/unexpected-error",
    });
  });

  test("returns JSON for unmatched routes", async () => {
    const response = await productionApp.request("/missing");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  test("includes request details for unmatched development routes", async () => {
    const response = await developmentApp.request("/missing");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(await response.json()).toEqual({
      error: "Not found",
      debug: { method: "GET", path: "/missing" },
    });
  });
});
