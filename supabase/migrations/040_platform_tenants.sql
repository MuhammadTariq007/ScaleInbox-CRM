-- ============================================================
-- 040_platform_tenants.sql — platform + tenant registry foundation
--
-- This migration adds the super-admin / platform layer without
-- destroying the existing account-scoped CRM model. The app keeps
-- its current `accounts` / `profiles.account_id` design as the
-- operational workspace boundary, and this migration adds a parent
-- tenant registry and platform role model above it.
--
-- Design summary
--   1. `tenants` is the root SaaS tenant registry.
--   2. `tenant_users` tracks direct membership for a tenant.
--   3. `tenant_memberships` tracks user access within a tenant or
--      subtenant workspace.
--   4. `tenant_subtenants` is the organizational child-workspace model.
--   5. `platform_audit_logs` records admin and tenant actions.
--   6. `tenant_settings` stores tenant-level configuration.
--   7. `profiles.platform_role`, `profiles.tenant_id`, and
--      `profiles.subtenant_id` are added as optional platform-scoped
--      fields that can be backfilled later via admin tooling.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role_enum') THEN
    CREATE TYPE platform_role_enum AS ENUM (
      'tenant_viewer',
      'tenant_agent',
      'subtenant_agent',
      'tenant_admin',
      'subtenant_admin',
      'tenant_owner',
      'platform_super_admin'
    );
  END IF;
END $$;

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  plan_name TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON tenants;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TENANT USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role platform_role_enum NOT NULL DEFAULT 'tenant_viewer',
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user
  ON tenant_users(user_id, tenant_id);

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON tenant_users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TENANT SUBTENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_subtenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_tenant_subtenants_tenant
  ON tenant_subtenants(tenant_id, status);

ALTER TABLE tenant_subtenants ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON tenant_subtenants;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_subtenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TENANT MEMBERSHIPS
--
-- This table stores both tenant-level and subtenant-level membership
-- with the same role model, keeping the app able to resolve the active
-- workspace without overloading the existing `profiles.account_id` row.
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subtenant_id UUID REFERENCES tenant_subtenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role platform_role_enum NOT NULL DEFAULT 'tenant_viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, subtenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user
  ON tenant_memberships(user_id, tenant_id, subtenant_id);

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANT SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_email TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS tenant_quota_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seats_limit INTEGER NOT NULL DEFAULT 5,
  broadcast_limit_per_month INTEGER NOT NULL DEFAULT 20,
  contacts_limit INTEGER NOT NULL DEFAULT 2000,
  automation_limit INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_quota_limits ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON tenant_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON tenant_quota_limits;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_quota_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PLATFORM AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  subtenant_id UUID REFERENCES tenant_subtenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role platform_role_enum,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_tenant
  ON platform_audit_logs(tenant_id, created_at DESC);

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — TENANT TABLES
-- ============================================================
DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_select ON tenants
  FOR SELECT USING (is_tenant_member(id) OR is_platform_super_admin());
CREATE POLICY tenants_update ON tenants
  FOR UPDATE USING (is_tenant_member(id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(id, 'tenant_admin') OR is_platform_super_admin());

DROP POLICY IF EXISTS tenant_users_select ON tenant_users;
DROP POLICY IF EXISTS tenant_users_modify ON tenant_users;
CREATE POLICY tenant_users_select ON tenant_users
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY tenant_users_modify ON tenant_users
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

DROP POLICY IF EXISTS tenant_subtenants_select ON tenant_subtenants;
DROP POLICY IF EXISTS tenant_subtenants_modify ON tenant_subtenants;
CREATE POLICY tenant_subtenants_select ON tenant_subtenants
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_viewer') OR is_platform_super_admin());
CREATE POLICY tenant_subtenants_modify ON tenant_subtenants
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

DROP POLICY IF EXISTS tenant_settings_select ON tenant_settings;
DROP POLICY IF EXISTS tenant_settings_modify ON tenant_settings;
CREATE POLICY tenant_settings_select ON tenant_settings
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY tenant_settings_modify ON tenant_settings
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

DROP POLICY IF EXISTS tenant_quota_limits_select ON tenant_quota_limits;
DROP POLICY IF EXISTS tenant_quota_limits_modify ON tenant_quota_limits;
CREATE POLICY tenant_quota_limits_select ON tenant_quota_limits
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY tenant_quota_limits_modify ON tenant_quota_limits
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

DROP POLICY IF EXISTS platform_audit_logs_select ON platform_audit_logs;
DROP POLICY IF EXISTS platform_audit_logs_insert ON platform_audit_logs;
CREATE POLICY platform_audit_logs_select ON platform_audit_logs
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY platform_audit_logs_insert ON platform_audit_logs
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

-- ============================================================
-- PROFILE EXTENSIONS
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS platform_role platform_role_enum,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtenant_id UUID REFERENCES tenant_subtenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_platform_role
  ON profiles(platform_role, tenant_id, subtenant_id);

-- ============================================================
-- PLATFORM AUTH HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION is_platform_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.platform_role = 'platform_super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_tenant_member(
  target_tenant_id UUID,
  min_role platform_role_enum DEFAULT 'tenant_viewer'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.tenant_id = target_tenant_id
      AND CASE p.platform_role
            WHEN 'platform_super_admin' THEN 7
            WHEN 'tenant_owner' THEN 6
            WHEN 'subtenant_admin' THEN 5
            WHEN 'tenant_admin' THEN 4
            WHEN 'subtenant_agent' THEN 3
            WHEN 'tenant_agent' THEN 2
            WHEN 'tenant_viewer' THEN 1
            ELSE 0
          END >= CASE min_role
            WHEN 'platform_super_admin' THEN 7
            WHEN 'tenant_owner' THEN 6
            WHEN 'subtenant_admin' THEN 5
            WHEN 'tenant_admin' THEN 4
            WHEN 'subtenant_agent' THEN 3
            WHEN 'tenant_agent' THEN 2
            WHEN 'tenant_viewer' THEN 1
            ELSE 0
          END
  );
$$;

ALTER FUNCTION is_platform_super_admin() OWNER TO postgres;
ALTER FUNCTION is_tenant_member(UUID, platform_role_enum) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION is_platform_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_tenant_member(UUID, platform_role_enum) TO authenticated, service_role;

-- ============================================================
-- DEFAULTS AND NOTE
--
-- Existing users remain fully compatible. They simply keep their
-- current account/workspace model until a platform tenant is assigned.
-- ============================================================
