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
