-- Harden user_roles policies: explicit guard preventing non-super_admin
-- from inserting/updating rows with role_id = 'super_admin'
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;

CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      is_super_admin()
      OR ((clinic_id IS NOT NULL) AND is_admin_clinic(clinic_id))
    )
    AND (role_id <> 'super_admin' OR is_super_admin())
  );

CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR ((clinic_id IS NOT NULL) AND is_admin_clinic(clinic_id))
  )
  WITH CHECK (
    (
      is_super_admin()
      OR ((clinic_id IS NOT NULL) AND is_admin_clinic(clinic_id))
    )
    AND (role_id <> 'super_admin' OR is_super_admin())
  );