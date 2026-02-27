-- Unique constraint: no two active patients in the same clinic can share document_id (DNI)
CREATE UNIQUE INDEX idx_patients_unique_document_per_clinic 
ON patients (clinic_id, document_id) 
WHERE is_deleted = false AND document_id IS NOT NULL AND document_id <> '';