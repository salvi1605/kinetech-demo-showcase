import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp, Appointment } from '@/contexts/AppContext';
import { format } from 'date-fns';
import type { TreatmentType } from '@/types/appointments';

// Comparar dos arrays de citas por contenido relevante
const hasDataChanged = (prev: Appointment[], next: Appointment[]): boolean => {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    if (
      prev[i].id !== next[i].id ||
      prev[i].status !== next[i].status ||
      prev[i].subSlot !== next[i].subSlot ||
      prev[i].patientId !== next[i].patientId ||
      prev[i].practitionerId !== next[i].practitionerId ||
      prev[i].notes !== next[i].notes ||
      prev[i].date !== next[i].date ||
      prev[i].startTime !== next[i].startTime
    ) return true;
  }
  return false;
};

export const useAppointmentsForClinic = (startDate: Date, endDate: Date) => {
  const { state } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appointmentsRef = useRef<Appointment[]>([]);

  // Convertir fechas a ISO strings para evitar recreación de objetos
  const startDateISO = format(startDate, 'yyyy-MM-dd');
  const endDateISO = format(endDate, 'yyyy-MM-dd');

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!state.currentClinicId) {
      setIsLoading(false);
      setAppointments([]);
      appointmentsRef.current = [];
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
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

      // Solo actualizar estado si los datos realmente cambiaron
      if (hasDataChanged(appointmentsRef.current, mappedAppointments)) {
        appointmentsRef.current = mappedAppointments;
        setAppointments(mappedAppointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar turnos');
      setAppointments([]);
      appointmentsRef.current = [];
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [state.currentClinicId, startDateISO, endDateISO]);

  useEffect(() => {
    fetchAppointments(false);
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
          // Refetch silencioso: no mostrar skeleton
          fetchAppointments(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.currentClinicId, fetchAppointments]);

  // Exponer refetch público siempre como no-silencioso por defecto
  const refetch = useCallback(() => fetchAppointments(false), [fetchAppointments]);

  return { appointments, isLoading, error, refetch };
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
