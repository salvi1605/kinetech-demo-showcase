-- Fix: sync treatment_type in clinical notes to match appointments (source of truth)
UPDATE patient_clinical_notes pcn
SET treatment_type = COALESCE(tt.name, 'FKT'),
    updated_at = now()
FROM appointments a
LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
WHERE pcn.appointment_id = a.id
  AND pcn.note_type = 'evolution'
  AND a.status <> 'cancelled'
  AND pcn.status = 'active'
  AND tt.name IS DISTINCT FROM pcn.treatment_type;