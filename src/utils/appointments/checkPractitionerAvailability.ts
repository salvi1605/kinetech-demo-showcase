import { supabase } from '@/integrations/supabase/client';

interface AvailabilityCheck {
  practitionerId: string;
  date: string;      // YYYY-MM-DD
  startTime: string;  // HH:mm
  clinicId: string;
}

interface AvailabilitySlot {
  from: string; // HH:mm
  to: string;   // HH:mm
}

interface AvailabilityResult {
  available: boolean;
  hasAvailabilityConfigured: boolean;
  availableSlots: AvailabilitySlot[];
  message?: string;
}

/**
 * Convierte una fecha ISO (YYYY-MM-DD) al weekday numérico usado en practitioner_availability.
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado (convención JS getDay()).
 */
function getWeekdayFromDate(dateISO: string): number {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
}

/**
 * Normaliza un string de hora a formato HH:mm (5 caracteres).
 * Soporta "08:00:00" → "08:00" y "08:00" → "08:00".
 */
function normalizeTime(time: string): string {
  return time.substring(0, 5);
}

/**
 * Verifica si la hora de inicio de una cita cae dentro de la disponibilidad
 * configurada para un profesional en el día de la semana correspondiente,
 * O dentro de una excepción de tipo extended_hours para esa fecha específica.
 *
 * Si el profesional NO tiene disponibilidad configurada, se permite (fail-open)
 * para no bloquear en clínicas que aún no la hayan configurado.
 */
export async function checkPractitionerAvailability(
  candidate: AvailabilityCheck
): Promise<AvailabilityResult> {
  const weekday = getWeekdayFromDate(candidate.date);

  // Fetch regular availability and extended_hours exceptions in parallel
  const [slotsRes, extendedRes] = await Promise.all([
    supabase
      .from('practitioner_availability')
      .select('from_time, to_time')
      .eq('practitioner_id', candidate.practitionerId)
      .eq('clinic_id', candidate.clinicId)
      .eq('weekday', weekday),
    supabase
      .from('schedule_exceptions')
      .select('from_time, to_time')
      .eq('practitioner_id', candidate.practitionerId)
      .eq('clinic_id', candidate.clinicId)
      .eq('date', candidate.date)
      .eq('type', 'extended_hours'),
  ]);

  if (slotsRes.error) {
    console.error('Error checking practitioner availability:', slotsRes.error);
    return { available: true, hasAvailabilityConfigured: false, availableSlots: [] };
  }

  const slots = slotsRes.data || [];
  const extendedSlots = extendedRes.data || [];

  // If no regular availability for this weekday, check if has ANY availability configured
  if (slots.length === 0 && extendedSlots.length === 0) {
    const { data: anySlots, error: anyError } = await supabase
      .from('practitioner_availability')
      .select('id')
      .eq('practitioner_id', candidate.practitionerId)
      .eq('clinic_id', candidate.clinicId)
      .limit(1);

    if (anyError || !anySlots || anySlots.length === 0) {
      // No availability configured at all → fail-open
      return { available: true, hasAvailabilityConfigured: false, availableSlots: [] };
    }

    // Has availability on other days but not this one and no extended_hours
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return {
      available: false,
      hasAvailabilityConfigured: true,
      availableSlots: [],
      message: `El profesional no tiene disponibilidad configurada para los ${dayNames[weekday]}`,
    };
  }

  // Combine regular slots + extended_hours into one list
  const availableSlots: AvailabilitySlot[] = [
    ...slots.map(s => ({
      from: normalizeTime(s.from_time),
      to: normalizeTime(s.to_time),
    })),
    ...extendedSlots
      .filter(s => s.from_time && s.to_time)
      .map(s => ({
        from: normalizeTime(s.from_time!),
        to: normalizeTime(s.to_time!),
      })),
  ];

  const startTime = normalizeTime(candidate.startTime);

  // Check if startTime falls within any slot (regular or extended)
  const isWithinSlot = availableSlots.some(slot => {
    return startTime >= slot.from && startTime < slot.to;
  });

  if (isWithinSlot) {
    return { available: true, hasAvailabilityConfigured: true, availableSlots };
  }

  // Format available slots for the message
  const slotsText = availableSlots
    .map(s => `${s.from}–${s.to}`)
    .join(', ');

  return {
    available: false,
    hasAvailabilityConfigured: true,
    availableSlots,
    message: `Fuera del horario del profesional. Disponible: ${slotsText}`,
  };
}
