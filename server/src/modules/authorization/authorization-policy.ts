import type { UserRole } from "shared";

import { isPrivilegedPermission } from "./permissions";

export const adminMutationLockId = 739241;

export function canDelegatePermission(input: {
  actorRole: UserRole;
  targetRole: UserRole;
  permissionId: string;
}): boolean {
  if (input.actorRole !== "admin") return false;
  if (input.targetRole === "admin") return false;

  return !isPrivilegedPermission(input.permissionId);
}

export function canTransitionRole(input: {
  actorRole: UserRole;
  currentRole: UserRole;
  nextRole: UserRole;
  activeAdminCount: number;
}): boolean {
  if (input.actorRole !== "admin") return false;

  return !(
    input.currentRole === "admin" &&
    input.nextRole !== "admin" &&
    input.activeAdminCount <= 1
  );
}
