import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';

/** Nombre corto para el saludo: preferido > primer nombre > primera palabra del nombre completo. */
export const getPatientFirstName = (p: {
  name?: string;
  first_name?: string | null;
  identificacion?: { preferredName?: string };
}): string | undefined =>
  p.identificacion?.preferredName?.trim() ||
  p.first_name?.trim() ||
  p.name?.trim().split(/\s+/)[0] ||
  undefined;

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

export interface WhatsAppReminderInput {
  patientFirstName?: string | null;
  clinicName?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm[:ss]
  practitionerName?: string | null;
}

const greetingFor = (name?: string | null) => (name?.trim() ? `Hola ${name.trim()}` : 'Hola');
export const dayDDMM = (ymd: string) => {
  const d = parseLocalDate(ymd);
  return `${format(d, 'EEEE', { locale: es })} ${format(d, 'dd/MM')}`;
};
const hhmm = (t?: string | null) => (t || '').slice(0, 5);

export const buildWhatsAppReminderMessage = ({
  patientFirstName,
  clinicName,
  date,
  startTime,
}: WhatsAppReminderInput): string => {
  const place = clinicName?.trim() || 'AgendixPro';
  return `${greetingFor(patientFirstName)}, te recordamos tu turno del ${dayDDMM(date)} a las ${hhmm(startTime)} en ${place}. Si no vas a poder asistir, avísanos por acá para liberar tu lugar. ¡Te esperamos!`;
};

export interface WhatsAppInfoInput extends WhatsAppReminderInput {
  endTime?: string | null;
  treatmentName?: string | null;
  clinicAddress?: string | null;
}

export const buildWhatsAppAppointmentInfoMessage = (i: WhatsAppInfoInput): string => {
  const d = parseLocalDate(i.date);
  const time = i.endTime ? `${hhmm(i.startTime)} a ${hhmm(i.endTime)}` : hhmm(i.startTime);
  const clinic = [i.clinicName?.trim(), i.clinicAddress?.trim()].filter(Boolean).join(', ');
  const lines = [
    `${greetingFor(i.patientFirstName)}, te compartimos los datos de tu turno:`,
    `📅 Fecha: ${format(d, 'EEEE', { locale: es })} ${format(d, 'dd/MM/yyyy')}`,
    `🕐 Hora: ${time}`,
    i.practitionerName?.trim() ? `👤 Profesional: ${i.practitionerName.trim()}` : null,
    i.treatmentName?.trim() ? `🩺 Tratamiento: ${i.treatmentName.trim()}` : null,
    clinic ? `📍 Clínica: ${clinic}` : null,
    '',
    'Ante cualquier consulta, responde este mensaje. ¡Gracias!',
  ];
  return lines.filter((l) => l !== null).join('\n');
};

export interface WhatsAppUpcomingItem {
  date: string; // YYYY-MM-DD
  startTime: string;
  practitionerName?: string | null;
}

export const WHATSAPP_UPCOMING_MAX = 10;

export const buildWhatsAppUpcomingMessage = ({
  patientFirstName,
  clinicName,
  items,
}: {
  patientFirstName?: string | null;
  clinicName?: string | null;
  items: WhatsAppUpcomingItem[];
}): string => {
  const place = clinicName?.trim() ? ` en ${clinicName.trim()}` : '';
  const shown = items.slice(0, WHATSAPP_UPCOMING_MAX);
  const lines = shown.map((a) => {
    const pro = a.practitionerName?.trim() ? ` – ${a.practitionerName.trim()}` : '';
    return `• ${dayDDMM(a.date)} ${hhmm(a.startTime)}${pro}`;
  });
  const extra = items.length - shown.length;
  if (extra > 0) lines.push(`y ${extra} ${extra === 1 ? 'turno más' : 'turnos más'}.`);
  return [`${greetingFor(patientFirstName)}, estos son tus próximos turnos${place}:`, ...lines, '', 'Ante cualquier consulta, responde este mensaje. ¡Gracias!'].join('\n');
};

export const buildWhatsAppUrl = (normalizedPhone: string, text: string): string =>
  `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;

export const buildWhatsAppCancelNoticeUrl = ({
  clinicPhone,
  patientFirstName,
  date,
  startTime,
}: WhatsAppReminderInput & { clinicPhone?: string | null }): string | undefined => {
  const phone = normalizeArPhoneForWhatsApp(clinicPhone);
  if (!phone) return undefined;
  const introduction = patientFirstName?.trim() ? `Hola, soy ${patientFirstName.trim()}.` : 'Hola.';
  return buildWhatsAppUrl(phone, `${introduction} No podré asistir a mi turno del ${dayDDMM(date)} a las ${hhmm(startTime)}.`);
};
