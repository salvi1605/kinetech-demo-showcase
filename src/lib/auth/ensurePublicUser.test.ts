/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { ensurePublicUserSafely, isAuthorizationError, normalizeEmail } from './ensurePublicUser';

const noWait = async () => undefined;
const silent = () => undefined;
const duplicateError = { message: 'Edge Function returned a non-2xx status code', context: { status: 500 } };
const unauthorizedError = { message: 'Unauthorized', context: { status: 401 } };

function makeDeps(results: unknown[], refreshError: unknown = null) {
  const calls = { invoke: 0, refresh: 0 };
  return {
    calls,
    deps: {
      invoke: async () => ({ error: results[calls.invoke++] ?? null }),
      refreshSession: async () => { calls.refresh++; return { error: refreshError }; },
      wait: noWait,
      warn: silent,
    },
  };
}

describe('normalizeEmail', () => {
  test('lower-cases and trims the email so profile and login always match', () => {
    expect(normalizeEmail('  QA.Mayusculas@Demo.Test ')).toBe('qa.mayusculas@demo.test');
  });
  test('returns an empty string for missing emails', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('ensurePublicUserSafely', () => {
  test('first call succeeds: one attempt, no refresh', async () => {
    const { deps, calls } = makeDeps([null]);
    expect(await ensurePublicUserSafely(deps)).toEqual({ ok: true, attempts: 1 });
    expect(calls).toEqual({ invoke: 1, refresh: 0 });
  });

  test('duplicate-profile error twice: reports failure after exactly one retry and never throws', async () => {
    const { deps, calls } = makeDeps([duplicateError, duplicateError]);
    const outcome = await ensurePublicUserSafely(deps);
    expect(outcome.ok).toBe(false);
    expect(outcome.attempts).toBe(2);
    expect(calls).toEqual({ invoke: 2, refresh: 0 });
  });

  test('authorization error: refreshes the session once, then retries', async () => {
    const { deps, calls } = makeDeps([unauthorizedError, null]);
    expect(await ensurePublicUserSafely(deps)).toEqual({ ok: true, attempts: 2 });
    expect(calls).toEqual({ invoke: 2, refresh: 1 });
  });

  test('failed refresh does not stop the retry and does not throw', async () => {
    const { deps, calls } = makeDeps([unauthorizedError, duplicateError], { message: 'refresh failed' });
    const outcome = await ensurePublicUserSafely(deps);
    expect(outcome.ok).toBe(false);
    expect(calls).toEqual({ invoke: 2, refresh: 1 });
  });

  test('an exception thrown by the call counts as a failure, not a crash', async () => {
    let n = 0;
    const outcome = await ensurePublicUserSafely({
      invoke: async () => { n++; throw new Error('network down'); },
      refreshSession: async () => ({ error: null }),
      wait: noWait,
      warn: silent,
    });
    expect(outcome.ok).toBe(false);
    expect(n).toBe(2);
  });

  test('only a 401 counts as an authorization error', () => {
    expect(isAuthorizationError(unauthorizedError)).toBe(true);
    expect(isAuthorizationError(duplicateError)).toBe(false);
    expect(isAuthorizationError(null)).toBe(false);
  });
});
