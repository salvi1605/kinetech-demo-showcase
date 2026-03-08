import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

interface PublicRouteGuardProps {
  children: ReactNode;
}

/**
 * Redirects authenticated users away from public pages to /calendar (or /select-clinic).
 * Shows content normally while auth is still loading or if not authenticated.
 */
export const PublicRouteGuard = ({ children }: PublicRouteGuardProps) => {
  const { state } = useApp();

  // Don't redirect while still checking auth
  if (state.isLoadingAuth) {
    return <>{children}</>;
  }

  // Authenticated → send to app
  if (state.isAuthenticated) {
    if (state.isSuperAdmin && !state.currentClinicId) {
      return <Navigate to="/super-admin" replace />;
    }
    if (state.currentClinicId) {
      return <Navigate to="/calendar" replace />;
    }
    return <Navigate to="/select-clinic" replace />;
  }

  return <>{children}</>;
};
