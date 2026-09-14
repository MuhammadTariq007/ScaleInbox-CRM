-- ============================================================
-- 041_superadmin_role_bootstrap.sql
--
-- Ensures every new profile starts in a valid tenant-scoped state and
-- provides a safe DB helper to promote or demote a user between tenant
-- and platform roles without leaving the profile in an undefined state.
-- ============================================================

ALTER TABLE public.profiles
  ALTER COLUMN platform_role SET DEFAULT 'tenant_viewer';

UPDATE public.profiles
SET platform_role = 'tenant_viewer'
WHERE platform_role IS NULL
  AND tenant_id IS NULL;

-- Keep the new-user trigger aligned with the platform role model.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    platform_role,
    tenant_id,
    subtenant_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'tenant_viewer',
    NULL,
    NULL
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Promote or demote a user in one place. This keeps the role model
-- consistent and prevents a user from ending up in the wrong portal.
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
    END,
    subtenant_id = NULL
  WHERE user_id = p_user_id
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;

ALTER FUNCTION public.set_user_platform_role(UUID, platform_role_enum) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.set_user_platform_role(UUID, platform_role_enum) TO authenticated, service_role;

-- Convenience helpers for super-admin bootstrap.
CREATE OR REPLACE FUNCTION public.make_user_super_admin(p_user_id UUID)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.set_user_platform_role(p_user_id, 'platform_super_admin');
$$;

CREATE OR REPLACE FUNCTION public.make_user_tenant_admin(p_user_id UUID, p_tenant_id UUID)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET
    platform_role = 'tenant_admin',
    tenant_id = p_tenant_id,
    subtenant_id = NULL
  WHERE user_id = p_user_id
  RETURNING *;
$$;

ALTER FUNCTION public.make_user_super_admin(UUID) OWNER TO postgres;
ALTER FUNCTION public.make_user_tenant_admin(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.make_user_super_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.make_user_tenant_admin(UUID, UUID) TO authenticated, service_role;
