import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

interface PatientRouteGuardProps {
  children: ReactNode;
}

export const PatientRouteGuard = ({ children }: PatientRouteGuardProps) => {
  const { state } = useApp();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Si el usuario es kinesiólogo, redirigir a la lista de pacientes
    if (state.userRole === 'health_pro') {
      navigate('/patients', { replace: true });
    }
  }, [state.userRole, navigate]);
  
  // Si es kinesiólogo, no renderizar nada (ya redirigimos)
  if (state.userRole === 'health_pro') {
    return null;
  }
  
  return <>{children}</>;
};
