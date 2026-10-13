import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';

const CLINIC_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * Normaliza un teléfono al formato que exige wa.me (solo dígitos, con código de país).
 * Argentina: antepone 549, quita el 0 de larga distancia y el 15 de celular.
 * Si el número trae otro código de país (+XX), se respeta tal cual.
 * Devuelve null si el número no es válido.
 */
export const normalizeArPhoneForWhatsApp = (phone?: string | null): string | null => {
  if (!phone) return null;
  let raw = phone.trim().replace(/[^\d+]/g, '');
  if (!raw) return null;
  if (raw.startsWith('00')) raw = `+${raw.slice(2)}`;

  let digits = raw.replace(/\+/g, '');
  const hadPlus = raw.startsWith('+');

  if (hadPlus && !digits.startsWith('54')) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  if (digits.startsWith('54') && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith('9') && digits.length === 11) digits = digits.slice(1);
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Quitar el "15" de celular ubicado después del código de área (2 a 4 dígitos)
  if (digits.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (digits.slice(areaLen, areaLen + 2) === '15') {
        digits = digits.slice(0, areaLen) + digits.slice(areaLen + 2);
        break;
      }
    }
  }

  if (digits.length !== 10) return null;
  return `549${digits}`;
};

const ymdInClinicTz = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

export interface WhatsAppReminderInput {
  patientFirstName?: string | null;
  clinicName?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm[:ss]
  practitionerName?: string | null;
  now?: Date;
}

export const buildWhatsAppReminderMessage = ({
  patientFirstName,
  clinicName,
  date,
  startTime,
  practitionerName,
  now = new Date(),
}: WhatsAppReminderInput): string => {
  const aptDate = parseLocalDate(date);
  const dayName = format(aptDate, 'EEEE', { locale: es });
  const ddmm = format(aptDate, 'dd/MM');
  const time = (startTime || '').slice(0, 5);

  const todayYmd = ymdInClinicTz(now);
  const tomorrowYmd = format(addDays(parseLocalDate(todayYmd), 1), 'yyyy-MM-dd');
  const when =
    date === todayYmd
      ? `hoy ${dayName} ${ddmm}`
      : date === tomorrowYmd
        ? `mañana ${dayName} ${ddmm}`
        : `el ${dayName} ${ddmm}`;

  const greeting = patientFirstName?.trim() ? `Hola ${patientFirstName.trim()}` : 'Hola';
  const place = clinicName?.trim() ? ` en ${clinicName.trim()}` : '';
  const withPro = practitionerName?.trim() ? ` con ${practitionerName.trim()}` : '';

  return `${greeting}, te recordamos tu turno${place} ${when} a las ${time}${withPro}. Por favor confirmanos tu asistencia. ¡Gracias!`;
};

export const buildWhatsAppUrl = (normalizedPhone: string, text: string): string =>
  `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
