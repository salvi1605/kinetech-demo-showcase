-- Add missing columns for preferred name and emergency contact relationship
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS preferred_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;