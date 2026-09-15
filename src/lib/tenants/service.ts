import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform/context";
import type { Tenant } from "./types";

export async function listTenants(): Promise<Tenant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list tenants: ${error.message}`);
  }

  return (data ?? []) as Tenant[];
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant: ${error.message}`);
  }

  return (data ?? null) as Tenant | null;
}

export async function listTenantMembers(tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list tenant members: ${error.message}`);
  }

  return data ?? [];
}

export async function listPlatformMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("*")
    .order("tenant_id", { ascending: true });

  if (error) {
    throw new Error(`Failed to list platform members: ${error.message}`);
  }

  return data ?? [];
}

export async function createTenant(input: {
  name: string;
  slug: string;
  ownerUserId?: string;
  defaultCurrency?: string;
  planName?: string;
}) {
  const ctx = await requirePlatformAdmin();
  const supabase = ctx.supabase;

  const payload = {
    name: input.name,
    slug: input.slug,
    owner_user_id: input.ownerUserId ?? ctx.userId,
    default_currency: input.defaultCurrency ?? "USD",
    plan_name: input.planName ?? "starter",
  };

  const { data, error } = await supabase
    .from("tenants")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`);
  }

  return data as Tenant;
}

export async function createTenantMembership(input: {
  tenantId: string;
  userId: string;
  role: string;
  status?: "active" | "invited" | "disabled";
}) {
  const ctx = await requirePlatformAdmin();
  const supabase = ctx.supabase;

  const payload = {
    tenant_id: input.tenantId,
    user_id: input.userId,
    role: input.role,
    status: input.status ?? "active",
    is_owner: false,
  };

  const { data, error } = await supabase
    .from("tenant_users")
    .upsert(payload, { onConflict: "tenant_id,user_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to assign tenant membership: ${error.message}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      tenant_id: input.tenantId,
      platform_role: input.role,
    })
    .eq("user_id", input.userId);

  if (profileError) {
    throw new Error(`Failed to sync tenant context: ${profileError.message}`);
  }

  return data;
}

export async function updateTenantMembershipRole(input: {
  tenantId: string;
  userId: string;
  role: string;
}) {
  const ctx = await requirePlatformAdmin();
  const supabase = ctx.supabase;

  const { data, error } = await supabase
    .from("tenant_users")
    .update({ role: input.role })
    .eq("tenant_id", input.tenantId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update tenant role: ${error.message}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      tenant_id: input.tenantId,
      platform_role: input.role,
    })
    .eq("user_id", input.userId);

  if (profileError) {
    throw new Error(`Failed to sync tenant role: ${profileError.message}`);
  }

  return data;
}

export async function removeTenantMembership(input: { tenantId: string; userId: string }) {
  const ctx = await requirePlatformAdmin();
  const supabase = ctx.supabase;

  const { error } = await supabase
    .from("tenant_users")
    .delete()
    .eq("tenant_id", input.tenantId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to remove tenant membership: ${error.message}`);
  }

  return true;
}
