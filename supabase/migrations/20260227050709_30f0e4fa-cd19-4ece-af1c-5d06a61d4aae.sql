
CREATE OR REPLACE FUNCTION public.validate_and_create_appointment(
  p_clinic_id uuid,
  p_practitioner_id uuid,
  p_patient_id uuid,
  p_date date,
  p_start_time time without time zone,
  p_sub_slot integer DEFAULT 1,
  p_treatment_type_key text DEFAULT 'fkt'::text,
  p_notes text DEFAULT ''::text,
  p_mode text DEFAULT 'in_person'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_weekday INT;
  v_has_any_availability BOOLEAN;
  v_is_within_slot BOOLEAN;
  v_avail_text TEXT;
  v_treatment_name TEXT;
  v_treatment_type_id UUID;
  v_is_candidate_exclusive BOOLEAN;
  v_existing_treatment TEXT;
  v_appointment_id UUID;
  v_block_reason TEXT;
BEGIN
  -- ── 1. Verificar bloqueos del profesional ──
  SELECT reason INTO v_block_reason
  FROM schedule_exceptions
  WHERE clinic_id = p_clinic_id
    AND practitioner_id = p_practitioner_id
    AND date = p_date
    AND type = 'practitioner_block'
  LIMIT 1;

  IF v_block_reason IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'BLOCKED',
      'error_message', COALESCE(UPPER(v_block_reason), 'BLOQUEO')
    );
  END IF;

  -- ── 2. Verificar disponibilidad horaria ──
  v_weekday := EXTRACT(DOW FROM p_date)::INT;

  SELECT EXISTS(
    SELECT 1 FROM practitioner_availability
    WHERE practitioner_id = p_practitioner_id
      AND clinic_id = p_clinic_id
      AND weekday = v_weekday
  ) INTO v_is_within_slot;

  IF NOT v_is_within_slot THEN
    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id
        AND clinic_id = p_clinic_id
      LIMIT 1
    ) INTO v_has_any_availability;

    IF v_has_any_availability THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'OUT_OF_HOURS',
        'error_message', 'El profesional no tiene disponibilidad configurada para este día de la semana'
      );
    END IF;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id
        AND clinic_id = p_clinic_id
        AND weekday = v_weekday
        AND p_start_time >= from_time
        AND p_start_time < to_time
    ) INTO v_is_within_slot;

    IF NOT v_is_within_slot THEN
      SELECT string_agg(
        SUBSTRING(from_time::TEXT FROM 1 FOR 5) || '–' || SUBSTRING(to_time::TEXT FROM 1 FOR 5),
        ', '
      ) INTO v_avail_text
      FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id
        AND clinic_id = p_clinic_id
        AND weekday = v_weekday;

      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'OUT_OF_HOURS',
        'error_message', 'Fuera del horario del profesional. Disponible: ' || COALESCE(v_avail_text, 'N/A')
      );
    END IF;
  END IF;

  -- ── 3. Verificar conflicto de sub-slot ──
  IF EXISTS(
    SELECT 1 FROM appointments
    WHERE clinic_id = p_clinic_id
      AND practitioner_id = p_practitioner_id
      AND date = p_date
      AND start_time = p_start_time
      AND sub_slot = p_sub_slot
      AND status <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SLOT_TAKEN',
      'error_message', 'El doctor ya tiene un turno en este Slot y horario'
    );
  END IF;

  -- ── 4. Verificar conflicto de tratamiento exclusivo ──
  v_treatment_name := CASE p_treatment_type_key
    WHEN 'fkt' THEN 'FKT'
    WHEN 'atm' THEN 'ATM'
    WHEN 'drenaje' THEN 'Drenaje linfático'
    WHEN 'drenaje_ultra' THEN 'Drenaje + Ultrasonido'
    WHEN 'masaje' THEN 'Masaje'
    WHEN 'vestibular' THEN 'Vestibular'
    WHEN 'otro' THEN 'Otro'
    ELSE p_treatment_type_key
  END;

  v_is_candidate_exclusive := p_treatment_type_key IN ('drenaje', 'masaje');

  SELECT tt.name INTO v_existing_treatment
  FROM appointments a
  LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
  WHERE a.practitioner_id = p_practitioner_id
    AND a.date = p_date
    AND a.start_time = p_start_time
    AND a.clinic_id = p_clinic_id
    AND a.status <> 'cancelled'
    AND (
      v_is_candidate_exclusive
      OR LOWER(COALESCE(tt.name, '')) IN ('drenaje linfático', 'masaje')
    )
  LIMIT 1;

  IF v_existing_treatment IS NOT NULL OR (v_is_candidate_exclusive AND EXISTS(
    SELECT 1 FROM appointments
    WHERE practitioner_id = p_practitioner_id
      AND date = p_date
      AND start_time = p_start_time
      AND clinic_id = p_clinic_id
      AND status <> 'cancelled'
  )) THEN
    IF v_is_candidate_exclusive THEN
      IF EXISTS(
        SELECT 1 FROM appointments
        WHERE practitioner_id = p_practitioner_id
          AND date = p_date
          AND start_time = p_start_time
          AND clinic_id = p_clinic_id
          AND status <> 'cancelled'
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'EXCLUSIVE_CONFLICT',
          'error_message', 'Conflicto: el tratamiento ' || v_treatment_name || ' es exclusivo y ya hay citas en este horario'
        );
      END IF;
    ELSE
      IF EXISTS(
        SELECT 1 FROM appointments a
        LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
        WHERE a.practitioner_id = p_practitioner_id
          AND a.date = p_date
          AND a.start_time = p_start_time
          AND a.clinic_id = p_clinic_id
          AND a.status <> 'cancelled'
          AND LOWER(COALESCE(tt.name, '')) IN ('drenaje linfático', 'masaje')
      ) THEN
        SELECT tt.name INTO v_existing_treatment
        FROM appointments a
        LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
        WHERE a.practitioner_id = p_practitioner_id
          AND a.date = p_date
          AND a.start_time = p_start_time
          AND a.clinic_id = p_clinic_id
          AND a.status <> 'cancelled'
          AND LOWER(COALESCE(tt.name, '')) IN ('drenaje linfático', 'masaje')
        LIMIT 1;

        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'EXCLUSIVE_CONFLICT',
          'error_message', 'El profesional ya tiene ' || COALESCE(v_existing_treatment, 'tratamiento exclusivo') || ' en este horario'
        );
      END IF;
    END IF;
  END IF;

  -- ── 5. Resolver treatment_type_id ──
  SELECT id INTO v_treatment_type_id
  FROM treatment_types
  WHERE clinic_id = p_clinic_id
    AND name = v_treatment_name
    AND is_active = true
  LIMIT 1;

  -- ── 6. Insertar cita ──
  INSERT INTO appointments (
    clinic_id, practitioner_id, patient_id, date, start_time,
    sub_slot, duration_minutes, status, mode, treatment_type_id, notes
  ) VALUES (
    p_clinic_id, p_practitioner_id, p_patient_id, p_date, p_start_time,
    p_sub_slot, 30, 'scheduled', p_mode::appointment_mode, v_treatment_type_id, p_notes
  )
  RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id
  );
END;
$function$;

-- Drop the old function with smallint signature to avoid ambiguity
DROP FUNCTION IF EXISTS public.validate_and_create_appointment(uuid, uuid, uuid, date, time without time zone, smallint, text, text, text);
