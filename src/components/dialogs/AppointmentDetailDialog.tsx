import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { parseLocalDate, formatForClipboard, copyToClipboard, isPastDay } from '@/utils/dateUtils';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { TreatmentType } from '@/types/appointments';
import { treatmentLabel } from '@/utils/formatters';
import { 
  Calendar, 
  Clock, 
  User, 
  NotebookPen, 
  Copy, 
  Trash2, 
  CalendarClock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History
} from 'lucide-react';
import { FreeAppointmentDialog } from './FreeAppointmentDialog';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TreatmentMultiSelect } from '@/components/shared/TreatmentMultiSelect';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useApp, updateAppointment } from '@/contexts/AppContext';
import { usePatientAppointments, formatAppointmentDisplay } from '@/hooks/usePatientAppointments';
import type { Appointment } from '@/contexts/AppContext';
import { displaySubSlot } from '@/utils/slotUtils';
import { ClinicalHistoryDialog } from '@/components/patients/ClinicalHistoryDialog';

const editAppointmentSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().min(1, 'La hora de inicio es requerida').refine((time) => {
    return time <= '19:00';
  }, {
    message: "La hora de inicio no puede ser posterior a las 19:00"
  }),
  practitionerId: z.string().min(1, 'Selecciona un kinesiólogo'),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  treatmentType: z.string().min(1, 'Selecciona un tipo de tratamiento'),
  notes: z.string().optional(),
});

type EditAppointmentForm = z.infer<typeof editAppointmentSchema>;

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
  onAppointmentChange?: (appointmentId: string) => void;
}

export const AppointmentDetailDialog = ({ open, onOpenChange, appointmentId, onAppointmentChange }: AppointmentDetailDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showFreeDialog, setShowFreeDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  
  // Get appointment from store by ID
  const appointment = appointmentId ? state.appointmentsById[appointmentId] : null;
  
  // Hook para obtener citas del paciente
  const { futuras, pasadas } = usePatientAppointments(appointment?.patientId || '');

  const form = useForm<EditAppointmentForm>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      date: '',
      startTime: '',
      practitionerId: '',
      status: 'scheduled',
      treatmentType: 'fkt',
      notes: '',
    }
  });

  // Generar slots de tiempo
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
        if (hour === 19 && minute === 0) break; // Incluir solo 19:00, no 19:30
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Actualizar formulario cuando cambia la cita
  useEffect(() => {
    if (appointment && open) {
      const dateStr = appointment.date.length === 10
        ? appointment.date
        : format(parseISO(appointment.date), 'yyyy-MM-dd');
      form.setValue('date', dateStr);
      form.setValue('startTime', appointment.startTime);
      form.setValue('practitionerId', appointment.practitionerId);
      form.setValue('status', appointment.status);
      form.setValue('treatmentType', appointment.treatmentType || 'fkt');
      form.setValue('notes', appointment.notes || '');
      setIsEditing(false);
    }
  }, [appointment, open, form]);

  if (!appointment) return null;

  const patient = state.patients.find(p => p.id === appointment.patientId);
  const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
  const appointmentDate = appointment.date.length === 10 ? parseLocalDate(appointment.date) : parseISO(appointment.date);
  
  // Check if appointment is in past day
  const appointmentDateISO = appointment.date.length === 10 ? appointment.date : format(parseISO(appointment.date), 'yyyy-MM-dd');
  const isPast = isPastDay(appointmentDateISO);
  const canEdit = state.userRole === 'admin' || !isPast;

  // Calcular duración estándar (30 min)
  const durationLabel = '30 min';
  
  // Obtener hora de fin
  const getEndTime = (start: string) => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = minutes + 30;
    const endHours = Math.floor((hours * 60 + totalMinutes) / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };
  
  const endTime = getEndTime(appointment.startTime);

  // Obtener estado y color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { 
          label: 'Reservado', 
          icon: CheckCircle2, 
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'cancelled':
        return { 
          label: 'Cancelado', 
          icon: XCircle, 
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'completed':
        return { 
          label: 'Completado', 
          icon: CheckCircle2, 
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'no_show':
        return { 
          label: 'No-show', 
          icon: AlertCircle, 
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      default:
        return { 
          label: 'Desconocido', 
          icon: AlertCircle, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusInfo = getStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;

  // Copiar resumen al portapapeles
  const handleCopyToClipboard = async () => {
    const summary = `
RESUMEN DE TURNO

Paciente: ${patient?.name || 'Sin paciente'}
Kinesiólogo: ${practitioner?.name || 'Sin asignar'}
Fecha: ${format(appointmentDate, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}
Horario: ${appointment.startTime}
Estado: ${statusInfo.label}
${appointment.notes ? `Notas: ${appointment.notes}` : ''}

Generado desde Sistema de Gestión de Turnos
${format(new Date(), 'dd/MM/yyyy HH:mm')}
    `.trim();

    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Copiado al portapapeles",
        description: "El resumen del turno ha sido copiado",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el resumen al portapapeles",
        variant: "destructive",
      });
    }
  };

  // Eliminar cita
  const onDeleteAppointment = (appt: Appointment) => {
    // Eliminar del estado global usando el reducer
    dispatch({ type: 'DELETE_APPOINTMENT', payload: appt.id });
    
    // Mostrar confirmación
    toast({
      title: "Turno eliminado",
      description: `El turno de ${patient?.name || 'Sin paciente'} ha sido eliminado`,
    });
    
    // Cerrar el modal
    onOpenChange(false);
  };

  // Enviar formulario
  const onSubmit = (data: EditAppointmentForm) => {
    if (!appointment) return;
    
    // Check permissions for past day appointments
    if (state.userRole !== 'admin' && isPast) {
      toast({
        title: "Acceso denegado",
        description: "No puedes realizar cambios en días anteriores",
        variant: "destructive",
      });
      return; // Impedir persistencia
    }
    
    const updatedAppointment: Appointment = {
      ...appointment,
      date: data.date,
      startTime: data.startTime,
      practitionerId: data.practitionerId,
      status: data.status,
      treatmentType: data.treatmentType as TreatmentType,
      notes: data.notes || ''
    };

    updateAppointment(dispatch, updatedAppointment);

    const updatedPractitioner = state.practitioners.find(p => p.id === data.practitionerId);
    const statusLabel = getStatusInfo(data.status).label;

    toast({
      title: "Turno actualizado",
      description: `Turno de ${patient?.name || 'Sin paciente'} con ${updatedPractitioner?.name} actualizado a ${statusLabel}`,
    });

    setIsEditing(false);
  };

  // Copiar todas las citas del paciente - computed from store each render
  const handleCopyAllPatientAppointments = async () => {
    if (!appointment) return;
    
    // Get all appointments for this patient from the store, excluding continuations
    const allAppointments = state.appointments.filter(apt => 
      apt.patientId === appointment.patientId && !apt.isContinuation
    );
    
    if (allAppointments.length === 0) return;
    
    const { formatCopyLine } = await import('@/utils/copyFormat');
    
    const items = allAppointments
      .map(apt => {
        const doctor = state.practitioners.find(p => p.id === apt.practitionerId);
        return formatCopyLine(apt.date, apt.startTime, doctor, apt.treatmentType);
      })
      .sort();
    
    await copyToClipboard(items.join('\n'));
    
    const n = items.length;
    toast({
      title: "Horarios copiados",
      description: n === 1 ? 'Horario copiado al portapapeles' : `${n} horarios copiados al portapapeles`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Turno' : 'Detalle del Turno'}
          </DialogTitle>
        </DialogHeader>

        {/* Vista de solo lectura */}
        {!isEditing && (
          <div className="space-y-6">
            {/* Estado del turno */}
            <div className={`p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                <span className={`font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>

            {/* Información del paciente */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <User className="h-4 w-4" />
                Paciente
              </Label>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium">{patient?.name || 'Sin paciente asignado'}</p>
                {patient && (
                  <div className="text-sm text-muted-foreground space-y-1 mt-2">
                    <p>📧 {patient.email}</p>
                    <p>📱 {patient.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información del kinesiólogo */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <User className="h-4 w-4" />
                Kinesiólogo
              </Label>
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <p className="font-medium">{practitioner?.name}</p>
                </div>
                {practitioner && (
                  <p className="text-sm text-muted-foreground mt-1">{practitioner.specialty}</p>
                )}
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Clock className="h-4 w-4" />
                Fecha y Horario
              </Label>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium">
                  {format(appointmentDate, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {appointment.startTime} - {endTime} ({durationLabel})
                </p>
              </div>
            </div>

            {/* Tipo de Tratamiento */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <NotebookPen className="h-4 w-4" />
                Tratamiento
              </Label>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium">
                  {appointment.treatmentType ? treatmentLabel[appointment.treatmentType] : 'Sin especificar'}
                </p>
              </div>
            </div>

            {/* Citas del Paciente */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Calendar className="h-4 w-4" />
                  Citas del Paciente
                </Label>
                <Button 
                  size="sm" 
                  onClick={handleCopyAllPatientAppointments}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Horarios
                </Button>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg max-h-96 overflow-auto">
                {/* Citas Futuras */}
                {futuras.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                      Próximos turnos ({futuras.length})
                    </h4>
                    <div className="space-y-2 divide-y">
                      {futuras.map((apt) => {
                        const display = formatAppointmentDisplay(apt, state.practitioners);
                        const isCurrentAppointment = apt.id === appointment.id;
                        const slotNumber = displaySubSlot(Number((apt as any).subSlot));
                        
                        return (
                          <div 
                            key={apt.id} 
                            className={`py-2 cursor-pointer hover:bg-muted/50 rounded px-2 transition-colors ${
                              isCurrentAppointment ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
                            }`}
                            onClick={() => onAppointmentChange?.(apt.id)}
                          >
                             <div className="flex items-center justify-between gap-2">
                               <p className="text-sm">
                                {display.dayName} {display.dateStr} • {display.timeRange} • Slot {slotNumber} • {display.practitionerName}
                                {apt.treatmentType && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    • {treatmentLabel[apt.treatmentType]}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {display.statusLabel}
                                </Badge>
                                {isCurrentAppointment && (
                                  <Badge variant="default" className="text-xs">
                                    Actual
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Citas Pasadas */}
                {pasadas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                      Turnos anteriores ({pasadas.length})
                    </h4>
                    <div className="space-y-2 divide-y">
                      {pasadas.map((apt) => {
                        const display = formatAppointmentDisplay(apt, state.practitioners);
                        const isCurrentAppointment = apt.id === appointment.id;
                        const slotNumber = displaySubSlot(Number((apt as any).subSlot));
                        
                        return (
                          <div 
                            key={apt.id} 
                            className={`py-2 cursor-pointer hover:bg-muted/50 rounded px-2 transition-colors opacity-75 ${
                              isCurrentAppointment ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
                            }`}
                            onClick={() => onAppointmentChange?.(apt.id)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm">
                                {display.dayName} {display.dateStr} • {display.timeRange} • Slot {slotNumber} • {display.practitionerName}
                                {apt.treatmentType && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    • {treatmentLabel[apt.treatmentType]}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {display.statusLabel}
                                </Badge>
                                {isCurrentAppointment && (
                                  <Badge variant="default" className="text-xs">
                                    Actual
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sin citas */}
                {futuras.length === 0 && pasadas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay otras citas para este paciente
                  </p>
                )}
              </div>
            </div>

            {/* Notas */}
            {appointment.notes && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <NotebookPen className="h-4 w-4" />
                  Notas
                </Label>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-wrap gap-2 pt-4">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <CalendarClock className="h-4 w-4" />
                  Reprogramar
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar resumen
              </Button>

              <RoleGuard allowedRoles={['admin', 'recep']}>
                <Button
                  variant="outline"
                  onClick={() => setShowFreeDialog(true)}
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Liberar Cita
                </Button>
              </RoleGuard>
            </div>
          </div>
        )}

        {/* Vista de edición */}
        {isEditing && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Estado del turno */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del turno</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              Reservado
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              Asistió
                            </div>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              No Asistió
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    {state.userRole !== 'admin' && isPast && (
                      <p className="text-sm text-red-600 mt-2">No se puede cambiar el estado de citas de días anteriores</p>
                    )}
                  </FormItem>
                )}
              />

              {/* Fecha */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!canEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horarios */}
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                       <FormControl>
                         <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                           <SelectTrigger>
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             {timeSlots.map((time) => (
                               <SelectItem key={time} value={time}>
                                 {time}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* Kinesiólogo */}
              <FormField
                control={form.control}
                name="practitionerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kinesiólogo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {state.practitioners.map((practitioner) => (
                            <SelectItem key={practitioner.id} value={practitioner.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary" />
                                {practitioner.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tratamiento */}
              <FormField
                control={form.control}
                name="treatmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tratamiento *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notas */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones, tratamientos especiales, etc..."
                        className="resize-none"
                        rows={3}
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* Footer para vista de solo lectura */}
        {!isEditing && (
          <div className="space-y-3">
            {patient && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  onClick={() => setShowHistoryDialog(true)}
                  className="w-full"
                >
                  <History className="h-4 w-4 mr-2" />
                  Historial del Paciente
                </Button>
              </>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Diálogo Liberar Cita */}
        {appointment && (
          <FreeAppointmentDialog
            open={showFreeDialog}
            onOpenChange={setShowFreeDialog}
            appointment={appointment}
          />
        )}

        {/* Diálogo Historial Clínico */}
        {patient && (
          <ClinicalHistoryDialog
            open={showHistoryDialog}
            onOpenChange={setShowHistoryDialog}
            patient={patient}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};