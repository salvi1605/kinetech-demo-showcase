import { Calendar, Users, UserCheck, Clock, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';

const mobileNavItems = [
  {
    title: 'Agenda',
    url: '/calendar',
    icon: Calendar,
    roles: ['admin', 'recep', 'kinesio'],
  },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    roles: ['admin', 'recep', 'kinesio'],
  },
  {
    title: 'Profesionales',
    url: '/practitioners',
    icon: UserCheck,
    roles: ['admin', 'recep'],
  },
  {
    title: 'Disponibilidad',
    url: '/availability',
    icon: Clock,
    roles: ['admin', 'kinesio'],
  },
  {
    title: 'Config',
    url: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export const BottomNav = () => {
  const location = useLocation();
  const { state } = useApp();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const getNavClasses = (path: string) => {
    const baseClasses = "flex flex-col items-center justify-center p-2 text-xs transition-colors";
    return isActive(path)
      ? `${baseClasses} text-primary font-medium`
      : `${baseClasses} text-muted-foreground hover:text-foreground`;
  };

  const visibleItems = mobileNavItems.filter(item => 
    item.roles.includes(state.userRole)
  );

  // Limit to 5 items on mobile for better UX
  const displayItems = visibleItems.slice(0, 5);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex">
        {displayItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={`${getNavClasses(item.url)} flex-1 relative`}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="truncate w-full text-center">{item.title}</span>
            
            {/* Active indicator */}
            {isActive(item.url) && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-b-md" />
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Demo Mode Indicator */}
      {state.isDemoMode && (
        <div className="absolute -top-8 left-2">
          <Badge variant="secondary" className="text-xs">
            DEMO
          </Badge>
        </div>
      )}
    </nav>
  );
};