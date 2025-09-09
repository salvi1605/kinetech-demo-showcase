import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Clock, User, UserPlus, NotebookPen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';

const newAppointmentSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().min(1, 'La hora de inicio es requerida'),
  endTime: z.string().min(1, 'La hora de fin es requerida'),
  practitionerId: z.string().min(1, 'Selecciona un kinesiólogo'),
  patientId: z.string().optional(),
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

type NewAppointmentForm = z.infer<typeof newAppointmentSchema>;

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot: { day: number; time: string; date: Date; slotIndex?: number } | null;
}

export const NewAppointmentDialog = ({ open, onOpenChange, selectedSlot }: NewAppointmentDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [patientSearch, setPatientSearch] = useState('');
  const [showQuickCreatePatient, setShowQuickCreatePatient] = useState(false);
  const [quickPatientName, setQuickPatientName] = useState('');

  const form = useForm<NewAppointmentForm>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      date: '',
      startTime: '',
      endTime: '',
      practitionerId: '',
      patientId: '',
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

  // Actualizar formulario cuando cambia selectedSlot
  useEffect(() => {
    if (selectedSlot && open) {
      form.setValue('date', format(selectedSlot.date, 'yyyy-MM-dd'));
      form.setValue('startTime', selectedSlot.time);
      
      // Calcular hora de fin (30 minutos después)
      const [hours, minutes] = selectedSlot.time.split(':').map(Number);
      const endMinutes = minutes + 30;
      const endHours = endMinutes >= 60 ? hours + 1 : hours;
      const finalMinutes = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
      const endTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
      form.setValue('endTime', endTime);
    }
  }, [selectedSlot, open, form]);

  // Filtrar pacientes por búsqueda
  const filteredPatients = state.patients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.phone.includes(patientSearch)
  );

  // Crear paciente rápido
  const handleQuickCreatePatient = () => {
    if (!quickPatientName.trim()) return;

    const newPatient = {
      id: Date.now().toString(),
      name: quickPatientName.trim(),
      phone: '',
      email: '',
      birthDate: '',
      conditions: []
    };

    dispatch({ type: 'ADD_PATIENT', payload: newPatient });
    form.setValue('patientId', newPatient.id);
    setPatientSearch(quickPatientName);
    setQuickPatientName('');
    setShowQuickCreatePatient(false);

    toast({
      title: "Paciente creado",
      description: `${newPatient.name} ha sido creado y seleccionado`,
    });
  };

  // Enviar formulario
  const onSubmit = (data: NewAppointmentForm) => {
    if (!selectedSlot) return;

    const newAppointment = {
      id: Date.now().toString(),
      slotIndex: selectedSlot?.slotIndex ?? 0,
      date: selectedSlot.date.toISOString(),
      startTime: data.startTime,
      endTime: data.endTime,
      practitionerId: data.practitionerId,
      patientId: data.patientId || '',
      status: 'scheduled' as const,
      type: 'consultation' as const,
      notes: data.notes || ''
    };

    dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });

    const patient = state.patients.find(p => p.id === data.patientId);
    const practitioner = state.practitioners.find(p => p.id === data.practitionerId);

    toast({
      title: "Turno creado exitosamente",
      description: `Turno para ${patient?.name || 'Sin paciente'} con ${practitioner?.name} el ${format(selectedSlot.date, 'dd/MM/yyyy')} a las ${data.startTime}`,
    });

    // Limpiar formulario y cerrar modal
    form.reset();
    setPatientSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Nuevo Turno
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información de fecha y hora */}
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Fecha y Horario
                </Label>
                {selectedSlot && (
                  <p className="text-sm text-muted-foreground">
                    {format(selectedSlot.date, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}
                  </p>
                )}
              </div>

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
                            <SelectValue placeholder="Seleccionar hora" />
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
                            <SelectValue placeholder="Seleccionar hora" />
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
            </div>

            {/* Selección de kinesiólogo */}
            <FormField
              control={form.control}
              name="practitionerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Kinesiólogo
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar kinesiólogo" />
                      </SelectTrigger>
                      <SelectContent>
                        {state.practitioners.map((practitioner) => (
                          <SelectItem key={practitioner.id} value={practitioner.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full bg-primary" 
                              />
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

            {/* Búsqueda y selección de paciente */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Paciente
              </Label>
              
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full"
                />

                {patientSearch && (
                  <div className="border rounded-lg max-h-32 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.slice(0, 5).map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-muted/50 border-b last:border-b-0 focus:outline-none focus:bg-muted/50"
                          onClick={() => {
                            form.setValue('patientId', patient.id);
                            setPatientSearch(patient.name);
                          }}
                        >
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-muted-foreground">{patient.phone}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          No se encontraron pacientes
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuickPatientName(patientSearch);
                            setShowQuickCreatePatient(true);
                          }}
                          className="text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Crear paciente rápido
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Crear paciente rápido */}
                {showQuickCreatePatient && (
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <Label className="text-sm font-medium mb-2 block">
                      Crear paciente rápido
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre completo"
                        value={quickPatientName}
                        onChange={(e) => setQuickPatientName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuickCreatePatient()}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleQuickCreatePatient}
                        disabled={!quickPatientName.trim()}
                      >
                        Crear
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowQuickCreatePatient(false);
                          setQuickPatientName('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paciente seleccionado */}
                {form.watch('patientId') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-white mb-1">
                          Paciente seleccionado
                        </Badge>
                        <p className="font-medium">
                          {state.patients.find(p => p.id === form.watch('patientId'))?.name}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          form.setValue('patientId', '');
                          setPatientSearch('');
                        }}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <NotebookPen className="h-4 w-4" />
                    Notas (opcional)
                  </FormLabel>
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
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Confirmar turno
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};