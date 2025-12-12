-- Agregar columnas de seguro y preferencias de contacto a la tabla patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS obra_social text,
ADD COLUMN IF NOT EXISTS numero_afiliado text,
ADD COLUMN IF NOT EXISTS sesiones_autorizadas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS copago numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contact_auth_whatsapp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_auth_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_preference text DEFAULT 'none';

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.patients.obra_social IS 'Obra social o seguro médico del paciente';
COMMENT ON COLUMN public.patients.numero_afiliado IS 'Número de afiliado a la obra social';
COMMENT ON COLUMN public.patients.sesiones_autorizadas IS 'Cantidad de sesiones autorizadas por la obra social';
COMMENT ON COLUMN public.patients.copago IS 'Monto del copago por sesión';
COMMENT ON COLUMN public.patients.contact_auth_whatsapp IS 'Autorización para contactar por WhatsApp';
COMMENT ON COLUMN public.patients.contact_auth_email IS 'Autorización para contactar por E-mail';
COMMENT ON COLUMN public.patients.reminder_preference IS 'Preferencia de recordatorio: 24h, none, etc.';