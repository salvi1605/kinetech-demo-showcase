CREATE OR REPLACE FUNCTION public.fn_sync_evolution_treatment_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_treatment_name TEXT;
BEGIN
  IF NEW.treatment_type_id IS DISTINCT FROM OLD.treatment_type_id THEN
    SELECT name INTO v_treatment_name
    FROM treatment_types
    WHERE id = NEW.treatment_type_id;

    v_treatment_name := COALESCE(v_treatment_name, 'FKT');

    UPDATE patient_clinical_notes
    SET treatment_type = v_treatment_name,
        updated_at = now()
    WHERE appointment_id = NEW.id
      AND note_type = 'evolution';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_evolution_treatment
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_evolution_treatment_type();