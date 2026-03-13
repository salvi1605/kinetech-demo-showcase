
-- =====================================================
-- Migración: Refuerzo de integridad aprobado
-- 1. FK CASCADE → RESTRICT/SET NULL
-- 2. Trigger validación cross-clinic
-- 3. Índice faltante
-- =====================================================

-- 1a. appointments.practitioner_id: CASCADE → RESTRICT
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_practitioner_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_practitioner_id_fkey
    FOREIGN KEY (practitioner_id) REFERENCES practitioners(id) ON DELETE RESTRICT;

-- 1b. appointments.clinic_id: CASCADE → RESTRICT
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_clinic_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

-- 1c. patients.clinic_id: CASCADE → RESTRICT
ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_clinic_id_fkey;
ALTER TABLE patients
  ADD CONSTRAINT patients_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

-- 1d. patient_clinical_notes.clinic_id: CASCADE → RESTRICT
ALTER TABLE patient_clinical_notes
  DROP CONSTRAINT IF EXISTS patient_clinical_notes_clinic_id_fkey;
ALTER TABLE patient_clinical_notes
  ADD CONSTRAINT patient_clinical_notes_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

-- 1e. patient_clinical_notes.practitioner_id: CASCADE → SET NULL
ALTER TABLE patient_clinical_notes
  DROP CONSTRAINT IF EXISTS patient_clinical_notes_practitioner_id_fkey;
ALTER TABLE patient_clinical_notes
  ADD CONSTRAINT patient_clinical_notes_practitioner_id_fkey
    FOREIGN KEY (practitioner_id) REFERENCES practitioners(id) ON DELETE SET NULL;

-- 2. Trigger de validación cross-clinic
CREATE OR REPLACE FUNCTION fn_validate_appointment_clinic_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar que el paciente pertenezca a la misma clínica
  IF NEW.patient_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM patients WHERE id = NEW.patient_id AND clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'El paciente no pertenece a la clínica de la cita (patient_id=%, clinic_id=%)', NEW.patient_id, NEW.clinic_id;
    END IF;
  END IF;

  -- Validar que el profesional pertenezca a la misma clínica
  IF NOT EXISTS (
    SELECT 1 FROM practitioners WHERE id = NEW.practitioner_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'El profesional no pertenece a la clínica de la cita (practitioner_id=%, clinic_id=%)', NEW.practitioner_id, NEW.clinic_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_appointment_clinic ON appointments;
CREATE TRIGGER trg_validate_appointment_clinic
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_appointment_clinic_consistency();

-- 3. Índice faltante
CREATE INDEX IF NOT EXISTS idx_clinical_notes_practitioner
  ON patient_clinical_notes(practitioner_id);
