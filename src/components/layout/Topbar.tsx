import { Users, Settings, Calendar as CalendarIcon, X, LogOut, Building, Menu, Wrench, Shield } from 'lucide-react';
import { AnimatedMenuItems } from '@/components/shared/AnimatedMenuItems';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApp, type UserRole, runAutoNoAsistio } from '@/contexts/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isDevToolsEnabled } from '@/lib/devTools';
import { clearSelectedRole } from '@/lib/selectedRoleStorage';

export const Topbar = () => {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isCalendarRoute = location.pathname === '/calendar';

  const handleRoleChange = (role: UserRole) => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
  };

  const handleDemoToggle = () => {
    if (state.isDemoMode) {
      dispatch({ type: 'CLEAR_DEMO_DATA' });
    } else {
      dispatch({ type: 'SEED_DEMO_DATA' });
    }
    dispatch({ type: 'TOGGLE_DEMO_MODE' });
  };

  const handlePractitionerChange = (practitionerId: string) => {
    dispatch({ type: 'SET_SELECTED_PRACTITIONER', payload: practitionerId || undefined });
  };

  const handleSimulateDayChange = () => {
    const tomorrowISO = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    runAutoNoAsistio(dispatch, state.appointments, tomorrowISO);
  };

  const handleTestDateChange = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      dispatch({ type: 'SET_TEST_DATE', payload: dateStr });
    }
  };

  const handleClearTestDate = () => {
    dispatch({ type: 'SET_TEST_DATE', payload: undefined });
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'tenant_owner': return 'Propietario';
      case 'admin_clinic': return 'Administrador';
      case 'receptionist': return 'Recepcionista';
      case 'health_pro': return 'Kinesiólogo';
    }
  };

  const getRoleBadgeVariant = (role: UserRole): "default" | "destructive" | "outline" | "secondary" => {
    switch (role) {
      case 'tenant_owner': return 'outline';
      case 'admin_clinic': return 'destructive';
      case 'receptionist': return 'secondary';
      case 'health_pro': return 'default';
    }
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

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

  const isMobile = useIsMobile();

  // Dev tools content shared between desktop and mobile sheet
  const devToolsContent = isDevToolsEnabled ? (
    <div className="flex flex-col gap-4">
      {/* Time Travel Control */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant={state.testCurrentDate ? "default" : "outline"} 
              size="sm"
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              {state.testCurrentDate 
                ? format(parseLocalDate(state.testCurrentDate), 'dd/MM/yyyy', { locale: es })
                : 'Test: Fecha'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={state.testCurrentDate ? parseLocalDate(state.testCurrentDate) : undefined}
              onSelect={handleTestDateChange}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {state.testCurrentDate && (
          <Button variant="ghost" size="sm" onClick={handleClearTestDate} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
        {state.testCurrentDate && (
          <Badge variant="default" className="text-xs bg-primary">🕐 Time Travel</Badge>
        )}
      </div>

      {/* Role Emulator */}
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Select value={state.userRole} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tenant_owner">Propietario</SelectItem>
            <SelectItem value="admin_clinic">Administrador</SelectItem>
            <SelectItem value="receptionist">Recepcionista</SelectItem>
            <SelectItem value="health_pro">Kinesiólogo</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant={getRoleBadgeVariant(state.userRole)} className="text-xs">
          {getRoleDisplayName(state.userRole)}
        </Badge>
      </div>

      {/* Demo Mode Toggle */}
      <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
        <Switch checked={state.isDemoMode} onCheckedChange={handleDemoToggle} id="demo-mode" />
        <Label htmlFor="demo-mode" className="text-sm cursor-pointer">Modo Demo</Label>
        {state.isDemoMode && <Badge variant="secondary" className="text-xs">DEMO</Badge>}
      </div>

      {/* Day Change Simulator */}
      {(state.userRole === 'admin_clinic' || state.userRole === 'tenant_owner') && (
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold w-full"
          onClick={handleSimulateDayChange}
          title="Ejecuta conversión Reservado → No Asistió como si fuera medianoche"
        >
          Simular cambio de día
        </Button>
      )}
    </div>
  ) : null;

  return (
    <header className="h-14 sm:h-16 border-b bg-card flex items-center justify-between px-3 sm:px-4 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger className="lg:hidden" />
        
        <div className="hidden lg:flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">AgendixPro</h1>
        </div>
      </div>

      {/* Center Section - Empty for spacing */}
      <div className="flex-1"></div>

      {/* Right Section - Desktop */}
      <div className="hidden md:flex items-center gap-4">
        {/* Clinic Name */}
        {state.currentClinicName && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[150px]">{state.currentClinicName}</span>
          </div>
        )}

        {/* Super Admin Dashboard Button - hidden when impersonating another role */}
        {state.isSuperAdmin && !state.isImpersonatingRole && (
          <Button variant="outline" size="sm" onClick={() => {
            dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: '', name: '' } });
            navigate('/super-admin');
          }} className="gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Panel Global
          </Button>
        )}

        {/* Change Clinic Button */}
        {state.isAuthenticated && (
          <Button variant="ghost" size="sm" onClick={() => { clearSelectedRole(); navigate('/select-clinic'); }}>
            Cambiar Clínica
          </Button>
        )}

        {/* DEV TOOLS - Desktop inline */}
        {isDevToolsEnabled && devToolsContent && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Wrench className="h-4 w-4" />
                Dev Tools
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              {devToolsContent}
            </PopoverContent>
          </Popover>
        )}

        {/* User Info and Logout */}
        {state.isAuthenticated && state.currentUser && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <span className="text-sm text-muted-foreground truncate max-w-[160px]">
              {state.currentUser.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Cerrar sesión</span>
            </Button>
          </div>
        )}
      </div>

      {/* Right Section - Mobile */}
      <div className="flex md:hidden items-center gap-2">
        {/* Dev Tools Sheet - Mobile */}
        {isDevToolsEnabled && devToolsContent && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Wrench className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Dev Tools</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                {devToolsContent}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* User Menu - Mobile */}
        {state.isAuthenticated && state.currentUser && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              <AnimatedMenuItems variant="fadeInRight" className="py-4 space-y-4">
                {/* Clinic Info */}
                {state.currentClinicName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{state.currentClinicName}</span>
                  </div>
                )}

                {state.isSuperAdmin && !state.isImpersonatingRole && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: '', name: '' } });
                      navigate('/super-admin');
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2 text-primary" />
                    Panel Global
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => { clearSelectedRole(); navigate('/select-clinic'); }}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Cambiar Clínica
                </Button>

                <Separator />

                {/* User email */}
                <div className="px-1">
                  <p className="text-xs text-muted-foreground">Sesión activa</p>
                  <p className="text-sm font-medium truncate">{state.currentUser.email}</p>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </Button>
              </AnimatedMenuItems>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
};