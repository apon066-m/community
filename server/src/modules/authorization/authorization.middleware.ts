import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";

import type { AppEnv } from "../../app-env";
import { getAuthorization } from "./authorization.repository";

async function loadAuthorization(c: Context<AppEnv>) {
  const existing = c.get("authorization");
  if (existing) return existing;

  const currentUser = c.get("user");
  if (!currentUser) return null;

  const authorization = await getAuthorization(currentUser.id);
  c.set("authorization", authorization);
  return authorization;
}

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = await loadAuthorization(c);

  if (!authorization || authorization.role !== "admin") {
    return c.json({ error: "Forbidden" }, StatusCodes.FORBIDDEN);
  }

  await next();
});

export function requirePermission(permissionId: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authorization = await loadAuthorization(c);

    if (!authorization?.permissions.has(permissionId)) {
      return c.json({ error: "Forbidden" }, StatusCodes.FORBIDDEN);
    }

    await next();
  });
}

export function requireAnyPermission(permissionIds: readonly string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authorization = await loadAuthorization(c);

    if (
      !authorization ||
      !permissionIds.some((permission) =>
        authorization.permissions.has(permission),
      )
    ) {
      return c.json({ error: "Forbidden" }, StatusCodes.FORBIDDEN);
    }

    await next();
  });
}
