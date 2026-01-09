import { ReactNode } from 'react';
import { useApp, UserRole } from '@/contexts/AppContext';

type AllowedRole = UserRole; // 'admin_clinic' | 'receptionist' | 'health_pro' | 'tenant_owner'

interface RoleGuardProps {
  allowedRoles: AllowedRole[];
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