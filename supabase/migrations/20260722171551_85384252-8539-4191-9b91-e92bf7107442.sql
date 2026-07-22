
-- 1. Campos de contacto en clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS appointment_instructions TEXT;

-- 2. Personalización de email en clinic_settings
ALTER TABLE public.clinic_settings
  ADD COLUMN IF NOT EXISTS email_subject_override TEXT,
  ADD COLUMN IF NOT EXISTS email_custom_message TEXT;

-- 3. RPC para consultar el último envío de una cita (mínima exposición + strict access)
CREATE OR REPLACE FUNCTION public.get_last_appointment_email_send(p_appointment_id uuid)
RETURNS TABLE(sent_at timestamp with time zone, recipient_email text, user_full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_clinic_id uuid;
BEGIN
  IF p_appointment_id IS NULL THEN
    RAISE EXCEPTION 'appointment_id es obligatorio';
  END IF;

  SELECT clinic_id INTO v_clinic_id
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Turno no encontrado';
  END IF;

  -- Autorización estricta: solo staff de la clínica de esa cita
  IF NOT (
    public.is_super_admin()
    OR public.is_admin_clinic(v_clinic_id)
    OR public.is_receptionist(v_clinic_id)
    OR public.is_health_pro(v_clinic_id)
  ) THEN
    RAISE EXCEPTION 'No tiene permisos para consultar los envíos de esta cita';
  END IF;

  RETURN QUERY
  SELECT
    al.created_at                          AS sent_at,
    (al.payload->>'recipient_email')::text AS recipient_email,
    u.full_name                            AS user_full_name
  FROM public.audit_log al
  LEFT JOIN public.users u ON u.id = al.user_id
  WHERE al.entity_type = 'appointment'
    AND al.entity_id = p_appointment_id
    AND al.action = 'send_info_email'
    AND al.clinic_id = v_clinic_id
  ORDER BY al.created_at DESC
  LIMIT 1;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_last_appointment_email_send(uuid) TO authenticated;
