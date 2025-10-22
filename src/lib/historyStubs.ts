import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { EvolutionEntry } from '@/types/patient';
import type { Patient, Appointment } from '@/contexts/AppContext';

dayjs.extend(utc);
dayjs.extend(timezone);

export const CLINIC_TZ = 'America/Argentina/Buenos_Aires';

export const todayYMD = (override?: string): string => {
  if (override) {
    console.log('[todayYMD] 🕐 TIME TRAVEL MODE:', override);
    return override;
  }
  return dayjs().tz(CLINIC_TZ).format('YYYY-MM-DD');
};

export function ensureTodayStubs(
  patient: Patient,
  allAppointments: Appointment[],
  currentUserId: string,
  testCurrentDate?: string
): void {
  // Initialize clinico if it doesn't exist
  if (!patient.clinico) {
    patient.clinico = {};
  }
  
  const ymd = todayYMD(testCurrentDate);
  console.log('[ensureTodayStubs] Fecha actual (CLINIC_TZ):', ymd);
  console.log('[ensureTodayStubs] Total appointments en store:', allAppointments.length);
  console.log('[ensureTodayStubs] Patient ID:', patient.id);
  
  const existingSet = new Set(
    (patient.clinico.historyByAppointment || [])
      .filter((e) => e.date === ymd)
      .map((e) => e.appointmentId)
  );
  
  console.log('[ensureTodayStubs] Entradas existentes para hoy:', existingSet.size);

  // Filter today's appointments for this patient
  // Direct comparison since a.date is already in 'YYYY-MM-DD' format
  const todaysAppointments = allAppointments.filter((a) => {
    if (a.patientId !== patient.id) return false;
    return a.date === ymd;
  });
  
  console.log('[ensureTodayStubs] Citas de hoy para este paciente:', todaysAppointments.length);
  if (todaysAppointments.length > 0) {
    console.log('[ensureTodayStubs] Detalles de citas:', todaysAppointments.map(a => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      treatmentType: a.treatmentType,
      patientId: a.patientId
    })));
  }

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

  console.log('[ensureTodayStubs] Nuevos stubs a crear:', additions.length);

  if (additions.length > 0) {
    patient.clinico.historyByAppointment = [
      ...(patient.clinico.historyByAppointment || []),
      ...additions,
    ];
    console.log('[ensureTodayStubs] Stubs agregados. Total entries:', patient.clinico.historyByAppointment.length);
  }
}
