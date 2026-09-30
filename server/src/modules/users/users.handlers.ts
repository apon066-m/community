import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type {
  ChangeBanInput,
  ChangeRoleInput,
  TeamListQuery,
  UserIdParams,
  UserListQuery,
} from "shared";

import type { AppEnv } from "../../app-env";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
} from "../../middleware/validation";
import {
  throwBanChangeError,
  throwRoleChangeError,
  throwUserListError,
} from "./users.errors";
import * as userService from "./users.service";

export async function listUsersHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<UserListQuery>(c);
  const result = await userService.listUsers({
    actorUserId: c.get("user")!.id,
    query,
  });

  if (result.status !== "listed") throwUserListError(result);

  return c.json(
    {
      items: result.items,
      pagination: result.pagination,
    },
    StatusCodes.OK,
  );
}

export async function listTeamUsersHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<TeamListQuery>(c);
  const result = await userService.listTeamUsers({
    actorUserId: c.get("user")!.id,
    query,
  });

  if (result.status !== "listed") throwUserListError(result);

  return c.json(
    {
      items: result.items,
      pagination: result.pagination,
    },
    StatusCodes.OK,
  );
}

export async function getCurrentUserHandler(c: Context<AppEnv>) {
  const result = await userService.getCurrentUser(c.get("user")!.id);
  if (!result) return c.json({ error: "User not found" }, StatusCodes.NOT_FOUND);
  return c.json({ user: result }, StatusCodes.OK);
}

export async function changeRoleHandler(c: Context<AppEnv>) {
  const { userId } = getValidatedParams<UserIdParams>(c);
  const { role: nextRole } = getValidatedBody<ChangeRoleInput>(c);

  const result = await userService.changeRole({
    actorUserId: c.get("user")!.id,
    userId,
    nextRole,
  });

  if (result.status !== "updated") throwRoleChangeError(result);

  return c.json({ userId, role: nextRole }, StatusCodes.OK);
}

export async function changeBanHandler(c: Context<AppEnv>) {
  const { userId } = getValidatedParams<UserIdParams>(c);
  const body = getValidatedBody<ChangeBanInput>(c);

  const banReason = body.reason?.trim() || null;
  const banExpires = body.expiresAt ? new Date(body.expiresAt) : null;

  const result = await userService.changeBan({
    actorUserId: c.get("user")!.id,
    userId,
    banned: body.banned,
    banReason,
    banExpires,
  });

  if (result.status !== "updated") throwBanChangeError(result);

  return c.json({ userId, banned: body.banned }, StatusCodes.OK);
}
