-- Crear función para verificar si el usuario es tenant_owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role_id = 'tenant_owner'
      AND ur.active = true
  );
$$;

-- Eliminar política existente de clinics
DROP POLICY IF EXISTS "clinics_admin_full_access" ON public.clinics;

-- Crear nueva política que permita acceso a admin_clinic Y tenant_owner
CREATE POLICY "clinics_admin_owner_full_access" 
ON public.clinics 
FOR ALL 
USING (
  is_admin_clinic(id) OR is_tenant_owner()
);