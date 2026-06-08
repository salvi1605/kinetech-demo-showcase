
-- 1) user_roles: políticas explícitas por comando con WITH CHECK correcto
DROP POLICY IF EXISTS user_roles_admin_full_access ON public.user_roles;

CREATE POLICY user_roles_admin_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (clinic_id IS NOT NULL AND public.is_admin_clinic(clinic_id))
  );

CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (clinic_id IS NOT NULL AND public.is_admin_clinic(clinic_id))
  );

CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (clinic_id IS NOT NULL AND public.is_admin_clinic(clinic_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (clinic_id IS NOT NULL AND public.is_admin_clinic(clinic_id))
  );

CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (clinic_id IS NOT NULL AND public.is_admin_clinic(clinic_id))
  );

-- 2) storage.objects: políticas para clinic-backups (solo super_admin / service_role)
DROP POLICY IF EXISTS clinic_backups_super_admin_select ON storage.objects;
DROP POLICY IF EXISTS clinic_backups_super_admin_modify ON storage.objects;

CREATE POLICY clinic_backups_super_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'clinic-backups' AND public.is_super_admin());

CREATE POLICY clinic_backups_super_admin_modify ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'clinic-backups' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'clinic-backups' AND public.is_super_admin());

-- 3) storage.objects: política UPDATE para patient-documents (admin clínica o recepción)
DROP POLICY IF EXISTS patient_documents_update ON storage.objects;

CREATE POLICY patient_documents_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND EXISTS (
      SELECT 1 FROM public.patient_documents pd
      WHERE pd.file_url = storage.objects.name
        AND (public.is_admin_clinic(pd.clinic_id) OR public.is_receptionist(pd.clinic_id))
    )
  )
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND EXISTS (
      SELECT 1 FROM public.patient_documents pd
      WHERE pd.file_url = storage.objects.name
        AND (public.is_admin_clinic(pd.clinic_id) OR public.is_receptionist(pd.clinic_id))
    )
  );

-- 4) Fijar search_path en funciones pgmq y revocar ejecución pública
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
