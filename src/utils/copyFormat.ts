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

// Normaliza HH:mm:ss → HH:mm de forma defensiva.
// Postgres devuelve `time` como "09:30:00"; cualquier consumidor que pase
// el valor sin formatear quedaría con segundos sobrantes ("09:30:00") o,
// peor, podría inducir a una lectura ambigua del horario.
const normalizeTime = (raw?: string | null): string => {
  if (!raw) return "—";
  const trimmed = String(raw).trim();
  // Match HH:mm o HH:mm:ss y devolver siempre HH:mm
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return trimmed;
  const hh = match[1].padStart(2, "0");
  return `${hh}:${match[2]}`;
};

export const formatCopyLine = (
  dateISO: string, 
  hhmm: string, 
  doctor?: DoctorLike | null, 
  treatmentType?: string
) => {
  const base = format(parseLocalDate(dateISO), "EEE dd/MM/yyyy", { locale: es });
  const cap = base.charAt(0).toUpperCase() + base.slice(1);
  const time = normalizeTime(hhmm);
  const formattedBase = `${cap} • ${time}`;
  const doc = fmtDoctorFull(doctor);
  
  const tt = treatmentType ? (treatmentLabel[treatmentType] ?? treatmentType) : "—";
  
  return `${formattedBase} • ${doc} • ${tt}`;
};
