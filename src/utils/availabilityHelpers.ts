import type { AvailabilityDay, DayKey } from '@/components/practitioners/AvailabilityEditor';

export const dayKeyToNumber: Record<DayKey, number> = {
  lun: 1,
  mar: 2,
  mié: 3,
  jue: 4,
  vie: 5,
  sáb: 6,
  dom: 0,
};

const numberToDayKey: Record<number, DayKey> = {
  0: 'dom',
  1: 'lun',
  2: 'mar',
  3: 'mié',
  4: 'jue',
  5: 'vie',
  6: 'sáb',
};

const ALL_DAYS: DayKey[] = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export const dbAvailabilityToEditor = (
  dbAvailability: { weekday: number; from_time: string; to_time: string }[]
): AvailabilityDay[] => {
  const daySlots: Record<DayKey, { from: string; to: string }[]> = {
    lun: [], mar: [], mié: [], jue: [], vie: [], sáb: [], dom: [],
  };

  dbAvailability.forEach(s => {
    const dayKey = numberToDayKey[s.weekday];
    if (dayKey) {
      daySlots[dayKey].push({
        from: s.from_time.substring(0, 5),
        to: s.to_time.substring(0, 5),
      });
    }
  });

  return ALL_DAYS.map(day => ({
    day,
    active: daySlots[day].length > 0,
    slots: daySlots[day],
  }));
};

/** Resumen de días activos para mostrar en el accordion */
export const getActiveDaysSummary = (availability: AvailabilityDay[]): string => {
  const DAY_SHORT: Record<DayKey, string> = {
    lun: 'Lun', mar: 'Mar', mié: 'Mié', jue: 'Jue', vie: 'Vie', sáb: 'Sáb', dom: 'Dom',
  };
  const active = availability.filter(d => d.active && d.slots.length > 0);
  if (active.length === 0) return 'Sin horarios configurados';
  return active.map(d => DAY_SHORT[d.day]).join(', ');
};
