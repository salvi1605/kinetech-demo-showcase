// Feriados oficiales de Argentina 2025 y 2026 (inamovibles + trasladables)
export interface ArgentineHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const ARGENTINE_HOLIDAYS_2025: ArgentineHoliday[] = [
  { date: '2025-01-01', name: 'Año Nuevo' },
  { date: '2025-03-03', name: 'Carnaval' },
  { date: '2025-03-04', name: 'Carnaval' },
  { date: '2025-03-24', name: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { date: '2025-04-02', name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
  { date: '2025-04-18', name: 'Viernes Santo' },
  { date: '2025-05-01', name: 'Día del Trabajador' },
  { date: '2025-05-25', name: 'Día de la Revolución de Mayo' },
  { date: '2025-06-16', name: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes' },
  { date: '2025-06-20', name: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
  { date: '2025-07-09', name: 'Día de la Independencia' },
  { date: '2025-08-18', name: 'Paso a la Inmortalidad del Gral. José de San Martín' },
  { date: '2025-10-12', name: 'Día del Respeto a la Diversidad Cultural' },
  { date: '2025-11-24', name: 'Día de la Soberanía Nacional' },
  { date: '2025-12-08', name: 'Inmaculada Concepción de María' },
  { date: '2025-12-25', name: 'Navidad' },
];

export const ARGENTINE_HOLIDAYS_2026: ArgentineHoliday[] = [
  { date: '2026-01-01', name: 'Año Nuevo' },
  { date: '2026-02-16', name: 'Carnaval' },
  { date: '2026-02-17', name: 'Carnaval' },
  { date: '2026-03-24', name: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { date: '2026-04-02', name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
  { date: '2026-04-03', name: 'Viernes Santo' },
  { date: '2026-05-01', name: 'Día del Trabajador' },
  { date: '2026-05-25', name: 'Día de la Revolución de Mayo' },
  { date: '2026-06-15', name: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes' },
  { date: '2026-06-20', name: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
  { date: '2026-07-09', name: 'Día de la Independencia' },
  { date: '2026-08-17', name: 'Paso a la Inmortalidad del Gral. José de San Martín' },
  { date: '2026-10-12', name: 'Día del Respeto a la Diversidad Cultural' },
  { date: '2026-11-23', name: 'Día de la Soberanía Nacional' },
  { date: '2026-12-08', name: 'Inmaculada Concepción de María' },
  { date: '2026-12-25', name: 'Navidad' },
];

export const ALL_ARGENTINE_HOLIDAYS = [...ARGENTINE_HOLIDAYS_2025, ...ARGENTINE_HOLIDAYS_2026];
