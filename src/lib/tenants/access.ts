import type { SupabaseClient } from "@supabase/supabase-js";
import { hasMinPlatformRole, type PlatformRole } from "@/lib/platform/roles";

export interface TenantAccessContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string | null;
  platformRole: PlatformRole | null;
  isPlatformAdmin: boolean;
}

export async function resolveTenantAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<TenantAccessContext> {
  const { data, error } = await supabase
    .from("profiles")
    .select("platform_role, tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not resolve tenant access");
  }

  const platformRole = data?.platform_role;
  const tenantId = data?.tenant_id ?? null;

  const normalisedRole =
    platformRole && ["tenant_viewer", "tenant_agent", "tenant_admin", "tenant_owner", "platform_super_admin"].includes(platformRole)
      ? (platformRole as PlatformRole)
      : null;

  return {
    supabase,
    userId,
    tenantId,
    platformRole: normalisedRole,
    isPlatformAdmin: normalisedRole === "platform_super_admin",
  };
}

export function requireTenantRole(role: PlatformRole, min: PlatformRole): boolean {
  return hasMinPlatformRole(role, min);
}

export function canAccessTenantScope(
  role: PlatformRole,
  requestedTenantId: string | null,
  activeTenantId: string | null,
): boolean {
  if (role === "platform_super_admin") {
    return true;
  }

  if (!requestedTenantId || !activeTenantId) {
    return requestedTenantId === activeTenantId;
  }

  return requestedTenantId === activeTenantId;
}
