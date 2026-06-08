CREATE OR REPLACE FUNCTION public.log_appointment_email_sent(
  p_appointment_id uuid,
  p_recipient_email text,
  p_template_name text,
  p_was_test boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_clinic_id uuid;
  v_audit_id uuid;
BEGIN
  IF p_appointment_id IS NULL OR p_recipient_email IS NULL OR p_template_name IS NULL THEN
    RAISE EXCEPTION 'Faltan parámetros obligatorios';
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT clinic_id INTO v_clinic_id FROM public.appointments WHERE id = p_appointment_id;
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Turno no encontrado';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_admin_clinic(v_clinic_id)
    OR public.is_receptionist(v_clinic_id)
  ) THEN
    RAISE EXCEPTION 'No tiene permisos para registrar este envío';
  END IF;

  INSERT INTO public.audit_log (clinic_id, user_id, entity_type, entity_id, action, payload)
  VALUES (
    v_clinic_id,
    v_user_id,
    'appointment',
    p_appointment_id,
    'send_info_email',
    jsonb_build_object(
      'recipient_email', p_recipient_email,
      'template_name', p_template_name,
      'was_test', COALESCE(p_was_test, false),
      'sent_at', now()
    )
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_appointment_email_sent(uuid, text, text, boolean) TO authenticated;