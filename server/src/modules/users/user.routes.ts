import { Hono } from "hono";
import {
  changeBanSchema,
  changeRoleSchema,
  teamListQuerySchema,
  userListQuerySchema,
  userIdParamsSchema,
} from "shared";

import type { AppEnv } from "../../app-env";
import { requireAdmin } from "../authorization/authorization.middleware";
import {
  validateJson,
  validateParams,
  validateQuery,
} from "../../middleware/validation";
import {
  changeBanHandler,
  changeRoleHandler,
  getCurrentUserHandler,
  listTeamUsersHandler,
  listUsersHandler,
} from "./users.handlers";
import { customerFavoriteRoutes } from "../favorites/favorites.routes";

export const userRoutes = new Hono<AppEnv>()
  .get("/", validateQuery(userListQuerySchema), listUsersHandler)
  .get("/me", getCurrentUserHandler)
  .route("/me/favorites", customerFavoriteRoutes);

export const adminUserRoutes = new Hono<AppEnv>()
  .use("*", requireAdmin)
  .get("/team", validateQuery(teamListQuerySchema), listTeamUsersHandler)
  .patch(
    "/:userId/role",
    validateParams(userIdParamsSchema),
    validateJson(changeRoleSchema),
    changeRoleHandler,
  )
  .patch(
    "/:userId/ban",
    validateParams(userIdParamsSchema),
    validateJson(changeBanSchema),
    changeBanHandler,
  );
