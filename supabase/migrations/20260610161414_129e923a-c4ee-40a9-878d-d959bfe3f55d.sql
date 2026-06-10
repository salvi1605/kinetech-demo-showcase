CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON public.appointments (clinic_id, date, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_patient_status
  ON public.appointments (clinic_id, patient_id, status);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_active_name
  ON public.patients (clinic_id, is_deleted, full_name);