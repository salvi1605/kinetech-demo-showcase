import { ReactNode } from 'react';
import { useApp, UserRole } from '@/contexts/AppContext';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard = ({ allowedRoles, children, fallback = null }: RoleGuardProps) => {
  const { state } = useApp();
  
  if (!allowedRoles.includes(state.userRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};