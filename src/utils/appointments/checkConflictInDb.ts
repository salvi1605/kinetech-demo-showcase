import { supabase } from '@/integrations/supabase/client';

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
