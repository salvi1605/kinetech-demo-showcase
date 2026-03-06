
-- Function: create evolution stub when an appointment is inserted
CREATE OR REPLACE FUNCTION public.fn_create_evolution_stub()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_treatment_name TEXT;
BEGIN
  -- Only create stub if patient_id is set and status is not cancelled
  IF NEW.patient_id IS NULL OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Skip if a stub already exists for this appointment
  IF EXISTS (
    SELECT 1 FROM patient_clinical_notes
    WHERE appointment_id = NEW.id AND note_type = 'evolution'
  ) THEN
    RETURN NEW;
  END IF;

  -- Resolve treatment name
  SELECT name INTO v_treatment_name
  FROM treatment_types
  WHERE id = NEW.treatment_type_id AND is_active = true
  LIMIT 1;

  v_treatment_name := COALESCE(v_treatment_name, 'FKT');

  -- Insert evolution stub
  INSERT INTO patient_clinical_notes (
    patient_id, clinic_id, practitioner_id, appointment_id,
    note_date, start_time, note_type, body, treatment_type, status, created_by
  ) VALUES (
    NEW.patient_id, NEW.clinic_id, NEW.practitioner_id, NEW.id,
    NEW.date, NEW.start_time, 'evolution', '', v_treatment_name, 'active', NEW.created_by
  );

  RETURN NEW;
END;
$function$;

-- Trigger: fires after each appointment insert
CREATE TRIGGER trg_create_evolution_stub
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_evolution_stub();
