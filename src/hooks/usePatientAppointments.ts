import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import type { Appointment } from '@/contexts/AppContext';
import { displaySubSlot } from '@/lib/slots';

/**
 * Hook que obtiene las citas de un paciente directamente desde la base de datos.
 * Retorna citas futuras y pasadas separadas.
 */
export const usePatientAppointments = (patientId: string) => {
  const { state } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!patientId || !state.currentClinicId) {
        setAppointments([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            start_time,
            sub_slot,
            status,
            notes,
            patient_id,
            practitioner_id,
            treatment_types(name)
          `)
          .eq('clinic_id', state.currentClinicId)
          .eq('patient_id', patientId)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) {
          console.error('Error fetching patient appointments:', error);
          setAppointments([]);
          return;
        }

        const mapped: Appointment[] = (data || []).map(apt => ({
          id: apt.id,
          patientId: apt.patient_id || '',
          practitionerId: apt.practitioner_id,
          date: apt.date,
          startTime: apt.start_time.substring(0, 5), // Normalize to HH:MM
          subSlot: apt.sub_slot as 1 | 2 | 3 | 4 | 5,
          status: apt.status === 'completed' ? 'completed' : apt.status === 'cancelled' || apt.status === 'no_show' ? 'cancelled' : 'scheduled',
          notes: apt.notes || '',
          type: 'consultation' as const,
          treatmentType: ((apt.treatment_types as any)?.name || 'fkt') as any,
        }));

        setAppointments(mapped);
      } catch (err) {
        console.error('Error in usePatientAppointments:', err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [patientId, state.currentClinicId]);

  return useMemo(() => {
    const now = new Date();
    const nowDateStr = format(now, 'yyyy-MM-dd');
    const nowTimeStr = format(now, 'HH:mm');

    const isFuture = (apt: Appointment): boolean => {
      const aptDateStr = apt.date.length === 10 ? apt.date : format(new Date(apt.date), 'yyyy-MM-dd');
      
      if (aptDateStr > nowDateStr) return true;
      if (aptDateStr < nowDateStr) return false;
      
      return apt.startTime >= nowTimeStr;
    };

    const futuras = appointments
      .filter(isFuture)
      .sort((a, b) => {
        const aDateStr = a.date.length === 10 ? a.date : format(new Date(a.date), 'yyyy-MM-dd');
        const bDateStr = b.date.length === 10 ? b.date : format(new Date(b.date), 'yyyy-MM-dd');
        
        if (aDateStr !== bDateStr) {
          return aDateStr.localeCompare(bDateStr);
        }
        return a.startTime.localeCompare(b.startTime);
      });

    const pasadas = appointments
      .filter(apt => !isFuture(apt))
      .sort((a, b) => {
        const aDateStr = a.date.length === 10 ? a.date : format(new Date(a.date), 'yyyy-MM-dd');
        const bDateStr = b.date.length === 10 ? b.date : format(new Date(b.date), 'yyyy-MM-dd');
        
        if (aDateStr !== bDateStr) {
          return aDateStr.localeCompare(bDateStr);
        }
        return a.startTime.localeCompare(b.startTime);
      });

    return { futuras, pasadas, loading };
  }, [appointments, loading]);
};

// Función helper para formatear display de cita
export const formatAppointmentDisplay = (appointment: Appointment, practitioners: any[]) => {
  const practitioner = practitioners.find(p => p.id === appointment.practitionerId);
  const appointmentDate = appointment.date.length === 10 
    ? parseLocalDate(appointment.date) 
    : new Date(appointment.date);
  
  const dayName = format(appointmentDate, 'EEE', { locale: es });
  const dateStr = format(appointmentDate, 'dd/MM');
  
  const slotNumber = displaySubSlot(Number((appointment as any).subSlot));

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Reservado';
      case 'completed': return 'Asistió';
      case 'cancelled': return 'No Asistió';
      default: return status;
    }
  };

  return {
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    dateStr,
    timeRange: appointment.startTime,
    slotNumber,
    practitionerName: practitioner?.name || 'Sin asignar',
    statusLabel: getStatusLabel(appointment.status),
    fullDisplay: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr} • ${appointment.startTime} • Slot ${slotNumber} • ${practitioner?.name || 'Sin asignar'} • ${getStatusLabel(appointment.status)}`
  };
};
