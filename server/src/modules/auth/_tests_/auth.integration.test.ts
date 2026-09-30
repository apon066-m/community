import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { user } from "../auth.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdEmails: string[] = [];

afterEach(async () => {
  if (!createdEmails.length || process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  for (const email of createdEmails.splice(0)) {
    await db.delete(user).where(eq(user.email, email));
  }
});

describe("signup validation", () => {
  test("returns friendly validation fields", async () => {
    const { app } = await import("../../../app");

    const response = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: process.env.CLIENT_ORIGIN!,
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(await response.json()).toEqual({
      error: "Please fix the highlighted fields.",
      code: "VALIDATION_ERROR",
      fields: {
        name: "Name is required",
        email: "Email is required",
        password: "Password is required",
      },
    });
  });
});

describeDatabase("authentication HTTP flow", () => {
  test("rejects requests without a session", async () => {
    const { app } = await import("../../../app");
    const response = await app.request("/api/v1/users/me");

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  test("signs up a customer with the default role", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const email = `${crypto.randomUUID()}@example.test`;
    createdEmails.push(email);

    const signupResponse = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: process.env.CLIENT_ORIGIN!,
      },
      body: JSON.stringify({
        name: "Test Customer",
        email,
        password: "correct-horse-battery-staple",
        phone: "+15551234567",
      }),
    });

    expect(signupResponse.status).toBe(StatusCodes.OK);
    const cookie = signupResponse.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toBeTruthy();

    const [createdUser] = await db
      .select({ role: user.role, phone: user.phone })
      .from(user)
      .where(eq(user.email, email));
    expect(createdUser?.role).toBe("customer");
    expect(createdUser?.phone).toBe("+15551234567");
    expect(cookie).toBeTruthy();
  });

  test("does not accept an administrative role during public signup", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const email = `${crypto.randomUUID()}@example.test`;
    createdEmails.push(email);

    await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: process.env.CLIENT_ORIGIN!,
      },
      body: JSON.stringify({
        name: "Role Injection",
        email,
        password: "correct-horse-battery-staple",
        role: "admin",
      }),
    });

    const [createdUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, email));

    expect(createdUser?.role).not.toBe("admin");
  });
});
