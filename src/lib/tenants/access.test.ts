import { describe, expect, it } from "vitest";
import {
  canAccessTenantScope,
  resolveTenantAccess,
  requireTenantRole,
} from "./access";

describe("tenant access helpers", () => {
  it("resolves platform access from the profile row", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                platform_role: "tenant_admin",
                tenant_id: "tenant-1",
                subtenant_id: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any;

    const result = await resolveTenantAccess(supabase, "user-1");

    expect(result).toMatchObject({
      userId: "user-1",
      tenantId: "tenant-1",
      subtenantId: null,
      platformRole: "tenant_admin",
      isPlatformAdmin: false,
    });
  });

  it("allows a higher platform role to satisfy the minimum tenant role", () => {
    expect(requireTenantRole("platform_super_admin", "tenant_admin")).toBe(true);
    expect(requireTenantRole("tenant_agent", "tenant_admin")).toBe(false);
  });

  it("enforces tenant and subtenant workspace scope", () => {
    expect(canAccessTenantScope("tenant_admin", "tenant-1", "tenant-1", null, null)).toBe(true);
    expect(canAccessTenantScope("tenant_admin", "tenant-2", "tenant-1", null, null)).toBe(false);
    expect(canAccessTenantScope("platform_super_admin", null, "tenant-1", null, null)).toBe(true);
  });
});
