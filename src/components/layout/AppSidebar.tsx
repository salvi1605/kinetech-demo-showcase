import * as React from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar,
  Users,
  UserCheck,
  Clock,
  Calendar1,
  Copy,
  Settings,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  Stethoscope,
  BarChart3
} from 'lucide-react';
import { useApp, type UserRole } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { isPreviewEnv } from '@/lib/envFlags';
import { toast } from 'sonner';
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
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro', 'super_admin'] as UserRole[],
  },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro', 'super_admin'] as UserRole[],
  },
  {
    title: 'Profesionales',
    url: '/practitioners',
    icon: UserCheck,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'super_admin'] as UserRole[],
  },
  {
    title: 'Tratamientos',
    url: '/treatments',
    icon: Stethoscope,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'super_admin'] as UserRole[],
  },
  {
    title: 'Disponibilidad',
    url: '/availability',
    icon: Clock,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro', 'super_admin'] as UserRole[],
  },
  {
    title: 'Excepciones',
    url: '/exceptions',
    icon: Calendar1,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro', 'super_admin'] as UserRole[],
  },
  {
    title: 'Copiar Horario',
    url: '/copy-schedule',
    icon: Copy,
    roles: ['admin_clinic', 'tenant_owner', 'super_admin'] as UserRole[],
  },
  ...(isPreviewEnv() ? [{
    title: 'Reportes',
    url: '/reports',
    icon: BarChart3,
    roles: ['admin_clinic', 'tenant_owner', 'super_admin'] as UserRole[],
  }] : []),
];

const authItems = [
  {
    title: 'Usuarios',
    url: '/users',
    icon: Shield,
    roles: ['admin_clinic', 'tenant_owner', 'super_admin'] as UserRole[],
  },
  {
    title: 'Clínicas',
    url: '/clinics',
    icon: Building2,
    roles: ['admin_clinic', 'tenant_owner', 'super_admin'] as UserRole[],
  },
  {
    title: 'Configuración',
    url: '/settings',
    icon: Settings,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro', 'super_admin'] as UserRole[],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const currentPath = location.pathname;
  const collapsed = !state.sidebarExpanded;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
      toast.success('Sesión cerrada exitosamente');
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-200",
      "border-0 ring-0 outline-none focus:border-0 focus:ring-0 focus-visible:outline-none",
      isActive
        ? "bg-primary/90 text-primary-foreground font-medium"
        : "text-primary-foreground hover:bg-primary-foreground hover:text-primary focus-visible:bg-primary-foreground focus-visible:text-primary",
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
        className={collapsed 
          ? [
              "size-10 min-w-10 min-h-10 grid place-items-center rounded-md transition-colors duration-200",
              "border-0 ring-0 outline-none focus:border-0 focus:ring-0 focus-visible:outline-none",
              active
                ? "bg-primary/90 text-primary-foreground font-medium"
                : "text-primary-foreground hover:bg-primary-foreground hover:text-primary focus-visible:bg-primary-foreground focus-visible:text-primary",
            ].join(" ")
          : getNavClasses
        }
        aria-current={active ? "page" : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0 text-current" />
        {!collapsed && <span className="truncate">{item.title}</span>}
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
      className={[
        collapsed ? "w-16" : "w-64",
        "bg-primary text-primary-foreground border-0 outline-none ring-0",
      ].join(" ")}
    >
      <SidebarContent className="p-2 bg-primary text-primary-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-primary-foreground/20 mb-2">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="AgendixPro"
                className="w-9 h-9 rounded-md object-contain"
              />
              <div>
                <h2 className="font-bold text-primary-foreground">AgendixPro</h2>
                <p className="text-xs text-primary-foreground/70">Sistema de Gestión</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="h-8 w-8 p-0 shrink-0 text-primary-foreground hover:bg-primary-foreground/10"
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
            <Badge className="w-full justify-center bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
              Modo Demostración
            </Badge>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-primary-foreground/70"}>
            Navegación Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <SidebarItem item={item} />
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Auth & Settings */}
        {visibleAuthItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : "text-primary-foreground/70"}>
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
            <SidebarMenu>
              {visibleAuthItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: (visibleNavItems.length + i) * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <SidebarItem item={item} />
                </motion.div>
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
                    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro', 'super_admin'],
                  }}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* User info and logout when authenticated */}
        {state.isAuthenticated && state.currentUser && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <div className="px-3 py-2 space-y-2">
                {!collapsed && (
                  <div className="text-xs text-primary-foreground/70 truncate">
                    {state.currentUser.email}
                  </div>
                )}
                {collapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLogout}
                          className="w-full h-10 p-0 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                        >
                          <LogOut className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        Cerrar sesión
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-2 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Cerrar sesión</span>
                  </Button>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Role chip colapsado */}
        {collapsed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 bg-primary-foreground/20 text-primary-foreground rounded-md flex items-center justify-center">
              <span className="text-xs font-medium">
                {state.userRole === 'super_admin' ? 'S' : state.userRole === 'tenant_owner' ? 'T' : state.userRole === 'admin_clinic' ? 'A' : state.userRole === 'receptionist' ? 'R' : 'K'}
              </span>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
