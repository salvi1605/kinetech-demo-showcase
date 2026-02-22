import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Clock, User, UserPlus, NotebookPen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { addMinutesStr } from '@/utils/dateUtils';
import { checkConflictInDb, checkSlotConflictInDb } from '@/utils/appointments/checkConflictInDb';
import { checkPractitionerAvailability } from '@/utils/appointments/checkPractitionerAvailability';
import { treatmentLabel, formatPatientFullName, formatPatientShortName, matchesPatientSearch } from '@/utils/formatters';
import type { TreatmentType } from '@/types/appointments';
import { createAppointment as createAppointmentInDb } from '@/lib/appointmentService';

const newAppointmentSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().min(1, 'La hora de inicio es requerida').refine((time) => {
    return time <= '19:00';
  }, {
    message: "La hora de inicio no puede ser posterior a las 19:00"
  }),
  practitionerId: z.string().min(1, 'Selecciona un kinesiólogo'),
  patientId: z.string().optional(),
  notes: z.string().optional(),
});

type NewAppointmentForm = z.infer<typeof newAppointmentSchema>;

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot: { day: number; time: string; date: Date; subSlot?: number } | null;
  preselectedPatientId?: string;
}

export const NewAppointmentDialog = ({ open, onOpenChange, selectedSlot, preselectedPatientId }: NewAppointmentDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [patientSearch, setPatientSearch] = useState('');
  const [showQuickCreatePatient, setShowQuickCreatePatient] = useState(false);
  const [quickPatientName, setQuickPatientName] = useState('');
  const [showMissingFieldsDialog, setShowMissingFieldsDialog] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  
  const practitionerSelectRef = useRef<HTMLButtonElement>(null);
  const patientSearchRef = useRef<HTMLInputElement>(null);

  const form = useForm<NewAppointmentForm>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      date: '',
      startTime: '',
      practitionerId: '',
      patientId: '',
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

  // Actualizar formulario cuando cambia selectedSlot
  useEffect(() => {
    if (selectedSlot && open) {
      form.setValue('date', format(selectedSlot.date, 'yyyy-MM-dd'));
      form.setValue('startTime', selectedSlot.time);
    }
  }, [selectedSlot, open, form]);

  // Pre-seleccionar paciente cuando viene desde otra vista
  useEffect(() => {
    if (open && preselectedPatientId) {
      form.setValue('patientId', preselectedPatientId);
      const patient = state.patients.find(p => p.id === preselectedPatientId);
      if (patient) {
        setPatientSearch(formatPatientShortName(patient));
      }
    }
  }, [open, preselectedPatientId, state.patients, form]);

  // Filtrar pacientes por búsqueda
  const filteredPatients = state.patients.filter(patient => {
    const searchLower = patientSearch.toLowerCase();
    return matchesPatientSearch(patient, searchLower) ||
      patient.phone.includes(patientSearch);
  });

  // Crear paciente rápido - CONECTADO A BD
  const handleQuickCreatePatient = async () => {
    if (!quickPatientName.trim()) return;
    
    if (!state.currentClinicId) {
      toast({
        title: "Error",
        description: "No hay clínica seleccionada",
        variant: "destructive",
      });
      return;
    }

    try {
      // Insertar en BD real
      const { data: newPatientData, error: insertError } = await supabase
        .from('patients')
        .insert({
          clinic_id: state.currentClinicId,
          full_name: quickPatientName.trim(),
          phone: '',
          email: '',
          is_deleted: false,
        })
        .select('id, full_name')
        .single();

      if (insertError) throw insertError;

      // Crear objeto para estado local
      const newPatient = {
        id: newPatientData.id,
        name: newPatientData.full_name,
        phone: '',
        email: '',
        birthDate: '',
        conditions: [],
      };

      // Actualizar estado local
      dispatch({ type: 'ADD_PATIENT', payload: newPatient });
      form.setValue('patientId', newPatient.id);
      setPatientSearch(quickPatientName);
      setQuickPatientName('');
      setShowQuickCreatePatient(false);

      toast({
        title: "Paciente creado",
        description: `${formatPatientFullName(newPatient)} ha sido creado y seleccionado`,
      });
    } catch (error) {
      console.error('Error creating quick patient:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el paciente",
        variant: "destructive",
      });
    }
  };

  // Verificar campos requeridos
  const requiredMissing = (values: { patientId?: string; practitionerId?: string }) => {
    const missing: string[] = [];
    if (!values.patientId) missing.push('paciente');
    if (!values.practitionerId) missing.push('kinesiólogo');
    return missing;
  };

  // Crear cita segura - CONECTADO A BD
  const createAppointment = async (data: NewAppointmentForm) => {
    if (!selectedSlot) return;
    
    // Guarda de seguridad: rechazar si falta algún ID
    if (!data.patientId || !data.practitionerId) {
      toast({
        title: "Error de validación",
        description: "No se puede crear la cita sin paciente y kinesiólogo",
        variant: "destructive"
      });
      return;
    }

    if (!state.currentClinicId) {
      toast({
        title: "Error",
        description: "No hay clínica seleccionada",
        variant: "destructive"
      });
      return;
    }

    const appointmentDate = format(selectedSlot.date, 'yyyy-MM-dd');
    const subSlot = selectedSlot.subSlot ?? 1;

    // Verificar si el profesional tiene un bloqueo (vacaciones, licencia, etc.) en esta fecha
    const { data: blocks, error: blockError } = await supabase
      .from('schedule_exceptions')
      .select('reason, type')
      .eq('clinic_id', state.currentClinicId)
      .eq('practitioner_id', data.practitionerId)
      .eq('date', appointmentDate)
      .eq('type', 'practitioner_block');

    if (!blockError && blocks && blocks.length > 0) {
      const practitionerName = state.practitioners.find(p => p.id === data.practitionerId)?.name || 'El profesional';
      const reason = blocks[0].reason?.toUpperCase() || 'BLOQUEO';
      toast({
        title: "Profesional no disponible",
        description: `${practitionerName} tiene ${reason} en esta fecha. No se puede agendar la cita.`,
        variant: "destructive",
      });
      return;
    }
    
    // Verificar disponibilidad del profesional
    if (state.currentClinicId) {
      const availCheck = await checkPractitionerAvailability({
        practitionerId: data.practitionerId,
        date: appointmentDate,
        startTime: data.startTime,
        clinicId: state.currentClinicId,
      });

      if (!availCheck.available && availCheck.hasAvailabilityConfigured) {
        const practitionerName = state.practitioners.find(p => p.id === data.practitionerId)?.name || 'El profesional';
        toast({
          title: "Fuera de horario",
          description: `${practitionerName}: ${availCheck.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Verificar conflictos en el mismo subSlot desde BD
    const slotConflict = await checkSlotConflictInDb(
      state.currentClinicId,
      data.practitionerId,
      appointmentDate,
      data.startTime,
      subSlot
    );
    
    if (slotConflict) {
      toast({
        title: "Conflicto de horario",
        description: "El doctor ya tiene un turno en este Slot y horario.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar conflicto de tratamiento exclusivo desde BD
    const validation = await checkConflictInDb({
      date: appointmentDate,
      startTime: data.startTime,
      practitionerId: data.practitionerId,
      treatmentType: 'fkt', // Tratamiento por defecto
      clinicId: state.currentClinicId,
    });
    
    if (!validation.ok && validation.conflict) {
      const practitionerName = state.practitioners.find(p => p.id === data.practitionerId)?.name || 'El profesional';
      toast({
        title: "Conflicto de disponibilidad",
        description: `${practitionerName} ya tiene un ${treatmentLabel[validation.conflict.treatmentType as TreatmentType]} en ${validation.conflict.startTime}. No puede tomar otra cita en este horario.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Crear en BD
      await createAppointmentInDb({
        clinicId: state.currentClinicId,
        patientId: data.patientId,
        practitionerId: data.practitionerId,
        date: appointmentDate,
        startTime: data.startTime,
        subSlot: subSlot,
        notes: data.notes || '',
        treatmentType: 'fkt',
      });

      const patient = state.patients.find(p => p.id === data.patientId);
      const practitioner = state.practitioners.find(p => p.id === data.practitionerId);

      toast({
        title: "Turno creado correctamente",
        description: `Turno para ${patient ? formatPatientFullName(patient) : 'Sin paciente'} con ${practitioner?.name} el ${format(selectedSlot.date, 'dd/MM/yyyy')} a las ${data.startTime}`,
      });

      form.reset();
      setPatientSearch('');
      
      // Trigger refetch en Calendar antes de cerrar
      window.dispatchEvent(new Event('appointmentUpdated'));
      
      // Cerrar modal después de refrescar
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el turno",
        variant: "destructive",
      });
    }
  };

  // Manejar confirmación de creación
  const onConfirmCreate = (values: NewAppointmentForm) => {
    const missing = requiredMissing(values);
    if (missing.length) {
      setMissingFields(missing);
      setShowMissingFieldsDialog(true);
      // No cerrar el diálogo "Nuevo Turno"
      return;
    }
    
    // Salvaguarda por rol para días pasados
    if (selectedSlot) {
      const appointmentDate = format(selectedSlot.date, 'yyyy-MM-dd');
      const isPast = appointmentDate < format(new Date(), 'yyyy-MM-dd');
      
      if (isPast && state.userRole !== 'admin_clinic' && state.userRole !== 'tenant_owner') {
        toast({
          title: "Acceso denegado",
          description: "No puedes realizar cambios en días anteriores",
          variant: "destructive",
        });
        return; // No crear nada
      }
    }
    
    createAppointment(values); // Continúa flujo normal
  };

  // Enfocar primer campo faltante después del popup
  const focusFirstMissingField = () => {
    if (missingFields.includes('kinesiólogo')) {
      practitionerSelectRef.current?.focus();
    } else if (missingFields.includes('paciente')) {
      patientSearchRef.current?.focus();
    }
  };

  // Enviar formulario
  const onSubmit = (data: NewAppointmentForm) => {
    onConfirmCreate(data);

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

              <div className="grid grid-cols-1 gap-4">
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
                       <SelectTrigger ref={practitionerSelectRef}>
                         <SelectValue placeholder="Seleccionar kinesiólogo" />
                       </SelectTrigger>
                      <SelectContent>
                        {state.practitioners.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Cargando...
                          </div>
                        ) : (
                          state.practitioners.map((practitioner) => (
                            <SelectItem key={practitioner.id} value={practitioner.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full bg-primary" 
                                />
                                {practitioner.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
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
                   ref={patientSearchRef}
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
                            setPatientSearch(formatPatientShortName(patient));
                          }}
                        >
                          <div className="font-medium">{formatPatientShortName(patient)}</div>
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
      
      {/* AlertDialog para campos faltantes */}
      <AlertDialog open={showMissingFieldsDialog} onOpenChange={setShowMissingFieldsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Información requerida</AlertDialogTitle>
            <AlertDialogDescription>
              {missingFields.length === 1 
                ? `Falta la información del ${missingFields[0]} para poder agendar la cita.`
                : 'Falta la información del paciente y del kinesiólogo para poder agendar la cita.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setShowMissingFieldsDialog(false);
                // Enfocar el primer campo faltante después de cerrar el popup
                setTimeout(focusFirstMissingField, 100);
              }}
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};