import { describe, expect, test } from "bun:test";
import { StatusCodes } from "http-status-codes";

describe("versioned application routes", () => {
  test("validates catalog queries under the v1 prefix", async () => {
    const { app } = await import("../../app");
    const response = await app.request("/api/v1/catalog-items?limit=0");

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { limit: expect.any(String) },
    });
  });

  test("keeps the legacy application prefix available during migration", async () => {
    const { app } = await import("../../app");
    const response = await app.request("/api/catalog-items?limit=0");

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  test("does not expose the retired coffee-specific route", async () => {
    const { app } = await import("../../app");
    const response = await app.request("/api/v1/coffees");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  test("does not move system routes into the versioned API", async () => {
    const { app } = await import("../../app");
    const response = await app.request("/api/v1/health");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });
});
