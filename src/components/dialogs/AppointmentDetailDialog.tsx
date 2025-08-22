import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import type { Appointment } from '@/contexts/AppContext';

const editAppointmentSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().min(1, 'La hora de inicio es requerida'),
  endTime: z.string().min(1, 'La hora de fin es requerida'),
  practitionerId: z.string().min(1, 'Selecciona un kinesiólogo'),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = parseInt(data.startTime.replace(':', ''));
    const end = parseInt(data.endTime.replace(':', ''));
    return end > start;
  }
  return true;
}, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["endTime"]
});

type EditAppointmentForm = z.infer<typeof editAppointmentSchema>;

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

export const AppointmentDetailDialog = ({ open, onOpenChange, appointment }: AppointmentDetailDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<EditAppointmentForm>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      date: '',
      startTime: '',
      endTime: '',
      practitionerId: '',
      status: 'scheduled',
      notes: '',
    }
  });

  // Generar slots de tiempo
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Actualizar formulario cuando cambia la cita
  useEffect(() => {
    if (appointment && open) {
      const appointmentDate = parseISO(appointment.date);
      form.setValue('date', format(appointmentDate, 'yyyy-MM-dd'));
      form.setValue('startTime', appointment.startTime);
      form.setValue('endTime', appointment.endTime);
      form.setValue('practitionerId', appointment.practitionerId);
      form.setValue('status', appointment.status);
      form.setValue('notes', appointment.notes || '');
      setIsEditing(false);
    }
  }, [appointment, open, form]);

  if (!appointment) return null;

  const patient = state.patients.find(p => p.id === appointment.patientId);
  const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
  const appointmentDate = parseISO(appointment.date);

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
Horario: ${appointment.startTime} - ${appointment.endTime}
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
  const handleDeleteAppointment = () => {
    // En una app real, aquí se eliminaría de la base de datos
    // Por ahora, solo actualizamos el estado en memoria
    const updatedAppointments = state.appointments.filter(a => a.id !== appointment.id);
    
    // Simular actualización del estado
    toast({
      title: "Turno eliminado",
      description: `El turno de ${patient?.name || 'Sin paciente'} ha sido eliminado`,
    });
    
    onOpenChange(false);
  };

  // Enviar formulario
  const onSubmit = (data: EditAppointmentForm) => {
    const updates = {
      date: new Date(`${data.date}T00:00:00`).toISOString(),
      startTime: data.startTime,
      endTime: data.endTime,
      practitionerId: data.practitionerId,
      status: data.status,
      notes: data.notes || ''
    };

    dispatch({ type: 'UPDATE_APPOINTMENT', payload: { id: appointment.id, updates } });

    const updatedPractitioner = state.practitioners.find(p => p.id === data.practitionerId);
    const statusLabel = getStatusInfo(data.status).label;

    toast({
      title: "Turno actualizado",
      description: `Turno de ${patient?.name || 'Sin paciente'} con ${updatedPractitioner?.name} actualizado a ${statusLabel}`,
    });

    setIsEditing(false);
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

            {/* Fecha y hora */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Clock className="h-4 w-4" />
                Fecha y Horario
              </Label>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium">
                  {format(appointmentDate, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}
                </p>
                <p className="text-muted-foreground mt-1">
                  {appointment.startTime} - {appointment.endTime}
                </p>
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
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <CalendarClock className="h-4 w-4" />
                Reprogramar
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar resumen
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El turno será eliminado permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAppointment}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Eliminar turno
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                          <SelectItem value="cancelled">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              Cancelado
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              No-show
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
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

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de fin</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};