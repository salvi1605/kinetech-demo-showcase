

# Plan: Ajustar validación de concurrencia por profesional y tratamiento

## Problema actual

La RPC `validate_and_create_appointment` tiene dos problemas en su validación de exclusividad (paso 6):

1. **Cuenta solo citas del mismo tratamiento** (`treatment_type_id = v_treatment_type_id`), no todas las citas del profesional en ese bloque. Si un profesional tiene un tratamiento exclusivo (`max_concurrent=1`) y ya tiene una cita con otro tratamiento, la validación no lo detecta.

2. **La cuenta es a nivel de clínica**, no por profesional. La variable `v_existing_count` no filtra por `practitioner_id`, así que citas de otros profesionales inflan el conteo erróneamente.

La RPC `validate_and_update_appointment` sí filtra por `practitioner_id` (correcto), pero tiene la misma debilidad de solo verificar el mismo `treatment_type_id` parcialmente.

El índice único `uq_appointments_active_slot` en `(clinic_id, date, start_time, sub_slot)` se mantiene como protección técnica de unicidad visual.

## Cambio propuesto

Modificar el **paso 6 (exclusividad de tratamiento)** en ambas RPCs para:

1. Contar **todas** las citas activas del **mismo profesional** en ese bloque horario (sin filtrar por treatment_type_id)
2. Verificar si alguna cita existente tiene un tratamiento exclusivo (`max_concurrent = 1`) → rechazar
3. Verificar si el nuevo tratamiento es exclusivo y ya hay citas → rechazar
4. Verificar que `(citas_existentes + 1) <= min(max_concurrent del nuevo tratamiento, min(max_concurrent de citas existentes))`

## Archivos a modificar

**Solo migraciones SQL** (2 RPCs):

- `validate_and_create_appointment` — reescribir paso 6 con lógica per-practitioner
- `validate_and_update_appointment` — ya filtra por practitioner, ajustar para considerar todos los tratamientos del bloque

No se tocan archivos frontend. No se modifica el índice único existente.

## Lógica detallada (pseudo-SQL)

```text
-- Para el profesional X en fecha Y hora Z:
SELECT COUNT(*) INTO v_practitioner_count
FROM appointments
WHERE practitioner_id = p_practitioner_id
  AND date = p_date AND start_time = p_start_time
  AND status <> 'cancelled'
  AND id <> excluded_id;

-- ¿Alguna existente es exclusiva?
SELECT MIN(COALESCE(tt.max_concurrent, 2)) INTO v_min_existing
FROM appointments a
LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
WHERE a.practitioner_id = ... (same filters);

-- Si min_existing = 1 y hay citas → rechazar
-- Si nuevo max_concurrent = 1 y hay citas → rechazar
-- Si (count + 1) > LEAST(nuevo_max, min_existing) → rechazar
```

## Resultado esperado

- Profesional con tratamiento exclusivo (`max_concurrent=1`): solo 1 paciente en ese bloque
- Profesional con tratamiento regular (`max_concurrent=2`): hasta 2 pacientes en ese bloque
- Distintos profesionales: independientes entre sí
- Índice único visual: se mantiene como safety net técnico

