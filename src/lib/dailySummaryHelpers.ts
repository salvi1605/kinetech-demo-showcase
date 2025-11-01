import type { Patient, DailySummary } from '@/contexts/AppContext';

/**
 * Obtiene el resumen clínico para una fecha específica
 */
export function getSummaryByDate(
  patient: Patient,
  date: string
): DailySummary | null {
  if (!patient.history?.summaries) return null;
  
  const summary = patient.history.summaries.find(s => s.date === date);
  return summary || null;
}

/**
 * Obtiene el último resumen clínico antes de una fecha dada
 */
export function getLastSummaryBefore(
  patient: Patient,
  date: string
): string | null {
  if (!patient.history?.summaries || patient.history.summaries.length === 0) {
    return null;
  }
  
  // Filtrar summaries anteriores a la fecha dada y ordenar descendente
  const previousSummaries = patient.history.summaries
    .filter(s => s.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  if (previousSummaries.length === 0) return null;
  
  return previousSummaries[0].text;
}

/**
 * Establece o actualiza el resumen clínico para una fecha (upsert)
 */
export function setSummaryForDate(
  patient: Patient,
  date: string,
  text: string,
  authorId: string
): Patient {
  const summaries = patient.history?.summaries || [];
  
  // Buscar si ya existe un resumen para esta fecha
  const existingIndex = summaries.findIndex(s => s.date === date);
  
  const newSummary: DailySummary = {
    date,
    text,
    authorId,
    updatedAtISO: new Date().toISOString(),
  };
  
  let updatedSummaries: DailySummary[];
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
      summaries: updatedSummaries,
    },
  };
}

/**
 * Elimina el resumen clínico de una fecha específica
 */
export function deleteSummaryForDate(
  patient: Patient,
  date: string
): Patient {
  if (!patient.history?.summaries) return patient;
  
  const updatedSummaries = patient.history.summaries.filter(s => s.date !== date);
  
  return {
    ...patient,
    history: {
      ...patient.history,
      summaries: updatedSummaries,
    },
  };
}
