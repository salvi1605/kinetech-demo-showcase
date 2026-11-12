import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { AccountSetupError } from '@/components/shared/AccountSetupError';
import { shouldShowAccountSetupError } from '@/lib/auth/accountSetup';

interface PublicRouteGuardProps {
  children: ReactNode;
}

/**
 * Redirects authenticated users away from public pages to /calendar (or /select-clinic).
 * Shows content normally while auth is still loading or if not authenticated.
 */
export const PublicRouteGuard = ({ children }: PublicRouteGuardProps) => {
  const { state } = useApp();
  const location = useLocation();

  // Signed in on /login but the profile could not be prepared: offer retry instead of a silent login form
  if (shouldShowAccountSetupError(state.accountSetupError, 'public', location.pathname)) {
    return <AccountSetupError />;
  }

  // Don't redirect while still checking auth
  if (state.isLoadingAuth) {
    return <>{children}</>;
  }

  // Authenticated → send to app
  if (state.isAuthenticated) {
    const effectiveIsSuperAdmin = state.isSuperAdmin && !state.isImpersonatingRole;
    if (effectiveIsSuperAdmin && !state.currentClinicId) {
      return <Navigate to="/super-admin" replace />;
    }
    if (state.currentClinicId) {
      return <Navigate to="/calendar" replace />;
    }
    return <Navigate to="/select-clinic" replace />;
  }

  return <>{children}</>;
};
