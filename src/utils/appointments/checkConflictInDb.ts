import { supabase } from '@/integrations/supabase/client';
import { TREATMENTS_EXCLUSIVOS } from '@/constants/treatments';

interface ConflictCheck {
  date: string;
  startTime: string;
  practitionerId: string;
  treatmentType: string;
  excludeId?: string; // Para editar citas existentes
  clinicId: string;
}

interface ConflictResult {
  ok: boolean;
  conflict?: {
    id: string;
    treatmentType: string;
    startTime: string;
  };
}

/**
 * Verifica conflictos de tratamientos exclusivos directamente en la base de datos.
 * Regla: Si un profesional tiene una cita con tratamiento exclusivo (Drenaje/Masaje)
 * en un bloque de 30 min (fecha+horaInicio), NO puede tomar otra cita en ese mismo bloque.
 */
export async function checkConflictInDb(candidate: ConflictCheck): Promise<ConflictResult> {
  const candidateIsExclusive = TREATMENTS_EXCLUSIVOS.includes(
    candidate.treatmentType.toLowerCase() as any
  );

  // Buscar citas existentes en el mismo slot (fecha + hora + practitioner)
  let query = supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      treatment_types!inner(name)
    `)
    .eq('practitioner_id', candidate.practitionerId)
    .eq('date', candidate.date)
    .eq('start_time', candidate.startTime)
    .eq('clinic_id', candidate.clinicId)
    .neq('status', 'cancelled');

  // Excluir la cita actual si estamos editando
  if (candidate.excludeId) {
    query = query.neq('id', candidate.excludeId);
  }

  const { data: existingAppts, error } = await query;

  if (error) {
    console.error('Error checking conflicts in DB:', error);
    // En caso de error, permitir (fail-open) para no bloquear al usuario
    return { ok: true };
  }

  if (!existingAppts || existingAppts.length === 0) {
    return { ok: true };
  }

  // Verificar si hay conflicto con tratamientos exclusivos
  for (const apt of existingAppts) {
    const existingTreatmentType = (apt.treatment_types as any)?.name || '';
    const existingIsExclusive = TREATMENTS_EXCLUSIVOS.includes(
      existingTreatmentType.toLowerCase() as any
    );

    // Hay conflicto si la cita existente es exclusiva o el candidato es exclusivo
    if (existingIsExclusive || candidateIsExclusive) {
      return {
        ok: false,
        conflict: {
          id: apt.id,
          treatmentType: existingTreatmentType,
          startTime: apt.start_time,
        },
      };
    }
  }

  return { ok: true };
}

/**
 * Verifica si ya existe una cita en el mismo subSlot exacto.
 */
export async function checkSlotConflictInDb(
  clinicId: string,
  practitionerId: string,
  date: string,
  startTime: string,
  subSlot: number,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('practitioner_id', practitionerId)
    .eq('date', date)
    .eq('start_time', startTime)
    .eq('sub_slot', subSlot)
    .neq('status', 'cancelled');

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking slot conflict:', error);
    return false; // Fail-open
  }

  return (data && data.length > 0);
}
