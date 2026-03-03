/**
 * Returns true if the app is running in a Lovable preview environment.
 * Preview URLs contain "preview" in the hostname (e.g. *-preview--*.lovable.app).
 * Production/published URLs do not (e.g. agendixpro.lovable.app).
 */
export function isPreviewEnv(): boolean {
  return window.location.hostname.includes('preview');
}
