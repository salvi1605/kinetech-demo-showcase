import { Calendar, Users, UserCheck, Clock, Copy, Settings, LogIn, Building } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
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
  const { state: sidebarState, open, setOpen } = useSidebar();
  const location = useLocation();
  const { state } = useApp();
  const currentPath = location.pathname;
  const collapsed = sidebarState === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-muted/50 transition-colors";

  const filterItemsByRole = (items: typeof navigationItems) => {
    return items.filter(item => item.roles.includes(state.userRole));
  };

  const visibleNavItems = filterItemsByRole(navigationItems);
  const visibleAuthItems = filterItemsByRole(authItems);

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="p-2">
        {/* Logo Section (when expanded) */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-4 border-b mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <h2 className="font-bold text-foreground">Kine-UI</h2>
              <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
            </div>
          </div>
        )}

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
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses}
                      aria-current={isActive(item.url) ? "page" : undefined}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavClasses}
                        aria-current={isActive(item.url) ? "page" : undefined}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/login" 
                      className={getNavClasses}
                      aria-current={isActive("/login") ? "page" : undefined}
                      title={collapsed ? "Iniciar Sesión" : undefined}
                    >
                      <LogIn className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Iniciar Sesión</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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