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
  const isExclusive = TREATMENTS_EXCLUSIVOS.includes(candidate.treatmentType.toLowerCase() as any);
  
  if (!isExclusive) return { ok: true };
  
  const match = all.find(a => 
    a.practitionerId === candidate.practitionerId &&
    a.date === candidate.date &&
    a.startTime === candidate.startTime &&
    a.id !== candidate.id
  );
  
  return match ? { ok: false, conflict: match } : { ok: true };
}
