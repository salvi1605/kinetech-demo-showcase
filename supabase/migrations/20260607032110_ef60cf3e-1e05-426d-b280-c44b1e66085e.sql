
CREATE OR REPLACE FUNCTION public.get_first_visit_dates(
  p_clinic_id uuid,
  p_patient_ids uuid[]
)
RETURNS TABLE(patient_id uuid, first_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.patient_id, MIN(a.date) AS first_date
  FROM public.appointments a
  WHERE a.clinic_id = p_clinic_id
    AND a.patient_id = ANY(p_patient_ids)
    AND a.status::text IN ('scheduled', 'completed')
    AND (
      public.is_admin_clinic(p_clinic_id)
      OR public.is_receptionist(p_clinic_id)
      OR public.is_health_pro(p_clinic_id)
    )
  GROUP BY a.patient_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_first_visit_dates(uuid, uuid[]) TO authenticated;
