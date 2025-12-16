-- Agregar columnas para soportar evoluciones y snapshots clínicos
ALTER TABLE patient_clinical_notes 
  ADD COLUMN IF NOT EXISTS note_type text NOT NULL DEFAULT 'evolution',
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS treatment_type text,
  ADD COLUMN IF NOT EXISTS clinical_data jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Hacer practitioner_id nullable (no siempre aplica para snapshots)
ALTER TABLE patient_clinical_notes 
  ALTER COLUMN practitioner_id DROP NOT NULL;

-- Crear índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_date ON patient_clinical_notes(patient_id, note_date);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_appointment ON patient_clinical_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type ON patient_clinical_notes(note_type);

-- Constraint para note_type válido
ALTER TABLE patient_clinical_notes 
  ADD CONSTRAINT valid_note_type CHECK (note_type IN ('evolution', 'snapshot'));

-- Habilitar realtime para actualizaciones en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE patient_clinical_notes;