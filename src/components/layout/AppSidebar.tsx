import { Calendar, Users, UserCheck, Clock, Copy, Settings, LogIn, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApp } from '@/contexts/AppContext';

const navigationItems = [
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
    title: 'Excepciones',
    url: '/exceptions',
    icon: Calendar,
    roles: ['admin', 'kinesio'],
  },
  {
    title: 'Copiar Horarios',
    url: '/copy-schedule',
    icon: Copy,
    roles: ['admin'],
  },
];

const authItems = [
  {
    title: 'Seleccionar Clínica',
    url: '/select-clinic',
    icon: Building,
    roles: ['admin', 'recep', 'kinesio'],
  },
  {
    title: 'Configuración',
    url: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, dispatch } = useApp();
  const currentPath = location.pathname;
  const collapsed = !state.sidebarExpanded;

  const isActive = (path: string) => currentPath === path;
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive 
        ? "bg-primary text-primary-foreground font-medium" 
        : "hover:bg-muted/50"
    }`;

  const filterItemsByRole = (items: typeof navigationItems) => {
    return items.filter(item => item.roles.includes(state.userRole));
  };

  const visibleNavItems = filterItemsByRole(navigationItems);
  const visibleAuthItems = filterItemsByRole(authItems);

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const SidebarItem = ({ item, isAuth = false }: { item: typeof navigationItems[0], isAuth?: boolean }) => {
    const active = isActive(item.url);
    
    const linkContent = (
      <NavLink 
        to={item.url} 
        className={getNavClasses}
        aria-current={active ? "page" : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className={collapsed ? "sr-only" : ""}>{item.title}</span>
      </NavLink>
    );

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  {linkContent}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          {linkContent}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
    >
      <SidebarContent className="p-2">
        {/* Header with Logo and Toggle Button */}
        <div className="flex items-center justify-between px-3 py-4 border-b mb-2">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div>
                <h2 className="font-bold text-foreground">Kine-UI</h2>
                <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="h-8 w-8 p-0 shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Demo Mode Indicator */}
        {state.isDemoMode && !collapsed && (
          <div className="mx-3 mb-4">
            <Badge variant="secondary" className="w-full justify-center">
              Modo Demostración
            </Badge>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navegación Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Authentication & Settings */}
        {visibleAuthItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAuthItems.map((item) => (
                  <SidebarItem key={item.title} item={item} isAuth />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Login Link (if not authenticated) */}
        {!state.isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarItem 
                  item={{
                    title: 'Iniciar Sesión',
                    url: '/login',
                    icon: LogIn,
                    roles: ['admin', 'recep', 'kinesio']
                  }} 
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Role Indicator (when collapsed) */}
        {collapsed && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
              <span className="text-xs font-medium">
                {state.userRole === 'admin' ? 'A' : state.userRole === 'recep' ? 'R' : 'K'}
              </span>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}