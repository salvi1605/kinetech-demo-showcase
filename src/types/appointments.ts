export type TreatmentType =
  | "fkt" 
  | "atm" 
  | "drenaje" 
  | "drenaje_ultra" 
  | "masaje" 
  | "vestibular" 
  | "otro";

export interface TreatmentOption {
  value: TreatmentType;
  label: string;
}

// DEPRECATED: Los siguientes campos ya no se utilizan
// isContinuation?: boolean;        // DEPRECATED: no usar
// primaryAppointmentId?: string;   // DEPRECATED: no usar
