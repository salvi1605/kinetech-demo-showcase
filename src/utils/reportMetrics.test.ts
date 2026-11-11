/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  calculatePractitionerPatients,
  UNCLASSIFIED_TREATMENT_LABEL,
  UNKNOWN_PRACTITIONER_LABEL,
  type PractitionerPatientsAppointment,
} from './reportMetrics';
import { fetchAllRows } from './fetchAllRows';

const practitioners = [
  { id: 'pro-a', name: 'Lic. Ana', color: '#111111', is_active: true },
  { id: 'pro-b', name: 'Lic. Bruno', color: '#222222', is_active: false },
];
const treatments = [
  { id: 'tt-1', name: 'Tratamiento Uno', color: '#aaaaaa' },
  { id: 'tt-2', name: 'Tratamiento Dos', color: '#bbbbbb' },
];
const appt = (patient: string | null, pro: string | null, tt: string | null): PractitionerPatientsAppointment =>
  ({ patient_id: patient, practitioner_id: pro, treatment_type_id: tt });

function row(result: ReturnType<typeof calculatePractitionerPatients>, pro: string, treatment: string) {
  const group = result.practitioners.find(g => g.practitionerName === pro);
  return group?.rows.find(r => r.treatmentName === treatment);
}

describe('calculatePractitionerPatients', () => {
  test('a patient with two treatments of the same professional counts once per row, once in subtotal and total', () => {
    const result = calculatePractitionerPatients(
      [appt('p1', 'pro-a', 'tt-1'), appt('p1', 'pro-a', 'tt-2')], practitioners, treatments,
    );
    expect(row(result, 'Lic. Ana', 'Tratamiento Uno')?.distinctPatients).toBe(1);
    expect(row(result, 'Lic. Ana', 'Tratamiento Dos')?.distinctPatients).toBe(1);
    expect(result.practitioners[0].distinctPatients).toBe(1);
    expect(result.totalDistinctPatients).toBe(1);
  });

  test('a patient seen by two professionals counts in each professional but once in the total (total < sum of rows)', () => {
    const result = calculatePractitionerPatients(
      [appt('p1', 'pro-a', 'tt-1'), appt('p1', 'pro-b', 'tt-1'), appt('p2', 'pro-b', 'tt-1')], practitioners, treatments,
    );
    const sumOfRows = result.practitioners.flatMap(g => g.rows).reduce((s, r) => s + r.distinctPatients, 0);
    expect(row(result, 'Lic. Ana', 'Tratamiento Uno')?.distinctPatients).toBe(1);
    expect(row(result, 'Lic. Bruno', 'Tratamiento Uno')?.distinctPatients).toBe(2);
    expect(sumOfRows).toBe(3);
    expect(result.totalDistinctPatients).toBe(2);
  });

  test('the same patient with three appointments in one group: 1 distinct patient, 3 appointments', () => {
    const result = calculatePractitionerPatients(
      [appt('p1', 'pro-a', 'tt-1'), appt('p1', 'pro-a', 'tt-1'), appt('p1', 'pro-a', 'tt-1')], practitioners, treatments,
    );
    expect(row(result, 'Lic. Ana', 'Tratamiento Uno')?.distinctPatients).toBe(1);
    expect(row(result, 'Lic. Ana', 'Tratamiento Uno')?.appointments).toBe(3);
    expect(result.totalAppointments).toBe(3);
  });

  test('appointments without treatment (or outside the clinic catalog) go to "Sin clasificar", listed last', () => {
    const result = calculatePractitionerPatients(
      [appt('p1', 'pro-a', null), appt('p2', 'pro-a', 'tt-ajeno'), appt('p3', 'pro-a', 'tt-1')], practitioners, treatments,
    );
    const rows = result.practitioners[0].rows;
    expect(rows.map(r => r.treatmentName)).toEqual(['Tratamiento Uno', UNCLASSIFIED_TREATMENT_LABEL]);
    expect(rows[1].distinctPatients).toBe(2);
    expect(rows[1].isUnclassified).toBe(true);
  });

  test('appointments without patient add to appointments but not to patient counts', () => {
    const result = calculatePractitionerPatients(
      [appt(null, 'pro-a', 'tt-1'), appt('p1', 'pro-a', 'tt-1')], practitioners, treatments,
    );
    expect(row(result, 'Lic. Ana', 'Tratamiento Uno')?.appointments).toBe(2);
    expect(row(result, 'Lic. Ana', 'Tratamiento Uno')?.distinctPatients).toBe(1);
    expect(result.totalDistinctPatients).toBe(1);
  });

  test('inactive professionals are included and flagged; unknown professionals never show an id', () => {
    const result = calculatePractitionerPatients(
      [appt('p1', 'pro-b', 'tt-1'), appt('p2', 'pro-borrado', 'tt-1')], practitioners, treatments,
    );
    expect(result.practitioners.map(g => g.practitionerName)).toEqual(['Lic. Bruno', UNKNOWN_PRACTITIONER_LABEL]);
    expect(result.practitioners[0].isInactive).toBe(true);
  });

  test('no appointments: total 0 and no professionals', () => {
    const result = calculatePractitionerPatients([], practitioners, treatments);
    expect(result.totalDistinctPatients).toBe(0);
    expect(result.totalAppointments).toBe(0);
    expect(result.practitioners).toEqual([]);
  });
});

describe('fetchAllRows', () => {
  test('requests 1000-row pages until a short page and returns all 1500 rows', async () => {
    const source = Array.from({ length: 1500 }, (_, i) => i);
    const ranges: [number, number][] = [];
    const rows = await fetchAllRows<number>(async (from, to) => {
      ranges.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(rows.length).toBe(1500);
  });

  test('an exact multiple of 1000 asks for one more empty page and stops', async () => {
    const source = Array.from({ length: 2000 }, (_, i) => i);
    const ranges: [number, number][] = [];
    const rows = await fetchAllRows<number>(async (from, to) => {
      ranges.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    expect(ranges.length).toBe(3);
    expect(rows.length).toBe(2000);
  });

  test('propagates query errors instead of returning partial counts', async () => {
    const failure = { message: 'fallo' };
    await expect(fetchAllRows(async () => ({ data: null, error: failure }))).rejects.toBe(failure);
  });
});
