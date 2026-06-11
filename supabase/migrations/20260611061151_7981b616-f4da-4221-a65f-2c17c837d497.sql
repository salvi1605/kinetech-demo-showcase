CREATE POLICY "clinics_staff_read" ON public.clinics
  FOR SELECT
  TO authenticated
  USING (
    public.is_receptionist(id)
    OR public.is_health_pro(id)
  );