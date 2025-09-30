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
  
  // Normaliza subSlot para UI: acepta datos 0–4 (legacy) y 1–5 (correcto)
  const raw = (appointment as any).subSlot as number | undefined;
  const slotNumber = typeof raw === 'number'
    ? (raw >= 1 && raw <= 5
        ? raw              // ya viene 1–5 → mostrar igual
        : (raw >= 0 && raw <= 4
            ? raw + 1      // legacy 0–4 → mostrar 1–5
            : 1))          // fuera de rango → fallback seguro
    : 1;

  // Estado en español
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