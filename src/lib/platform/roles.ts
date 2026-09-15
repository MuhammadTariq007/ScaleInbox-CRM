export type PlatformRole =
  | "tenant_viewer"
  | "tenant_agent"
  | "tenant_admin"
  | "tenant_owner"
  | "platform_super_admin";

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  "tenant_viewer",
  "tenant_agent",
  "tenant_admin",
  "tenant_owner",
  "platform_super_admin",
] as const;

export function roleRankForPlatform(role: PlatformRole): number {
  switch (role) {
    case "tenant_viewer":
      return 1;
    case "tenant_agent":
      return 2;
    case "tenant_admin":
      return 4;
    case "tenant_owner":
      return 5;
    case "platform_super_admin":
      return 6;
  }
}

export function hasMinPlatformRole(
  role: PlatformRole,
  min: PlatformRole,
): boolean {
  return roleRankForPlatform(role) >= roleRankForPlatform(min);
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === "string" &&
    (PLATFORM_ROLES as readonly string[]).includes(value)
  );
}

export function canManageTenant(role: PlatformRole): boolean {
  return hasMinPlatformRole(role, "tenant_admin");
}

export function canAccessPlatform(role: PlatformRole): boolean {
  return hasMinPlatformRole(role, "tenant_viewer");
}
