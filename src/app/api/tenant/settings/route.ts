import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const DEFAULT_FEATURE_FLAGS = {
  broadcasts: true,
  automations: true,
  ai_assistant: false,
  shared_inbox: true,
  contacts: true,
  custom_fields: true,
  whatsapp_integration: true,
};

const DEFAULT_QUOTA_LIMITS = {
  seats_limit: 5,
  broadcast_limit_per_month: 20,
  contacts_limit: 2000,
  automation_limit: 3,
};

function normalizeFeatureFlags(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_FEATURE_FLAGS };
  }

  return Object.entries(DEFAULT_FEATURE_FLAGS).reduce<Record<string, boolean>>((acc, [key, defaultValue]) => {
    const current = (value as Record<string, unknown>)[key];
    acc[key] = typeof current === "boolean" ? current : defaultValue;
    return acc;
  }, {});
}

function normalizeQuotaLimits(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_QUOTA_LIMITS };
  }

  return Object.entries(DEFAULT_QUOTA_LIMITS).reduce<Record<string, number>>((acc, [key, defaultValue]) => {
    const current = (value as Record<string, unknown>)[key];
    const numeric = typeof current === "number" ? current : Number(current ?? defaultValue);
    acc[key] = Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : defaultValue;
    return acc;
  }, {});
}

async function recordTenantAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  userId: string,
  actorRole: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  if (!tenantId) return;

  const { error } = await supabase.from("platform_audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: userId,
    actor_role: actorRole ?? "tenant_viewer",
    action,
    entity_type: "tenant_settings",
    entity_id: tenantId,
    metadata,
  });

  if (error) {
    console.warn("[tenant/settings] audit logging skipped", error.message);
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("tenant_id, platform_role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[tenant/settings] profile lookup failed", profileErr);
      return NextResponse.json({ error: "Could not load tenant settings" }, { status: 500 });
    }

    const tenantId = profile?.tenant_id;
    if (!tenantId && profile?.platform_role !== "platform_super_admin") {
      return NextResponse.json({ error: "This account is not assigned to a tenant" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Platform super admins must choose a tenant context" }, { status: 400 });
    }

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name, plan_name")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantErr) {
      console.error("[tenant/settings] tenant lookup failed", tenantErr);
      return NextResponse.json({ error: "Could not load tenant configuration" }, { status: 500 });
    }

    let { data: settings, error: settingsErr } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (settingsErr) {
      console.error("[tenant/settings] settings lookup failed", settingsErr);
      return NextResponse.json({ error: "Could not load tenant configuration" }, { status: 500 });
    }

    if (!settings) {
      const insertResult = await supabase
        .from("tenant_settings")
        .insert({
          tenant_id: tenantId,
          feature_flags: DEFAULT_FEATURE_FLAGS,
          billing_email: null,
          timezone: "UTC",
        })
        .select("*")
        .single();

      if (insertResult.error) {
        console.error("[tenant/settings] settings insert failed", insertResult.error);
        return NextResponse.json({ error: "Could not initialize tenant configuration" }, { status: 500 });
      }

      settings = insertResult.data;
    }

    let { data: quotaRow, error: quotaErr } = await supabase
      .from("tenant_quota_limits")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (quotaErr) {
      console.error("[tenant/settings] quota lookup failed", quotaErr);
      return NextResponse.json({ error: "Could not load tenant quotas" }, { status: 500 });
    }

    if (!quotaRow) {
      const insertQuota = await supabase
        .from("tenant_quota_limits")
        .insert({
          tenant_id: tenantId,
          seats_limit: tenant?.plan_name === "growth" ? 15 : tenant?.plan_name === "scale" ? 50 : 5,
          broadcast_limit_per_month: tenant?.plan_name === "growth" ? 100 : tenant?.plan_name === "scale" ? 500 : 20,
          contacts_limit: tenant?.plan_name === "growth" ? 10000 : tenant?.plan_name === "scale" ? 50000 : 2000,
          automation_limit: tenant?.plan_name === "growth" ? 20 : tenant?.plan_name === "scale" ? 75 : 3,
        })
        .select("*")
        .single();

      if (insertQuota.error) {
        console.error("[tenant/settings] quota insert failed", insertQuota.error);
        return NextResponse.json({ error: "Could not initialize tenant quotas" }, { status: 500 });
      }

      quotaRow = insertQuota.data;
    }

    return NextResponse.json({
      tenant: {
        id: tenant?.id ?? tenantId,
        name: tenant?.name ?? "Tenant",
        plan_name: tenant?.plan_name ?? "starter",
      },
      settings: {
        id: settings.id,
        tenant_id: settings.tenant_id,
        billing_email: settings.billing_email ?? "",
        timezone: settings.timezone ?? "UTC",
        feature_flags: normalizeFeatureFlags(settings.feature_flags),
      },
      quota_limits: normalizeQuotaLimits(quotaRow),
    });
  } catch (err) {
    console.error("[tenant/settings] GET failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, platform_role")
      .eq("user_id", user.id)
      .maybeSingle();

    const actorRole = profile?.platform_role ?? "tenant_viewer";
    const tenantId = profile?.tenant_id;
    if (!tenantId && profile?.platform_role !== "platform_super_admin") {
      return NextResponse.json({ error: "This account is not assigned to a tenant" }, { status: 403 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      billing_email?: string | null;
      timezone?: string;
      feature_flags?: Record<string, boolean>;
      quota_limits?: Record<string, number>;
    };

    if (!tenantId) {
      return NextResponse.json({ error: "Platform super admins must choose a tenant context" }, { status: 400 });
    }

    const update: {
      billing_email?: string | null;
      timezone?: string;
      feature_flags?: Record<string, boolean>;
    } = {};
    const quotaUpdate: Partial<Record<string, number>> = {};

    if (typeof payload.billing_email === "string" || payload.billing_email === null) {
      update.billing_email = payload.billing_email?.trim() || null;
    }

    if (typeof payload.timezone === "string" && payload.timezone.trim()) {
      update.timezone = payload.timezone.trim();
    }

    if (payload.feature_flags && typeof payload.feature_flags === "object") {
      update.feature_flags = normalizeFeatureFlags(payload.feature_flags);
    }

    if (payload.quota_limits && typeof payload.quota_limits === "object") {
      Object.assign(quotaUpdate, normalizeQuotaLimits(payload.quota_limits));
    }

    if (Object.keys(update).length === 0 && Object.keys(quotaUpdate).length === 0) {
      return NextResponse.json({ error: "No valid settings changes were provided" }, { status: 400 });
    }

    let settingsData;
    if (Object.keys(update).length > 0) {
      const { data, error } = await supabase
        .from("tenant_settings")
        .upsert(
          { tenant_id: tenantId, ...update },
          { onConflict: "tenant_id" },
        )
        .select("*")
        .single();

      if (error) {
        console.error("[tenant/settings] update failed", error);
        return NextResponse.json({ error: "Failed to save tenant settings" }, { status: 500 });
      }
      settingsData = data;
    }

    let quotaData;
    if (Object.keys(quotaUpdate).length > 0) {
      const { data, error } = await supabase
        .from("tenant_quota_limits")
        .upsert(
          { tenant_id: tenantId, ...quotaUpdate },
          { onConflict: "tenant_id" },
        )
        .select("*")
        .single();

      if (error) {
        console.error("[tenant/settings] quota update failed", error);
        return NextResponse.json({ error: "Failed to save tenant quotas" }, { status: 500 });
      }
      quotaData = data;
    }

    await recordTenantAudit(
      supabase,
      tenantId,
      user.id,
      actorRole,
      "tenant_settings_updated",
      {
        changed_fields: Object.keys(update).concat(Object.keys(quotaUpdate)),
        billing_email: update.billing_email ?? null,
        timezone: update.timezone ?? null,
        quota_limits: quotaData ? normalizeQuotaLimits(quotaData) : undefined,
      },
    );

    return NextResponse.json({
      settings: settingsData
        ? {
            id: settingsData.id,
            tenant_id: settingsData.tenant_id,
            billing_email: settingsData.billing_email ?? "",
            timezone: settingsData.timezone ?? "UTC",
            feature_flags: normalizeFeatureFlags(settingsData.feature_flags),
          }
        : undefined,
      quota_limits: quotaData ? normalizeQuotaLimits(quotaData) : undefined,
    });
  } catch (err) {
    console.error("[tenant/settings] PATCH failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
