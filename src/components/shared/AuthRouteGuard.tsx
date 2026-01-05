import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthRouteGuardProps {
  children: ReactNode;
  requireClinic?: boolean;
}

export const AuthRouteGuard = ({ children, requireClinic = true }: AuthRouteGuardProps) => {
  const { state } = useApp();
  const location = useLocation();

  // Show loading state while checking authentication
  if (state.isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User with roles but no clinics -> redirect to /no-access
  if (state.hasRolesPending) {
    if (location.pathname !== '/no-access') {
      return <Navigate to="/no-access" replace />;
    }
    return <>{children}</>;
  }

  // If requireClinic is false, handle special routing
  if (!requireClinic) {
    // User without roles trying to access create-clinic -> allow
    // User with roles trying to access create-clinic -> redirect to no-access
    if (location.pathname === '/create-clinic' && !state.canCreateClinic && !state.currentClinicId) {
      return <Navigate to="/no-access" replace />;
    }
    return <>{children}</>;
  }

  // Check if user needs to create a clinic or select one
  if (!state.currentClinicId) {
    // No clinic selected - determine where to go
    if (state.canCreateClinic) {
      // User can create clinic (no roles)
      if (location.pathname !== '/create-clinic') {
        return <Navigate to="/create-clinic" replace />;
      }
    } else {
      // Has clinic access somewhere, needs to select
      if (location.pathname !== '/select-clinic' && location.pathname !== '/create-clinic') {
        return <Navigate to="/select-clinic" replace />;
      }
    }
    
    // Show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
};
