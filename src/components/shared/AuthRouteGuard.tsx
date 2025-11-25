import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

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

  // If requireClinic is false, allow access (for create-clinic and select-clinic pages)
  if (!requireClinic) {
    return <>{children}</>;
  }

  // Check if user needs to create a clinic or select one
  useEffect(() => {
    const checkUserClinics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user from public.users
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) return;

        // Get user's clinics
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('clinic_id')
          .eq('user_id', userData.id)
          .eq('active', true);

        if (!userRoles || userRoles.length === 0) {
          // No clinics - redirect to create
          if (location.pathname !== '/create-clinic') {
            window.location.href = '/create-clinic';
          }
        } else if (userRoles.length > 1 && !state.currentClinicId) {
          // Multiple clinics but none selected - redirect to select
          if (location.pathname !== '/select-clinic') {
            window.location.href = '/select-clinic';
          }
        }
      } catch (error) {
        console.error('Error checking user clinics:', error);
      }
    };

    if (state.isAuthenticated) {
      checkUserClinics();
    }
  }, [state.isAuthenticated, state.currentClinicId, location.pathname]);

  // If clinic is required but not set, show loading
  if (requireClinic && !state.currentClinicId) {
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
