/// <reference types="bun" />
import React from 'react';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Row = Record<string, unknown>;
type Call = { table: string; filters: string[]; order?: string; range?: [number, number] };

const SERVER_MAX_ROWS = 1000;
let tables: Record<string, Row[]> = {};
let failOnRangeFrom: number | null = null;
const calls: Call[] = [];

function makeQuery(table: string) {
  const call: Call = { table, filters: [] };
  calls.push(call);
  const preds: ((r: Row) => boolean)[] = [];
  const query = {
    select: () => query,
    eq: (k: string, v: unknown) => { call.filters.push(`${k}=${v}`); preds.push((r) => r[k] === v); return query; },
    neq: (k: string, v: unknown) => { call.filters.push(`${k}!=${v}`); preds.push((r) => r[k] !== v); return query; },
    gte: (k: string, v: string) => { call.filters.push(`${k}>=${v}`); preds.push((r) => String(r[k]) >= v); return query; },
    lte: (k: string, v: string) => { call.filters.push(`${k}<=${v}`); preds.push((r) => String(r[k]) <= v); return query; },
    or: () => query,
    order: (k: string) => { call.order = k; return query; },
    range: (from: number, to: number) => { call.range = [from, to]; return query; },
    then: (resolve: (v: { data: Row[] | null; error: unknown }) => unknown, reject?: (e: unknown) => unknown) => {
      if (call.range && failOnRangeFrom === call.range[0]) {
        return Promise.resolve({ data: null, error: { message: 'page failed' } }).then(resolve, reject);
      }
      let rows = (tables[table] ?? []).filter((r) => preds.every((p) => p(r)));
      if (call.order) rows = [...rows].sort((a, b) => String(a[call.order!]).localeCompare(String(b[call.order!])));
      // Emula el tope del servidor: nunca más de 1000 filas por pedido
      rows = call.range ? rows.slice(call.range[0], call.range[1] + 1) : rows.slice(0, SERVER_MAX_ROWS);
      return Promise.resolve({ data: rows.slice(0, SERVER_MAX_ROWS), error: null }).then(resolve, reject);
    },
  };
  return query;
}

mock.module('@/integrations/supabase/client', () => ({ supabase: { from: (t: string) => makeQuery(t) } }));
mock.module('@/contexts/AppContext', () => ({ useApp: () => ({ state: { currentClinicId: 'demo-clinic' } }) }));

const hooks = await import('./useReportData');

const RANGE = { dateFrom: '2026-10-01', dateTo: '2026-12-31' };
const PRACTITIONERS = [
  { id: 'p1', display_name: 'Lic. Demo Uno', color: '#111111', is_active: true, clinic_id: 'demo-clinic' },
  { id: 'p2', display_name: 'Lic. Demo Dos', color: '#222222', is_active: true, clinic_id: 'demo-clinic' },
];
const TREATMENTS = [
  { id: 't1', name: 'Tratamiento A', color: '#333333', is_active: true, clinic_id: 'demo-clinic' },
  { id: 't2', name: 'Tratamiento B', color: '#444444', is_active: true, clinic_id: 'demo-clinic' },
];
const STATUSES = ['completed', 'no_show', 'cancelled', 'scheduled'] as const;

/** n turnos sintéticos: estado, profesional y tratamiento rotan; todas las fechas en noviembre */
function appointments(n: number, status?: (typeof STATUSES)[number]): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${String(i).padStart(6, '0')}`,
    clinic_id: 'demo-clinic',
    date: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
    start_time: '09:00:00',
    status: status ?? STATUSES[i % 4],
    practitioner_id: i % 2 === 0 ? 'p1' : 'p2',
    treatment_type_id: i % 2 === 0 ? 't1' : 't2',
    duration_minutes: 30,
    is_charged: false,
  }));
}
function notes(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `n${String(i).padStart(6, '0')}`,
    clinic_id: 'demo-clinic',
    note_type: 'evolution',
    note_date: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
    practitioner_id: i % 2 === 0 ? 'p1' : 'p2',
    body: 'Evolución',
    is_completed: true,
  }));
}
function seed(appts: Row[], evolutions: Row[] = []) {
  tables = {
    appointments: appts,
    patient_clinical_notes: evolutions,
    practitioners: PRACTITIONERS,
    treatment_types: TREATMENTS,
    practitioner_availability: [],
    schedule_exceptions: [],
    holiday_calendar: [],
  };
}

let renderer: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  calls.length = 0;
  failOnRangeFrom = null;
});

type QueryState = { status: string; data?: unknown; error?: unknown };
async function run(useHook: () => QueryState): Promise<QueryState> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let state: QueryState = { status: 'pending' };
  function Probe() { state = useHook(); return null; }
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
  });
  for (let i = 0; i < 100 && state.status === 'pending'; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  }
  return state;
}
const pagesOf = (table: string) => calls.filter((c) => c.table === table);
const sum = (rows: Record<string, number>[], key: string) => rows.reduce((a, r) => a + r[key], 0);

describe('reportes: carga completa en tandas de 1000', () => {
  test('Operativo cuenta los 2500 turnos con filtros intactos en cada tanda', async () => {
    seed(appointments(2500));
    const res = await run(() => hooks.useOperationalReport({ ...RANGE, practitionerId: undefined, groupBy: 'month' }));
    expect(res.status).toBe('success');
    const { totals } = res.data as { totals: Record<string, number> };
    // 625 de cada estado; los cancelados no cuentan como reservados
    expect(totals.completed).toBe(625);
    expect(totals.noShows).toBe(625);
    expect(totals.booked).toBe(1875);
    const pages = pagesOf('appointments');
    expect(pages.map((p) => p.range)).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    for (const p of pages) {
      expect(p.order).toBe('id');
      expect(p.filters).toEqual(['clinic_id=demo-clinic', `date>=${RANGE.dateFrom}`, `date<=${RANGE.dateTo}`]);
    }
  });

  test('Operativo con profesional elegido mantiene el filtro en todas las tandas', async () => {
    seed(appointments(2500));
    const res = await run(() => hooks.useOperationalReport({ ...RANGE, practitionerId: 'p1', groupBy: 'month' }));
    const { totals } = res.data as { totals: Record<string, number> };
    expect(totals.completed).toBe(625); // p1 tiene los pares: completed y cancelled
    expect(pagesOf('appointments').every((p) => p.filters.includes('practitioner_id=p1'))).toBe(true);
  });

  test('Productividad suma 2500 turnos entre los dos profesionales', async () => {
    seed(appointments(2500));
    const res = await run(() => hooks.useProductivityReport(RANGE));
    const rows = res.data as Record<string, number>[];
    expect(sum(rows, 'completed')).toBe(625);
    expect(sum(rows, 'cancelled')).toBe(625);
    expect(sum(rows, 'noShows')).toBe(625);
    expect(sum(rows, 'booked')).toBe(1875);
    expect(pagesOf('appointments').length).toBe(3);
  });

  test('Tratamientos cuenta los 1875 turnos no cancelados y conserva el filtro de estado', async () => {
    seed(appointments(2500));
    const res = await run(() => hooks.useTreatmentReport(RANGE));
    const { byTreatment } = res.data as { byTreatment: { count: number }[] };
    expect(byTreatment.reduce((a, t) => a + t.count, 0)).toBe(1875);
    expect(pagesOf('appointments').every((p) => p.filters.includes('status!=cancelled'))).toBe(true);
    expect(pagesOf('appointments').length).toBe(2); // 1875 filas: 2 tandas
  });

  test('Cumplimiento pagina turnos completados y evoluciones (100 % con 1500 y 1500)', async () => {
    seed(appointments(1500, 'completed'), notes(1500));
    const res = await run(() => hooks.useComplianceReport(RANGE));
    const rows = res.data as Record<string, number>[];
    expect(sum(rows, 'completedAppts')).toBe(1500);
    expect(sum(rows, 'completedNotes')).toBe(1500);
    expect(rows.every((r) => r.compliancePct === 100)).toBe(true);
    expect(pagesOf('appointments').every((p) => p.filters.includes('status=completed'))).toBe(true);
    expect(pagesOf('patient_clinical_notes').map((p) => p.range)).toEqual([[0, 999], [1000, 1999]]);
    expect(pagesOf('patient_clinical_notes').every((p) => p.filters.includes('note_type=evolution'))).toBe(true);
  });

  test('con menos de 1000 filas hace un solo pedido y da el mismo total', async () => {
    seed(appointments(300));
    const res = await run(() => hooks.useProductivityReport(RANGE));
    expect(sum(res.data as Record<string, number>[], 'completed')).toBe(75);
    expect(pagesOf('appointments').map((p) => p.range)).toEqual([[0, 999]]);
  });

  test('si falla la segunda tanda el reporte queda en error, sin datos parciales', async () => {
    seed(appointments(2500));
    failOnRangeFrom = 1000;
    const res = await run(() => hooks.useTreatmentReport(RANGE));
    expect(res.status).toBe('error');
    expect(res.data).toBeUndefined();
  });
});
