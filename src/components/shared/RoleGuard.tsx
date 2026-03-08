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
  
  // super_admin always has full access (same as tenant_owner + extras)
  if (state.userRole === 'super_admin' || allowedRoles.includes(state.userRole)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};