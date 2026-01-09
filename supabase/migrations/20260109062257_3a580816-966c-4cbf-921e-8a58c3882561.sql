-- Agregar columna sub_slots_per_block a clinic_settings
ALTER TABLE public.clinic_settings
ADD COLUMN sub_slots_per_block INTEGER NOT NULL DEFAULT 5;

-- Agregar constraint para validar rango 1-10
ALTER TABLE public.clinic_settings
ADD CONSTRAINT check_sub_slots_range CHECK (sub_slots_per_block >= 1 AND sub_slots_per_block <= 10);

-- Comentario descriptivo
COMMENT ON COLUMN public.clinic_settings.sub_slots_per_block IS 'Número de citas simultáneas permitidas en cada bloque de tiempo';