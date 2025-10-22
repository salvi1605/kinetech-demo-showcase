import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { EvolutionEntry } from '@/types/patient';
import type { Patient, Appointment } from '@/contexts/AppContext';

dayjs.extend(utc);
dayjs.extend(timezone);

export const CLINIC_TZ = 'America/Argentina/Buenos_Aires';

export const todayYMD = (): string => {
  return dayjs().tz(CLINIC_TZ).format('YYYY-MM-DD');
};

export function ensureTodayStubs(
  patient: Patient,
  allAppointments: Appointment[],
  currentUserId: string
): void {
  if (!patient.clinico) return;
  
  const ymd = todayYMD();
  const existingSet = new Set(
    (patient.clinico.historyByAppointment || [])
      .filter((e) => e.date === ymd)
      .map((e) => e.appointmentId)
  );

  // Filter today's appointments for this patient
  const todaysAppointments = allAppointments.filter((a) => {
    if (a.patientId !== patient.id) return false;
    const aptDate = dayjs(a.date).tz(CLINIC_TZ).format('YYYY-MM-DD');
    return aptDate === ymd;
  });

  // Create stubs for appointments not yet in history
  const additions: EvolutionEntry[] = todaysAppointments
    .filter((a) => !existingSet.has(a.id))
    .map((a) => ({
      appointmentId: a.id,
      date: ymd,
      time: a.startTime,
      treatmentType: a.treatmentType || 'fkt',
      doctorId: a.practitionerId,
      text: '',
      completed: false,
      createdBy: currentUserId,
      updatedAt: new Date().toISOString(),
      status: 'active',
    }));

  if (additions.length > 0) {
    patient.clinico.historyByAppointment = [
      ...(patient.clinico.historyByAppointment || []),
      ...additions,
    ];
  }
}
