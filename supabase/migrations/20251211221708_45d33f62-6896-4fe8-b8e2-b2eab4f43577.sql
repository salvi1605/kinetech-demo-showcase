-- Add date_of_birth column to patients table
ALTER TABLE public.patients
ADD COLUMN date_of_birth date NULL;