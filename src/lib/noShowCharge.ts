import { supabase } from '@/integrations/supabase/client';

export const CHARGE_EDITOR_ROLES = ['super_admin', 'admin_clinic', 'tenant_owner'] as const;

export const canEditCharge = (role: string | null | undefined) =>
  !!role && (CHARGE_EDITOR_ROLES as readonly string[]).includes(role);

export interface ChargeSuggestion {
  suggestCharge: boolean;
  ordinal: number; // n-ésima inasistencia del paciente en este tratamiento
  reason: string;
}

/** Sugerencia (nunca aplica nada): 1ª inasistencia → sin cargo; 2ª+ → con cargo. */
export async function suggestNoShowCharge(params: {
  clinicId: string;
  patientId: string;
  treatmentTypeId?: string | null;
  appointmentId: string;
  date: string;
}): Promise<ChargeSuggestion | null> {
  let q = supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', params.clinicId)
    .eq('patient_id', params.patientId)
    .eq('status', 'no_show')
    .neq('id', params.appointmentId)
    .lte('date', params.date);
  q = params.treatmentTypeId ? q.eq('treatment_type_id', params.treatmentTypeId) : q.is('treatment_type_id', null);
  const { count, error } = await q;
  if (error) return null;
  const ordinal = (count ?? 0) + 1;
  return {
    suggestCharge: ordinal >= 2,
    ordinal,
    reason: ordinal >= 2
      ? `${ordinal}ª inasistencia en este tratamiento: se sugiere cobrar`
      : '1ª inasistencia en este tratamiento: se sugiere no cobrar',
  };
}

export async function setAppointmentCharged(appointmentId: string, clinicId: string, isCharged: boolean) {
  const { error } = await supabase
    .from('appointments')
    .update({ is_charged: isCharged })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .eq('status', 'no_show');
  if (error) throw error;
}
