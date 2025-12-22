-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users with clinic access can view documents
CREATE POLICY "Users can view patient documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents'
  AND (
    is_admin_clinic((storage.foldername(name))[1]::uuid)
    OR is_receptionist((storage.foldername(name))[1]::uuid)
    OR is_health_pro((storage.foldername(name))[1]::uuid)
  )
);

-- Policy: Admin and receptionist can upload documents
CREATE POLICY "Staff can upload patient documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (
    is_admin_clinic((storage.foldername(name))[1]::uuid)
    OR is_receptionist((storage.foldername(name))[1]::uuid)
  )
);

-- Policy: Admin can delete documents
CREATE POLICY "Admin can delete patient documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-documents'
  AND is_admin_clinic((storage.foldername(name))[1]::uuid)
);