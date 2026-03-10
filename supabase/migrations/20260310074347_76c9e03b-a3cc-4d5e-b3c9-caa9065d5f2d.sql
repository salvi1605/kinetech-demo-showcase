
-- Drop and recreate to fix return type
DROP FUNCTION IF EXISTS public.validate_and_create_appointment(uuid,uuid,uuid,date,time without time zone,integer,text,text,text);

CREATE FUNCTION public.validate_and_create_appointment(
  p_clinic_id uuid, p_practitioner_id uuid, p_patient_id uuid,
  p_date date, p_start_time time without time zone,
  p_sub_slot integer DEFAULT 1,
  p_treatment_type_key text DEFAULT 'fkt'::text,
  p_notes text DEFAULT ''::text,
  p_mode text DEFAULT 'in_person'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_max_sub_slots INT;
  v_lock_key BIGINT;
BEGIN
  v_lock_key := abs(hashtext(p_clinic_id::text || p_date::text || p_start_time::text));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_clinic_id IS NULL OR p_practitioner_id IS NULL OR p_patient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'MISSING_FIELDS',
      'error_message', 'Faltan campos obligatorios');
  END IF;

  IF p_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'PAST_DATE',
      'error_message', 'No se pueden crear turnos en fechas pasadas');
  END IF;

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

  -- 3. Sub-slot conflict check GLOBAL (across all practitioners)
  IF EXISTS(
    SELECT 1 FROM appointments
    WHERE clinic_id = p_clinic_id AND date = p_date AND start_time = p_start_time AND sub_slot = p_sub_slot
      AND status <> 'cancelled'
  ) THEN
    SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots
    FROM clinic_settings cs WHERE cs.clinic_id = p_clinic_id;
    v_max_sub_slots := COALESCE(v_max_sub_slots, 5);

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

  -- 6. Treatment exclusivity
  v_candidate_max_concurrent := NULL;
  IF v_treatment_type_id IS NOT NULL THEN
    SELECT tt.max_concurrent INTO v_candidate_max_concurrent FROM treatment_types tt WHERE tt.id = v_treatment_type_id;
  END IF;
  v_candidate_max_concurrent := COALESCE(v_candidate_max_concurrent, 2);

  SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots FROM clinic_settings cs WHERE cs.clinic_id = p_clinic_id;
  v_max_sub_slots := COALESCE(v_max_sub_slots, 5);

  SELECT COUNT(*) INTO v_existing_count FROM appointments
  WHERE clinic_id = p_clinic_id AND date = p_date AND start_time = p_start_time
    AND status <> 'cancelled' AND treatment_type_id = v_treatment_type_id;

  v_existing_min_concurrent := v_candidate_max_concurrent;
  IF v_existing_count > 0 THEN
    SELECT MIN(tt2.max_concurrent) INTO v_existing_min_concurrent
    FROM appointments a2 JOIN treatment_types tt2 ON a2.treatment_type_id = tt2.id
    WHERE a2.clinic_id = p_clinic_id AND a2.date = p_date AND a2.start_time = p_start_time
      AND a2.status <> 'cancelled' AND a2.treatment_type_id = v_treatment_type_id;
    IF v_existing_min_concurrent IS NULL THEN v_existing_min_concurrent := v_candidate_max_concurrent; END IF;
    IF (v_existing_count + 1) > LEAST(v_candidate_max_concurrent, v_existing_min_concurrent, v_max_sub_slots) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
        'error_message', 'Se alcanzó el límite de pacientes simultáneos para este tratamiento');
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
$$;

-- Fix update RPC: sub_slot check global
DROP FUNCTION IF EXISTS public.validate_and_update_appointment(uuid,uuid,date,time without time zone,integer,text,text,text);

CREATE FUNCTION public.validate_and_update_appointment(
  p_appointment_id UUID,
  p_practitioner_id UUID DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_sub_slot INT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_treatment_type_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current RECORD;
  v_new_practitioner_id UUID;
  v_new_date DATE;
  v_new_start_time TIME;
  v_new_status TEXT;
  v_new_notes TEXT;
  v_treatment_type_id UUID;
  v_treatment_name TEXT;
  v_has_availability BOOLEAN;
  v_weekday INT;
  v_avail_text TEXT;
  v_old_status TEXT;
  v_block_reason TEXT;
  v_max_sub_slots INT;
  v_free_slot INT;
  v_date_or_time_changed BOOLEAN;
BEGIN
  SELECT * INTO v_current FROM appointments WHERE id = p_appointment_id;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'error_message', 'Turno no encontrado');
  END IF;

  v_old_status := v_current.status;
  v_new_practitioner_id := COALESCE(p_practitioner_id, v_current.practitioner_id);
  v_new_date := COALESCE(p_date, v_current.date);
  v_new_start_time := COALESCE(p_start_time, v_current.start_time);
  v_new_status := COALESCE(p_status, v_current.status::TEXT);
  v_new_notes := COALESCE(p_notes, v_current.notes);
  v_date_or_time_changed := (v_new_date <> v_current.date OR v_new_start_time <> v_current.start_time OR v_new_practitioner_id <> v_current.practitioner_id);

  IF v_date_or_time_changed AND v_new_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'PAST_DATE', 'error_message', 'No se pueden mover turnos a fechas pasadas');
  END IF;

  IF v_new_practitioner_id <> v_current.practitioner_id OR v_new_date <> v_current.date OR v_new_start_time <> v_current.start_time THEN
    v_weekday := EXTRACT(DOW FROM v_new_date)::INT;
    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability pa
      WHERE pa.practitioner_id = v_new_practitioner_id AND pa.clinic_id = v_current.clinic_id
        AND pa.weekday = v_weekday AND v_new_start_time >= pa.from_time AND v_new_start_time < pa.to_time
    ) INTO v_has_availability;
    IF NOT v_has_availability THEN
      IF EXISTS(SELECT 1 FROM practitioner_availability WHERE practitioner_id = v_new_practitioner_id AND clinic_id = v_current.clinic_id) THEN
        SELECT STRING_AGG(
          CASE weekday WHEN 0 THEN 'Dom' WHEN 1 THEN 'Lun' WHEN 2 THEN 'Mar' WHEN 3 THEN 'Mié' WHEN 4 THEN 'Jue' WHEN 5 THEN 'Vie' WHEN 6 THEN 'Sáb' END
          || ' ' || SUBSTRING(from_time::TEXT FROM 1 FOR 5) || '–' || SUBSTRING(to_time::TEXT FROM 1 FOR 5), ', '
        ) INTO v_avail_text FROM practitioner_availability
        WHERE practitioner_id = v_new_practitioner_id AND clinic_id = v_current.clinic_id AND weekday = v_weekday;
        RETURN jsonb_build_object('success', false, 'error_code', 'OUT_OF_HOURS',
          'error_message', 'Fuera del horario del profesional. Disponible: ' || COALESCE(v_avail_text, 'N/A'));
      END IF;
    END IF;
  END IF;

  SELECT reason INTO v_block_reason FROM schedule_exceptions
  WHERE clinic_id = v_current.clinic_id AND date = v_new_date
    AND (practitioner_id IS NULL OR practitioner_id = v_new_practitioner_id)
    AND type = 'practitioner_block'
    AND (from_time IS NULL OR v_new_start_time >= from_time)
    AND (to_time IS NULL OR v_new_start_time < to_time) LIMIT 1;
  IF v_block_reason IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'BLOCKED', 'error_message', 'Agenda bloqueada: ' || v_block_reason);
  END IF;

  -- 4. Sub_slot GLOBAL
  v_free_slot := v_current.sub_slot;
  IF v_date_or_time_changed THEN
    SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots FROM clinic_settings cs WHERE cs.clinic_id = v_current.clinic_id;
    v_max_sub_slots := COALESCE(v_max_sub_slots, 5);
    IF p_sub_slot IS NOT NULL THEN
      IF p_sub_slot < 1 OR p_sub_slot > v_max_sub_slots THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
          'error_message', 'Sub-slot ' || p_sub_slot || ' fuera de rango (1-' || v_max_sub_slots || ')');
      END IF;
      IF EXISTS(
        SELECT 1 FROM appointments WHERE clinic_id = v_current.clinic_id
          AND date = v_new_date AND start_time = v_new_start_time AND sub_slot = p_sub_slot
          AND status <> 'cancelled' AND id <> p_appointment_id
      ) THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
          'error_message', 'El sub-slot ' || p_sub_slot || ' ya está ocupado. Elegí otro.');
      END IF;
      v_free_slot := p_sub_slot;
    ELSE
      v_free_slot := NULL;
      FOR i IN 1..v_max_sub_slots LOOP
        IF NOT EXISTS(
          SELECT 1 FROM appointments WHERE clinic_id = v_current.clinic_id
            AND date = v_new_date AND start_time = v_new_start_time AND sub_slot = i
            AND status <> 'cancelled' AND id <> p_appointment_id
        ) THEN
          v_free_slot := i; EXIT;
        END IF;
      END LOOP;
      IF v_free_slot IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
          'error_message', 'Todos los turnos del bloque están ocupados (' || v_max_sub_slots || '/' || v_max_sub_slots || '). Elegí otro horario.');
      END IF;
    END IF;
  END IF;

  IF p_treatment_type_key IS NOT NULL THEN
    v_treatment_name := CASE p_treatment_type_key
      WHEN 'fkt' THEN 'FKT' WHEN 'atm' THEN 'ATM'
      WHEN 'drenaje' THEN 'Drenaje linfático' WHEN 'drenaje_ultra' THEN 'Drenaje + Ultrasonido'
      WHEN 'masaje' THEN 'Masaje' WHEN 'vestibular' THEN 'Vestibular'
      WHEN 'otro' THEN 'Otro' ELSE p_treatment_type_key END;
    SELECT id INTO v_treatment_type_id FROM treatment_types
    WHERE clinic_id = v_current.clinic_id AND name = v_treatment_name AND (is_active = true OR is_active IS NULL) LIMIT 1;
  ELSE
    v_treatment_type_id := v_current.treatment_type_id;
  END IF;

  UPDATE appointments
  SET practitioner_id = v_new_practitioner_id, date = v_new_date, start_time = v_new_start_time,
      sub_slot = v_free_slot, status = v_new_status::appointment_status,
      treatment_type_id = v_treatment_type_id, notes = v_new_notes, updated_at = now()
  WHERE id = p_appointment_id;

  IF v_old_status::TEXT <> v_new_status THEN
    INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by)
    VALUES (p_appointment_id, v_old_status::appointment_status, v_new_status::appointment_status,
      (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1));
  END IF;

  IF v_date_or_time_changed THEN
    UPDATE patient_clinical_notes SET note_date = v_new_date, start_time = v_new_start_time,
      practitioner_id = v_new_practitioner_id, updated_at = now()
    WHERE appointment_id = p_appointment_id AND note_type = 'evolution';
  END IF;

  RETURN jsonb_build_object('success', true, 'appointment_id', p_appointment_id, 'sub_slot', v_free_slot);
END;
$$;

-- Fix existing collision: reassign Losi's appointment to next free sub_slot
UPDATE appointments
SET sub_slot = (
  SELECT MIN(s) FROM generate_series(1, 5) s
  WHERE s NOT IN (
    SELECT a2.sub_slot FROM appointments a2
    WHERE a2.clinic_id = appointments.clinic_id
      AND a2.date = appointments.date
      AND a2.start_time = appointments.start_time
      AND a2.status <> 'cancelled'
      AND a2.id <> appointments.id
  )
)
WHERE id = '25c02b67-84ee-4d41-b538-2ab541f78a8e';
