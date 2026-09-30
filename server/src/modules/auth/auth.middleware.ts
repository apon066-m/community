import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";

import type { AppEnv } from "../../app-env";
import { auth } from "./auth";

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  c.set("authorization", null);

  await next();
});

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user") || !c.get("session")) {
    return c.json({ error: "Unauthorized" }, StatusCodes.UNAUTHORIZED);
  }

  await next();
});
