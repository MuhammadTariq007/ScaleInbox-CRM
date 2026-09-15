-- Backfill the platform tenant registry from the existing account workspaces.
-- This makes the tenant settings surface usable for deployments created
-- before the platform tenant layer was introduced.

INSERT INTO tenants (name, slug, owner_user_id, default_currency, plan_name)
SELECT
  a.name,
  left(regexp_replace(lower(a.name), '[^a-z0-9]+', '-', 'g'), 48)
    || '-' || substring(a.id::text, 1, 8),
  a.owner_user_id,
  COALESCE(a.default_currency, 'USD'),
  'starter'
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.owner_user_id = a.owner_user_id
);

INSERT INTO tenant_users (tenant_id, user_id, role, is_owner, status)
SELECT
  t.id,
  p.user_id,
  CASE
    WHEN p.user_id = t.owner_user_id THEN 'tenant_owner'::platform_role_enum
    WHEN p.account_role = 'admin' THEN 'tenant_admin'::platform_role_enum
    WHEN p.account_role = 'agent' THEN 'tenant_agent'::platform_role_enum
    ELSE 'tenant_viewer'::platform_role_enum
  END,
  p.user_id = t.owner_user_id,
  'active'
FROM profiles p
JOIN accounts a ON a.id = p.account_id
JOIN tenants t ON t.owner_user_id = a.owner_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_users tu
  WHERE tu.tenant_id = t.id AND tu.user_id = p.user_id
);

UPDATE profiles p
SET
  tenant_id = t.id,
  platform_role = CASE
    WHEN p.user_id = t.owner_user_id THEN 'tenant_owner'::platform_role_enum
    WHEN p.account_role = 'admin' THEN 'tenant_admin'::platform_role_enum
    WHEN p.account_role = 'agent' THEN 'tenant_agent'::platform_role_enum
    ELSE 'tenant_viewer'::platform_role_enum
  END
FROM accounts a
JOIN tenants t ON t.owner_user_id = a.owner_user_id
WHERE p.account_id = a.id
  AND (p.tenant_id IS NULL OR p.platform_role IS NULL);

INSERT INTO tenant_settings (tenant_id, feature_flags, timezone)
SELECT t.id, '{}'::jsonb, 'UTC'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_settings ts WHERE ts.tenant_id = t.id
);

INSERT INTO tenant_quota_limits (tenant_id)
SELECT t.id
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_quota_limits q WHERE q.tenant_id = t.id
);
