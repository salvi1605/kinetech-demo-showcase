ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS email_reminders_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clinic_settings.email_reminders_enabled IS 'Habilita el envío manual de recordatorios/informaciones de turnos por correo. Por defecto false.';