CREATE UNIQUE INDEX idx_unique_evolution_per_appointment
  ON patient_clinical_notes (appointment_id, note_type)
  WHERE appointment_id IS NOT NULL;