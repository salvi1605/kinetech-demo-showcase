-- 1) roles: restrict read to roles assigned to the caller, tenant owners or super admins
DROP POLICY IF EXISTS roles_authenticated_read ON public.roles;
CREATE POLICY roles_authenticated_read ON public.roles
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR public.is_tenant_owner()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = public.current_auth_user_id()
      AND ur.role_id = roles.id
  )
);

-- 2) contact_messages: keep public form submissions but validate content
DROP POLICY IF EXISTS contact_messages_anon_insert ON public.contact_messages;
DROP POLICY IF EXISTS contact_messages_auth_insert ON public.contact_messages;

CREATE POLICY contact_messages_anon_insert ON public.contact_messages
FOR INSERT TO anon
WITH CHECK (
  char_length(name) BETWEEN 1 AND 200
  AND char_length(message) BETWEEN 1 AND 5000
  AND char_length(email) <= 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (clinic IS NULL OR char_length(clinic) <= 200)
  AND is_read = false
);

CREATE POLICY contact_messages_auth_insert ON public.contact_messages
FOR INSERT TO authenticated
WITH CHECK (
  char_length(name) BETWEEN 1 AND 200
  AND char_length(message) BETWEEN 1 AND 5000
  AND char_length(email) <= 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (clinic IS NULL OR char_length(clinic) <= 200)
  AND is_read = false
);