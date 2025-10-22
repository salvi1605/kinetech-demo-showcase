import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  User,
  Clock,
  X,
  Plus,
  Check
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useApp, Appointment } from '@/contexts/AppContext';
import type { TreatmentType } from '@/types/appointments';
import { treatmentLabel } from '@/utils/formatters';
import { getAccessibleTextColor } from '@/utils/colorUtils';
import { displaySelectedLabel, parseSlotKey, isPastDay } from '@/utils/dateUtils';
import { statusLabel } from '@/utils/statusUtils';
import { NewAppointmentDialog } from '@/components/dialogs/NewAppointmentDialog';
import { AppointmentDetailDialog } from '@/components/dialogs/AppointmentDetailDialog';
import { MassCreateAppointmentDialog } from '@/components/dialogs/MassCreateAppointmentDialog';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { KinesioCombobox } from '@/components/shared/KinesioCombobox';
import { TreatmentMultiSelect } from '@/components/shared/TreatmentMultiSelect';
import { WeekNavigatorCompact } from '@/components/navigation/WeekNavigatorCompact';
import { useAutoNoAsistio } from '@/hooks/useAutoNoAsistio';

// Configuración de horarios y slots
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 19; // Último inicio permitido: 19:00
const SLOT_MINUTES = 30;

// Generar slots de tiempo
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = WORK_START_HOUR; hour <= WORK_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
      if (hour === WORK_END_HOUR && minute === 0) break; // Solo 19:00, no 19:30
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MOBILE_WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

// Utilidades para tri-estado
type Status = 'scheduled' | 'completed' | 'cancelled';
const statusToChecked = (s: Status) => s === 'completed' ? true : s === 'cancelled' ? 'indeterminate' : false;
const nextStatus = (s: Status): Status => s === 'scheduled' ? 'completed' : s === 'completed' ? 'cancelled' : 'scheduled';

// Mock appointment status for available slots
const mockAvailableSlots = [
  { day: 1, time: '09:00', practitionerId: '1' },
  { day: 1, time: '09:30', practitionerId: '1' },
  { day: 1, time: '10:00', practitionerId: '2' },
  { day: 2, time: '14:00', practitionerId: '1' },
  { day: 3, time: '11:00', practitionerId: '2' },
  { day: 4, time: '15:30', practitionerId: '1' },
  { day: 5, time: '16:00', practitionerId: '2' },
];

// Crear clave única para cada sub-slot
const getSlotKey = ({ dateISO, hour, subSlot }: { dateISO: string; hour: string; subSlot: number }) => {
  return `${dateISO}_${hour}_${subSlot}`;
};

export const Calendar = () => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  
  // Initialize auto no asistio hook
  useAutoNoAsistio();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // Para mobile
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string; date: Date; subSlot?: number } | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showMassCreateModal, setShowMassCreateModal] = useState(false);
  const [agendaBanner, setAgendaBanner] = useState<{ type: 'error'; text: string } | null>(null);

  // Obtener fechas de la semana laboral
  const getWeekDates = () => {
    const currentWeek = state.calendarWeekStart 
      ? new Date(state.calendarWeekStart + 'T00:00:00') 
      : new Date();
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Lunes
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  };

  const weekDates = getWeekDates();

  // Índice de citas por clave de sub-slot
  const appointmentsBySlotKey = new Map<string, Appointment>();

  // Construir índice de citas (convertir subSlot 1-5 a índice 0-4 para el Map)
  state.appointments.forEach(appointment => {
    const dateISO = appointment.date.length === 10
      ? appointment.date
      : format(parseISO(appointment.date), 'yyyy-MM-dd');
    const subSlot0 = ((appointment.subSlot ?? 1) - 1); // Convertir 1-5 a 0-4
    const key = getSlotKey({ dateISO, hour: appointment.startTime, subSlot: subSlot0 });
    appointmentsBySlotKey.set(key, appointment);
  });

  // Effect to update loading when week changes and clean past selections
  useEffect(() => {
    if (state.calendarWeekStart) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 300);
      
      // Clean past day selections only for non-admin users
      if (state.userRole !== 'admin') {
        const filteredSlots = [...state.selectedSlots].filter(key => {
          const [dateISO] = key.split('_');
          return !isPastDay(dateISO);
        });
        
        if (filteredSlots.length !== state.selectedSlots.size) {
          // Clear all selections if any past day slots were found
          dispatch({ type: 'CLEAR_SLOT_SELECTION' });
        }
      }
      
      // Clear banner
      setAgendaBanner(null);
      
      return () => clearTimeout(timer);
    }
  }, [state.calendarWeekStart, state.userRole]);


  // Obtener citas para un slot específico (opcionalmente filtrado por subIndex)
  const getAppointmentsForSlot = (dayIndex: number, time: string, subIndex?: number) => {
    const targetDateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
    return state.appointments.filter(apt => {
      const aptISO = apt.date.length === 10
        ? apt.date
        : format(parseISO(apt.date), 'yyyy-MM-dd');
      const matchesSlot = aptISO === targetDateISO && apt.startTime === time;
      if (subIndex !== undefined) {
        // Comparar subSlot (1-5) con subIndex + 1
        return matchesSlot && apt.subSlot === (subIndex + 1);
      }
      return matchesSlot;
    });
  };

  // Obtener capacidad para un slot
  const getSlotCapacity = (dayIndex: number, time: string) => {
    const weekday = (dayIndex + 1) % 7; // Convert to 0=Sunday format
    const availability = state.availability.find(av => 
      av.weekday === weekday && 
      time >= av.from && 
      time < av.to
    );
    return availability?.capacity || 5; // Default capacity
  };

  // Obtener próximo sub-slot disponible
  const getNextAvailableSubSlot = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    const capacity = getSlotCapacity(dayIndex, time);
    const usedSlots = appointments.map(apt => apt.subSlot);
    
    for (let i = 1; i <= capacity; i++) {
      if (!usedSlots.includes(i as 1 | 2 | 3 | 4 | 5)) {
        return i as 1 | 2 | 3 | 4 | 5;
      }
    }
    return null; // No available slots
  };

  // Verificar si hay slot disponible
  const isSlotAvailable = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    const capacity = getSlotCapacity(dayIndex, time);
    
    // Si hay menos citas que capacidad, hay slots disponibles
    return appointments.length < capacity;
  };

  // Obtener color del kinesiólogo
  const getPractitionerColor = (practitionerId: string) => {
    const practitioner = state.practitioners.find(p => p.id === practitionerId);
    return practitioner?.color || '#6b7280'; // Default gray
  };

  // Obtener estilos con contraste accesible
  const getPractitionerStyles = (practitionerId: string) => {
    const bgColor = getPractitionerColor(practitionerId);
    const textColor = getAccessibleTextColor(bgColor);
    return {
      backgroundColor: bgColor,
      color: textColor,
      borderColor: bgColor,
    };
  };

  // Verificar si multi-selección está habilitada
  const isMultiSelectEnabled = state.userRole === 'admin' || state.userRole === 'recep';

  // Función para alternar selección de slot
  const toggleSelect = (key: string) => {
    dispatch({ type: 'TOGGLE_SLOT_SELECTION', payload: key });
  };

  // Handler para toggle tri-estado
  const onTriToggle = (apt: Appointment) => {
    const dateISO = apt.date.length === 10 ? apt.date : format(parseISO(apt.date), 'yyyy-MM-dd');
    if (isPastDay(dateISO) && state.userRole !== 'admin') {
      toast({
        title: "Acceso denegado",
        description: "No puedes realizar cambios en días anteriores",
        variant: "destructive",
      });
      return;
    }
    
    const nextStatusValue = nextStatus(apt.status as Status);
    dispatch({ 
      type: 'UPDATE_APPOINTMENT', 
      payload: { 
        id: apt.id, 
        updates: { status: nextStatusValue } 
      } 
    });
    
    // Actualizar el índice local (convertir subSlot 1-5 a 0-4)
    const subSlot0 = ((apt.subSlot ?? 1) - 1);
    const key = getSlotKey({ dateISO, hour: apt.startTime, subSlot: subSlot0 });
    const updatedApt = { ...apt, status: nextStatusValue };
    appointmentsBySlotKey.set(key, updatedApt);
    
    const msg = nextStatusValue === 'completed' ? 'Turno marcado como Asistió' : 
                nextStatusValue === 'scheduled' ? 'Turno marcado como Reservado' : 
                'Turno marcado como No Asistió';
    toast({
      title: msg,
      description: "El estado del turno se ha actualizado",
    });
  };

  // Handler de clic en sub-slot
  const onSubSlotClick = (meta: { dayIndex: number; time: string; subSlot: number }) => {
    const dateISO = format(weekDates[meta.dayIndex], 'yyyy-MM-dd');
    const key = getSlotKey({ dateISO, hour: meta.time, subSlot: meta.subSlot });
    const appointment = appointmentsBySlotKey.get(key);
    const isPast = isPastDay(dateISO);
    
    if (appointment) {
      // Abrir detalle de turno existente (siempre permitido)
      setAgendaBanner(null);
      setSelectedAppointmentId(appointment.id);
    } else {
      // Sub-slot vacío (crear)
      if (isPast && (state.userRole === 'recep' || state.userRole === 'kinesio')) {
        setAgendaBanner({ type: 'error', text: 'No se pueden elegir citas de días anteriores' });
        return; // No seleccionar ni abrir modales de creación
      }
      
      setAgendaBanner(null); // Admin o día actual/futuro
      
      if (isMultiSelectEnabled) {
        // Alternar selección si está libre y multi-select está habilitado
        toggleSelect(key);
      } else {
        // Abrir nuevo turno (para rol kinesio)
        setSelectedSlot({ 
          day: meta.dayIndex, 
          time: meta.time, 
          date: weekDates[meta.dayIndex],
          subSlot: meta.subSlot
        });
        setShowNewAppointmentModal(true);
      }
    }
  };

  // Función para confirmar selección múltiple
  const confirmSelection = () => {
    if (state.selectedSlots.size === 0 || !state.selectedPractitionerId || !state.selectedTreatmentType) {
      const missing = [];
      if (state.selectedSlots.size === 0) missing.push('horarios');
      if (!state.selectedPractitionerId) missing.push('kinesiólogo');
      if (!state.selectedTreatmentType) missing.push('tipo de tratamiento');
      
      toast({
        title: "Datos incompletos",
        description: `Falta seleccionar: ${missing.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    setShowMassCreateModal(true);
  };

  // Listen for mass create modal trigger from topbar
  useEffect(() => {
    const handleOpenMassCreate = () => {
      confirmSelection();
    };
    
    window.addEventListener('openMassCreateModal', handleOpenMassCreate);
    return () => window.removeEventListener('openMassCreateModal', handleOpenMassCreate);
  }, [state.selectedSlots.size, state.selectedPractitionerId]);

  // Función para limpiar selección
  const clearSelection = () => {
    dispatch({ type: 'CLEAR_SLOT_SELECTION' });
  };

  // Handlers de interacción (mantener para compatibilidad)
  const handleSlotClick = (dayIndex: number, time: string, subIndex?: number) => {
    if (subIndex !== undefined) {
      onSubSlotClick({ dayIndex, time, subSlot: subIndex });
    } else {
      // Fallback para clicks sin subIndex específico
      onSubSlotClick({ dayIndex, time, subSlot: 0 });
    }
  };

  // Handler para exportar datos
  const handleExport = () => {
    // Implementar lógica de exportación
    toast({
      title: "Exportar datos",
      description: "Funcionalidad de exportación en desarrollo",
    });
  };

  // Renderizado de slot para grid con capacidad múltiple
  const renderSlot = (dayIndex: number, time: string) => {
    const capacity = getSlotCapacity(dayIndex, time);
    const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
    
    // Obtener citas usando el índice de sub-slots
    const slotAppointments = Array.from({ length: 5 }, (_, subIndex) => {
      const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
      return appointmentsBySlotKey.get(key);
    });
    
    const hasAppointments = slotAppointments.some(apt => apt !== undefined);

    // Si hay citas, mostrar sub-slots
    if (hasAppointments) {
      return (
        <div key={`${dayIndex}-${time}`} className="min-h-[60px] p-1 border border-border/30 grid gap-1" 
             style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
          {Array.from({ length: 5 }).map((_, subIndex) => {
              const appointment = slotAppointments[subIndex];
            
            if (appointment) {
              const patient = state.patients.find(p => p.id === appointment.patientId);
              const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
              const styles = getPractitionerStyles(appointment.practitionerId);
              const hasPermission = ['admin', 'recep', 'kinesio'].includes(state.userRole);
              const stateAttr = statusToChecked(appointment.status as Status);
              const aria = stateAttr === true ? 'true' : stateAttr === 'indeterminate' ? 'mixed' : 'false';
              
              return (
                <div className="flex justify-center items-center px-1">
                  <div 
                    className="mx-auto text-xs p-2 rounded border hover:opacity-80 transition-all text-left focus:outline-none focus:ring-1 focus:ring-ring flex items-center gap-2 w-full max-w-full relative"
                    style={styles}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSubSlotClick({ dayIndex, time, subSlot: subIndex });
                      }
                    }}
                    aria-label={`Turno de ${patient?.name || 'Paciente'} con ${practitioner?.name || 'Profesional'} a las ${time}, sub-slot ${subIndex + 1}`}
                  >
                    {hasPermission && appointment.practitionerId && appointment.patientId && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={aria}
                        onClick={(e) => { e.stopPropagation(); onTriToggle(appointment); }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer bg-background"
                        data-state={stateAttr === true ? 'checked' : stateAttr === 'indeterminate' ? 'indeterminate' : 'unchecked'}
                      >
                        {stateAttr === true && <Check className="h-4 w-4 text-green-600" />}
                        {stateAttr === 'indeterminate' && <X className="h-4 w-4 text-red-600" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{patient?.name || 'Paciente'}</div>
                      <div className="truncate opacity-75">{practitioner?.name || 'Profesional'}</div>
                      <div className={`text-xs px-2 py-1 rounded border mt-1 ${
                        appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {statusLabel(appointment.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (subIndex < capacity) {
              const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
              const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
              const isSelected = state.selectedSlots.has(key);
              
              return (
                <button
                  key={`${dayIndex}-${time}-${subIndex}`}
                  className={`text-xs p-1 rounded border cursor-pointer transition-colors flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-ring ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                      : 'border-dashed border-green-300 bg-green-50 hover:bg-green-100'
                  }`}
                  onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                  aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} turno ${time} sub-slot ${subIndex + 1}`}
                  tabIndex={0}
                >
                  <span className={isSelected ? 'text-blue-600' : 'text-green-600'}>
                    {isSelected ? '✓' : <Plus className="h-3 w-3" />}
                  </span>
                </button>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Slot completamente vacío - mostrar todos los sub-slots disponibles
    return (
      <div key={`${dayIndex}-${time}`} className="min-h-[60px] p-1 border border-border/30 grid gap-1" 
           style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
         {Array.from({ length: 5 }).map((_, subIndex) => {
           if (subIndex >= capacity) {
             return <div key={`${dayIndex}-${time}-${subIndex}`} className="bg-gray-100" />;
           }
           
           const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
           const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
           const isSelected = state.selectedSlots.has(key);
           
           return (
             <button
               key={`${dayIndex}-${time}-${subIndex}`}
               className={`text-xs p-1 rounded border cursor-pointer transition-colors flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-ring ${
                 isSelected 
                   ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                   : 'border-dashed border-green-300 bg-green-50 hover:bg-green-100'
               }`}
               onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
               aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} turno ${time} sub-slot ${subIndex + 1}`}
               tabIndex={0}
             >
               <span className={isSelected ? 'text-blue-600' : 'text-green-600'}>
                 {isSelected ? '✓' : <Plus className="h-3 w-3" />}
               </span>
             </button>
           );
         })}
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          Agenda
        </h1>
        {agendaBanner?.type === 'error' && (
          <div className="w-full mt-2 text-sm font-medium text-red-600">
            {agendaBanner.text}
          </div>
        )}
        <p className="text-muted-foreground">
          Gestiona turnos y horarios de kinesiología
        </p>
      </div>

      {/* Rest of component remains the same */}
      <div className="space-y-4">

        {/* Clear selection button */}
        {isMultiSelectEnabled && state.selectedSlots.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-900">
                  {state.selectedSlots.size} horario{state.selectedSlots.size !== 1 ? 's' : ''} seleccionado{state.selectedSlots.size !== 1 ? 's' : ''}
                </span>
                {state.selectedSlots.size > 0 && isMultiSelectEnabled && (
                  <>
                    <KinesioCombobox
                      value={state.selectedPractitionerId}
                      onChange={(practitionerId) => dispatch({ type: 'SET_SELECTED_PRACTITIONER', payload: practitionerId })}
                      options={state.practitioners.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="Selecciona Kinesiólogo"
                      className="text-xs"
                    />
                    <Select
                      value={state.selectedTreatmentType ?? ''}
                      onValueChange={(value) => dispatch({ type: 'SET_SELECTED_TREATMENT_TYPE', payload: value as TreatmentType })}
                    >
                      <SelectTrigger className="h-8 text-xs w-[200px]">
                        <SelectValue placeholder="Selecciona tratamiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fkt">FKT</SelectItem>
                        <SelectItem value="atm">ATM</SelectItem>
                        <SelectItem value="drenaje">Drenaje</SelectItem>
                        <SelectItem value="masaje">Masaje</SelectItem>
                        <SelectItem value="vestibular">Vestibular</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="text-blue-700 hover:text-blue-900 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
              {Array.from(state.selectedSlots)
                .sort((a, b) => {
                  const aSlot = a.split('_');
                  const bSlot = b.split('_');
                  if (aSlot[0] !== bSlot[0]) return aSlot[0].localeCompare(bSlot[0]);
                  if (aSlot[1] !== bSlot[1]) return aSlot[1].localeCompare(bSlot[1]);
                  return parseInt(aSlot[2]) - parseInt(bSlot[2]);
                })
                .map((key) => {
                  const { dateISO, hour, subSlot } = parseSlotKey(key);
                  const displayText = displaySelectedLabel({ dateISO, hour, subSlot: (subSlot + 1) as 1 | 2 | 3 | 4 | 5 });
                  
                  return (
                    <div key={key} className="flex items-center justify-between text-sm bg-white rounded p-2">
                      <span className="text-blue-900">
                        {displayText}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSelect(key)}
                        className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={confirmSelection} 
                className="flex-1"
                disabled={state.selectedSlots.size === 0 || !state.selectedPractitionerId || !state.selectedTreatmentType}
              >
                Confirmar selección
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Navegación de semana */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {format(weekDates[0], 'd MMM', { locale: es })} - {format(weekDates[4], 'd MMM yyyy', { locale: es })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vista Desktop/Tablet - Grid semanal */}
          <div className="hidden md:block">
            {isLoading ? (
              <LoadingSkeleton variant="calendar" />
            ) : (
              <div className="overflow-x-auto">
                {/* Navegador de semana compacto */}
                <div className="sticky top-0 z-10 flex justify-end px-2 py-1 bg-background/80 backdrop-blur">
                  <WeekNavigatorCompact />
                </div>
                <div className="grid grid-cols-6 gap-1 min-w-[800px]">
                  {/* Header */}
                  <div className="p-2 text-sm font-medium text-muted-foreground border-b">
                    Hora
                  </div>
                  {WEEKDAYS.map((day, index) => (
                    <div key={day} className="p-2 text-sm font-medium text-center border-b bg-muted/30">
                      <div>{day}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(weekDates[index], 'd MMM', { locale: es })}
                      </div>
                    </div>
                  ))}

                  {/* Slots de tiempo */}
                  {TIME_SLOTS.map((time) => (
                    <div key={time} className="contents">
                      <div className="p-2 text-sm text-muted-foreground border-r bg-muted/10 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {time}
                      </div>
                      {WEEKDAYS.map((_, dayIndex) => renderSlot(dayIndex, time))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vista Mobile - Tabs por día */}
          <div className="md:hidden">
            {/* Navegador de semana compacto para móvil */}
            <div className="flex justify-end mb-2">
              <WeekNavigatorCompact />
            </div>
            <Tabs value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
              <TabsList className="grid w-full grid-cols-5">
                {MOBILE_WEEKDAYS.map((day, index) => (
                  <TabsTrigger key={index} value={index.toString()} className="text-xs">
                    <div className="text-center">
                      <div>{day}</div>
                      <div className="text-xs">{format(weekDates[index], 'd', { locale: es })}</div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {WEEKDAYS.map((_, dayIndex) => (
                <TabsContent key={dayIndex} value={dayIndex.toString()} className="mt-4">
                  {isLoading ? (
                    <LoadingSkeleton variant="cards" />
                  ) : (
                    <div className="space-y-1">
                       {TIME_SLOTS.map((time) => {
                          const capacity = getSlotCapacity(dayIndex, time);
                          const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
                          
                          // Obtener citas usando el índice de sub-slots
                          const slotAppointments = Array.from({ length: 5 }, (_, subIndex) => {
                            const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
                            return appointmentsBySlotKey.get(key);
                          });
                          
                          const appointmentCount = slotAppointments.filter(apt => apt !== undefined).length;
                         
                         return (
                           <div key={time} className="space-y-1">
                             <div className="flex items-center gap-2 mb-2">
                               <Clock className="h-4 w-4 text-muted-foreground" />
                               <span className="font-medium">{time}</span>
                               <span className="text-xs text-muted-foreground">
                                 ({appointmentCount}/{capacity})
                               </span>
                             </div>
                             
                             {Array.from({ length: capacity }).map((_, subIndex) => {
                               const appointment = slotAppointments[subIndex];
                              
                               if (appointment) {
                                 const patient = state.patients.find(p => p.id === appointment.patientId);
                                 const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
                                 const styles = getPractitionerStyles(appointment.practitionerId);
                                 const canShowCheckbox = appointment.practitionerId && appointment.patientId && appointment.status !== 'cancelled';
                                 const isCompleted = appointment.status === 'completed';
                                 const hasPermission = ['admin', 'recep', 'kinesio'].includes(state.userRole);
                                 
                                  return (
                                    <Card
                                      key={`${time}-${subIndex}`}
                                      className="p-3 cursor-pointer border-l-4 hover:opacity-80 transition-colors"
                                      style={{ borderLeftColor: getPractitionerColor(appointment.practitionerId) }}
                                      onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="font-medium text-sm truncate">
                                              {patient?.name || 'Paciente'}
                                            </div>
                                             <span className={`inline-block px-2 py-1 text-xs rounded ${
                                               appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                               appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                               'bg-red-100 text-red-800'
                                             }`}>
                                                {statusLabel(appointment.status)}
                                             </span>
                                          </div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                                            <User className="h-3 w-3" />
                                            <span className="truncate">{practitioner?.name || 'Profesional'}</span>
                                          </div>
                                        </div>
                        {hasPermission && appointment.practitionerId && appointment.patientId && (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={statusToChecked(appointment.status as Status) === true ? 'true' : statusToChecked(appointment.status as Status) === 'indeterminate' ? 'mixed' : 'false'}
                            onClick={(e) => { e.stopPropagation(); onTriToggle(appointment); }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer bg-background ml-2"
                            data-state={statusToChecked(appointment.status as Status) === true ? 'checked' : statusToChecked(appointment.status as Status) === 'indeterminate' ? 'indeterminate' : 'unchecked'}
                          >
                            {statusToChecked(appointment.status as Status) === true && <Check className="h-4 w-4 text-green-600" />}
                            {statusToChecked(appointment.status as Status) === 'indeterminate' && <X className="h-4 w-4 text-red-600" />}
                          </button>
                        )}
                                      </div>
                                    </Card>
                                  );
                                } else {
                                  const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
                                  const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
                                  const isSelected = state.selectedSlots.has(key);
                                  
                                  return (
                                    <Card
                                      key={`${time}-${subIndex}`}
                                      className={`p-3 cursor-pointer border-dashed transition-colors ${
                                        isSelected 
                                          ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
                                          : 'border-green-300 bg-green-50 hover:bg-green-100'
                                      }`}
                                      onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                                    >
                                      <div className="flex items-center justify-center">
                                        <span className={`text-lg ${isSelected ? 'text-blue-600' : 'text-green-600'}`}>
                                          {isSelected ? '✓' : <Plus className="h-4 w-4" />}
                                        </span>
                                      </div>
                                    </Card>
                                  );
                                }
                              return null;
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>


      {/* Modal Nuevo Turno */}
      <NewAppointmentDialog
        open={showNewAppointmentModal}
        onOpenChange={setShowNewAppointmentModal}
        selectedSlot={selectedSlot}
      />

      <AppointmentDetailDialog
        open={!!selectedAppointmentId}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        appointmentId={selectedAppointmentId}
        onAppointmentChange={(appointmentId) => setSelectedAppointmentId(appointmentId)}
      />

      <MassCreateAppointmentDialog
        open={showMassCreateModal}
        onOpenChange={setShowMassCreateModal}
        selectedSlotKeys={Array.from(state.selectedSlots)}
      />


      {/* Estado vacío */}
      {!state.isDemoMode && state.appointments.length === 0 && !isLoading && (
        <EmptyState
          icon={<CalendarIcon className="h-12 w-12" />}
          title="No hay turnos programados"
          description="Comienza creando tu primer turno o activa el modo demo para ver datos de ejemplo"
          action={{
            label: "Crear primer turno",
            onClick: () => setShowNewAppointmentModal(true),
            disabled: !['admin', 'recep'].includes(state.userRole),
            'aria-label': 'Crear el primer turno del calendario'
          }}
        />
      )}
    </div>
  );
};
