CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role_id = 'super_admin'
      AND ur.clinic_id IS NULL
      AND ur.active = true
  );
$function$;

-- Prevent assigning super_admin with a non-null clinic_id (which would have granted global powers via the old function)
CREATE OR REPLACE FUNCTION public.enforce_super_admin_global()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role_id = 'super_admin' AND NEW.clinic_id IS NOT NULL THEN
    RAISE EXCEPTION 'super_admin role must have clinic_id = NULL (global scope)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_super_admin_global ON public.user_roles;
CREATE TRIGGER trg_enforce_super_admin_global
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_global();

-- Clean up any stray rows that would have bypassed the new is_super_admin() check
UPDATE public.user_roles
SET clinic_id = NULL
WHERE role_id = 'super_admin' AND clinic_id IS NOT NULL;