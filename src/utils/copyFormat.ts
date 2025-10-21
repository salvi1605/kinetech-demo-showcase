import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseLocalDate } from "@/utils/dateUtils";
import { treatmentLabel } from "@/utils/formatters";

export interface DoctorLike { 
  name?: string;
}

const fmtDoctorFull = (d?: DoctorLike | null) => {
  if (!d || !d.name) return "—";
  return d.name.trim() || "—";
};

export const formatCopyLine = (
  dateISO: string, 
  hhmm: string, 
  doctor?: DoctorLike | null, 
  treatmentType?: string
) => {
  const base = format(parseLocalDate(dateISO), "EEE dd/MM/yyyy", { locale: es });
  const cap = base.charAt(0).toUpperCase() + base.slice(1);
  const formattedBase = `${cap} • ${hhmm}`;
  const doc = fmtDoctorFull(doctor);
  
  const tt = treatmentType ? (treatmentLabel[treatmentType] ?? treatmentType) : "—";
  
  return `${formattedBase} • ${doc} • ${tt}`;
};
