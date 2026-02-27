
-- 1. Add description column to treatment_types
ALTER TABLE public.treatment_types ADD COLUMN IF NOT EXISTS description text;

-- 2. Create practitioner_treatments junction table
CREATE TABLE public.practitioner_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  treatment_type_id uuid NOT NULL REFERENCES public.treatment_types(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(practitioner_id, treatment_type_id)
);

-- 3. Enable RLS
ALTER TABLE public.practitioner_treatments ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "practitioner_treatments_admin_full_access"
ON public.practitioner_treatments FOR ALL
USING (is_admin_clinic(clinic_id));

CREATE POLICY "practitioner_treatments_staff_read"
ON public.practitioner_treatments FOR SELECT
USING (is_receptionist(clinic_id) OR is_health_pro(clinic_id));
