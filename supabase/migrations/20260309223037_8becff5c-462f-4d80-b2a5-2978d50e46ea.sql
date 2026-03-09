
CREATE OR REPLACE FUNCTION public.validate_and_create_appointment(p_clinic_id uuid, p_practitioner_id uuid, p_patient_id uuid, p_date date, p_start_time time without time zone, p_sub_slot integer DEFAULT 1, p_treatment_type_key text DEFAULT 'fkt'::text, p_notes text DEFAULT ''::text, p_mode text DEFAULT 'in_person'::text)
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
  v_appointment_id UUID;
  v_block_reason TEXT;
  v_has_any_pt BOOLEAN;
  v_candidate_max_concurrent INT;
  v_existing_count INT;
  v_existing_min_concurrent INT;
  v_max_sub_slots INT;
  v_lock_key1 INT;
  v_lock_key2 INT;
  v_current_user_id UUID;
BEGIN
  -- ▶ Resolve current users.id from auth.uid()
  SELECT id INTO v_current_user_id FROM public.users WHERE auth_user_id = auth.uid();

  -- ▶ ADVISORY LOCK
  v_lock_key1 := hashtext(p_practitioner_id::text);
  v_lock_key2 := hashtext(p_clinic_id::text || '|' || p_date::text || '|' || p_start_time::text);
  PERFORM pg_advisory_xact_lock(v_lock_key1, v_lock_key2);

  -- 1. Verificar bloqueos del profesional
  SELECT reason INTO v_block_reason
  FROM schedule_exceptions
  WHERE clinic_id = p_clinic_id AND practitioner_id = p_practitioner_id
    AND date = p_date AND type = 'practitioner_block'
  LIMIT 1;

  IF v_block_reason IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'BLOCKED',
      'error_message', COALESCE(UPPER(v_block_reason), 'BLOQUEO'));
  END IF;

  -- 2. Verificar disponibilidad horaria
  v_weekday := EXTRACT(DOW FROM p_date)::INT;

  SELECT EXISTS(
    SELECT 1 FROM practitioner_availability
    WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id AND weekday = v_weekday
  ) INTO v_is_within_slot;

  IF NOT v_is_within_slot THEN
    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id LIMIT 1
    ) INTO v_has_any_availability;

    IF v_has_any_availability THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'OUT_OF_HOURS',
        'error_message', 'El profesional no tiene disponibilidad configurada para este día de la semana');
    END IF;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id
        AND weekday = v_weekday AND p_start_time >= from_time AND p_start_time < to_time
    ) INTO v_is_within_slot;

    IF NOT v_is_within_slot THEN
      SELECT string_agg(
        SUBSTRING(from_time::TEXT FROM 1 FOR 5) || '–' || SUBSTRING(to_time::TEXT FROM 1 FOR 5), ', '
      ) INTO v_avail_text
      FROM practitioner_availability
      WHERE practitioner_id = p_practitioner_id AND clinic_id = p_clinic_id AND weekday = v_weekday;

      RETURN jsonb_build_object('success', false, 'error_code', 'OUT_OF_HOURS',
        'error_message', 'Fuera del horario del profesional. Disponible: ' || COALESCE(v_avail_text, 'N/A'));
    END IF;
  END IF;

  -- 3. Verificar conflicto de sub-slot
  IF EXISTS(
    SELECT 1 FROM appointments
    WHERE clinic_id = p_clinic_id AND practitioner_id = p_practitioner_id
      AND date = p_date AND start_time = p_start_time AND sub_slot = p_sub_slot
      AND status <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_TAKEN',
      'error_message', 'El doctor ya tiene un turno en este Slot y horario');
  END IF;

  -- 4. Resolver treatment name
  v_treatment_name := CASE p_treatment_type_key
    WHEN 'fkt' THEN 'FKT' WHEN 'atm' THEN 'ATM'
    WHEN 'drenaje' THEN 'Drenaje linfático' WHEN 'drenaje_ultra' THEN 'Drenaje + Ultrasonido'
    WHEN 'masaje' THEN 'Masaje' WHEN 'vestibular' THEN 'Vestibular'
    WHEN 'otro' THEN 'Otro' ELSE p_treatment_type_key
  END;

  -- 4b. Verificar que el profesional puede realizar este tratamiento
  SELECT EXISTS(
    SELECT 1 FROM practitioner_treatments WHERE practitioner_id = p_practitioner_id
  ) INTO v_has_any_pt;

  IF v_has_any_pt THEN
    SELECT id INTO v_treatment_type_id
    FROM treatment_types
    WHERE clinic_id = p_clinic_id AND name = v_treatment_name AND is_active = true
    LIMIT 1;

    IF v_treatment_type_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM practitioner_treatments
      WHERE practitioner_id = p_practitioner_id AND treatment_type_id = v_treatment_type_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'TREATMENT_NOT_ALLOWED',
        'error_message', 'El profesional no tiene asignado el tratamiento: ' || v_treatment_name);
    END IF;
  END IF;

  -- 5. Resolver treatment_type_id si no se resolvió
  IF v_treatment_type_id IS NULL THEN
    SELECT id INTO v_treatment_type_id
    FROM treatment_types
    WHERE clinic_id = p_clinic_id AND name = v_treatment_name AND is_active = true
    LIMIT 1;
  END IF;

  -- 6. Verificar concurrencia usando max_concurrent
  SELECT COALESCE(tt.max_concurrent, 2) INTO v_candidate_max_concurrent
  FROM treatment_types tt WHERE tt.id = v_treatment_type_id;
  v_candidate_max_concurrent := COALESCE(v_candidate_max_concurrent, 2);

  SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots
  FROM clinic_settings cs WHERE cs.clinic_id = p_clinic_id;
  v_max_sub_slots := COALESCE(v_max_sub_slots, 5);

  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE practitioner_id = p_practitioner_id AND date = p_date
    AND start_time = p_start_time AND clinic_id = p_clinic_id AND status <> 'cancelled';

  IF v_candidate_max_concurrent = 1 AND v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
      'error_message', 'Conflicto: el tratamiento ' || v_treatment_name || ' es exclusivo y ya hay citas en este horario');
  END IF;

  IF v_existing_count > 0 THEN
    SELECT MIN(COALESCE(tt.max_concurrent, 2)) INTO v_existing_min_concurrent
    FROM appointments a
    LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
    WHERE a.practitioner_id = p_practitioner_id AND a.date = p_date
      AND a.start_time = p_start_time AND a.clinic_id = p_clinic_id AND a.status <> 'cancelled';

    IF v_existing_min_concurrent = 1 THEN
      SELECT tt.name INTO v_treatment_name
      FROM appointments a LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
      WHERE a.practitioner_id = p_practitioner_id AND a.date = p_date
        AND a.start_time = p_start_time AND a.clinic_id = p_clinic_id AND a.status <> 'cancelled'
        AND COALESCE(tt.max_concurrent, 2) = 1
      LIMIT 1;

      RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
        'error_message', 'El profesional ya tiene ' || COALESCE(v_treatment_name, 'tratamiento exclusivo') || ' en este horario');
    END IF;

    IF (v_existing_count + 1) > LEAST(v_candidate_max_concurrent, v_existing_min_concurrent, v_max_sub_slots) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
        'error_message', 'Se alcanzó el límite de pacientes simultáneos para este tratamiento');
    END IF;
  END IF;

  -- 7. Insertar cita CON created_by y updated_by
  INSERT INTO appointments (
    clinic_id, practitioner_id, patient_id, date, start_time,
    sub_slot, duration_minutes, status, mode, treatment_type_id, notes,
    created_by, updated_by
  ) VALUES (
    p_clinic_id, p_practitioner_id, p_patient_id, p_date, p_start_time,
    p_sub_slot, 30, 'scheduled', p_mode::appointment_mode, v_treatment_type_id, p_notes,
    v_current_user_id, v_current_user_id
  ) RETURNING id INTO v_appointment_id;

  -- 8. AUTO-CREATE evolution stub (idempotent — trigger may have already created it)
  INSERT INTO patient_clinical_notes (
    patient_id, clinic_id, practitioner_id, appointment_id,
    note_date, start_time, note_type, body, treatment_type, status, created_by
  ) VALUES (
    p_patient_id, p_clinic_id, p_practitioner_id, v_appointment_id,
    p_date, p_start_time, 'evolution', '', v_treatment_name, 'active', v_current_user_id
  )
  ON CONFLICT (appointment_id, note_type) WHERE appointment_id IS NOT NULL
  DO NOTHING;

  -- 9. ▶ AUDIT LOG: registrar creación
  INSERT INTO audit_log (clinic_id, user_id, entity_type, entity_id, action, payload)
  VALUES (
    p_clinic_id, v_current_user_id, 'appointment', v_appointment_id, 'create',
    jsonb_build_object(
      'date', p_date,
      'start_time', p_start_time::text,
      'practitioner_id', p_practitioner_id,
      'patient_id', p_patient_id,
      'treatment', v_treatment_name,
      'sub_slot', p_sub_slot
    )
  );

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id);
END;
$function$;
