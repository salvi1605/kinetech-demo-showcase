
-- 1. Insert super_admin role
INSERT INTO roles (id, description) VALUES ('super_admin', 'Administrador global del sistema - acceso total a todas las clínicas');

-- 2. Make clinic_id nullable in user_roles (only super_admin uses NULL)
ALTER TABLE user_roles ALTER COLUMN clinic_id DROP NOT NULL;

-- 3. Add CHECK constraint: super_admin requires NULL clinic_id, others require NOT NULL
ALTER TABLE user_roles ADD CONSTRAINT chk_super_admin_clinic
  CHECK (
    (role_id = 'super_admin' AND clinic_id IS NULL)
    OR (role_id <> 'super_admin' AND clinic_id IS NOT NULL)
  );

-- 4. Seed the root super_admin user
INSERT INTO user_roles (user_id, clinic_id, role_id, active)
VALUES ('f6157dc0-677c-4fd7-8441-bc424c4e5056', NULL, 'super_admin', true);

-- 5. Create is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role_id = 'super_admin'
      AND ur.active = true
  );
$$;

-- 6. Update is_admin_clinic to include super_admin bypass
CREATE OR REPLACE FUNCTION public.is_admin_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id IN ('admin_clinic', 'tenant_owner')
      AND ur.active = true
  );
$$;

-- 7. Update can_view_user to include super_admin
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE (
      public.is_super_admin()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id AND auth_user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur1
        JOIN public.users u ON ur1.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND ur1.role_id IN ('admin_clinic', 'tenant_owner')
        AND ur1.active = true
        AND EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = target_user_id AND ur2.clinic_id = ur1.clinic_id)
      )
    )
  END;
$$;

-- 8. Update clinics RLS policy for super_admin
DROP POLICY IF EXISTS clinics_admin_owner_full_access ON clinics;
CREATE POLICY clinics_admin_owner_full_access ON clinics FOR ALL
  TO authenticated USING (is_admin_clinic(id) OR is_super_admin());

-- 9. Update user_roles RLS policy for super_admin (handle NULL clinic_id)
DROP POLICY IF EXISTS user_roles_admin_full_access ON user_roles;
CREATE POLICY user_roles_admin_full_access ON user_roles FOR ALL
  TO authenticated USING (is_super_admin() OR (clinic_id IS NOT NULL AND is_admin_clinic(clinic_id)));

-- 10. Protect root super_admin trigger
CREATE OR REPLACE FUNCTION public.protect_root_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.role_id = 'super_admin' 
     AND OLD.user_id = 'f6157dc0-677c-4fd7-8441-bc424c4e5056'::uuid THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'No se puede eliminar el super_admin raíz del sistema';
    END IF;
    IF NEW.active = false THEN
      RAISE EXCEPTION 'No se puede desactivar el super_admin raíz del sistema';
    END IF;
    IF NEW.role_id <> 'super_admin' THEN
      RAISE EXCEPTION 'No se puede cambiar el rol del super_admin raíz del sistema';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_root_super_admin
  BEFORE UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION protect_root_super_admin();

-- 11. Block create_clinic_onboarding for everyone
CREATE OR REPLACE FUNCTION public.create_clinic_onboarding(p_name text, p_country_code text DEFAULT NULL::text, p_timezone text DEFAULT 'America/Argentina/Buenos_Aires'::text, p_default_currency text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'La creación de clínicas está deshabilitada. Contacte al administrador del sistema.';
END;
$function$;

-- 12. Create super_admin_create_clinic RPC
CREATE OR REPLACE FUNCTION public.super_admin_create_clinic(
  p_name text,
  p_country_code text DEFAULT 'AR',
  p_timezone text DEFAULT 'America/Argentina/Buenos_Aires',
  p_default_currency text DEFAULT 'ARS',
  p_owner_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_clinic_id UUID;
BEGIN
  -- Verify caller is super_admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo un super_admin puede crear clínicas';
  END IF;

  -- Create clinic
  INSERT INTO public.clinics (name, country_code, timezone, default_currency)
  VALUES (p_name, p_country_code, p_timezone, p_default_currency)
  RETURNING id INTO v_clinic_id;

  -- Create default clinic_settings
  INSERT INTO public.clinic_settings (
    clinic_id, min_slot_minutes, workday_start, workday_end,
    auto_mark_no_show, auto_mark_no_show_time, allow_professional_self_block
  ) VALUES (
    v_clinic_id, 30, '08:00:00', '19:00:00', true, '00:00:00', true
  );

  -- If owner specified, assign tenant_owner role
  IF p_owner_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, clinic_id, role_id, active)
    VALUES (p_owner_user_id, v_clinic_id, 'tenant_owner', true);
  END IF;

  RETURN v_clinic_id;
END;
$$;
