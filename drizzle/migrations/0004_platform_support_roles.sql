CREATE OR REPLACE FUNCTION public.assign_platform_roles_to_clinic(_clinic_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  SELECT id INTO v_user FROM public.users WHERE lower(email) = 'salvi1605@gmail.com' LIMIT 1;
  IF v_user IS NULL THEN RETURN; END IF;
  -- super_admin is global (clinic_id NULL) by enforce_super_admin_global
  INSERT INTO public.user_roles (user_id, clinic_id, role_id, active)
  SELECT v_user, NULL, 'super_admin', true
  WHERE EXISTS (SELECT 1 FROM public.roles WHERE id = 'super_admin')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND clinic_id IS NULL AND role_id = 'super_admin');
  IF _clinic_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, clinic_id, role_id, active)
    SELECT v_user, _clinic_id, r.id, true FROM public.roles r
    WHERE r.id <> 'super_admin'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.clinic_id = _clinic_id AND ur.role_id = r.id);
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.assign_platform_roles_to_clinic(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_fn_clinics_assign_platform_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assign_platform_roles_to_clinic(NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_clinics_assign_platform_roles ON public.clinics;
CREATE TRIGGER trg_clinics_assign_platform_roles AFTER INSERT ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_clinics_assign_platform_roles();

CREATE OR REPLACE FUNCTION public.get_platform_staff_user_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT user_id FROM public.user_roles WHERE role_id = 'super_admin' AND active IS TRUE
$$;
REVOKE ALL ON FUNCTION public.get_platform_staff_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_staff_user_ids() TO authenticated;