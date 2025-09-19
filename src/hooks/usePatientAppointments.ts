import { useMemo } from 'react';
import { format, compareAsc, compareDesc } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { es } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import type { Appointment } from '@/contexts/AppContext';

// Timezone de la clínica
const CLINIC_TZ = 'America/Argentina/Buenos_Aires';

export const usePatientAppointments = (patientId: string) => {
  const { state } = useApp();

  return useMemo(() => {
    // Filtrar citas del paciente (sin clinicId ya que no está en el schema actual)
    const patientAppointments = state.appointments.filter(
      apt => apt.patientId === patientId
    );

    // Obtener fecha/hora actual para comparar
    const now = new Date();
    const nowDateStr = format(now, 'yyyy-MM-dd');
    const nowTimeStr = format(now, 'HH:mm');

    // Función para comparar si una cita es futura
    const isFuture = (apt: Appointment): boolean => {
      const aptDateStr = apt.date.length === 10 ? apt.date : format(new Date(apt.date), 'yyyy-MM-dd');
      
      if (aptDateStr > nowDateStr) return true;
      if (aptDateStr < nowDateStr) return false;
      
      // Mismo día, comparar hora
      return apt.startTime >= nowTimeStr;
    };

    // Separar en futuras y pasadas
    const futuras = patientAppointments
      .filter(isFuture)
      .sort((a, b) => {
        const aDateStr = a.date.length === 10 ? a.date : format(new Date(a.date), 'yyyy-MM-dd');
        const bDateStr = b.date.length === 10 ? b.date : format(new Date(b.date), 'yyyy-MM-dd');
        
        if (aDateStr !== bDateStr) {
          return aDateStr.localeCompare(bDateStr);
        }
        return a.startTime.localeCompare(b.startTime);
      });

    const pasadas = patientAppointments
      .filter(apt => !isFuture(apt))
      .sort((a, b) => {
        const aDateStr = a.date.length === 10 ? a.date : format(new Date(a.date), 'yyyy-MM-dd');
        const bDateStr = b.date.length === 10 ? b.date : format(new Date(b.date), 'yyyy-MM-dd');
        
        if (aDateStr !== bDateStr) {
          return bDateStr.localeCompare(aDateStr); // Descendente para pasadas
        }
        return b.startTime.localeCompare(a.startTime); // Descendente para pasadas
      });

    return { futuras, pasadas };
  }, [state.appointments, patientId]);
};

// Función helper para formatear display de cita
export const formatAppointmentDisplay = (appointment: Appointment, practitioners: any[]) => {
  const practitioner = practitioners.find(p => p.id === appointment.practitionerId);
  const appointmentDate = appointment.date.length === 10 
    ? parseLocalDate(appointment.date) 
    : new Date(appointment.date);
  
  const dayName = format(appointmentDate, 'EEE', { locale: es });
  const dateStr = format(appointmentDate, 'dd/MM');
  
  // Calcular slot basado en hora (simplificado)
  const [hours, minutes] = appointment.startTime.split(':').map(Number);
  const minutesFromStart = (hours - 8) * 60 + minutes;
  const slotNumber = Math.floor(minutesFromStart / 30) + 1;

  // Estado en español
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Reservado';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'No-show';
      case 'checked_in': return 'En atención';
      default: return status;
    }
  };

  return {
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    dateStr,
    timeRange: `${appointment.startTime}–${appointment.endTime}`,
    slotNumber,
    practitionerName: practitioner?.name || 'Sin asignar',
    statusLabel: getStatusLabel(appointment.status),
    fullDisplay: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr} • ${appointment.startTime}–${appointment.endTime} • Slot ${slotNumber} • ${practitioner?.name || 'Sin asignar'} • ${getStatusLabel(appointment.status)}`
  };
};