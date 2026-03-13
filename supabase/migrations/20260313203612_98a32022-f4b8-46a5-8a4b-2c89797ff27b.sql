
-- 1. Receptionist can INSERT documents
CREATE POLICY "documents_recep_insert"
ON public.patient_documents FOR INSERT
WITH CHECK (is_receptionist(clinic_id));

-- 2. Health pro can INSERT documents for assigned patients
CREATE POLICY "documents_pro_insert_assigned"
ON public.patient_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = patient_documents.patient_id
      AND a.practitioner_id = current_practitioner_id()
  )
);

-- 3. Update storage INSERT policy to include receptionist and health_pro
DROP POLICY IF EXISTS "Staff can upload patient documents" ON storage.objects;

CREATE POLICY "Staff can upload patient documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (
    is_admin_clinic((storage.foldername(name))[1]::uuid)
    OR is_receptionist((storage.foldername(name))[1]::uuid)
    OR is_health_pro((storage.foldername(name))[1]::uuid)
  )
);
