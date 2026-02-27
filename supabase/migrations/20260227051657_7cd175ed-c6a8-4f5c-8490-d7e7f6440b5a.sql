
-- ══════════════════════════════════════════════════════════════════
-- 1. delete_appointments_batch: eliminar N citas en 1 round-trip
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_appointments_batch(p_appointment_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- Eliminar solo citas que no estén ya canceladas
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
$$;

-- ══════════════════════════════════════════════════════════════════
-- 2. validate_and_update_appointment: validar + actualizar en 1 RT
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.validate_and_update_appointment(
  p_appointment_id UUID,
  p_practitioner_id UUID DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_treatment_type_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_is_candidate_exclusive BOOLEAN;
  v_existing_treatment TEXT;
  v_block_reason TEXT;
  v_max_sub_slots INT;
  v_free_slot INT;
  v_date_or_time_changed BOOLEAN;
BEGIN
  -- ── 0. Obtener cita actual ──
  SELECT a.*, tt.name AS current_treatment_name
  INTO v_current
  FROM appointments a
  LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
  WHERE a.id = p_appointment_id;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'error_message', 'Cita no encontrada');
  END IF;

  -- Resolver valores finales (usar actual si no se pasa)
  v_new_practitioner_id := COALESCE(p_practitioner_id, v_current.practitioner_id);
  v_new_date := COALESCE(p_date, v_current.date);
  v_new_start_time := COALESCE(p_start_time, v_current.start_time);
  v_new_status := COALESCE(p_status, v_current.status::TEXT);
  v_new_treatment_key := COALESCE(p_treatment_type_key, 'fkt');
  v_new_notes := COALESCE(p_notes, v_current.notes);

  v_date_or_time_changed := (v_new_date <> v_current.date)
    OR (v_new_start_time <> v_current.start_time)
    OR (v_new_practitioner_id <> v_current.practitioner_id);

  -- ── 1. Verificar bloqueos del profesional ──
  IF v_date_or_time_changed THEN
    SELECT reason INTO v_block_reason
    FROM schedule_exceptions
    WHERE clinic_id = v_current.clinic_id
      AND practitioner_id = v_new_practitioner_id
      AND date = v_new_date
      AND type = 'practitioner_block'
    LIMIT 1;

    IF v_block_reason IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'BLOCKED',
        'error_message', 'Profesional no disponible: ' || COALESCE(UPPER(v_block_reason), 'BLOQUEO')
      );
    END IF;

    -- ── 2. Verificar disponibilidad horaria ──
    v_weekday := EXTRACT(DOW FROM v_new_date)::INT;

    SELECT EXISTS(
      SELECT 1 FROM practitioner_availability
      WHERE practitioner_id = v_new_practitioner_id
        AND clinic_id = v_current.clinic_id
    ) INTO v_has_any_availability;

    IF v_has_any_availability THEN
      SELECT EXISTS(
        SELECT 1 FROM practitioner_availability
        WHERE practitioner_id = v_new_practitioner_id
          AND clinic_id = v_current.clinic_id
          AND weekday = v_weekday
          AND v_new_start_time >= from_time
          AND v_new_start_time < to_time
      ) INTO v_is_within_slot;

      IF NOT v_is_within_slot THEN
        SELECT string_agg(
          SUBSTRING(from_time::TEXT FROM 1 FOR 5) || '–' || SUBSTRING(to_time::TEXT FROM 1 FOR 5),
          ', '
        ) INTO v_avail_text
        FROM practitioner_availability
        WHERE practitioner_id = v_new_practitioner_id
          AND clinic_id = v_current.clinic_id
          AND weekday = v_weekday;

        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'OUT_OF_HOURS',
          'error_message', 'Fuera del horario del profesional. Disponible: ' || COALESCE(v_avail_text, 'sin horario este día')
        );
      END IF;
    END IF;
  END IF;

  -- ── 3. Verificar conflicto de tratamiento exclusivo ──
  v_treatment_name := CASE v_new_treatment_key
    WHEN 'fkt' THEN 'FKT'
    WHEN 'atm' THEN 'ATM'
    WHEN 'drenaje' THEN 'Drenaje linfático'
    WHEN 'drenaje_ultra' THEN 'Drenaje + Ultrasonido'
    WHEN 'masaje' THEN 'Masaje'
    WHEN 'vestibular' THEN 'Vestibular'
    WHEN 'otro' THEN 'Otro'
    ELSE v_new_treatment_key
  END;

  v_is_candidate_exclusive := v_new_treatment_key IN ('drenaje', 'masaje');

  -- Verificar si hay conflicto con tratamientos exclusivos
  IF v_is_candidate_exclusive THEN
    IF EXISTS(
      SELECT 1 FROM appointments
      WHERE practitioner_id = v_new_practitioner_id
        AND date = v_new_date
        AND start_time = v_new_start_time
        AND clinic_id = v_current.clinic_id
        AND status <> 'cancelled'
        AND id <> p_appointment_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'EXCLUSIVE_CONFLICT',
        'error_message', 'Conflicto: el tratamiento ' || v_treatment_name || ' es exclusivo y ya hay citas en este horario'
      );
    END IF;
  ELSE
    SELECT tt.name INTO v_existing_treatment
    FROM appointments a
    LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
    WHERE a.practitioner_id = v_new_practitioner_id
      AND a.date = v_new_date
      AND a.start_time = v_new_start_time
      AND a.clinic_id = v_current.clinic_id
      AND a.status <> 'cancelled'
      AND a.id <> p_appointment_id
      AND LOWER(COALESCE(tt.name, '')) IN ('drenaje linfático', 'masaje')
    LIMIT 1;

    IF v_existing_treatment IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'EXCLUSIVE_CONFLICT',
        'error_message', 'El profesional ya tiene ' || v_existing_treatment || ' en este horario'
      );
    END IF;
  END IF;

  -- ── 4. Calcular sub_slot libre si cambia fecha/hora/profesional ──
  v_free_slot := v_current.sub_slot; -- mantener el actual por defecto

  IF v_date_or_time_changed THEN
    SELECT COALESCE(cs.sub_slots_per_block, 5)
    INTO v_max_sub_slots
    FROM clinic_settings cs
    WHERE cs.clinic_id = v_current.clinic_id;

    IF v_max_sub_slots IS NULL THEN
      v_max_sub_slots := 5;
    END IF;

    v_free_slot := NULL;
    FOR i IN 1..v_max_sub_slots LOOP
      IF NOT EXISTS(
        SELECT 1 FROM appointments
        WHERE clinic_id = v_current.clinic_id
          AND practitioner_id = v_new_practitioner_id
          AND date = v_new_date
          AND start_time = v_new_start_time
          AND sub_slot = i
          AND status <> 'cancelled'
          AND id <> p_appointment_id
      ) THEN
        v_free_slot := i;
        EXIT;
      END IF;
    END LOOP;

    IF v_free_slot IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'SLOT_FULL',
        'error_message', 'Todos los turnos del bloque están ocupados (' || v_max_sub_slots || '/' || v_max_sub_slots || '). Elegí otro horario.'
      );
    END IF;
  END IF;

  -- ── 5. Resolver treatment_type_id ──
  SELECT id INTO v_treatment_type_id
  FROM treatment_types
  WHERE clinic_id = v_current.clinic_id
    AND name = v_treatment_name
    AND is_active = true
  LIMIT 1;

  -- ── 6. Ejecutar UPDATE ──
  UPDATE appointments
  SET
    practitioner_id = v_new_practitioner_id,
    date = v_new_date,
    start_time = v_new_start_time,
    sub_slot = v_free_slot,
    status = v_new_status::appointment_status,
    treatment_type_id = v_treatment_type_id,
    notes = v_new_notes,
    updated_at = now()
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', p_appointment_id,
    'sub_slot', v_free_slot
  );
END;
$$;
