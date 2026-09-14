export type TenantStatus = "active" | "suspended" | "trial" | "archived";
export type TenantMembershipRole =
  | "tenant_viewer"
  | "tenant_agent"
  | "subtenant_agent"
  | "tenant_admin"
  | "subtenant_admin"
  | "tenant_owner"
  | "platform_super_admin";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  owner_user_id: string | null;
  default_currency: string;
  plan_name: string;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantMembershipRole;
  is_owner: boolean;
  status: "active" | "invited" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface TenantSubtenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  feature_flags: Record<string, unknown>;
  billing_email: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}
