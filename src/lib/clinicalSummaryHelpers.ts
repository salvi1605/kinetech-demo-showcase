import type { Patient, ClinicalSummaryDay, Appointment } from '@/contexts/AppContext';
import { format } from 'date-fns';

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (TZ clínica)
 */
export function getTodayISO(testCurrentDate?: string): string {
  if (testCurrentDate) {
    return testCurrentDate;
  }
  // En producción, usar fecha local de la clínica
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Obtiene el último snapshot clínico antes de una fecha dada
 */
export function getLatestSummaryBefore(
  patient: Patient,
  date: string
): ClinicalSummaryDay | null {
  if (!patient.history?.clinicalSummaries || patient.history.clinicalSummaries.length === 0) {
    return null;
  }

  const previousSummaries = patient.history.clinicalSummaries
    .filter((s) => s.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (previousSummaries.length === 0) return null;

  return previousSummaries[0];
}

/**
 * Obtiene el snapshot clínico para una fecha específica
 */
export function getSummaryByDate(
  patient: Patient,
  date: string
): ClinicalSummaryDay | null {
  if (!patient.history?.clinicalSummaries) return null;

  const summary = patient.history.clinicalSummaries.find((s) => s.date === date);
  return summary || null;
}

/**
 * Crea o actualiza el snapshot clínico para una fecha (upsert)
 */
export function upsertSummaryFor(
  patient: Patient,
  date: string,
  clinicalData: ClinicalSummaryDay['clinicalData'],
  authorId: string
): Patient {
  const summaries = patient.history?.clinicalSummaries || [];

  const existingIndex = summaries.findIndex((s) => s.date === date);

  const newSummary: ClinicalSummaryDay = {
    date,
    clinicalData,
    authorId,
    updatedAt: new Date().toISOString(),
  };

  let updatedSummaries: ClinicalSummaryDay[];
  if (existingIndex >= 0) {
    // Actualizar existente
    updatedSummaries = [...summaries];
    updatedSummaries[existingIndex] = newSummary;
  } else {
    // Agregar nuevo
    updatedSummaries = [...summaries, newSummary];
  }

  return {
    ...patient,
    history: {
      ...patient.history,
      clinicalSummaries: updatedSummaries,
    },
  };
}

/**
 * Elimina el snapshot clínico de una fecha específica
 */
export function deleteSummaryFor(patient: Patient, date: string): Patient {
  if (!patient.history?.clinicalSummaries) return patient;

  const updatedSummaries = patient.history.clinicalSummaries.filter((s) => s.date !== date);

  return {
    ...patient,
    history: {
      ...patient.history,
      clinicalSummaries: updatedSummaries,
    },
  };
}

/**
 * Verifica si el paciente tiene al menos una cita en una fecha dada
 */
export function hasAppointmentOn(
  appointments: Appointment[],
  patientId: string,
  date: string
): boolean {
  return appointments.some((apt) => apt.patientId === patientId && apt.date === date);
}
