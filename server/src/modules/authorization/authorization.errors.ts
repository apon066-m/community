import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";
import type {
  CreatePermissionResult,
  CreateRoleResult,
  DeleteUserOverrideResult,
  ListUserOverridesResult,
  ReplaceRolePermissionsResult,
  SetUserOverrideResult,
} from "./authorization.service";

function authorizationError(
  message: string,
  code: string,
  statusCode: ContentfulStatusCode,
) {
  return new AppError({ message, code, statusCode });
}

export function throwListUserOverridesError(
  result: Exclude<ListUserOverridesResult, { status: "listed" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw authorizationError(
        "User not found",
        "USER_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
  }
}

export function throwCreatePermissionError(
  result: Exclude<CreatePermissionResult, { status: "created" }>,
): never {
  if (result.status === "forbidden") {
    throw authorizationError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
  }

  throw authorizationError(
    "Permission already exists",
    "PERMISSION_EXISTS",
    StatusCodes.CONFLICT,
  );
}

export function throwCreateRoleError(
  result: Exclude<CreateRoleResult, { status: "created" }>,
): never {
  if (result.status === "forbidden") {
    throw authorizationError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
  }

  throw authorizationError(
    "Role already exists",
    "ROLE_EXISTS",
    StatusCodes.CONFLICT,
  );
}

export function throwReplaceRolePermissionsError(
  result: Exclude<ReplaceRolePermissionsResult, { status: "updated" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw authorizationError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
    case "unknown-permission":
      throw authorizationError(
        "Unknown permission",
        "UNKNOWN_PERMISSION",
        StatusCodes.BAD_REQUEST,
      );
    case "privileged-permission":
      throw authorizationError(
        "Administrative permissions cannot be delegated",
        "PRIVILEGED_PERMISSION",
        StatusCodes.BAD_REQUEST,
      );
    case "invalid-role":
      throw authorizationError(
        "Admin permissions cannot be replaced",
        "INVALID_ROLE",
        StatusCodes.BAD_REQUEST,
      );
    case "role-not-found":
      throw authorizationError(
        "Role not found",
        "ROLE_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
  }
}

export function throwSetUserOverrideError(
  result: Exclude<SetUserOverrideResult, { status: "updated" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw authorizationError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
    case "not-found":
      throw authorizationError(
        "User or permission not found",
        "USER_OR_PERMISSION_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
    case "not-delegable":
      throw authorizationError(
        "Permission cannot be delegated",
        "PERMISSION_NOT_DELEGABLE",
        StatusCodes.BAD_REQUEST,
      );
  }
}

export function throwDeleteUserOverrideError(
  result: Exclude<DeleteUserOverrideResult, { status: "deleted" }>,
): never {
  switch (result.status) {
    case "forbidden":
      throw authorizationError("Forbidden", "FORBIDDEN", StatusCodes.FORBIDDEN);
    case "not-found":
      throw authorizationError(
        "Permission override not found",
        "OVERRIDE_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
  }
}
