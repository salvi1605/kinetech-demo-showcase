CREATE POLICY "clinic_settings_staff_read"
ON public.clinic_settings
FOR SELECT
TO authenticated
USING (
  is_receptionist(clinic_id) OR is_health_pro(clinic_id)
);