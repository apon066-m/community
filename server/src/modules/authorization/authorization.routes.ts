import { Hono } from "hono";
import {
  createPermissionSchema,
  createRoleSchema,
  replaceRolePermissionsSchema,
  roleParamsSchema,
  setUserOverrideSchema,
  userIdParamsSchema,
  userPermissionParamsSchema,
} from "shared";

import type { AppEnv } from "../../app-env";
import { validateJson, validateParams } from "../../middleware/validation";
import { requireAdmin } from "./authorization.middleware";
import {
  createPermissionHandler,
  createRoleHandler,
  deleteUserOverrideHandler,
  listPermissionsHandler,
  listRolesHandler,
  listUserOverridesHandler,
  replaceRolePermissionsHandler,
  setUserOverrideHandler,
} from "./authorization.handlers";

export const authorizationRoutes = new Hono<AppEnv>()
  .use("*", requireAdmin)
  .get("/permissions", listPermissionsHandler)
  .post(
    "/permissions",
    validateJson(createPermissionSchema),
    createPermissionHandler,
  )
  .get("/roles", listRolesHandler)
  .post("/roles", validateJson(createRoleSchema), createRoleHandler)
  .put(
    "/roles/:role/permissions",
    validateParams(roleParamsSchema),
    validateJson(replaceRolePermissionsSchema),
    replaceRolePermissionsHandler,
  )
  .get(
    "/users/:userId/permissions",
    validateParams(userIdParamsSchema),
    listUserOverridesHandler,
  )
  .put(
    "/users/:userId/permissions/:permissionId",
    validateParams(userPermissionParamsSchema),
    validateJson(setUserOverrideSchema),
    setUserOverrideHandler,
  )
  .delete(
    "/users/:userId/permissions/:permissionId",
    validateParams(userPermissionParamsSchema),
    deleteUserOverrideHandler,
  );
