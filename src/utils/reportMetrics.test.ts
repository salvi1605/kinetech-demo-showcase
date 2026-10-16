import { describe, expect, it } from 'bun:test';
import { calculateAppointmentBreakdown } from './reportMetrics';

describe('desglose de no-shows con/sin cargo', () => {
  it('no cambia el total de no-shows y suma con + sin cargo', () => {
    const r = calculateAppointmentBreakdown([
      { date: '2026-08-01', status: 'no_show', is_charged: true },
      { date: '2026-08-01', status: 'no_show', is_charged: false },
      { date: '2026-08-01', status: 'no_show' },
      { date: '2026-08-01', status: 'completed', is_charged: true },
      { date: '2026-08-01', status: 'cancelled' },
    ], new Date('2026-10-16T12:00:00Z'));
    expect(r.noShows).toBe(3);
    expect(r.noShowsCharged).toBe(1);
    expect(r.noShowsUncharged).toBe(2);
    expect(r.totalBooked).toBe(4);
  });
});
