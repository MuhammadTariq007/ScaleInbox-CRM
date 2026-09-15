import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isPlatformRole, type PlatformRole } from "./roles";

export interface PlatformContext {
  supabase: SupabaseClient;
  userId: string;
  platformRole: PlatformRole;
  tenantId: string | null;
  isPlatformAdmin: boolean;
}

export class PlatformUnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "PlatformUnauthorizedError";
  }
}

export class PlatformForbiddenError extends Error {
  readonly status = 403 as const;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "PlatformForbiddenError";
  }
}

export async function resolvePlatformContext(): Promise<PlatformContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new PlatformUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("platform_role, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new PlatformForbiddenError("Could not load platform context");
  }

  const platformRole = data?.platform_role;
  if (!platformRole || !isPlatformRole(platformRole)) {
    throw new PlatformForbiddenError("Profile is not linked to a platform role");
  }

  return {
    supabase,
    userId: user.id,
    platformRole,
    tenantId: data?.tenant_id ?? null,
    isPlatformAdmin: platformRole === "platform_super_admin",
  };
}

export async function requirePlatformAdmin(): Promise<PlatformContext> {
  const ctx = await resolvePlatformContext();
  if (ctx.platformRole !== "platform_super_admin") {
    throw new PlatformForbiddenError("This action requires platform super admin access");
  }
  return ctx;
}

export async function requireTenantAccess(tenantId: string): Promise<PlatformContext> {
  const ctx = await resolvePlatformContext();
  if (ctx.isPlatformAdmin) {
    return ctx;
  }
  if (!ctx.tenantId || ctx.tenantId !== tenantId) {
    throw new PlatformForbiddenError("This tenant is not available to the current user");
  }
  return ctx;
}

export async function requireWorkspaceAccess(tenantId: string): Promise<PlatformContext> {
  const ctx = await resolvePlatformContext();
  if (ctx.isPlatformAdmin) {
    return ctx;
  }

  if (!ctx.tenantId || ctx.tenantId !== tenantId) {
    throw new PlatformForbiddenError("This workspace is not available to the current user");
  }

  return ctx;
}
