import { describe, expect, it } from "vitest";
import {
  PLATFORM_ROLES,
  hasMinPlatformRole,
  isPlatformRole,
  roleRankForPlatform,
  type PlatformRole,
} from "./roles";

describe("platform role helpers", () => {
  it("exposes the expected platform role hierarchy", () => {
    expect(PLATFORM_ROLES).toEqual([
      "tenant_viewer",
      "tenant_agent",
      "subtenant_agent",
      "tenant_admin",
      "subtenant_admin",
      "tenant_owner",
      "platform_super_admin",
    ]);
  });

  it("accepts valid platform roles only", () => {
    expect(isPlatformRole("platform_super_admin")).toBe(true);
    expect(isPlatformRole("tenant_admin")).toBe(true);
    expect(isPlatformRole("owner")).toBe(false);
  });

  it("ranks elevated roles above viewer permissions", () => {
    expect(roleRankForPlatform("tenant_viewer")).toBe(1);
    expect(roleRankForPlatform("tenant_agent")).toBe(2);
    expect(roleRankForPlatform("tenant_admin")).toBe(4);
    expect(roleRankForPlatform("platform_super_admin")).toBe(7);
  });

  it("supports minimum-role checks across the hierarchy", () => {
    expect(hasMinPlatformRole("tenant_admin", "tenant_agent")).toBe(true);
    expect(hasMinPlatformRole("tenant_admin", "tenant_admin")).toBe(true);
    expect(hasMinPlatformRole("tenant_agent", "tenant_admin")).toBe(false);
    expect(hasMinPlatformRole("platform_super_admin", "tenant_owner")).toBe(true);
  });

  it("keeps the platform role type aligned with the declared union", () => {
    const role: PlatformRole = "tenant_owner";
    expect(role).toBe("tenant_owner");
  });
});
