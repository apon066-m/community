import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type {
  CreatePermissionInput,
  CreateRoleInput,
  ReplaceRolePermissionsInput,
  RoleParams,
  SetUserOverrideInput,
  UserIdParams,
  UserPermissionParams,
} from "shared";

import type { AppEnv } from "../../app-env";
import {
  getValidatedBody,
  getValidatedParams,
} from "../../middleware/validation";
import {
  throwCreatePermissionError,
  throwCreateRoleError,
  throwDeleteUserOverrideError,
  throwListUserOverridesError,
  throwReplaceRolePermissionsError,
  throwSetUserOverrideError,
} from "./authorization.errors";
import * as service from "./authorization.service";

export async function listPermissionsHandler(c: Context<AppEnv>) {
  return c.json({ permissions: await service.listPermissions() }, StatusCodes.OK);
}

export async function createPermissionHandler(c: Context<AppEnv>) {
  const { id, description } = getValidatedBody<CreatePermissionInput>(c);

  const result = await service.createPermission({
    actorUserId: c.get("user")!.id,
    id,
    description,
  });

  if (result.status !== "created") throwCreatePermissionError(result);

  return c.json({ permission: result.permission }, StatusCodes.CREATED);
}

export async function listRolesHandler(c: Context<AppEnv>) {
  return c.json({ roles: await service.listRoles() }, StatusCodes.OK);
}

export async function replaceRolePermissionsHandler(c: Context<AppEnv>) {
  const { role } = getValidatedParams<RoleParams>(c);
  const { permissions } = getValidatedBody<ReplaceRolePermissionsInput>(c);
  const result = await service.replaceRolePermissions({
    actorUserId: c.get("user")!.id,
    role,
    permissions,
  });

  if (result.status !== "updated") throwReplaceRolePermissionsError(result);

  return c.json(
    { role: result.role, permissions: result.permissions },
    StatusCodes.OK,
  );
}

export async function listUserOverridesHandler(c: Context<AppEnv>) {
  const { userId } = getValidatedParams<UserIdParams>(c);
  const result = await service.listUserOverrides(userId);

  if (result.status !== "listed") throwListUserOverridesError(result);

  return c.json(
    { overrides: result.overrides },
    StatusCodes.OK,
  );
}

export async function createRoleHandler(c: Context<AppEnv>) {
  const input = getValidatedBody<CreateRoleInput>(c);
  const result = await service.createRole({
    actorUserId: c.get("user")!.id,
    ...input,
  });

  if (result.status !== "created") throwCreateRoleError(result);

  return c.json({ role: result.role }, StatusCodes.CREATED);
}

export async function setUserOverrideHandler(c: Context<AppEnv>) {
  const { userId, permissionId } = getValidatedParams<UserPermissionParams>(c);
  const { effect } = getValidatedBody<SetUserOverrideInput>(c);

  const result = await service.setUserOverride({
    actorUserId: c.get("user")!.id,
    userId,
    permissionId,
    effect,
  });

  if (result.status !== "updated") throwSetUserOverrideError(result);

  return c.json({ override: result.override }, StatusCodes.OK);
}

export async function deleteUserOverrideHandler(c: Context<AppEnv>) {
  const { userId, permissionId } = getValidatedParams<UserPermissionParams>(c);
  const result = await service.deleteUserOverride({
    actorUserId: c.get("user")!.id,
    userId,
    permissionId,
  });

  if (result.status !== "deleted") throwDeleteUserOverrideError(result);

  return c.body(null, StatusCodes.NO_CONTENT);
}
