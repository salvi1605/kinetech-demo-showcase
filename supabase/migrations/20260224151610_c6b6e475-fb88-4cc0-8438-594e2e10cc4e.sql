-- Seed treatment_types for all existing clinics
-- Using the 7 defined TreatmentType values with appropriate durations
INSERT INTO public.treatment_types (clinic_id, name, default_duration_minutes, is_active)
SELECT c.id, t.name, t.duration, true
FROM public.clinics c
CROSS JOIN (VALUES
  ('FKT', 30),
  ('ATM', 30),
  ('Drenaje linfático', 30),
  ('Drenaje + Ultrasonido', 30),
  ('Masaje', 30),
  ('Vestibular', 30),
  ('Otro', 30)
) AS t(name, duration)
WHERE NOT EXISTS (
  SELECT 1 FROM public.treatment_types tt 
  WHERE tt.clinic_id = c.id AND tt.name = t.name
);