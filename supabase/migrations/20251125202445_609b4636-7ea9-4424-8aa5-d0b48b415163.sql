-- Ensure tenant_owner role exists
INSERT INTO public.roles (id, description)
VALUES ('tenant_owner', 'Owner of account / multi-clinic')
ON CONFLICT (id) DO NOTHING;

-- Ensure clinic_settings has unique constraint on clinic_id
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