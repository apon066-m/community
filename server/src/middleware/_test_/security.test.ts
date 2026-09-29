import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

import { trustedMutationOrigin } from "../security";

const app = new Hono()
  .use("*", trustedMutationOrigin("http://localhost:5173"))
  .put("/profile", (c) => c.json({ success: true }));

describe("trusted mutation origin", () => {
  test("rejects cross-origin cookie mutations", async () => {
    const response = await app.request("/profile", {
      method: "PUT",
      headers: {
        cookie: "session=test",
        origin: "https://attacker.example",
      },
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });

  test("accepts configured-origin JSON mutations", async () => {
    const response = await app.request("/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: "session=test",
        origin: "http://localhost:5173",
      },
    });

    expect(response.status).toBe(StatusCodes.OK);
  });

  test("accepts configured-origin multipart mutations", async () => {
    const form = new FormData();
    form.append("file", new File(["image"], "menu-item.png", { type: "image/png" }));

    const response = await app.request("/profile", {
      method: "PUT",
      headers: {
        cookie: "session=test",
        origin: "http://localhost:5173",
      },
      body: form,
    });

    expect(response.status).toBe(StatusCodes.OK);
  });

  test("rejects cookie mutations without an origin", async () => {
    const response = await app.request("/profile", {
      method: "PUT",
      headers: { cookie: "session=test" },
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
