-- Actualizar función is_admin_clinic para incluir tenant_owner
CREATE OR REPLACE FUNCTION public.is_admin_clinic(target_clinic_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id IN ('admin_clinic', 'tenant_owner')
      AND ur.active = true
  );
$function$;