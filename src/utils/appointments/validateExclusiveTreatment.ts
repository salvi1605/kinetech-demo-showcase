import { TREATMENTS_EXCLUSIVOS } from "@/constants/treatments";

type Appt = { 
  id?: string; 
  date: string; 
  startTime: string; 
  practitionerId: string; 
  treatmentType: string 
};

export function hasExclusiveConflict(
  all: Appt[], 
  candidate: Appt
): { ok: boolean; conflict?: Appt } {
  const candidateIsExclusive = TREATMENTS_EXCLUSIVOS.includes(candidate.treatmentType.toLowerCase() as any);
  
  // Buscar si ya existe una cita en el mismo slot
  const match = all.find(a => 
    a.practitionerId === candidate.practitionerId &&
    a.date === candidate.date &&
    a.startTime === candidate.startTime &&
    a.id !== candidate.id
  );
  
  if (!match) return { ok: true };
  
  // Hay conflicto si:
  // 1. La cita existente es exclusiva (Drenaje/Masaje)
  // 2. O el candidato es exclusivo (Drenaje/Masaje)
  const existingIsExclusive = TREATMENTS_EXCLUSIVOS.includes(match.treatmentType.toLowerCase() as any);
  
  if (existingIsExclusive || candidateIsExclusive) {
    return { ok: false, conflict: match };
  }
  
  return { ok: true };
}
