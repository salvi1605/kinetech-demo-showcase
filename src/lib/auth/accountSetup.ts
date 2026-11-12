/**
 * Where the "No pudimos preparar tu cuenta" screen replaces the page.
 * Protected pages always show it; among public pages only /login does,
 * so marketing pages keep working for a signed-in user with a broken profile.
 */
export const shouldShowAccountSetupError = (
  accountSetupError: boolean,
  guard: 'auth' | 'public',
  pathname: string,
): boolean => accountSetupError && (guard === 'auth' || pathname === '/login');
