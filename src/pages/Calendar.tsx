import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Copy,
  Search,
  User,
  Clock,
  X
} from 'lucide-react';
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
import { NewAppointmentDialog } from '@/components/dialogs/NewAppointmentDialog';
import { AppointmentDetailDialog } from '@/components/dialogs/AppointmentDetailDialog';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';

// Configuración de horarios y slots
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
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

export const Calendar = () => {
  const { state } = useApp();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('all');
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // Para mobile
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string; date: Date } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Cambio de semana con skeleton
  const changeWeek = (direction: 'prev' | 'next') => {
    setIsLoading(true);
    const newWeek = direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    
    // Simular loading
    setTimeout(() => setIsLoading(false), 800);
  };

  // Obtener fechas de la semana laboral
  const getWeekDates = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Lunes
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  };

  const weekDates = getWeekDates();

  // Obtener citas para un slot específico
  const getAppointmentsForSlot = (dayIndex: number, time: string) => {
    const targetDate = weekDates[dayIndex];
    return state.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return isSameDay(aptDate, targetDate) && apt.startTime === time;
    });
  };

  // Verificar si hay slot disponible
  const isSlotAvailable = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    if (appointments.length > 0) return false;
    
    // Verificar si hay slots mock disponibles
    return mockAvailableSlots.some(slot => 
      slot.day === dayIndex + 1 && 
      slot.time === time &&
      (selectedPractitioner === 'all' || slot.practitionerId === selectedPractitioner)
    );
  };

  // Obtener color del kinesiólogo
  const getPractitionerColor = (practitionerId: string) => {
    const colors = ['bg-blue-100 border-blue-300', 'bg-green-100 border-green-300', 'bg-purple-100 border-purple-300'];
    const index = state.practitioners.findIndex(p => p.id === practitionerId);
    return colors[index % colors.length] || 'bg-gray-100 border-gray-300';
  };

  // Handlers de interacción
  const handleSlotClick = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    
    if (appointments.length > 0) {
      // Mostrar detalle de cita existente
      setSelectedAppointment(appointments[0]);
    } else if (isSlotAvailable(dayIndex, time)) {
      // Crear nueva cita
      setSelectedSlot({ day: dayIndex, time, date: weekDates[dayIndex] });
      setShowNewAppointmentModal(true);
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

  // Filtros
  const filteredPractitioners = selectedPractitioner === 'all' 
    ? state.practitioners 
    : state.practitioners.filter(p => p.id === selectedPractitioner);

  const filteredPatients = state.patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Renderizado de slot para grid
  const renderSlot = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    const isAvailable = isSlotAvailable(dayIndex, time);
    
    if (appointments.length > 0) {
      const appointment = appointments[0];
      const patient = state.patients.find(p => p.id === appointment.patientId);
      const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
      const colorClass = getPractitionerColor(appointment.practitionerId);
      
      return (
        <button 
          key={`${dayIndex}-${time}`}
          className={`min-h-[60px] p-2 border border-border/30 cursor-pointer hover:opacity-80 transition-all ${colorClass} w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`}
          onClick={() => handleSlotClick(dayIndex, time)}
          aria-label={`Turno de ${patient?.name || 'Paciente'} con ${practitioner?.name || 'Profesional'} a las ${time}`}
          tabIndex={0}
        >
          <div className="text-xs font-medium text-foreground">
            {patient?.name || 'Paciente'}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <User className="h-3 w-3" />
            {practitioner?.name || 'Profesional'}
          </div>
          <div className="flex items-center justify-between mt-1">
            <Badge 
              variant={appointment.status === 'cancelled' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {appointment.status === 'scheduled' ? 'Reservado' : 
               appointment.status === 'cancelled' ? 'Cancelado' : 
               appointment.status === 'completed' ? 'No-show' : appointment.status}
            </Badge>
          </div>
        </button>
      );
    }
    
    if (isAvailable) {
      return (
        <button 
          key={`${dayIndex}-${time}`}
          className="min-h-[60px] p-2 border border-border/30 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors flex items-center justify-center w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          onClick={() => handleSlotClick(dayIndex, time)}
          aria-label={`Slot disponible a las ${time}. Hacer clic para crear turno`}
          tabIndex={0}
        >
          <Badge variant="outline" className="text-xs bg-white border-green-300 text-green-700">
            Disponible
          </Badge>
        </button>
      );
    }
    
    return (
      <div 
        key={`${dayIndex}-${time}`}
        className="min-h-[60px] p-2 border border-border/30 bg-gray-50"
      />
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground">
            Gestiona turnos y horarios de kinesiología
          </p>
        </div>

        {/* Filtros Desktop */}
        <div className="hidden lg:flex items-center gap-2 flex-wrap">
          <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kinesiólogo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {state.practitioners.map((practitioner) => (
                <SelectItem key={practitioner.id} value={practitioner.id}>
                  {practitioner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-10 w-[160px]"
            />
          </div>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button variant="outline" onClick={handleCopySchedule}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar horario
          </Button>

          <RoleGuard allowedRoles={['admin', 'recep']}>
            <Button onClick={() => setShowNewAppointmentModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo turno
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Navegación de semana */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {format(weekDates[0], 'd MMM', { locale: es })} - {format(weekDates[4], 'd MMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => changeWeek('prev')}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => changeWeek('next')}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                        const appointments = getAppointmentsForSlot(dayIndex, time);
                        const isAvailable = isSlotAvailable(dayIndex, time);
                        
                        return (
                          <button 
                            key={time}
                            className={`p-3 border rounded-lg transition-all min-h-[44px] w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                              appointments.length > 0 
                                ? `${getPractitionerColor(appointments[0].practitionerId)} hover:opacity-80 cursor-pointer`
                                : isAvailable 
                                  ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                                  : 'bg-gray-50 border-gray-200 cursor-default'
                            }`}
                            onClick={() => appointments.length > 0 || isAvailable ? handleSlotClick(dayIndex, time) : undefined}
                            disabled={appointments.length === 0 && !isAvailable}
                            aria-label={
                              appointments.length > 0 
                                ? `Turno reservado a las ${time} por ${state.patients.find(p => p.id === appointments[0].patientId)?.name}`
                                : isAvailable 
                                  ? `Slot disponible a las ${time}. Hacer clic para crear turno`
                                  : `Slot no disponible a las ${time}`
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{time}</span>
                              </div>
                              
                              {appointments.length > 0 ? (
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {state.patients.find(p => p.id === appointments[0].patientId)?.name}
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    Reservado
                                  </Badge>
                                </div>
                              ) : isAvailable ? (
                                <Badge variant="outline" className="text-xs bg-white border-green-300 text-green-700">
                                  Disponible
                                </Badge>
                              ) : null}
                            </div>
                          </button>
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

      {/* FAB Mobile - Con Role Guard */}
      <RoleGuard allowedRoles={['admin', 'recep']}>
        <FloatingActionButton
          onClick={() => setShowNewAppointmentModal(true)}
          ariaLabel="Crear nuevo turno"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      </RoleGuard>

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