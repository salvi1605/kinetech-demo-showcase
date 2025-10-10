import { Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useApp, type UserRole, runAutoNoAsistio } from '@/contexts/AppContext';
import { useLocation } from 'react-router-dom';
import { addDays, format } from 'date-fns';

export const Topbar = () => {
  const { state, dispatch } = useApp();
  const location = useLocation();
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

        {/* Settings */}
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};