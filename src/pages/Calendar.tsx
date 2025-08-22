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
  const [showAppointmentDetailModal, setShowAppointmentDetailModal] = useState(false);
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
      setShowAppointmentDetailModal(true);
    } else if (isSlotAvailable(dayIndex, time)) {
      // Crear nueva cita
      setSelectedSlot({ day: dayIndex, time, date: weekDates[dayIndex] });
      setShowNewAppointmentModal(true);
    }
  };

  const handleExport = () => {
    toast({
      title: "Exportando agenda",
      description: "Se ha iniciado la exportación de la agenda semanal",
    });
  };

  const handleCopySchedule = () => {
    toast({
      title: "Horario copiado",
      description: "El horario se ha copiado al portapapeles",
    });
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
        <div 
          key={`${dayIndex}-${time}`}
          className={`min-h-[60px] p-2 border border-border/30 cursor-pointer hover:opacity-80 transition-all ${colorClass}`}
          onClick={() => handleSlotClick(dayIndex, time)}
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
        </div>
      );
    }
    
    if (isAvailable) {
      return (
        <div 
          key={`${dayIndex}-${time}`}
          className="min-h-[60px] p-2 border border-border/30 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors flex items-center justify-center"
          onClick={() => handleSlotClick(dayIndex, time)}
        >
          <Badge variant="outline" className="text-xs bg-white border-green-300 text-green-700">
            Disponible
          </Badge>
        </div>
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

          <Button onClick={() => setShowNewAppointmentModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo turno
          </Button>
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
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
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
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {TIME_SLOTS.map((time) => {
                        const appointments = getAppointmentsForSlot(dayIndex, time);
                        const isAvailable = isSlotAvailable(dayIndex, time);
                        
                        return (
                          <div 
                            key={time}
                            className={`p-3 border rounded-lg cursor-pointer transition-all min-h-[44px] ${
                              appointments.length > 0 
                                ? `${getPractitionerColor(appointments[0].practitionerId)} hover:opacity-80`
                                : isAvailable 
                                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                  : 'bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => appointments.length > 0 || isAvailable ? handleSlotClick(dayIndex, time) : undefined}
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

      {/* FAB Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-10">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => setShowNewAppointmentModal(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modal Nuevo Turno */}
      <NewAppointmentDialog
        open={showNewAppointmentModal}
        onOpenChange={setShowNewAppointmentModal}
        selectedSlot={selectedSlot}
      />

      {/* Modal Detalle Turno */}
      <Dialog open={showAppointmentDetailModal} onOpenChange={setShowAppointmentDetailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Turno</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Paciente</label>
                <p className="text-sm text-muted-foreground">
                  {state.patients.find(p => p.id === selectedAppointment.patientId)?.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Kinesiólogo</label>
                <p className="text-sm text-muted-foreground">
                  {state.practitioners.find(p => p.id === selectedAppointment.practitionerId)?.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <div className="mt-1">
                  <Badge variant="secondary">{selectedAppointment.status}</Badge>
                </div>
              </div>
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  (Formulario de edición/detalle aquí - UI only)
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estado vacío */}
      {!state.isDemoMode && state.appointments.length === 0 && !isLoading && (
        <Card className="text-center p-8">
          <CardContent>
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No hay turnos programados</CardTitle>
            <p className="text-muted-foreground mb-4">
              Activa el modo demo para ver datos de ejemplo o comienza creando turnos
            </p>
            <Button onClick={() => setShowNewAppointmentModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer turno
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};