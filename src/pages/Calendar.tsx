import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Filter, Clock, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const Calendar = () => {
  const { state } = useApp();
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  const getAppointmentsForSlot = (day: number, time: string) => {
    return state.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      const dayOfWeek = aptDate.getDay();
      return dayOfWeek === day && apt.startTime === time;
    });
  };

  const getPatientName = (patientId: string) => {
    const patient = state.patients.find(p => p.id === patientId);
    return patient?.name || 'Paciente no encontrado';
  };

  const getPractitionerName = (practitionerId: string) => {
    const practitioner = state.practitioners.find(p => p.id === practitionerId);
    return practitioner?.name || 'Profesional no encontrado';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground">
            Gestiona las citas y horarios de los profesionales
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por profesional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los profesionales</SelectItem>
              {state.practitioners.map((practitioner) => (
                <SelectItem key={practitioner.id} value={practitioner.id}>
                  {practitioner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Vista Semanal</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button 
                variant={viewMode === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Día
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-1 min-w-[800px]">
              {/* Header Row */}
              <div className="p-2 text-sm font-medium text-muted-foreground">
                Hora
              </div>
              {weekDays.map((day, index) => (
                <div key={day} className="p-2 text-sm font-medium text-center bg-muted/50 rounded">
                  {day}
                </div>
              ))}

              {/* Time Slots */}
              {timeSlots.map((time) => (
                <div key={time} className="contents">
                  <div className="p-2 text-sm text-muted-foreground border-r">
                    {time}
                  </div>
                  {weekDays.map((_, dayIndex) => {
                    const appointments = getAppointmentsForSlot(dayIndex + 1, time);
                    return (
                      <div 
                        key={`${dayIndex}-${time}`} 
                        className="p-1 border border-border/50 min-h-[60px] bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        {appointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className="bg-primary/10 border border-primary/20 rounded p-2 mb-1 text-xs hover:bg-primary/20 transition-colors"
                          >
                            <div className="font-medium text-primary">
                              {getPatientName(appointment.patientId)}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getPractitionerName(appointment.practitionerId)}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <Badge 
                                variant={getStatusBadgeVariant(appointment.status)}
                                className="text-xs"
                              >
                                {getStatusLabel(appointment.status)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {appointment.startTime}-{appointment.endTime}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Citas Hoy</p>
                <p className="text-2xl font-bold">{state.appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Profesionales Activos</p>
                <p className="text-2xl font-bold">{state.practitioners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Pacientes Total</p>
                <p className="text-2xl font-bold">{state.patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Data State */}
      {!state.isDemoMode && state.appointments.length === 0 && (
        <Card className="text-center p-8">
          <CardContent>
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No hay citas programadas</CardTitle>
            <CardDescription className="mb-4">
              Comienza agregando citas o activa el modo demo para ver datos de ejemplo
            </CardDescription>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Cita
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};