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