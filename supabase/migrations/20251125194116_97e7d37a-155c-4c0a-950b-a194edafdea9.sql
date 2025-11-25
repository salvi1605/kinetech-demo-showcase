-- Asegurar que clinic_settings tenga todos los campos necesarios
-- Primero verificar si existen las columnas y agregarlas si faltan

-- Agregar columnas faltantes a clinic_settings si no existen
DO $$ 
BEGIN
  -- auto_mark_no_show
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinic_settings' 
    AND column_name = 'auto_mark_no_show'
  ) THEN
    ALTER TABLE public.clinic_settings 
    ADD COLUMN auto_mark_no_show boolean NOT NULL DEFAULT true;
  END IF;

  -- auto_mark_no_show_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinic_settings' 
    AND column_name = 'auto_mark_no_show_time'
  ) THEN
    ALTER TABLE public.clinic_settings 
    ADD COLUMN auto_mark_no_show_time time NOT NULL DEFAULT '00:00';
  END IF;
END $$;

-- Asegurar que clinic_id en clinic_settings sea único (para relación 1:1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clinic_settings_clinic_id_key'
  ) THEN
    ALTER TABLE public.clinic_settings
    ADD CONSTRAINT clinic_settings_clinic_id_key UNIQUE (clinic_id);
  END IF;
END $$;