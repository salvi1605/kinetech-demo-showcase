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
        treatmentType: mapTreatmentTypeToInternal(apt.treatment_type_id, apt.treatment_types?.name),
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

  // Suscribirse a cambios en tiempo real de appointments
  useEffect(() => {
    if (!state.currentClinicId) return;

    const channel = supabase
      .channel('calendar-appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${state.currentClinicId}`
        },
        (payload) => {
          console.log('Realtime calendar update:', payload);
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.currentClinicId, fetchAppointments]);

  return { appointments, isLoading, error, refetch: fetchAppointments };
};

// Mapeo de status DB -> interno
const mapDbStatusToInternal = (dbStatus: string): 'scheduled' | 'completed' | 'cancelled' | 'no_show' => {
  switch (dbStatus) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'no_show':
      return 'no_show';
    case 'scheduled':
    case 'confirmed':
    default:
      return 'scheduled';
  }
};

// Mapeo de treatment_type_id a TreatmentType interno usando nombre de BD
const mapTreatmentTypeToInternal = (
  treatmentTypeId: string | null, 
  treatmentTypeName?: string | null
): TreatmentType => {
  // Mapear por nombre del tratamiento si está disponible
  if (treatmentTypeName) {
    const normalizedName = treatmentTypeName.toLowerCase().trim();
    if (normalizedName.includes('atm') || normalizedName.includes('temporomandibular')) return 'atm';
    if (normalizedName.includes('drenaje') && normalizedName.includes('ultra')) return 'drenaje_ultra';
    if (normalizedName.includes('drenaje')) return 'drenaje';
    if (normalizedName.includes('masaje')) return 'masaje';
    if (normalizedName.includes('vestibular')) return 'vestibular';
    if (normalizedName.includes('fkt') || normalizedName.includes('fisio') || normalizedName.includes('kinesio')) return 'fkt';
    if (normalizedName.includes('otro')) return 'otro';
  }
  
  // Fallback seguro si no hay nombre o no coincide
  return 'fkt';
};
