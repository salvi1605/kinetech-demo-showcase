import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parse a local date from ISO string format (yyyy-MM-dd) without timezone conversion
 */
export const parseLocalDate = (dateISO: string) => parse(dateISO, 'yyyy-MM-dd', new Date());

/**
 * Get today's date in ISO format using browser timezone
 */
export const todayISO = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Check if a date is in the past (before today)
 */
export const isPastDay = (dateISO: string) => dateISO < todayISO();


/**
 * Display label for selected slot in the format: "Lun 15/09 • 08:00 • Slot 3"
 */
export const displaySelectedLabel = (
  { dateISO, hour, subSlot }: { dateISO: string; hour: string; subSlot: 1 | 2 | 3 | 4 | 5 }
) => {
  const dayName = format(parseLocalDate(dateISO), 'EEE', { locale: es });
  const dateNum = format(parseLocalDate(dateISO), 'dd/MM');
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateNum} • ${hour} • Slot ${subSlot}`;
};

/**
 * Parse slot key to extract dateISO, hour, and subSlot
 */
export const parseSlotKey = (key: string): { dateISO: string; hour: string; subSlot: number } => {
  const [dateISO, hour, subSlotStr] = key.split('_');
  return { dateISO, hour, subSlot: parseInt(subSlotStr) };
};

/**
 * Sort slot keys by date and time
 */
export const byDateTime = (aKey: string, bKey: string): number => {
  const a = parseSlotKey(aKey);
  const b = parseSlotKey(bKey);
  
  if (a.dateISO !== b.dateISO) {
    return a.dateISO.localeCompare(b.dateISO);
  }
  if (a.hour !== b.hour) {
    return a.hour.localeCompare(b.hour);
  }
  return a.subSlot - b.subSlot;
};

export const addMinutesStr = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + min;
  const hh = String(Math.floor((t % 1440) / 60)).padStart(2, '0');
  const mm = String(t % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Función para derivar endTime en runtime cuando sea necesario (duración fija de 30 min)
export const getAppointmentEndTime = (startTime: string): string => {
  return addMinutesStr(startTime, 30);
};

/**
 * Formatear fecha y hora para copiar al portapapeles: "EEE dd/MM/yyyy • HH:mm"
 */
export const formatForClipboard = (dateISO: string, hour: string) => {
  const day = format(parseLocalDate(dateISO), 'EEE dd/MM/yyyy', { locale: es });
  const cap = day.charAt(0).toUpperCase() + day.slice(1);
  return `${cap} • ${hour}`;
};

/**
 * Copiar texto al portapapeles con fallback
 */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};