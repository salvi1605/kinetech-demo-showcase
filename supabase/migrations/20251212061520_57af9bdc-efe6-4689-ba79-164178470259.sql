-- Update can_view_user function to include tenant_owner role
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- User can view themselves
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = target_user_id 
    AND auth_user_id = auth.uid()
  )
  OR
  -- Or user is admin_clinic OR tenant_owner in any clinic that the target user belongs to
  EXISTS (
    SELECT 1
    FROM public.user_roles ur1
    JOIN public.users u ON ur1.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND ur1.role_id IN ('admin_clinic', 'tenant_owner')
    AND ur1.active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = target_user_id
      AND ur2.clinic_id = ur1.clinic_id
    )
  );
$function$;