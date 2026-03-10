
CREATE OR REPLACE FUNCTION public.validate_and_create_appointment(
  p_clinic_id uuid, p_practitioner_id uuid, p_patient_id uuid,
  p_date date, p_start_time time without time zone,
  p_sub_slot integer DEFAULT 1, p_treatment_type_key text DEFAULT 'fkt'::text,
  p_notes text DEFAULT ''::text, p_mode text DEFAULT 'in_person'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_treatment_type_id UUID;
  v_treatment_name TEXT;
  v_appointment_id UUID;
  v_has_availability BOOLEAN;
  v_weekday INT;
  v_avail_text TEXT;
  v_can_treat BOOLEAN;
  v_candidate_max_concurrent INT;
  v_existing_count INT;
  v_existing_min_concurrent INT;
  v_existing_exclusive_name TEXT;
  v_max_sub_slots INT;
  v_lock_key BIGINT;
BEGIN
  -- Advisory lock per practitioner+slot for serialization
  v_lock_key := abs(hashtext(p_practitioner_id::text || p_clinic_id::text || p_date::text || p_start_time::text));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 1. Basic validation
  IF p_clinic_id IS NULL OR p_practitioner_id IS NULL OR p_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'MISSING_FIELDS',
      'error_message', 'Faltan campos obligatorios');
  END IF;

  IF p_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'PAST_DATE',
      'error_message', 'No se pueden crear turnos en fechas pasadas');
  END IF;

  -- 2. Availability check
  v_weekday := EXTRACT(DOW FROM p_date)::INT;
  SELECT EXISTS(
    SELECT 1 FROM practitioner_availability pa
    WHERE pa.practitioner_id = p_practitioner_id AND pa.clinic_id = p_clinic_id
      AND pa.weekday = v_weekday AND p_start_time >= pa.from_time AND p_start_time < pa.to_time
  ) INTO v_has_availability;

  IF NOT v_has_availability THEN
    IF EXISTS(SELECT 1 FROM practitioner_availability WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id) THEN
      SELECT STRING_AGG(
        CASE weekday WHEN 0 THEN 'Dom' WHEN 1 THEN 'Lun' WHEN 2 THEN 'Mar'
          WHEN 3 THEN 'Mié' WHEN 4 THEN 'Jue' WHEN 5 THEN 'Vie' WHEN 6 THEN 'Sáb' END
        || ' ' || SUBSTRING(from_time::TEXT FROM 1 FOR 5) || '–' || SUBSTRING(to_time::TEXT FROM 1 FOR 5), ', '
      ) INTO v_avail_text
      FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id AND weekday = v_weekday;
      RETURN jsonb_build_object('success', false, 'error_code', 'OUT_OF_HOURS',
        'error_message', 'Fuera del horario del profesional. Disponible: ' || COALESCE(v_avail_text, 'N/A'));
    END IF;
  END IF;

  -- 3. Sub-slot conflict check GLOBAL (visual uniqueness across all practitioners)
  SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots
  FROM clinic_settings cs WHERE cs.clinic_id = p_clinic_id;
  v_max_sub_slots := COALESCE(v_max_sub_slots, 5);

  IF EXISTS(
    SELECT 1 FROM appointments
    WHERE clinic_id = p_clinic_id AND date = p_date AND start_time = p_start_time AND sub_slot = p_sub_slot
      AND status <> 'cancelled'
  ) THEN
    p_sub_slot := NULL;
    FOR i IN 1..v_max_sub_slots LOOP
      IF NOT EXISTS(
        SELECT 1 FROM appointments
        WHERE clinic_id = p_clinic_id AND date = p_date AND start_time = p_start_time AND sub_slot = i
          AND status <> 'cancelled'
      ) THEN
        p_sub_slot := i;
        EXIT;
      END IF;
    END LOOP;

    IF p_sub_slot IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
        'error_message', 'Todos los sub-slots del bloque están ocupados');
    END IF;
  END IF;

  -- 4. Resolve treatment
  v_treatment_name := CASE p_treatment_type_key
    WHEN 'fkt' THEN 'FKT' WHEN 'atm' THEN 'ATM'
    WHEN 'drenaje' THEN 'Drenaje linfático' WHEN 'drenaje_ultra' THEN 'Drenaje + Ultrasonido'
    WHEN 'masaje' THEN 'Masaje' WHEN 'vestibular' THEN 'Vestibular'
    WHEN 'otro' THEN 'Otro' ELSE p_treatment_type_key
  END;

  SELECT EXISTS(
    SELECT 1 FROM practitioner_treatments pt JOIN treatment_types tt ON pt.treatment_type_id = tt.id
    WHERE pt.practitioner_id = p_practitioner_id AND pt.clinic_id = p_clinic_id AND tt.name = v_treatment_name
  ) INTO v_can_treat;

  IF NOT v_can_treat THEN
    IF EXISTS(SELECT 1 FROM practitioner_treatments WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'TREATMENT_NOT_ALLOWED',
        'error_message', 'Este profesional no tiene habilitado el tratamiento: ' || v_treatment_name);
    END IF;
  END IF;

  SELECT id INTO v_treatment_type_id FROM treatment_types
  WHERE clinic_id = p_clinic_id AND name = v_treatment_name AND (is_active = true OR is_active IS NULL) LIMIT 1;

  IF v_treatment_type_id IS NULL THEN
    SELECT id INTO v_treatment_type_id FROM treatment_types
    WHERE clinic_id = p_clinic_id AND (is_active = true OR is_active IS NULL) ORDER BY created_at LIMIT 1;
  END IF;

  -- 6. PER-PRACTITIONER capacity validation (across ALL treatment types)
  -- Resolve max_concurrent for the new treatment
  v_candidate_max_concurrent := NULL;
  IF v_treatment_type_id IS NOT NULL THEN
    SELECT tt.max_concurrent INTO v_candidate_max_concurrent FROM treatment_types tt WHERE tt.id = v_treatment_type_id;
  END IF;
  v_candidate_max_concurrent := COALESCE(v_candidate_max_concurrent, 2);

  -- Count ALL active appointments for THIS PRACTITIONER in this block (regardless of treatment)
  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE practitioner_id = p_practitioner_id
    AND clinic_id = p_clinic_id
    AND date = p_date
    AND start_time = p_start_time
    AND status <> 'cancelled';

  -- If new treatment is exclusive and practitioner already has appointments → reject
  IF v_candidate_max_concurrent = 1 AND v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
      'error_message', 'Conflicto: el tratamiento ' || v_treatment_name || ' es exclusivo y el profesional ya tiene citas en este horario');
  END IF;

  IF v_existing_count > 0 THEN
    -- Check if any existing appointment has an exclusive treatment
    SELECT MIN(COALESCE(tt.max_concurrent, 2)) INTO v_existing_min_concurrent
    FROM appointments a
    LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
    WHERE a.practitioner_id = p_practitioner_id
      AND a.clinic_id = p_clinic_id
      AND a.date = p_date
      AND a.start_time = p_start_time
      AND a.status <> 'cancelled';

    -- If any existing treatment is exclusive → reject
    IF v_existing_min_concurrent = 1 THEN
      SELECT tt.name INTO v_existing_exclusive_name
      FROM appointments a
      LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
      WHERE a.practitioner_id = p_practitioner_id
        AND a.clinic_id = p_clinic_id
        AND a.date = p_date
        AND a.start_time = p_start_time
        AND a.status <> 'cancelled'
        AND COALESCE(tt.max_concurrent, 2) = 1
      LIMIT 1;

      RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
        'error_message', 'El profesional ya tiene ' || COALESCE(v_existing_exclusive_name, 'tratamiento exclusivo') || ' en este horario');
    END IF;

    -- Check overall capacity: (existing + 1) must not exceed the most restrictive limit
    IF (v_existing_count + 1) > LEAST(v_candidate_max_concurrent, v_existing_min_concurrent, v_max_sub_slots) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
        'error_message', 'Se alcanzó el límite de pacientes simultáneos para este profesional en este horario');
    END IF;
  END IF;

  -- 7. Insert
  INSERT INTO appointments (
    clinic_id, practitioner_id, patient_id, date, start_time,
    duration_minutes, sub_slot, status, notes, treatment_type_id, mode, created_by, updated_by
  ) VALUES (
    p_clinic_id, p_practitioner_id, p_patient_id, p_date, p_start_time,
    30, p_sub_slot, 'scheduled', p_notes, v_treatment_type_id, p_mode::appointment_mode,
    (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  ) RETURNING id INTO v_appointment_id;

  -- 8. Evolution stub
  INSERT INTO patient_clinical_notes (
    patient_id, clinic_id, practitioner_id, appointment_id,
    note_date, start_time, note_type, body, treatment_type, status, created_by
  ) VALUES (
    p_patient_id, p_clinic_id, p_practitioner_id, v_appointment_id,
    p_date, p_start_time, 'evolution', '', p_treatment_type_key, 'active',
    (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  ) ON CONFLICT (appointment_id, note_type) WHERE appointment_id IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id, 'sub_slot', p_sub_slot);
END;
$function$;
