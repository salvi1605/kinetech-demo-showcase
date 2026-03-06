
-- =====================================================
-- Audit tracking: update RPCs to capture user and log changes
-- =====================================================

-- 1. UPDATE validate_and_create_appointment to set created_by/updated_by and log to audit_log
CREATE OR REPLACE FUNCTION public.validate_and_create_appointment(
  p_clinic_id uuid, p_practitioner_id uuid, p_patient_id uuid,
  p_date date, p_start_time time without time zone,
  p_sub_slot integer DEFAULT 1, p_treatment_type_key text DEFAULT 'fkt'::text,
  p_notes text DEFAULT ''::text, p_mode text DEFAULT 'in_person'::text
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

  -- 8. AUTO-CREATE evolution stub
  INSERT INTO patient_clinical_notes (
    patient_id, clinic_id, practitioner_id, appointment_id,
    note_date, start_time, note_type, body, treatment_type, status, created_by
  ) VALUES (
    p_patient_id, p_clinic_id, p_practitioner_id, v_appointment_id,
    p_date, p_start_time, 'evolution', '', v_treatment_name, 'active', v_current_user_id
  );

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


-- 2. UPDATE validate_and_update_appointment to set updated_by and log changes
CREATE OR REPLACE FUNCTION public.validate_and_update_appointment(
  p_appointment_id uuid,
  p_practitioner_id uuid DEFAULT NULL::uuid,
  p_date date DEFAULT NULL::date,
  p_start_time time without time zone DEFAULT NULL::time without time zone,
  p_status text DEFAULT NULL::text,
  p_treatment_type_key text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_sub_slot integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current RECORD;
  v_new_practitioner_id UUID;
  v_new_date DATE;
  v_new_start_time TIME;
  v_new_status TEXT;
  v_new_treatment_key TEXT;
  v_new_notes TEXT;
  v_weekday INT;
  v_has_any_availability BOOLEAN;
  v_is_within_slot BOOLEAN;
  v_avail_text TEXT;
  v_treatment_name TEXT;
  v_treatment_type_id UUID;
  v_block_reason TEXT;
  v_max_sub_slots INT;
  v_free_slot INT;
  v_date_or_time_changed BOOLEAN;
  v_evo_body TEXT;
  v_has_any_pt BOOLEAN;
  v_candidate_max_concurrent INT;
  v_existing_count INT;
  v_existing_min_concurrent INT;
  v_existing_exclusive_name TEXT;
  v_dest_key1 INT;
  v_dest_key2 INT;
  v_src_key1 INT;
  v_src_key2 INT;
  v_current_user_id UUID;
  v_audit_changes JSONB;
  v_audit_action TEXT;
BEGIN
  -- ▶ Resolve current users.id from auth.uid()
  SELECT id INTO v_current_user_id FROM public.users WHERE auth_user_id = auth.uid();

  -- 0. Obtener cita actual
  SELECT a.*, tt.name AS current_treatment_name
  INTO v_current
  FROM appointments a
  LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
  WHERE a.id = p_appointment_id;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'error_message', 'Cita no encontrada');
  END IF;

  v_new_practitioner_id := COALESCE(p_practitioner_id, v_current.practitioner_id);
  v_new_date := COALESCE(p_date, v_current.date);
  v_new_start_time := COALESCE(p_start_time, v_current.start_time);
  v_new_status := COALESCE(p_status, v_current.status::TEXT);
  v_new_treatment_key := COALESCE(p_treatment_type_key, 'fkt');
  v_new_notes := COALESCE(p_notes, v_current.notes);

  v_date_or_time_changed := (v_new_date <> v_current.date)
    OR (v_new_start_time <> v_current.start_time)
    OR (v_new_practitioner_id <> v_current.practitioner_id);

  -- ▶ ADVISORY LOCKS
  v_dest_key1 := hashtext(v_new_practitioner_id::text);
  v_dest_key2 := hashtext(v_current.clinic_id::text || '|' || v_new_date::text || '|' || v_new_start_time::text);

  IF v_date_or_time_changed THEN
    v_src_key1 := hashtext(v_current.practitioner_id::text);
    v_src_key2 := hashtext(v_current.clinic_id::text || '|' || v_current.date::text || '|' || v_current.start_time::text);

    IF (v_src_key1, v_src_key2) = (v_dest_key1, v_dest_key2) THEN
      PERFORM pg_advisory_xact_lock(v_dest_key1, v_dest_key2);
    ELSIF (v_src_key1 < v_dest_key1) OR (v_src_key1 = v_dest_key1 AND v_src_key2 < v_dest_key2) THEN
      PERFORM pg_advisory_xact_lock(v_src_key1, v_src_key2);
      PERFORM pg_advisory_xact_lock(v_dest_key1, v_dest_key2);
    ELSE
      PERFORM pg_advisory_xact_lock(v_dest_key1, v_dest_key2);
      PERFORM pg_advisory_xact_lock(v_src_key1, v_src_key2);
    END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(v_dest_key1, v_dest_key2);
  END IF;

  -- 1. Verificar bloqueos del profesional
  IF v_date_or_time_changed THEN
    SELECT reason INTO v_block_reason
    FROM schedule_exceptions
    WHERE clinic_id = v_current.clinic_id AND practitioner_id = v_new_practitioner_id
      AND date = v_new_date AND type = 'practitioner_block'
    LIMIT 1;

    IF v_block_reason IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'BLOCKED',
        'error_message', 'Profesional no disponible: ' || COALESCE(UPPER(v_block_reason), 'BLOQUEO'));
    END IF;

    -- 2. Verificar disponibilidad horaria
    v_weekday := EXTRACT(DOW FROM v_new_date)::INT;

    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability
      WHERE practitioner_id = v_new_practitioner_id AND clinic_id = v_current.clinic_id
    ) INTO v_has_any_availability;

    IF v_has_any_availability THEN
      SELECT EXISTS(
        SELECT 1 FROM practitioner_availability
        WHERE practitioner_id = v_new_practitioner_id AND clinic_id = v_current.clinic_id
          AND weekday = v_weekday AND v_new_start_time >= from_time AND v_new_start_time < to_time
      ) INTO v_is_within_slot;

      IF NOT v_is_within_slot THEN
        SELECT string_agg(
          SUBSTRING(from_time::TEXT FROM 1 FOR 5) || '–' || SUBSTRING(to_time::TEXT FROM 1 FOR 5), ', '
        ) INTO v_avail_text
        FROM practitioner_availability
        WHERE practitioner_id = v_new_practitioner_id AND clinic_id = v_current.clinic_id AND weekday = v_weekday;

        RETURN jsonb_build_object('success', false, 'error_code', 'OUT_OF_HOURS',
          'error_message', 'Fuera del horario del profesional. Disponible: ' || COALESCE(v_avail_text, 'sin horario este día'));
      END IF;
    END IF;
  END IF;

  -- 3. Resolver treatment name
  v_treatment_name := CASE v_new_treatment_key
    WHEN 'fkt' THEN 'FKT' WHEN 'atm' THEN 'ATM'
    WHEN 'drenaje' THEN 'Drenaje linfático' WHEN 'drenaje_ultra' THEN 'Drenaje + Ultrasonido'
    WHEN 'masaje' THEN 'Masaje' WHEN 'vestibular' THEN 'Vestibular'
    WHEN 'otro' THEN 'Otro' ELSE v_new_treatment_key
  END;

  -- 3b. Verificar que el profesional puede realizar este tratamiento
  SELECT EXISTS(
    SELECT 1 FROM practitioner_treatments WHERE practitioner_id = v_new_practitioner_id
  ) INTO v_has_any_pt;

  IF v_has_any_pt THEN
    SELECT id INTO v_treatment_type_id
    FROM treatment_types
    WHERE clinic_id = v_current.clinic_id AND name = v_treatment_name AND is_active = true
    LIMIT 1;

    IF v_treatment_type_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM practitioner_treatments
      WHERE practitioner_id = v_new_practitioner_id AND treatment_type_id = v_treatment_type_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'TREATMENT_NOT_ALLOWED',
        'error_message', 'El profesional no tiene asignado el tratamiento: ' || v_treatment_name);
    END IF;
  END IF;

  -- 4. Resolver treatment_type_id si no se resolvió
  IF v_treatment_type_id IS NULL THEN
    SELECT id INTO v_treatment_type_id
    FROM treatment_types
    WHERE clinic_id = v_current.clinic_id AND name = v_treatment_name AND is_active = true
    LIMIT 1;
  END IF;

  -- 5. Verificar concurrencia
  SELECT COALESCE(tt.max_concurrent, 2) INTO v_candidate_max_concurrent
  FROM treatment_types tt WHERE tt.id = v_treatment_type_id;
  v_candidate_max_concurrent := COALESCE(v_candidate_max_concurrent, 2);

  SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots
  FROM clinic_settings cs WHERE cs.clinic_id = v_current.clinic_id;
  v_max_sub_slots := COALESCE(v_max_sub_slots, 5);

  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE practitioner_id = v_new_practitioner_id AND date = v_new_date
    AND start_time = v_new_start_time AND clinic_id = v_current.clinic_id
    AND status <> 'cancelled' AND id <> p_appointment_id;

  IF v_candidate_max_concurrent = 1 AND v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
      'error_message', 'Conflicto: el tratamiento ' || v_treatment_name || ' es exclusivo y ya hay citas en este horario');
  END IF;

  IF v_existing_count > 0 THEN
    SELECT MIN(COALESCE(tt.max_concurrent, 2)) INTO v_existing_min_concurrent
    FROM appointments a
    LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
    WHERE a.practitioner_id = v_new_practitioner_id AND a.date = v_new_date
      AND a.start_time = v_new_start_time AND a.clinic_id = v_current.clinic_id
      AND a.status <> 'cancelled' AND a.id <> p_appointment_id;

    IF v_existing_min_concurrent = 1 THEN
      SELECT tt.name INTO v_existing_exclusive_name
      FROM appointments a LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
      WHERE a.practitioner_id = v_new_practitioner_id AND a.date = v_new_date
        AND a.start_time = v_new_start_time AND a.clinic_id = v_current.clinic_id
        AND a.status <> 'cancelled' AND a.id <> p_appointment_id
        AND COALESCE(tt.max_concurrent, 2) = 1
      LIMIT 1;

      RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
        'error_message', 'El profesional ya tiene ' || COALESCE(v_existing_exclusive_name, 'tratamiento exclusivo') || ' en este horario');
    END IF;

    IF (v_existing_count + 1) > LEAST(v_candidate_max_concurrent, v_existing_min_concurrent, v_max_sub_slots) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
        'error_message', 'Se alcanzó el límite de pacientes simultáneos para este tratamiento');
    END IF;
  END IF;

  -- 6. Calcular sub_slot
  v_free_slot := v_current.sub_slot;

  IF v_date_or_time_changed THEN
    IF p_sub_slot IS NOT NULL THEN
      IF p_sub_slot < 1 OR p_sub_slot > v_max_sub_slots THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
          'error_message', 'Sub-slot ' || p_sub_slot || ' fuera de rango (1-' || v_max_sub_slots || ')');
      END IF;

      IF EXISTS(
        SELECT 1 FROM appointments
        WHERE clinic_id = v_current.clinic_id AND practitioner_id = v_new_practitioner_id
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
          SELECT 1 FROM appointments
          WHERE clinic_id = v_current.clinic_id AND practitioner_id = v_new_practitioner_id
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

  -- 7. Ejecutar UPDATE CON updated_by
  UPDATE appointments
  SET practitioner_id = v_new_practitioner_id, date = v_new_date,
      start_time = v_new_start_time, sub_slot = v_free_slot,
      status = v_new_status::appointment_status, treatment_type_id = v_treatment_type_id,
      notes = v_new_notes, updated_at = now(),
      updated_by = v_current_user_id
  WHERE id = p_appointment_id;

  -- 8. MOVE evolution if date/time/practitioner changed
  IF v_date_or_time_changed THEN
    UPDATE patient_clinical_notes
    SET note_date = v_new_date, start_time = v_new_start_time,
        practitioner_id = v_new_practitioner_id, updated_at = now()
    WHERE appointment_id = p_appointment_id;
  END IF;

  -- 9. HANDLE CANCELLATION
  IF v_new_status = 'cancelled' AND v_current.status::TEXT <> 'cancelled' THEN
    SELECT body INTO v_evo_body
    FROM patient_clinical_notes
    WHERE appointment_id = p_appointment_id AND note_type = 'evolution'
    LIMIT 1;

    IF v_evo_body IS NOT NULL THEN
      IF TRIM(v_evo_body) = '' THEN
        DELETE FROM patient_clinical_notes
        WHERE appointment_id = p_appointment_id AND note_type = 'evolution';
      ELSE
        UPDATE patient_clinical_notes
        SET body = body || E'\n[Sistema] Cita cancelada el ' || TO_CHAR(now(), 'DD/MM/YYYY HH24:MI'),
            status = 'canceled', updated_at = now()
        WHERE appointment_id = p_appointment_id AND note_type = 'evolution';
      END IF;
    END IF;
  END IF;

  -- 10. ▶ AUDIT LOG: registrar solo los campos que cambiaron
  v_audit_changes := '{}'::jsonb;

  IF v_new_date <> v_current.date THEN
    v_audit_changes := v_audit_changes || jsonb_build_object('date', jsonb_build_object('from', v_current.date, 'to', v_new_date));
  END IF;

  IF v_new_start_time <> v_current.start_time THEN
    v_audit_changes := v_audit_changes || jsonb_build_object('start_time', jsonb_build_object('from', v_current.start_time::text, 'to', v_new_start_time::text));
  END IF;

  IF v_new_practitioner_id <> v_current.practitioner_id THEN
    v_audit_changes := v_audit_changes || jsonb_build_object('practitioner_id', jsonb_build_object('from', v_current.practitioner_id, 'to', v_new_practitioner_id));
  END IF;

  IF v_new_status <> v_current.status::TEXT THEN
    v_audit_changes := v_audit_changes || jsonb_build_object('status', jsonb_build_object('from', v_current.status::text, 'to', v_new_status));
  END IF;

  IF v_free_slot <> v_current.sub_slot THEN
    v_audit_changes := v_audit_changes || jsonb_build_object('sub_slot', jsonb_build_object('from', v_current.sub_slot, 'to', v_free_slot));
  END IF;

  IF v_new_notes IS DISTINCT FROM v_current.notes THEN
    v_audit_changes := v_audit_changes || jsonb_build_object('notes', jsonb_build_object('from', COALESCE(v_current.notes, ''), 'to', COALESCE(v_new_notes, '')));
  END IF;

  -- Determine action type
  IF v_new_status = 'cancelled' AND v_current.status::TEXT <> 'cancelled' THEN
    v_audit_action := 'cancel';
  ELSIF v_date_or_time_changed THEN
    v_audit_action := 'reschedule';
  ELSE
    v_audit_action := 'update';
  END IF;

  -- Only log if something actually changed
  IF v_audit_changes <> '{}'::jsonb THEN
    INSERT INTO audit_log (clinic_id, user_id, entity_type, entity_id, action, payload)
    VALUES (
      v_current.clinic_id, v_current_user_id, 'appointment', p_appointment_id, v_audit_action,
      jsonb_build_object('changes', v_audit_changes)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'appointment_id', p_appointment_id, 'sub_slot', v_free_slot);
END;
$function$;


-- 3. UPDATE delete_appointments_batch to log deletions
CREATE OR REPLACE FUNCTION public.delete_appointments_batch(p_appointment_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_count INT;
  v_current_user_id UUID;
  v_appt RECORD;
BEGIN
  SELECT id INTO v_current_user_id FROM public.users WHERE auth_user_id = auth.uid();

  -- Log each deletion before deleting
  FOR v_appt IN
    SELECT id, clinic_id, date, start_time, practitioner_id, patient_id
    FROM appointments WHERE id = ANY(p_appointment_ids)
  LOOP
    INSERT INTO audit_log (clinic_id, user_id, entity_type, entity_id, action, payload)
    VALUES (
      v_appt.clinic_id, v_current_user_id, 'appointment', v_appt.id, 'delete',
      jsonb_build_object(
        'date', v_appt.date,
        'start_time', v_appt.start_time::text,
        'practitioner_id', v_appt.practitioner_id,
        'patient_id', v_appt.patient_id
      )
    );
  END LOOP;

  WITH deleted AS (
    DELETE FROM appointments
    WHERE id = ANY(p_appointment_ids)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'deleted_count', v_deleted_count,
    'requested_count', array_length(p_appointment_ids, 1)
  );
END;
$function$;
