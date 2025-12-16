-- Eliminar política anterior que solo permite manage_own por practitioner_id
DROP POLICY IF EXISTS "clinical_notes_pro_manage_own" ON patient_clinical_notes;

-- Política para que health_pro pueda ver notas de pacientes asignados (con citas)
CREATE POLICY "clinical_notes_pro_view_assigned"
ON patient_clinical_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = patient_clinical_notes.patient_id
      AND a.practitioner_id = current_practitioner_id()
  )
);

-- Política para que health_pro pueda insertar notas de pacientes asignados
CREATE POLICY "clinical_notes_pro_insert_assigned"
ON patient_clinical_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = patient_clinical_notes.patient_id
      AND a.practitioner_id = current_practitioner_id()
  )
);

-- Política para que health_pro pueda actualizar notas que creó o de pacientes asignados
CREATE POLICY "clinical_notes_pro_update_assigned"
ON patient_clinical_notes
FOR UPDATE
USING (
  -- Puede actualizar si es el creador
  created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR
  -- O si tiene citas con el paciente
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = patient_clinical_notes.patient_id
      AND a.practitioner_id = current_practitioner_id()
  )
);

-- Política para que receptionist pueda ver notas (no insertar/modificar)
CREATE POLICY "clinical_notes_recep_view"
ON patient_clinical_notes
FOR SELECT
USING (is_receptionist(clinic_id));