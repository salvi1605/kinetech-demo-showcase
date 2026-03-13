
-- Fix search_path on the new trigger function
CREATE OR REPLACE FUNCTION fn_validate_appointment_clinic_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.patient_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM patients WHERE id = NEW.patient_id AND clinic_id = NEW.clinic_id
    ) THEN
      RAISE EXCEPTION 'El paciente no pertenece a la clínica de la cita (patient_id=%, clinic_id=%)', NEW.patient_id, NEW.clinic_id;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM practitioners WHERE id = NEW.practitioner_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'El profesional no pertenece a la clínica de la cita (practitioner_id=%, clinic_id=%)', NEW.practitioner_id, NEW.clinic_id;
  END IF;

  RETURN NEW;
END;
$$;
