-- Remove legacy subtenant state that cannot be removed by the original
-- platform migration because PostgreSQL enum labels are append-only.

UPDATE tenant_users
SET role = 'tenant_viewer'::platform_role_enum
WHERE role::text IN ('subtenant_agent', 'subtenant_admin');

UPDATE tenant_memberships
SET role = 'tenant_viewer'::platform_role_enum
WHERE role::text IN ('subtenant_agent', 'subtenant_admin');

UPDATE profiles
SET platform_role = 'tenant_viewer'::platform_role_enum
WHERE platform_role::text IN ('subtenant_agent', 'subtenant_admin');

UPDATE platform_audit_logs
SET actor_role = 'tenant_viewer'::platform_role_enum
WHERE actor_role::text IN ('subtenant_agent', 'subtenant_admin');

DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
DROP POLICY IF EXISTS tenant_users_select ON tenant_users;
DROP POLICY IF EXISTS tenant_users_modify ON tenant_users;
DROP POLICY IF EXISTS tenant_settings_select ON tenant_settings;
DROP POLICY IF EXISTS tenant_settings_modify ON tenant_settings;
DROP POLICY IF EXISTS tenant_quota_limits_select ON tenant_quota_limits;
DROP POLICY IF EXISTS tenant_quota_limits_modify ON tenant_quota_limits;
DROP POLICY IF EXISTS platform_audit_logs_select ON platform_audit_logs;
DROP POLICY IF EXISTS platform_audit_logs_insert ON platform_audit_logs;
DROP POLICY IF EXISTS tenant_subtenants_select ON tenant_subtenants;
DROP POLICY IF EXISTS tenant_subtenants_modify ON tenant_subtenants;
ALTER TABLE tenant_memberships DROP COLUMN IF EXISTS subtenant_id;
ALTER TABLE platform_audit_logs DROP COLUMN IF EXISTS subtenant_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS subtenant_id;
DROP TABLE IF EXISTS tenant_subtenants;

DROP FUNCTION IF EXISTS is_tenant_member(UUID, platform_role_enum);
DROP FUNCTION IF EXISTS public.make_user_super_admin(UUID);
DROP FUNCTION IF EXISTS public.set_user_platform_role(UUID, platform_role_enum);

ALTER TYPE platform_role_enum RENAME TO platform_role_enum_legacy;

CREATE TYPE platform_role_enum AS ENUM (
  'tenant_viewer',
  'tenant_agent',
  'tenant_admin',
  'tenant_owner',
  'platform_super_admin'
);

ALTER TABLE tenant_users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE tenant_memberships
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE profiles
  ALTER COLUMN platform_role DROP DEFAULT;

ALTER TABLE tenant_users
  ALTER COLUMN role TYPE platform_role_enum
  USING role::text::platform_role_enum;

ALTER TABLE tenant_memberships
  ALTER COLUMN role TYPE platform_role_enum
  USING role::text::platform_role_enum;

ALTER TABLE platform_audit_logs
  ALTER COLUMN actor_role TYPE platform_role_enum
  USING actor_role::text::platform_role_enum;

ALTER TABLE profiles
  ALTER COLUMN platform_role TYPE platform_role_enum
  USING platform_role::text::platform_role_enum;

ALTER TABLE tenant_users
  ALTER COLUMN role SET DEFAULT 'tenant_viewer'::platform_role_enum;

ALTER TABLE tenant_memberships
  ALTER COLUMN role SET DEFAULT 'tenant_viewer'::platform_role_enum;

ALTER TABLE profiles
  ALTER COLUMN platform_role SET DEFAULT 'tenant_viewer'::platform_role_enum;

DROP TYPE platform_role_enum_legacy;

CREATE OR REPLACE FUNCTION public.set_user_platform_role(
  p_user_id UUID,
  p_platform_role platform_role_enum
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.profiles;
BEGIN
  UPDATE public.profiles
  SET
    platform_role = p_platform_role,
    tenant_id = CASE
      WHEN p_platform_role = 'platform_super_admin' THEN NULL
      ELSE tenant_id
    END
  WHERE user_id = p_user_id
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;

ALTER FUNCTION public.set_user_platform_role(UUID, platform_role_enum) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.set_user_platform_role(UUID, platform_role_enum) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.make_user_super_admin(p_user_id UUID)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.set_user_platform_role(p_user_id, 'platform_super_admin');
$$;

ALTER FUNCTION public.make_user_super_admin(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.make_user_super_admin(UUID) TO authenticated, service_role;

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
            WHEN 'platform_super_admin' THEN 6
            WHEN 'tenant_owner' THEN 5
            WHEN 'tenant_admin' THEN 4
            WHEN 'tenant_agent' THEN 2
            WHEN 'tenant_viewer' THEN 1
            ELSE 0
          END >= CASE min_role
            WHEN 'platform_super_admin' THEN 6
            WHEN 'tenant_owner' THEN 5
            WHEN 'tenant_admin' THEN 4
            WHEN 'tenant_agent' THEN 2
            WHEN 'tenant_viewer' THEN 1
            ELSE 0
          END
  );
$$;

ALTER FUNCTION is_tenant_member(UUID, platform_role_enum) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION is_tenant_member(UUID, platform_role_enum) TO authenticated, service_role;

CREATE POLICY tenants_select ON tenants
  FOR SELECT USING (is_tenant_member(id) OR is_platform_super_admin());
CREATE POLICY tenants_update ON tenants
  FOR UPDATE USING (is_tenant_member(id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(id, 'tenant_admin') OR is_platform_super_admin());

CREATE POLICY tenant_users_select ON tenant_users
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY tenant_users_modify ON tenant_users
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

CREATE POLICY tenant_settings_select ON tenant_settings
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY tenant_settings_modify ON tenant_settings
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

CREATE POLICY tenant_quota_limits_select ON tenant_quota_limits
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY tenant_quota_limits_modify ON tenant_quota_limits
  FOR ALL USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin())
  WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());

CREATE POLICY platform_audit_logs_select ON platform_audit_logs
  FOR SELECT USING (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
CREATE POLICY platform_audit_logs_insert ON platform_audit_logs
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id, 'tenant_admin') OR is_platform_super_admin());
