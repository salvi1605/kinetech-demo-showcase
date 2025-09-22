import { useState } from 'react';
import { Search, Calendar, Users, Settings, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useApp, type UserRole } from '@/contexts/AppContext';

export const Topbar = () => {
  const { state, dispatch } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);

  const getCurrentWeekString = () => {
    const date = new Date();
    date.setDate(date.getDate() + (weekOffset * 7));
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? weekOffset - 1 : weekOffset + 1;
    setWeekOffset(newOffset);
    
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + (newOffset * 7));
    dispatch({ type: 'SET_CURRENT_WEEK', payload: newDate });
  };

  const handleRoleChange = (role: UserRole) => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
  };

  const handleSearchChange = (value: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
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
        
        <div className="hidden lg:flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">Kine-UI</h1>
          <Badge variant="outline" className="text-xs">v2</Badge>
        </div>

        {/* Week Selector */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleWeekChange('prev')}
          >
            ←
          </Button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium min-w-[120px] text-center">
              {getCurrentWeekString()}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleWeekChange('next')}
          >
            →
          </Button>
        </div>

        {/* Kinesiólogo selector (solo admin/recep) */}
        {(state.userRole === 'admin' || state.userRole === 'recep') && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={state.selectedPractitionerId || ''} 
              onValueChange={handlePractitionerChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar kinesiólogo" />
              </SelectTrigger>
              <SelectContent>
                {state.practitioners.map((practitioner) => (
                  <SelectItem key={practitioner.id} value={practitioner.id}>
                    {practitioner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Lista de slots seleccionados */}
        {(state.userRole === 'admin' || state.userRole === 'recep') && state.selectedSlots.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md p-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {state.selectedSlots.size} slot{state.selectedSlots.size !== 1 ? 's' : ''} seleccionado{state.selectedSlots.size !== 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              disabled={state.selectedSlots.size === 0 || !state.selectedPractitionerId}
              onClick={() => {
                // Trigger mass create modal - this would need to be passed as prop or handled via context
                const event = new CustomEvent('openMassCreateModal');
                window.dispatchEvent(event);
              }}
            >
              Confirmar selección
            </Button>
          </div>
        )}
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pacientes, profesionales..."
            value={state.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

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

        {/* Settings */}
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};