import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp, Appointment } from '@/contexts/AppContext';
import { format } from 'date-fns';
import type { TreatmentType } from '@/types/appointments';

export const useAppointmentsForClinic = (startDate: Date, endDate: Date) => {
  const { state } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convertir fechas a ISO strings para evitar recreación de objetos
  const startDateISO = format(startDate, 'yyyy-MM-dd');
  const endDateISO = format(endDate, 'yyyy-MM-dd');

  const fetchAppointments = useCallback(async () => {
    if (!state.currentClinicId) {
      setIsLoading(false);
      setAppointments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      const { data: dbAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_time,
          duration_minutes,
          sub_slot,
          status,
          notes,
          mode,
          patient_id,
          practitioner_id,
          treatment_type_id,
          patients (
            id,
            full_name
          ),
          practitioners (
            id,
            display_name
          ),
          treatment_types (
            id,
            name
          )
        `)
        .eq('clinic_id', state.currentClinicId)
        .gte('date', startDateISO)
        .lte('date', endDateISO)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      // Mapear de BD a formato interno
      const mappedAppointments: Appointment[] = (dbAppointments || []).map(apt => ({
        id: apt.id,
        patientId: apt.patient_id || '',
        practitionerId: apt.practitioner_id,
        date: apt.date,
        startTime: apt.start_time,
        subSlot: apt.sub_slot as 1 | 2 | 3 | 4 | 5,
        status: mapDbStatusToInternal(apt.status),
        notes: apt.notes || '',
        type: 'consultation' as const,
        treatmentType: mapTreatmentTypeToInternal(apt.treatment_type_id),
      }));

      setAppointments(mappedAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar turnos');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [state.currentClinicId, startDateISO, endDateISO]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, isLoading, error, refetch: fetchAppointments };
};

// Mapeo de status DB -> interno
const mapDbStatusToInternal = (dbStatus: string): 'scheduled' | 'completed' | 'cancelled' => {
  switch (dbStatus) {
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'no_show':
      return 'cancelled';
    case 'scheduled':
    case 'confirmed':
    default:
      return 'scheduled';
  }
};

// Mapeo de treatment_type_id a TreatmentType interno (provisional)
const mapTreatmentTypeToInternal = (treatmentTypeId: string | null): TreatmentType => {
  // Por ahora retornamos 'fkt' por defecto
  // Más adelante se puede hacer un fetch de treatment_types y mapear correctamente
  return 'fkt';
};
