import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useApp } from '@/contexts/AppContext';
import { formatPatientShortName } from '@/utils/formatters';

const routeNames: Record<string, string> = {
  '/': 'Inicio',
  '/login': 'Iniciar Sesión',
  '/select-clinic': 'Seleccionar Clínica',
  '/calendar': 'Agenda',
  '/patients': 'Pacientes',
  '/practitioners': 'Profesionales',
  '/availability': 'Disponibilidad',
  '/exceptions': 'Excepciones',
  '/copy-schedule': 'Copiar Horarios',
  '/settings': 'Configuración',
};

// Helper to convert name to URL-friendly slug
const nameToSlug = (name: string) => name.replace(/\s+/g, '_');

export const Breadcrumbs = () => {
  const location = useLocation();
  const { state } = useApp();
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // Get display name for dynamic routes (patients/:id)
  const getDisplayName = (segment: string, index: number): string => {
    // If previous segment is 'patients' and this looks like a UUID, find patient name
    if (index > 0 && pathnames[index - 1] === 'patients') {
      const patient = state.patients.find(p => p.id === segment);
      if (patient) {
        return formatPatientShortName(patient);
      }
    }
    return segment;
  };
  
  // Don't show breadcrumbs on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <div className="bg-muted/30 border-b px-4 py-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span className="sr-only">Inicio</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
        {pathnames.map((pathname, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            const displayName = routeNames[routeTo] || getDisplayName(pathname, index);
            
            return (
              <div key={routeTo} className="flex items-center">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-medium">
                      {displayName}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={routeTo} className="hover:text-primary transition-colors">
                        {displayName}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};