/// <reference types="bun" />
import React from 'react';
import { describe, expect, mock, test } from 'bun:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const signOutCalls: number[] = [];
mock.module('@/integrations/supabase/client', () => ({
  supabase: { auth: { signOut: async () => { signOutCalls.push(1); return { error: null }; } } },
}));
mock.module('@/components/shared/SeoHead', () => ({ SeoHead: () => null }));

const { AccountSetupError } = await import('./AccountSetupError');
const { shouldShowAccountSetupError } = await import('@/lib/auth/accountSetup');

describe('profile step failure keeps the session', () => {
  test('protected pages show the retry screen when the profile could not be prepared', () => {
    expect(shouldShowAccountSetupError(true, 'auth', '/calendar')).toBe(true);
    expect(shouldShowAccountSetupError(true, 'auth', '/select-clinic')).toBe(true);
  });

  test('/login shows the retry screen instead of a silent login form', () => {
    expect(shouldShowAccountSetupError(true, 'public', '/login')).toBe(true);
  });

  test('public marketing pages are not replaced', () => {
    expect(shouldShowAccountSetupError(true, 'public', '/')).toBe(false);
    expect(shouldShowAccountSetupError(true, 'public', '/pricing')).toBe(false);
  });

  test('without a setup error nothing is replaced', () => {
    expect(shouldShowAccountSetupError(false, 'auth', '/calendar')).toBe(false);
    expect(shouldShowAccountSetupError(false, 'public', '/login')).toBe(false);
  });

  test('the screen offers Reintentar and Cerrar sesión and does not sign out by itself', () => {
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<AccountSetupError />); });
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('No pudimos preparar tu cuenta');
    expect(text).toContain('Reintentar');
    expect(text).toContain('Cerrar sesión');
    expect(signOutCalls.length).toBe(0);
  });
});
