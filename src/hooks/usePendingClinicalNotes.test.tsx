/// <reference types="bun" />
import React from 'react';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

type Note = { id: string; patient_id: string; practitioner_id: string; is_completed: boolean };
type Response = { data: Note[] | null; error: { message: string } | null };
const requests: { filters: Record<string, string>; resolve: (value: Response) => void }[] = [];

mock.module('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const filters: Record<string, string> = {};
      const promise = new Promise<Response>((resolve) => requests.push({ filters, resolve }));
      const query = {
        select: () => query,
        eq: (key: string, value: string) => { filters[key] = value; return query; },
        then: promise.then.bind(promise),
      };
      return query;
    },
  },
}));
mock.module('react-router-dom', () => ({ useNavigate: () => () => undefined }));

const { usePendingClinicalNotes } = await import('./usePendingClinicalNotes');
const { PendingNotesHealthProBanner } = await import('../components/calendar/PendingNotesHealthProBanner');
let renderer: ReactTestRenderer | undefined;
let result: ReturnType<typeof usePendingClinicalNotes>;
function Probe(props: { clinicId?: string; date: string; practitionerId?: string }) {
  result = usePendingClinicalNotes(props.clinicId, props.date, props.practitionerId);
  return null;
}
const initial = { clinicId: 'demo-clinic', date: '2026-11-05', practitionerId: 'demo-pro' };
const note = (id: string): Note => ({ id, patient_id: 'demo-patient', practitioner_id: 'demo-pro', is_completed: false });
async function resolve(index: number, data: Note[] | null, error: Response['error'] = null) {
  const request = requests[index];
  if (!request) throw new Error('Missing test request');
  await act(async () => { request.resolve({ data, error }); });
}
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  requests.length = 0;
});

describe('pending clinical notes request lifecycle', () => {
  test('no practitioner means no professional query or loading state', () => {
    act(() => { renderer = create(<PendingNotesHealthProBanner clinicId="demo-clinic" date="2026-11-05" practitionerId={undefined} />); });
    expect(requests.length).toBe(0);
    expect(renderer?.toJSON()).toBeNull();
  });

  for (const changed of [
    { ...initial, date: '2026-11-12' },
    { ...initial, clinicId: 'another-demo-clinic' },
    { ...initial, practitionerId: 'another-demo-pro' },
  ]) {
    test(`ignores obsolete response after ${JSON.stringify(changed)} context change`, async () => {
      act(() => { renderer = create(<Probe {...initial} />); });
      act(() => { renderer?.update(<Probe {...changed} />); });
      expect(requests[1]?.filters.clinic_id).toBe(changed.clinicId);
      expect(requests[1]?.filters.note_date).toBe(changed.date);
      expect(requests[1]?.filters.practitioner_id).toBe(changed.practitionerId);
      await resolve(0, [note('obsolete')]);
      expect(result.pendingItems).toEqual([]);
      expect(result.isLoading).toBe(true);
      await resolve(1, [note('current')]);
      expect(result.pendingItems.map(item => item.noteId)).toEqual(['current']);
      expect(result.isLoading).toBe(false);
    });
  }

  test('clears previous data and ignores an older error while the new request loads', async () => {
    act(() => { renderer = create(<Probe {...initial} />); });
    await resolve(0, [note('previous-week')]);
    act(() => { void result.refetch(); });
    act(() => { renderer?.update(<Probe {...initial} date="2026-11-12" />); });
    expect(result.total).toBe(0);
    await resolve(1, null, { message: 'obsolete error' });
    expect(result.isLoading).toBe(true);
    await resolve(2, []);
    expect(result.isLoading).toBe(false);
  });

  test('newer refetch wins even if an earlier request resolves last', async () => {
    act(() => { renderer = create(<Probe {...initial} />); });
    act(() => { void result.refetch(); });
    await resolve(1, [note('latest')]);
    await resolve(0, [note('old')]);
    expect(result.pendingItems.map(item => item.noteId)).toEqual(['latest']);
  });

  test('missing clinic resets loading and invalidates the prior response', async () => {
    act(() => { renderer = create(<Probe {...initial} />); });
    act(() => { renderer?.update(<Probe {...initial} clinicId={undefined} />); });
    expect(result.isLoading).toBe(false);
    await resolve(0, [note('old-clinic')]);
    expect(result.total).toBe(0);
  });

  test('unmount invalidates in-flight results', async () => {
    act(() => { renderer = create(<Probe {...initial} />); });
    const beforeUnmount = result;
    act(() => renderer?.unmount());
    await resolve(0, [note('after-unmount')]);
    expect(result).toBe(beforeUnmount);
  });

  test('admin queries still aggregate without a practitioner filter', async () => {
    act(() => { renderer = create(<Probe {...initial} practitionerId={undefined} />); });
    expect(requests[0]?.filters.practitioner_id).toBeUndefined();
    await resolve(0, [note('one'), { ...note('two'), is_completed: true }]);
    expect({ total: result.total, completed: result.completed, pending: result.pending }).toEqual({ total: 2, completed: 1, pending: 1 });
  });
});