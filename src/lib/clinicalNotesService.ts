import { supabase } from '@/integrations/supabase/client';
import type { EvolutionEntry } from '@/types/patient';
import type { TreatmentType } from '@/types/appointments';
import type { ClinicalSummaryDay } from '@/contexts/AppContext';

export interface ClinicalNoteRow {
  id: string;
  patient_id: string;
  clinic_id: string;
  practitioner_id: string | null;
  note_date: string;
  title: string | null;
  body: string;
  note_type: 'evolution' | 'snapshot';
  appointment_id: string | null;
  start_time: string | null;
  treatment_type: string | null;
  clinical_data: ClinicalSummaryDay['clinicalData'] | null;
  created_by: string | null;
  is_completed: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

const DEFAULT_TREATMENT: TreatmentType = 'fkt';

const DEFAULT_CLINICAL_DATA: ClinicalSummaryDay['clinicalData'] = {
  mainReason: '',
  diagnosis: '',
  laterality: '',
  painLevel: 0,
  redFlags: { embarazo: false, cancer: false, marcapasos: false, alergias: false },
  redFlagsDetail: { alergias: '' },
  restricciones: { noMagnetoterapia: false, noElectroterapia: false },
};

// Fetch evolution notes for a patient
export async function fetchEvolutionNotes(
  patientId: string,
  clinicId: string
): Promise<EvolutionEntry[]> {
  const { data, error } = await supabase
    .from('patient_clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .eq('note_type', 'evolution')
    .order('note_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[clinicalNotesService] Error fetching evolution notes:', error);
    throw error;
  }

  return (data || []).map((row): EvolutionEntry => ({
    appointmentId: row.appointment_id || '',
    date: row.note_date,
    time: row.start_time?.substring(0, 5) || '',
    treatmentType: (row.treatment_type as TreatmentType) || DEFAULT_TREATMENT,
    doctorId: row.practitioner_id || '',
    text: row.body || '',
    completed: row.is_completed,
    createdBy: row.created_by || '',
    updatedAt: row.updated_at || new Date().toISOString(),
    status: row.status === 'canceled' ? 'canceled' : 'active',
  }));
}

// Fetch clinical snapshots for a patient
export async function fetchClinicalSnapshots(
  patientId: string,
  clinicId: string
): Promise<ClinicalSummaryDay[]> {
  const { data, error } = await supabase
    .from('patient_clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .eq('note_type', 'snapshot')
    .order('note_date', { ascending: true });

  if (error) {
    console.error('[clinicalNotesService] Error fetching snapshots:', error);
    throw error;
  }

  return (data || []).map((row): ClinicalSummaryDay => ({
    date: row.note_date,
    clinicalData: (row.clinical_data as ClinicalSummaryDay['clinicalData']) || DEFAULT_CLINICAL_DATA,
    authorId: row.created_by || '',
    updatedAt: row.updated_at || new Date().toISOString(),
  }));
}

// Upsert an evolution note
export async function upsertEvolutionNote(
  patientId: string,
  clinicId: string,
  entry: EvolutionEntry
): Promise<void> {
  // Check if note exists for this appointment
  const { data: existing } = await supabase
    .from('patient_clinical_notes')
    .select('id')
    .eq('patient_id', patientId)
    .eq('appointment_id', entry.appointmentId)
    .eq('note_type', 'evolution')
    .maybeSingle();

  const noteData = {
    patient_id: patientId,
    clinic_id: clinicId,
    practitioner_id: entry.doctorId || null,
    note_date: entry.date,
    title: `Evolución ${entry.date} ${entry.time}`,
    body: entry.text,
    note_type: 'evolution' as const,
    appointment_id: entry.appointmentId,
    start_time: entry.time ? `${entry.time}:00` : null,
    treatment_type: entry.treatmentType,
    created_by: entry.createdBy || null,
    is_completed: entry.completed,
    status: entry.status || 'active',
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('patient_clinical_notes')
      .update(noteData)
      .eq('id', existing.id);

    if (error) {
      console.error('[clinicalNotesService] Error updating evolution note:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('patient_clinical_notes')
      .insert(noteData);

    if (error) {
      console.error('[clinicalNotesService] Error inserting evolution note:', error);
      throw error;
    }
  }
}

// Upsert a clinical snapshot
export async function upsertClinicalSnapshot(
  patientId: string,
  clinicId: string,
  snapshot: ClinicalSummaryDay,
  authorId: string
): Promise<void> {
  // Check if snapshot exists for this date
  const { data: existing } = await supabase
    .from('patient_clinical_notes')
    .select('id')
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .eq('note_date', snapshot.date)
    .eq('note_type', 'snapshot')
    .maybeSingle();

  const noteData = {
    patient_id: patientId,
    clinic_id: clinicId,
    practitioner_id: null,
    note_date: snapshot.date,
    title: `Resumen Clínico ${snapshot.date}`,
    body: snapshot.clinicalData.mainReason || '',
    note_type: 'snapshot' as const,
    appointment_id: null,
    start_time: null,
    treatment_type: null,
    clinical_data: snapshot.clinicalData,
    created_by: authorId,
    is_completed: true,
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('patient_clinical_notes')
      .update(noteData)
      .eq('id', existing.id);

    if (error) {
      console.error('[clinicalNotesService] Error updating snapshot:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('patient_clinical_notes')
      .insert(noteData);

    if (error) {
      console.error('[clinicalNotesService] Error inserting snapshot:', error);
      throw error;
    }
  }
}

// Delete a clinical note by ID
export async function deleteClinicalNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_clinical_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('[clinicalNotesService] Error deleting note:', error);
    throw error;
  }
}

// Delete evolution note by appointment ID
export async function deleteEvolutionByAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_clinical_notes')
    .delete()
    .eq('appointment_id', appointmentId)
    .eq('note_type', 'evolution');

  if (error) {
    console.error('[clinicalNotesService] Error deleting by appointment:', error);
    throw error;
  }
}

// Delete snapshot by date
export async function deleteSnapshotByDate(
  patientId: string,
  clinicId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('patient_clinical_notes')
    .delete()
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .eq('note_date', date)
    .eq('note_type', 'snapshot');

  if (error) {
    console.error('[clinicalNotesService] Error deleting snapshot:', error);
    throw error;
  }
}

// Check if evolution note exists for appointment
export async function evolutionNoteExists(appointmentId: string): Promise<boolean> {
  const { data } = await supabase
    .from('patient_clinical_notes')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('note_type', 'evolution')
    .maybeSingle();

  return !!data;
}

// Create stub evolution notes for today's appointments
export async function ensureEvolutionStubs(
  patientId: string,
  clinicId: string,
  todayAppointments: Array<{
    id: string;
    date: string;
    startTime: string;
    treatmentType?: string;
    practitionerId: string;
  }>,
  currentUserId: string
): Promise<void> {
  for (const appt of todayAppointments) {
    const exists = await evolutionNoteExists(appt.id);
    if (!exists) {
      const entry: EvolutionEntry = {
        appointmentId: appt.id,
        date: appt.date,
        time: appt.startTime.substring(0, 5),
        treatmentType: (appt.treatmentType as TreatmentType) || DEFAULT_TREATMENT,
        doctorId: appt.practitionerId,
        text: '',
        completed: false,
        createdBy: currentUserId,
        updatedAt: new Date().toISOString(),
        status: 'active',
      };
      
      await upsertEvolutionNote(patientId, clinicId, entry);
    }
  }
}
