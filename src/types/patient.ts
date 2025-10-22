import type { TreatmentType } from './appointments';

export type EvolutionEntry = {
  appointmentId: string;
  date: string; // 'YYYY-MM-DD' (TZ clínica)
  time: string; // 'HH:mm'
  treatmentType: TreatmentType;
  doctorId: string;
  text: string; // max 3000
  completed: boolean; // text.trim() !== ''
  createdBy: string; // userId
  updatedAt: string; // ISO
  status?: 'active' | 'canceled';
};
