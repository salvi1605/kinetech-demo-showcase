-- 1. Update can_view_user to explicitly require authentication
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- SECURITY: Require authentication first
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE (
      -- User can view themselves
      EXISTS (
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
      )
    )
  END;
$$;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "users_can_view_allowed" ON public.users;
DROP POLICY IF EXISTS "users_read_own_record" ON public.users;

-- 3. Create new policies with explicit authentication check
CREATE POLICY "users_authenticated_can_view_allowed"
ON public.users
FOR SELECT
TO authenticated
USING (can_view_user(id));

-- Add comment for documentation
COMMENT ON FUNCTION public.can_view_user IS 'Returns true only if the authenticated user can view the target user. Returns false for unauthenticated requests.';