CREATE OR REPLACE FUNCTION public.get_last_clinic_backup_at(_clinic_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _result timestamptz;
BEGIN
  IF NOT (
    public.is_super_admin()
    OR public.is_admin_clinic(_clinic_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND ur.clinic_id = _clinic_id
        AND ur.role_id = 'tenant_owner'
        AND ur.active = true
    )
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT max(o.created_at) INTO _result
  FROM storage.objects o
  WHERE o.bucket_id = 'clinic-backups'
    AND o.name LIKE _clinic_id::text || '/%';
  RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_last_clinic_backup_at(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_last_clinic_backup_at(uuid) TO authenticated;