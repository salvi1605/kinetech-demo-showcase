
-- 1. Add max_concurrent column to treatment_types
ALTER TABLE public.treatment_types
ADD COLUMN max_concurrent INTEGER NOT NULL DEFAULT 2;

-- 2. Set existing exclusive treatments to max_concurrent = 1
UPDATE public.treatment_types
SET max_concurrent = 1
WHERE LOWER(name) IN ('drenaje linfático', 'drenaje + ultrasonido', 'masaje');

-- 3. Replace validate_and_create_appointment with max_concurrent logic
CREATE OR REPLACE FUNCTION public.validate_and_create_appointment(
  p_clinic_id uuid, p_practitioner_id uuid, p_patient_id uuid,
  p_date date, p_start_time time without time zone,
  p_sub_slot integer DEFAULT 1, p_treatment_type_key text DEFAULT 'fkt',
  p_notes text DEFAULT '', p_mode text DEFAULT 'in_person'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
BEGIN
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
  -- Get candidate's max_concurrent
  SELECT COALESCE(tt.max_concurrent, 2) INTO v_candidate_max_concurrent
  FROM treatment_types tt WHERE tt.id = v_treatment_type_id;
  v_candidate_max_concurrent := COALESCE(v_candidate_max_concurrent, 2);

  -- Get clinic sub_slots_per_block
  SELECT COALESCE(cs.sub_slots_per_block, 5) INTO v_max_sub_slots
  FROM clinic_settings cs WHERE cs.clinic_id = p_clinic_id;
  v_max_sub_slots := COALESCE(v_max_sub_slots, 5);

  -- Count existing appointments in this block
  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE practitioner_id = p_practitioner_id AND date = p_date
    AND start_time = p_start_time AND clinic_id = p_clinic_id AND status <> 'cancelled';

  -- If candidate is exclusive (max_concurrent=1), no other appointments allowed
  IF v_candidate_max_concurrent = 1 AND v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'EXCLUSIVE_CONFLICT',
      'error_message', 'Conflicto: el tratamiento ' || v_treatment_name || ' es exclusivo y ya hay citas en este horario');
  END IF;

  -- If there's an existing exclusive treatment in this block, reject
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

    -- Check max_concurrent limit: use MIN of all treatments' max_concurrent in the block (including candidate)
    IF (v_existing_count + 1) > LEAST(v_candidate_max_concurrent, v_existing_min_concurrent, v_max_sub_slots) THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'SLOT_FULL',
        'error_message', 'Se alcanzó el límite de pacientes simultáneos para este tratamiento');
    END IF;
  END IF;

  -- 7. Insertar cita
  INSERT INTO appointments (
    clinic_id, practitioner_id, patient_id, date, start_time,
    sub_slot, duration_minutes, status, mode, treatment_type_id, notes
  ) VALUES (
    p_clinic_id, p_practitioner_id, p_patient_id, p_date, p_start_time,
    p_sub_slot, 30, 'scheduled', p_mode::appointment_mode, v_treatment_type_id, p_notes
  ) RETURNING id INTO v_appointment_id;

  -- 8. AUTO-CREATE evolution stub
  INSERT INTO patient_clinical_notes (
    patient_id, clinic_id, practitioner_id, appointment_id,
    note_date, start_time, note_type, body, treatment_type, status
  ) VALUES (
    p_patient_id, p_clinic_id, p_practitioner_id, v_appointment_id,
    p_date, p_start_time, 'evolution', '', v_treatment_name, 'active'
  );

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id);
END;
$function$;

-- 4. Replace validate_and_update_appointment (both overloads)
-- Drop existing overloads first
DROP FUNCTION IF EXISTS public.validate_and_update_appointment(uuid, uuid, date, time, text, text, text);
DROP FUNCTION IF EXISTS public.validate_and_update_appointment(uuid, uuid, date, time, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.validate_and_update_appointment(
  p_appointment_id uuid, p_practitioner_id uuid DEFAULT NULL,
  p_date date DEFAULT NULL, p_start_time time DEFAULT NULL,
  p_status text DEFAULT NULL, p_treatment_type_key text DEFAULT NULL,
  p_notes text DEFAULT NULL, p_sub_slot integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
BEGIN
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

  -- 5. Verificar concurrencia usando max_concurrent
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

  -- 7. Ejecutar UPDATE
  UPDATE appointments
  SET practitioner_id = v_new_practitioner_id, date = v_new_date,
      start_time = v_new_start_time, sub_slot = v_free_slot,
      status = v_new_status::appointment_status, treatment_type_id = v_treatment_type_id,
      notes = v_new_notes, updated_at = now()
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

  RETURN jsonb_build_object('success', true, 'appointment_id', p_appointment_id, 'sub_slot', v_free_slot);
END;
$function$;
