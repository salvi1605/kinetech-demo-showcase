import { Users, Settings, Calendar as CalendarIcon, X, LogOut, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useApp, type UserRole, runAutoNoAsistio } from '@/contexts/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      case 'admin': return 'Administrador';
      case 'recep': return 'Recepcionista';
      case 'kinesio': return 'Kinesiólogo';
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'recep': return 'secondary';
      case 'kinesio': return 'default';
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

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">Kine-UI</h1>
            <Badge variant="outline" className="text-xs">v2</Badge>
          </div>
          
        </div>

      </div>

      {/* Center Section - Empty for spacing */}
      <div className="flex-1"></div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Clinic Name */}
        {state.currentClinicName && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{state.currentClinicName}</span>
          </div>
        )}

        {/* Change Clinic Button */}
        {state.isAuthenticated && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/select-clinic')}
            className="hidden md:flex"
          >
            Cambiar Clínica
          </Button>
        )}

        {/* Time Travel Control */}
        <div className="flex items-center gap-2">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearTestDate}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {state.testCurrentDate && (
              <Badge variant="default" className="text-xs bg-primary">
                🕐 Time Travel
              </Badge>
            )}
        </div>

        {/* Role Emulator */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={state.userRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="recep">Recepcionista</SelectItem>
              <SelectItem value="kinesio">Kinesiólogo</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant={getRoleBadgeVariant(state.userRole)} className="text-xs">
            {getRoleDisplayName(state.userRole)}
          </Badge>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
          <Switch
            checked={state.isDemoMode}
            onCheckedChange={handleDemoToggle}
            id="demo-mode"
          />
          <Label htmlFor="demo-mode" className="text-sm cursor-pointer">
            Modo Demo
          </Label>
          {state.isDemoMode && (
            <Badge variant="secondary" className="text-xs">
              DEMO
            </Badge>
          )}
        </div>

        {/* Day Change Simulator */}
        {state.userRole === 'admin' && (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            onClick={handleSimulateDayChange}
            title="Ejecuta conversión Reservado → No Asistió como si fuera medianoche"
          >
            Simular cambio de día
          </Button>
        )}

        {/* User Info and Logout */}
        {state.isAuthenticated && state.currentUser && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <span className="text-sm text-muted-foreground">
              {state.currentUser.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Cerrar sesión</span>
            </Button>
          </div>
        )}

        {/* Settings */}
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};