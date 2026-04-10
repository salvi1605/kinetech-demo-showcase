-- Drop the unique constraint that prevents multiple roles per clinic
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_unique_user_clinic;

-- Add a new constraint: same user can't have the SAME role twice in the same clinic
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_unique_user_clinic_role UNIQUE (user_id, clinic_id, role_id);