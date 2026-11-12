/**
 * Post-login profile step ("ensure-public-user").
 *
 * Rule: a failure in this step must NEVER sign the user out. It retries once
 * (refreshing the access token first only when the failure was an
 * authorization error) and then reports the outcome so the caller can keep
 * going with whatever profile already exists.
 */

/** Canonical form for staff emails: trimmed and lower-case. */
export const normalizeEmail = (email?: string | null): string =>
  (email ?? '').trim().toLowerCase();

export interface EnsurePublicUserDeps {
  invoke: () => Promise<{ error: unknown }>;
  refreshSession: () => Promise<{ error: unknown }>;
  wait?: (ms: number) => Promise<void>;
  warn?: (...args: unknown[]) => void;
}

export type EnsurePublicUserOutcome =
  | { ok: true; attempts: number }
  | { ok: false; attempts: number; error: unknown };

const RETRY_DELAY_MS = 500;

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** True when the edge function answered 401 (expired or invalid access token). */
export const isAuthorizationError = (error: unknown): boolean => {
  const status = (error as { context?: { status?: unknown } } | null)?.context?.status;
  return status === 401;
};

const safeInvoke = async (invoke: EnsurePublicUserDeps['invoke']): Promise<unknown> => {
  try {
    const { error } = await invoke();
    return error ?? null;
  } catch (error) {
    return error ?? new Error('ensure-public-user threw');
  }
};

export async function ensurePublicUserSafely(deps: EnsurePublicUserDeps): Promise<EnsurePublicUserOutcome> {
  const wait = deps.wait ?? defaultWait;
  const warn = deps.warn ?? console.warn;

  const firstError = await safeInvoke(deps.invoke);
  if (!firstError) return { ok: true, attempts: 1 };

  warn('[Bootstrap] ensure-public-user failed, retrying once', firstError);

  if (isAuthorizationError(firstError)) {
    try {
      const { error: refreshError } = await deps.refreshSession();
      if (refreshError) warn('[Bootstrap] session refresh failed (session kept)', refreshError);
    } catch (refreshError) {
      warn('[Bootstrap] session refresh threw (session kept)', refreshError);
    }
  }

  await wait(RETRY_DELAY_MS);

  const retryError = await safeInvoke(deps.invoke);
  if (!retryError) return { ok: true, attempts: 2 };

  warn('[Bootstrap] ensure-public-user retry failed; continuing without signing out', retryError);
  return { ok: false, attempts: 2, error: retryError };
}
