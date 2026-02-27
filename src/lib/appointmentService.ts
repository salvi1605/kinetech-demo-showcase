import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
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
  status?: 'scheduled' | 'completed' | 'no_show' | 'cancelled';
  notes?: string;
  treatmentType?: TreatmentType;
}

// Mapeo de status interno -> DB
const mapStatusToDb = (status: 'scheduled' | 'completed' | 'no_show' | 'cancelled') => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'no_show':
      return 'no_show';
    case 'cancelled':
      return 'cancelled';
    case 'scheduled':
    default:
      return 'scheduled';
  }
};

export const createAppointment = async (input: CreateAppointmentInput) => {
  // Resolver treatment_type_id por nombre
  let treatmentTypeId: string | null = null;
  if (input.treatmentType && input.clinicId) {
    const nameMap: Record<TreatmentType, string> = {
      fkt: 'FKT',
      atm: 'ATM',
      drenaje: 'Drenaje linfático',
      drenaje_ultra: 'Drenaje + Ultrasonido',
      masaje: 'Masaje',
      vestibular: 'Vestibular',
      otro: 'Otro',
    };
    const treatmentName = nameMap[input.treatmentType];
    if (treatmentName) {
      const { data: tt } = await supabase
        .from('treatment_types')
        .select('id')
        .eq('clinic_id', input.clinicId)
        .eq('name', treatmentName)
        .maybeSingle();
      treatmentTypeId = tt?.id || null;
    }
  }

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
      treatment_type_id: treatmentTypeId,
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
  // treatmentType mapping is handled at call site if needed
  // For now, treatment_type_id updates are not supported via this method

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
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled'
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

// ── RPC wrappers (optimización: validación + inserción en 1 round-trip) ──

export interface RpcAppointmentResult {
  success: boolean;
  appointment_id?: string;
  error_code?: 'BLOCKED' | 'OUT_OF_HOURS' | 'SLOT_TAKEN' | 'EXCLUSIVE_CONFLICT';
  error_message?: string;
}

export interface RpcBatchResult {
  index: number;
  success: boolean;
  appointment_id?: string;
  error_code?: string;
  error_message?: string;
}

export const createAppointmentRpc = async (input: CreateAppointmentInput): Promise<RpcAppointmentResult> => {
  const { data, error } = await supabase.rpc('validate_and_create_appointment', {
    p_clinic_id: input.clinicId,
    p_practitioner_id: input.practitionerId,
    p_patient_id: input.patientId,
    p_date: input.date,
    p_start_time: input.startTime,
    p_sub_slot: input.subSlot,
    p_treatment_type_key: input.treatmentType || 'fkt',
    p_notes: input.notes || '',
    p_mode: input.mode || 'in_person',
  });

  if (error) throw error;
  return data as unknown as RpcAppointmentResult;
};

export interface BatchAppointmentInput {
  clinic_id: string;
  practitioner_id: string;
  patient_id: string;
  date: string;
  start_time: string;
  sub_slot: number;
  treatment_type_key: string;
  notes?: string;
  mode?: string;
}

export const createAppointmentsBatchRpc = async (appointments: BatchAppointmentInput[]): Promise<RpcBatchResult[]> => {
  const { data, error } = await supabase.rpc('validate_and_create_appointments_batch', {
    p_appointments: appointments as unknown as Json[],
  });

  if (error) throw error;
  return data as unknown as RpcBatchResult[];
};

// ── Batch delete (1 round-trip para N eliminaciones) ──

export interface BatchDeleteResult {
  deleted_count: number;
  requested_count: number;
}

export const deleteAppointmentsBatchRpc = async (ids: string[]): Promise<BatchDeleteResult> => {
  const { data, error } = await supabase.rpc('delete_appointments_batch', {
    p_appointment_ids: ids,
  });

  if (error) throw error;
  return data as unknown as BatchDeleteResult;
};

// ── Validate + Update en 1 round-trip ──

export interface UpdateAppointmentRpcInput {
  practitionerId?: string;
  date?: string;
  startTime?: string;
  status?: string;
  treatmentTypeKey?: string;
  notes?: string;
  subSlot?: number;
}

export interface RpcUpdateResult {
  success: boolean;
  appointment_id?: string;
  sub_slot?: number;
  error_code?: 'NOT_FOUND' | 'BLOCKED' | 'OUT_OF_HOURS' | 'EXCLUSIVE_CONFLICT' | 'SLOT_FULL';
  error_message?: string;
}

export const updateAppointmentRpc = async (id: string, updates: UpdateAppointmentRpcInput): Promise<RpcUpdateResult> => {
  const { data, error } = await supabase.rpc('validate_and_update_appointment', {
    p_appointment_id: id,
    ...(updates.practitionerId ? { p_practitioner_id: updates.practitionerId } : {}),
    ...(updates.date ? { p_date: updates.date } : {}),
    ...(updates.startTime ? { p_start_time: updates.startTime } : {}),
    ...(updates.status ? { p_status: updates.status } : {}),
    ...(updates.treatmentTypeKey ? { p_treatment_type_key: updates.treatmentTypeKey } : {}),
    ...(updates.notes !== undefined ? { p_notes: updates.notes } : {}),
    ...(updates.subSlot !== undefined ? { p_sub_slot: updates.subSlot } : {}),
  });

  if (error) throw error;
  return data as unknown as RpcUpdateResult;
};
