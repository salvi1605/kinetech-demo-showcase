ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_charged boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.appointments.is_charged IS 'Cobro de la sesión, independiente del estado de asistencia. Solo admin/dueño puede cambiarlo.';

CREATE OR REPLACE FUNCTION public.fn_guard_appointment_is_charged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'no_show' THEN
    NEW.is_charged := false;
  END IF;
  IF NEW.is_charged IS DISTINCT FROM OLD.is_charged
     AND auth.uid() IS NOT NULL
     AND NOT (public.is_super_admin() OR public.is_admin_clinic(NEW.clinic_id)) THEN
    RAISE EXCEPTION 'Solo administración o dueño pueden modificar el cargo' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_appointment_is_charged ON public.appointments;
CREATE TRIGGER trg_guard_appointment_is_charged BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_appointment_is_charged();