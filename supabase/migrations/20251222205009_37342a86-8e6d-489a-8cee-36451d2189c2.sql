-- Agregar columnas faltantes a practitioners
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS license_id text;