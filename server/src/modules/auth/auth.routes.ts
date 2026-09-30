import { Hono } from "hono";
import { signUpEmailSchema } from "shared";

import { ValidationError } from "../../errors/validation-error";
import { auth } from "./auth";

export const authRoutes = new Hono().on(["GET", "POST"], "/*", async (c) => {
  if (
    c.req.method === "POST" &&
    new URL(c.req.url).pathname === "/api/auth/sign-up/email"
  ) {
    const body = await c.req.raw
      .clone()
      .json()
      .catch(() => null);
    const parsed = signUpEmailSchema.safeParse(body);

    if (!parsed.success) {
      throw ValidationError.fromIssues(parsed.error.issues);
    }
  }

  return auth.handler(c.req.raw);
});
