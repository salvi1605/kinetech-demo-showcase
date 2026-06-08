
CREATE OR REPLACE FUNCTION public.get_appointment_email_audit(
  p_clinic_id uuid DEFAULT NULL,
  p_recipient text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  clinic_id uuid,
  clinic_name text,
  user_id uuid,
  user_full_name text,
  user_email text,
  appointment_id uuid,
  recipient_email text,
  template_name text,
  was_test boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo super_admin puede consultar la auditoría de emails';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      al.id,
      al.created_at,
      al.clinic_id,
      c.name AS clinic_name,
      al.user_id,
      u.full_name AS user_full_name,
      u.email AS user_email,
      al.entity_id AS appointment_id,
      (al.payload->>'recipient_email') AS recipient_email,
      (al.payload->>'template_name') AS template_name,
      COALESCE((al.payload->>'was_test')::boolean, false) AS was_test
    FROM public.audit_log al
    LEFT JOIN public.clinics c ON c.id = al.clinic_id
    LEFT JOIN public.users u ON u.id = al.user_id
    WHERE al.entity_type = 'appointment'
      AND al.action = 'send_info_email'
      AND (p_clinic_id IS NULL OR al.clinic_id = p_clinic_id)
      AND (p_recipient IS NULL OR (al.payload->>'recipient_email') ILIKE '%' || p_recipient || '%')
      AND (p_date_from IS NULL OR al.created_at >= p_date_from)
      AND (p_date_to IS NULL OR al.created_at <= p_date_to)
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  )
  SELECT
    f.id, f.created_at, f.clinic_id, f.clinic_name,
    f.user_id, f.user_full_name, f.user_email,
    f.appointment_id, f.recipient_email, f.template_name, f.was_test,
    (SELECT total FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointment_email_audit(uuid, text, timestamptz, timestamptz, int, int) TO authenticated;
