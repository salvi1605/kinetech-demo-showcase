export interface ReportAppointment {
  date: string;
  start_time?: string | null;
  status: string;
  is_charged?: boolean | null;
}

export interface AppointmentBreakdown {
  totalBooked: number;
  completed: number;
  noShows: number;
  noShowsCharged: number;
  noShowsUncharged: number;
  scheduledFuture: number;
  scheduledPending: number;
}

const CLINIC_TIME_ZONE = 'America/Argentina/Buenos_Aires';

function clinicNowParts(now: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

export function calculateAppointmentBreakdown(
  appointments: ReportAppointment[],
  now = new Date(),
): AppointmentBreakdown {
  const clinicNow = clinicNowParts(now);

  return appointments.reduce<AppointmentBreakdown>((result, appointment) => {
    if (appointment.status === 'cancelled') return result;

    result.totalBooked += 1;
    if (appointment.status === 'completed') {
      result.completed += 1;
      return result;
    }
    if (appointment.status === 'no_show') {
      result.noShows += 1;
      if (appointment.is_charged) result.noShowsCharged += 1;
      else result.noShowsUncharged += 1;
      return result;
    }

    const appointmentTime = appointment.start_time?.slice(0, 5) ?? '00:00';
    const isFuture = appointment.date > clinicNow.date
      || (appointment.date === clinicNow.date && appointmentTime > clinicNow.time);

    if (isFuture) result.scheduledFuture += 1;
    else result.scheduledPending += 1;
    return result;
  }, {
    totalBooked: 0,
    completed: 0,
    noShows: 0,
    noShowsCharged: 0,
    noShowsUncharged: 0,
    scheduledFuture: 0,
    scheduledPending: 0,
  });
}
// ─── Pacientes distintos por profesional y tratamiento ───

export interface PractitionerPatientsAppointment {
  patient_id: string | null;
  practitioner_id: string | null;
  treatment_type_id: string | null;
}

export interface PractitionerPatientsCatalogItem {
  id: string;
  name: string;
  color?: string | null;
  is_active?: boolean | null;
}

export interface PractitionerPatientsRow {
  treatmentName: string;
  color: string | null;
  distinctPatients: number;
  appointments: number;
  isUnclassified: boolean;
}

export interface PractitionerPatientsGroup {
  practitionerName: string;
  color: string | null;
  isInactive: boolean;
  isUnknown: boolean;
  distinctPatients: number;
  appointments: number;
  rows: PractitionerPatientsRow[];
}

export interface PractitionerPatientsSummary {
  totalDistinctPatients: number;
  totalAppointments: number;
  practitioners: PractitionerPatientsGroup[];
}

export const UNCLASSIFIED_TREATMENT_LABEL = 'Sin clasificar';
export const UNKNOWN_PRACTITIONER_LABEL = 'Profesional sin identificar';

/**
 * Cuenta pacientes distintos por profesional y tratamiento sobre turnos ya filtrados
 * (completados, clínica y rango). El total del período y el subtotal por profesional
 * se calculan con conjuntos propios: un paciente cuenta una vez en cada fila que le
 * corresponde, pero una sola vez en el subtotal y en el total. Los turnos sin paciente
 * suman a Turnos y no a pacientes; sin tratamiento (o fuera del catálogo) van a "Sin clasificar".
 */
export function calculatePractitionerPatients(
  appointments: PractitionerPatientsAppointment[],
  practitioners: PractitionerPatientsCatalogItem[],
  treatments: PractitionerPatientsCatalogItem[],
): PractitionerPatientsSummary {
  const practitionerById = new Map(practitioners.map(p => [p.id, p]));
  const treatmentById = new Map(treatments.map(t => [t.id, t]));
  const allPatients = new Set<string>();

  type RowAcc = { treatment?: PractitionerPatientsCatalogItem; patients: Set<string>; appointments: number };
  type GroupAcc = { practitioner?: PractitionerPatientsCatalogItem; patients: Set<string>; appointments: number; rows: Map<string, RowAcc> };
  const groups = new Map<string, GroupAcc>();

  for (const appointment of appointments) {
    const practitioner = appointment.practitioner_id ? practitionerById.get(appointment.practitioner_id) : undefined;
    const groupKey = practitioner ? practitioner.id : '__unknown__';
    let group = groups.get(groupKey);
    if (!group) {
      group = { practitioner, patients: new Set(), appointments: 0, rows: new Map() };
      groups.set(groupKey, group);
    }

    const treatment = appointment.treatment_type_id ? treatmentById.get(appointment.treatment_type_id) : undefined;
    const rowKey = treatment ? treatment.id : '__unclassified__';
    let row = group.rows.get(rowKey);
    if (!row) {
      row = { treatment, patients: new Set(), appointments: 0 };
      group.rows.set(rowKey, row);
    }

    group.appointments += 1;
    row.appointments += 1;
    if (appointment.patient_id) {
      allPatients.add(appointment.patient_id);
      group.patients.add(appointment.patient_id);
      row.patients.add(appointment.patient_id);
    }
  }

  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  const practitionerGroups = Array.from(groups.values()).map<PractitionerPatientsGroup>(group => ({
    practitionerName: group.practitioner?.name ?? UNKNOWN_PRACTITIONER_LABEL,
    color: group.practitioner?.color ?? null,
    isInactive: group.practitioner ? group.practitioner.is_active === false : false,
    isUnknown: !group.practitioner,
    distinctPatients: group.patients.size,
    appointments: group.appointments,
    rows: Array.from(group.rows.values())
      .map<PractitionerPatientsRow>(row => ({
        treatmentName: row.treatment?.name ?? UNCLASSIFIED_TREATMENT_LABEL,
        color: row.treatment?.color ?? null,
        distinctPatients: row.patients.size,
        appointments: row.appointments,
        isUnclassified: !row.treatment,
      }))
      .sort((a, b) => {
        if (a.isUnclassified !== b.isUnclassified) return a.isUnclassified ? 1 : -1;
        if (b.distinctPatients !== a.distinctPatients) return b.distinctPatients - a.distinctPatients;
        return collator.compare(a.treatmentName, b.treatmentName);
      }),
  }));

  practitionerGroups.sort((a, b) => {
    if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
    return collator.compare(a.practitionerName, b.practitionerName);
  });

  return {
    totalDistinctPatients: allPatients.size,
    totalAppointments: appointments.length,
    practitioners: practitionerGroups,
  };
}
