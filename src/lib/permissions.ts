import { UserRole } from "@prisma/client";

export function canAccessAdmin(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function canCreateRecords(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.OPERATOR;
}

export function canManageRecords(role: UserRole) {
  return role === UserRole.ADMIN;
}
