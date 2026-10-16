CREATE OR REPLACE FUNCTION public.fn_guard_appointment_is_charged()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'no_show' THEN
    NEW.is_charged := false;
  END IF;
  IF NEW.is_charged IS DISTINCT FROM OLD.is_charged
     AND auth.uid() IS NOT NULL
     AND NOT (public.is_super_admin() OR public.is_admin_clinic(NEW.clinic_id) OR public.is_receptionist(NEW.clinic_id)) THEN
    RAISE EXCEPTION 'Solo recepción, administración o dueño pueden modificar el cargo' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_audit_appointment_is_charged()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_charged IS DISTINCT FROM OLD.is_charged THEN
    INSERT INTO public.audit_log (clinic_id, user_id, entity_type, entity_id, action, payload)
    VALUES (
      NEW.clinic_id,
      (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1),
      'appointment', NEW.id, 'update_charge',
      jsonb_build_object('changes', jsonb_build_object('is_charged', jsonb_build_object('from', OLD.is_charged, 'to', NEW.is_charged)),
                         'status', NEW.status::text)
    );
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_audit_appointment_is_charged ON public.appointments;
CREATE TRIGGER trg_audit_appointment_is_charged AFTER UPDATE OF is_charged ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_appointment_is_charged();