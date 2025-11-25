-- Drop existing problematic policies
DROP POLICY IF EXISTS "users_admin_can_view" ON public.users;
DROP POLICY IF EXISTS "users_can_view_self" ON public.users;

-- Create a security definer function to check if user can view other users
-- This avoids recursion by not triggering RLS on users table
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- User can view themselves
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = target_user_id 
    AND auth_user_id = auth.uid()
  )
  OR
  -- Or user is admin in any clinic that the target user belongs to
  EXISTS (
    SELECT 1
    FROM public.user_roles ur1
    JOIN public.users u ON ur1.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND ur1.role_id = 'admin_clinic'
    AND ur1.active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = target_user_id
      AND ur2.clinic_id = ur1.clinic_id
    )
  );
$$;

-- Create new simplified policies using the security definer function
CREATE POLICY "users_can_view_allowed"
ON public.users
FOR SELECT
TO authenticated
USING (public.can_view_user(id));

-- Allow users to view their own record without the function for better performance
CREATE POLICY "users_read_own_record"
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

COMMENT ON FUNCTION public.can_view_user IS 'Security definer function to check if authenticated user can view target user. Prevents RLS recursion.';
