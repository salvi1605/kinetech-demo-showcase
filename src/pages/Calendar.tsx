import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Copy,
  User,
  Clock,
  X
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
import { getAccessibleTextColor } from '@/utils/colorUtils';
import { displaySelectedLabel, parseSlotKey } from '@/utils/dateUtils';
import { NewAppointmentDialog } from '@/components/dialogs/NewAppointmentDialog';
import { AppointmentDetailDialog } from '@/components/dialogs/AppointmentDetailDialog';
import { MassCreateAppointmentDialog } from '@/components/dialogs/MassCreateAppointmentDialog';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { KinesioCombobox } from '@/components/shared/KinesioCombobox';
import { WeekNavigatorCompact } from '@/components/navigation/WeekNavigatorCompact';

// Configuración de horarios y slots
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 19;
const SLOT_MINUTES = 30;

// Generar slots de tiempo
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MOBILE_WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // Para mobile
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string; date: Date; slotIndex?: number } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showMassCreateModal, setShowMassCreateModal] = useState(false);

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

  // Construir índice de citas
  state.appointments.forEach(appointment => {
    const dateISO = appointment.date.length === 10
      ? appointment.date
      : format(parseISO(appointment.date), 'yyyy-MM-dd');
    const subSlot = appointment.slotIndex || 0;
    const key = getSlotKey({ dateISO, hour: appointment.startTime, subSlot });
    appointmentsBySlotKey.set(key, appointment);
  });

  // Effect to update loading when week changes
  useEffect(() => {
    if (state.calendarWeekStart) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.calendarWeekStart]);


  // Obtener citas para un slot específico (opcionalmente filtrado por subIndex)
  const getAppointmentsForSlot = (dayIndex: number, time: string, subIndex?: number) => {
    const targetDateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
    return state.appointments.filter(apt => {
      const aptISO = apt.date.length === 10
        ? apt.date
        : format(parseISO(apt.date), 'yyyy-MM-dd');
      const matchesSlot = aptISO === targetDateISO && apt.startTime === time;
      if (subIndex !== undefined) {
        return matchesSlot && apt.slotIndex === subIndex;
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
    const usedSlots = appointments.map(apt => apt.slotIndex || 0);
    
    for (let i = 0; i < capacity; i++) {
      if (!usedSlots.includes(i)) {
        return i;
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

  // Handler para toggle de completado
  const onToggleCompleted = (apt: Appointment, isCompleted: boolean) => {
    const nextStatus = isCompleted ? 'completed' : 'scheduled';
    dispatch({ 
      type: 'UPDATE_APPOINTMENT', 
      payload: { 
        id: apt.id, 
        updates: { status: nextStatus } 
      } 
    });
    
    // Actualizar el índice local
    const dateISO = apt.date.length === 10 ? apt.date : format(parseISO(apt.date), 'yyyy-MM-dd');
    const subSlot = apt.slotIndex || 0;
    const key = getSlotKey({ dateISO, hour: apt.startTime, subSlot });
    appointmentsBySlotKey.set(key, { ...apt, status: nextStatus });
    
    toast({
      title: isCompleted ? "Turno marcado como completado" : "Turno marcado como pendiente",
      description: isCompleted ? "El turno se ha completado exitosamente" : "El turno está pendiente de completar",
    });
  };

  // Handler de clic en sub-slot
  const onSubSlotClick = (meta: { dayIndex: number; time: string; subSlot: number }) => {
    const dateISO = format(weekDates[meta.dayIndex], 'yyyy-MM-dd');
    const key = getSlotKey({ dateISO, hour: meta.time, subSlot: meta.subSlot });
    const appointment = appointmentsBySlotKey.get(key);
    
    if (appointment) {
      // Abrir detalle de turno existente (sin seleccionar)
      setSelectedAppointment(appointment);
    } else if (isMultiSelectEnabled) {
      // Alternar selección si está libre y multi-select está habilitado
      toggleSelect(key);
    } else {
      // Abrir nuevo turno (para rol kinesio)
      setSelectedSlot({ 
        day: meta.dayIndex, 
        time: meta.time, 
        date: weekDates[meta.dayIndex],
        slotIndex: meta.subSlot
      });
      setShowNewAppointmentModal(true);
    }
  };

  // Función para confirmar selección múltiple
  const confirmSelection = () => {
    if (state.selectedSlots.size === 0 || !state.selectedPractitionerId) {
      const missing = [];
      if (state.selectedSlots.size === 0) missing.push('horarios');
      if (!state.selectedPractitionerId) missing.push('kinesiólogo');
      
      toast({
        title: "Datos incompletos",
        description: `Falta seleccionar: ${missing.join(' y ')}`,
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

  const handleExport = async () => {
    try {
      const scheduleText = `AGENDA SEMANAL - ${format(weekDates[0], 'd MMM', { locale: es })} al ${format(weekDates[4], 'd MMM yyyy', { locale: es })}

${weekDates.map((date, dayIndex) => {
  const dayAppointments = TIME_SLOTS.map(time => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    if (appointments.length > 0) {
      const apt = appointments[0];
      const patient = state.patients.find(p => p.id === apt.patientId);
      const practitioner = state.practitioners.find(p => p.id === apt.practitionerId);
      return `${time} - ${patient?.name || 'Sin paciente'} (${practitioner?.name || 'Sin profesional'})`;
    }
    return null;
  }).filter(Boolean);
  
  return `${format(date, 'EEEE d/MM', { locale: es })}:
${dayAppointments.length > 0 ? dayAppointments.join('\n') : 'Sin turnos programados'}`;
}).join('\n\n')}

Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      await navigator.clipboard.writeText(scheduleText);
      
      toast({
        title: "Agenda exportada",
        description: "La agenda semanal ha sido copiada al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo copiar la agenda al portapapeles",
        variant: "destructive",
      });
    }
  };

  const handleCopySchedule = async () => {
    try {
      const scheduleText = `HORARIO SEMANAL
${WEEKDAYS.map((day, index) => `${day}: ${format(weekDates[index], 'd/MM')}`).join('\n')}

Horarios disponibles: ${WORK_START_HOUR}:00 - ${WORK_END_HOUR}:00
Duración de turnos: ${SLOT_MINUTES} minutos

Profesionales:
${state.practitioners.map(p => `- ${p.name} (${p.specialty})`).join('\n')}`;

      await navigator.clipboard.writeText(scheduleText);
      
      toast({
        title: "Horario copiado",
        description: "El horario base ha sido copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el horario al portapapeles",
        variant: "destructive",
      });
    }
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
              const canShowCheckbox = appointment.practitionerId && appointment.patientId && appointment.status !== 'cancelled';
              const isCompleted = appointment.status === 'completed';
              const hasPermission = ['admin', 'recep', 'kinesio'].includes(state.userRole);
              
              return (
                <button
                  key={`${dayIndex}-${time}-${subIndex}`}
                  className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-all text-left focus:outline-none focus:ring-1 focus:ring-ring ${
                    isCompleted ? 'opacity-70' : ''
                  }`}
                  style={styles}
                  onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                  aria-label={`Turno de ${patient?.name || 'Paciente'} con ${practitioner?.name || 'Profesional'} a las ${time}, sub-slot ${subIndex + 1}`}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-1">
                    {canShowCheckbox && hasPermission && (
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={(checked) => onToggleCompleted(appointment, Boolean(checked))}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        disabled={appointment.status === 'cancelled'}
                        className="h-3 w-3"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{patient?.name || 'Paciente'}</div>
                      <div className="truncate opacity-75">{practitioner?.name || 'Profesional'}</div>
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Completado
                        </Badge>
                      )}
                      {appointment.status === 'scheduled' && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Reservado
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
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
                    {isSelected ? '✓' : '+'}
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
                 {isSelected ? '✓' : '+'}
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
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Agenda
            </h1>
            <p className="text-muted-foreground">
              Gestiona turnos y horarios de kinesiología
            </p>
          </div>
          <div className="lg:hidden">
            <WeekNavigatorCompact />
          </div>
        </div>
        <div className="hidden lg:block">
          <WeekNavigatorCompact />
        </div>

        {/* Botones de acción para admin/recep (simplificado) */}
        {isMultiSelectEnabled && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNewAppointmentModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo turno
            </Button>
            <Button variant="outline" onClick={handleCopySchedule}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar horario
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        )}
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
                  <KinesioCombobox
                    value={state.selectedPractitionerId}
                    onChange={(practitionerId) => dispatch({ type: 'SET_SELECTED_PRACTITIONER', payload: practitionerId })}
                    options={state.practitioners.map(p => ({ value: p.id, label: p.name }))}
                    placeholder="Selecciona Kinesiólogo"
                    className="text-xs"
                  />
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
                disabled={state.selectedSlots.size === 0 || !state.selectedPractitionerId}
              >
                Confirmar selección
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </div>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button variant="outline" onClick={handleCopySchedule}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar horario
          </Button>

        </div>
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
                                   <button
                                     key={`${time}-${subIndex}`}
                                     className={`p-2 border rounded-lg transition-all min-h-[44px] w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:opacity-80 cursor-pointer ${
                                       isCompleted ? 'opacity-70' : ''
                                     }`}
                                     style={styles}
                                     onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                                     aria-label={`Turno de ${patient?.name} a las ${time}, sub-slot ${subIndex + 1}`}
                                   >
                                     <div className="flex items-center gap-2">
                                       {canShowCheckbox && hasPermission && (
                                         <Checkbox
                                           checked={isCompleted}
                                           onCheckedChange={(checked) => onToggleCompleted(appointment, Boolean(checked))}
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             e.preventDefault();
                                           }}
                                           disabled={appointment.status === 'cancelled'}
                                           className="h-4 w-4 shrink-0"
                                         />
                                       )}
                                       <div className="flex-1 min-w-0">
                                         <div className="text-sm font-medium">{patient?.name}</div>
                                         <div className="text-xs opacity-75 mb-1">{practitioner?.name || 'Profesional'}</div>
                                         {isCompleted ? (
                                           <Badge variant="secondary" className="text-xs">
                                             Completado
                                           </Badge>
                                         ) : (
                                           <Badge variant="outline" className="text-xs">
                                             Reservado
                                           </Badge>
                                         )}
                                       </div>
                                     </div>
                                   </button>
                                 );
                                } else {
                                  const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
                                  const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
                                  const isSelected = state.selectedSlots.has(key);
                                  
                                  return (
                                    <button
                                      key={`${time}-${subIndex}`}
                                      className={`p-2 border rounded-lg transition-all min-h-[44px] w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer ${
                                        isSelected 
                                          ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                                          : 'border-dashed border-green-300 bg-green-50 hover:bg-green-100'
                                      }`}
                                      onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                                      aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} turno ${time} sub-slot ${subIndex + 1}`}
                                    >
                                      <div className="flex items-center justify-center">
                                        <span className={`text-lg ${isSelected ? 'text-blue-600' : 'text-green-600'}`}>
                                          {isSelected ? '✓' : '+'}
                                        </span>
                                        <span className={`ml-2 text-sm ${isSelected ? 'text-blue-700' : 'text-green-700'}`}>
                                          {isSelected ? 'Seleccionado' : 'Disponible'}
                                        </span>
                                      </div>
                                    </button>
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
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onAppointmentChange={(appointment) => setSelectedAppointment(appointment)}
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