import { useState } from 'react';
import { Calendar, Users, UserCheck, MoreHorizontal, Clock, Settings, Stethoscope, Calendar1, Copy, Shield, Building2 } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useApp, type UserRole } from '@/contexts/AppContext';
import { isDevToolsEnabled } from '@/lib/devTools';

const primaryNavItems = [
  {
    title: 'Agenda',
    url: '/calendar',
    icon: Calendar,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'] as UserRole[],
  },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'] as UserRole[],
  },
  {
    title: 'Profesionales',
    url: '/practitioners',
    icon: UserCheck,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist'] as UserRole[],
  },
  {
    title: 'Config',
    url: '/settings',
    icon: Settings,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'] as UserRole[],
  },
];

const moreNavItems = [
  {
    title: 'Tratamientos',
    url: '/treatments',
    icon: Stethoscope,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist'] as UserRole[],
  },
  {
    title: 'Disponibilidad',
    url: '/availability',
    icon: Clock,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro'] as UserRole[],
  },
  {
    title: 'Excepciones',
    url: '/exceptions',
    icon: Calendar1,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro'] as UserRole[],
  },
  {
    title: 'Copiar Horario',
    url: '/copy-schedule',
    icon: Copy,
    roles: ['admin_clinic', 'tenant_owner'] as UserRole[],
  },
  {
    title: 'Usuarios',
    url: '/users',
    icon: Shield,
    roles: ['admin_clinic', 'tenant_owner'] as UserRole[],
  },
  {
    title: 'Clínicas',
    url: '/clinics',
    icon: Building2,
    roles: ['admin_clinic', 'tenant_owner'] as UserRole[],
  },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const currentPath = location.pathname;
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => currentPath === path;

  const getNavClasses = (path: string) => {
    const baseClasses = "flex flex-col items-center justify-center p-2 text-xs transition-colors min-h-[44px]";
    return isActive(path)
      ? `${baseClasses} text-primary font-medium`
      : `${baseClasses} text-muted-foreground hover:text-foreground`;
  };

  const visiblePrimary = primaryNavItems.filter(item => 
    item.roles.includes(state.userRole)
  );

  const visibleMore = moreNavItems.filter(item =>
    item.roles.includes(state.userRole)
  );

  // Check if "Más" should be active (current route is in moreNavItems)
  const isMoreActive = visibleMore.some(item => isActive(item.url));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50" aria-label="Navegación principal móvil">
        <div className="flex">
          {visiblePrimary.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={`${getNavClasses(item.url)} flex-1 relative`}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="truncate w-full text-center">{item.title}</span>
              
              {isActive(item.url) && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-b-md" />
              )}
            </NavLink>
          ))}

          {/* "Más" tab */}
          {visibleMore.length > 0 && (
            <button
              onClick={() => setShowMore(true)}
              className={`${getNavClasses('__more')} flex-1 relative ${isMoreActive ? 'text-primary font-medium' : ''}`}
              aria-label="Más opciones"
            >
              <MoreHorizontal className="h-5 w-5 mb-1" />
              <span className="truncate w-full text-center">Más</span>
              {isMoreActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-b-md" />
              )}
            </button>
          )}
        </div>
        
        {isDevToolsEnabled && state.isDemoMode && (
          <div className="absolute -top-8 left-2">
            <Badge variant="secondary" className="text-xs">
              DEMO
            </Badge>
          </div>
        )}
      </nav>

      {/* More menu sheet */}
      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="max-h-[60vh]">
          <SheetHeader>
            <SheetTitle>Más opciones</SheetTitle>
          </SheetHeader>
          <div className="py-4 grid grid-cols-3 gap-3">
            {visibleMore.map((item) => (
              <button
                key={item.title}
                onClick={() => {
                  navigate(item.url);
                  setShowMore(false);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors min-h-[80px] ${
                  isActive(item.url)
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium text-center">{item.title}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
