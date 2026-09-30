import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";
import type {
  BanChangeResult,
  ListUsersResult,
  RoleChangeResult,
} from "./users.service";

function userError(
  message: string,
  code: string,
  statusCode: ContentfulStatusCode,
) {
  return new AppError({ message, code, statusCode });
}

export function throwUserListError(
  result: Exclude<ListUsersResult, { status: "listed" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw userError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
  }
}

export function throwRoleChangeError(
  result: Exclude<RoleChangeResult, { status: "updated" }>,
): never {
  switch (result.status) {
    case "actor-forbidden":
      throw userError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
    case "not-found":
      throw userError("User not found", "USER_NOT_FOUND", StatusCodes.NOT_FOUND);
    case "role-not-found":
      throw userError("Role not found", "ROLE_NOT_FOUND", StatusCodes.NOT_FOUND);
    case "final-admin":
      throw userError(
        "The final active admin cannot be demoted",
        "FINAL_ADMIN_PROTECTED",
        StatusCodes.CONFLICT,
      );
  }
}

export function throwBanChangeError(
  result: Exclude<BanChangeResult, { status: "updated" }>,
): never {
  switch (result.status) {
    case "actor-forbidden":
      throw userError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
    case "not-found":
      throw userError("User not found", "USER_NOT_FOUND", StatusCodes.NOT_FOUND);
    case "final-admin":
      throw userError(
        "The final active admin cannot be banned",
        "FINAL_ADMIN_PROTECTED",
        StatusCodes.CONFLICT,
      );
  }
}
