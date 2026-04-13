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
  
  // super_admin has full access ONLY when not impersonating another role
  const effectiveIsSuperAdmin = state.userRole === 'super_admin' && !state.isImpersonatingRole;
  if (effectiveIsSuperAdmin || allowedRoles.includes(state.userRole)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};