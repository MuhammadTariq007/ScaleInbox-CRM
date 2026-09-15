import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canAccessTenantScope,
  resolveTenantAccess,
  requireTenantRole,
} from "./access";

describe("tenant access helpers", () => {
  it("resolves tenant access from the profile row", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                platform_role: "tenant_admin",
                tenant_id: "tenant-1",
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await resolveTenantAccess(supabase, "user-1");

    expect(result).toMatchObject({
      userId: "user-1",
      tenantId: "tenant-1",
      platformRole: "tenant_admin",
      isPlatformAdmin: false,
    });
  });

  it("allows a higher platform role to satisfy the minimum tenant role", () => {
    expect(requireTenantRole("platform_super_admin", "tenant_admin")).toBe(true);
    expect(requireTenantRole("tenant_agent", "tenant_admin")).toBe(false);
  });

  it("enforces tenant scope without any subtenant boundary", () => {
    expect(canAccessTenantScope("tenant_admin", "tenant-1", "tenant-1")).toBe(true);
    expect(canAccessTenantScope("tenant_admin", "tenant-2", "tenant-1")).toBe(false);
    expect(canAccessTenantScope("platform_super_admin", null, "tenant-1")).toBe(true);
  });
});
