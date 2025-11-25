import { supabase } from '@/integrations/supabase/client';
import type { Appointment } from '@/contexts/AppContext';
import type { TreatmentType } from '@/types/appointments';

export interface CreateAppointmentInput {
  clinicId: string;
  patientId: string | null;
  practitionerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  subSlot: number;
  treatmentType?: TreatmentType;
  notes?: string;
  mode?: 'in_person' | 'virtual' | 'home_visit';
}

export interface UpdateAppointmentInput {
  patientId?: string | null;
  practitionerId?: string;
  date?: string;
  startTime?: string;
  subSlot?: number;
  status?: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  treatmentType?: TreatmentType;
}

// Mapeo de status interno -> DB
const mapStatusToDb = (status: 'scheduled' | 'completed' | 'cancelled') => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'scheduled':
    default:
      return 'scheduled';
  }
};

export const createAppointment = async (input: CreateAppointmentInput) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id: input.clinicId,
      patient_id: input.patientId,
      practitioner_id: input.practitionerId,
      date: input.date,
      start_time: input.startTime,
      sub_slot: input.subSlot,
      duration_minutes: 30,
      status: 'scheduled',
      notes: input.notes || '',
      mode: input.mode || 'in_person',
      treatment_type_id: null, // TODO: mapear treatmentType a ID real
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAppointment = async (id: string, updates: UpdateAppointmentInput) => {
  const dbUpdates: any = {};

  if (updates.patientId !== undefined) dbUpdates.patient_id = updates.patientId;
  if (updates.practitionerId) dbUpdates.practitioner_id = updates.practitionerId;
  if (updates.date) dbUpdates.date = updates.date;
  if (updates.startTime) dbUpdates.start_time = updates.startTime;
  if (updates.subSlot !== undefined) dbUpdates.sub_slot = updates.subSlot;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status) dbUpdates.status = mapStatusToDb(updates.status);
  if (updates.treatmentType) {
    // TODO: mapear treatmentType a ID real
    dbUpdates.treatment_type_id = null;
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAppointment = async (id: string) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateAppointmentStatus = async (
  id: string, 
  status: 'scheduled' | 'completed' | 'cancelled'
) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: mapStatusToDb(status) })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createMultipleAppointments = async (appointments: CreateAppointmentInput[]) => {
  const inserts = appointments.map(apt => ({
    clinic_id: apt.clinicId,
    patient_id: apt.patientId,
    practitioner_id: apt.practitionerId,
    date: apt.date,
    start_time: apt.startTime,
    sub_slot: apt.subSlot,
    duration_minutes: 30,
    status: 'scheduled' as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show',
    notes: apt.notes || '',
    mode: (apt.mode || 'in_person') as 'in_person' | 'virtual' | 'home_visit',
    treatment_type_id: null,
  }));

  const { data, error } = await supabase
    .from('appointments')
    .insert(inserts)
    .select();

  if (error) throw error;
  return data;
};
