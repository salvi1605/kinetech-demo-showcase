import { NavLink, useLocation } from 'react-router-dom';
import { 
  Calendar,
  Users,
  UserCheck,
  Clock,
  Calendar1,
  Copy,
  Settings,
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp, type UserRole } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Navigation items definition
const navigationItems = [
  {
    title: 'Agenda',
    url: '/calendar',
    icon: Calendar,
    roles: ['admin', 'recep', 'kinesio'] as UserRole[],
  },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    roles: ['admin', 'recep'] as UserRole[],
  },
  {
    title: 'Profesionales',
    url: '/practitioners',
    icon: UserCheck,
    roles: ['admin'] as UserRole[],
  },
  {
    title: 'Disponibilidad',
    url: '/availability',
    icon: Clock,
    roles: ['admin'] as UserRole[],
  },
  {
    title: 'Excepciones',
    url: '/exceptions',
    icon: Calendar1,
    roles: ['admin'] as UserRole[],
  },
  {
    title: 'Copiar Horario',
    url: '/copy-schedule',
    icon: Copy,
    roles: ['admin'] as UserRole[],
  },
];

const authItems = [
  {
    title: 'Configuración',
    url: '/settings',
    icon: Settings,
    roles: ['admin'] as UserRole[],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, dispatch } = useApp();
  const currentPath = location.pathname;
  const collapsed = !state.sidebarExpanded;

  // Classes de nav en esquema oscuro-azul
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      isActive
        ? "bg-white/20 text-white font-medium" // ★ activo: contraste alto
        : "text-white/90 hover:bg-white/10",    // ★ normal/hover legible sobre azul
    ].join(" ");

  const filterItemsByRole = (items: typeof navigationItems) =>
    items.filter(item => item.roles.includes(state.userRole));

  const visibleNavItems = filterItemsByRole(navigationItems);
  const visibleAuthItems = filterItemsByRole(authItems);

  const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' });

  const SidebarItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const active = currentPath === item.url;

    const linkContent = (
      <NavLink
        to={item.url}
        className={getNavClasses}
        aria-current={active ? "page" : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0 text-white" /> {/* ★ icono blanco */}
        <span className={collapsed ? "sr-only" : "text-white"}>{item.title}</span> {/* ★ texto blanco */}
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
            {/* tooltip por defecto está bien; si quieres oscuro: className="bg-slate-900 text-white" */}
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
      className={[
        collapsed ? "w-16" : "w-64",
        "bg-blue-700 text-white border-r border-blue-800", // ★ fondo azul + texto blanco
      ].join(" ")}
    >
      {/* ★ A veces el content hereda bg; forzamos aquí también */}
      <SidebarContent className="p-2 bg-blue-700 text-white"> {/* ★ */}
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-blue-600 mb-2"> {/* ★ bordes en tonos azules */}
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div>
                <h2 className="font-bold text-white">Kine-UI</h2> {/* ★ */}
                <p className="text-xs text-white/70">Sistema de Gestión</p> {/* ★ */}
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="h-8 w-8 p-0 shrink-0 text-white hover:bg-white/10" // ★ que se vea
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
            <Badge className="w-full justify-center bg-white/10 text-white border-white/20"> {/* ★ legible sobre azul */}
              Modo Demostración
            </Badge>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-white/70"}> {/* ★ */}
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

        {/* Auth & Settings */}
        {visibleAuthItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : "text-white/70"}> {/* ★ */}
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAuthItems.map((item) => (
                  <SidebarItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Login link when not authenticated */}
        {!state.isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarItem
                  item={{
                    title: 'Iniciar Sesión',
                    url: '/login',
                    icon: LogIn,
                    roles: ['admin', 'recep', 'kinesio'],
                  }}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Role chip colapsado */}
        {collapsed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 bg-white/20 text-white rounded-md flex items-center justify-center"> {/* ★ */}
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