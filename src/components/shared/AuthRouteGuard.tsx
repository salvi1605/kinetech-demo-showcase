import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthRouteGuardProps {
  children: ReactNode;
}

export const AuthRouteGuard = ({ children }: AuthRouteGuardProps) => {
  const { state } = useApp();

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

  // Render protected content
  return <>{children}</>;
};
