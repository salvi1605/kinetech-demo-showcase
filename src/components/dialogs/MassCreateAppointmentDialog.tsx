import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TreatmentMultiSelect } from '@/components/shared/TreatmentMultiSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApp, Appointment } from '@/contexts/AppContext';
import type { TreatmentType } from '@/types/appointments';
import { treatmentLabel } from '@/utils/formatters';
import { Search, User, Clock, AlertCircle, Copy, AlertTriangle, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { displaySelectedLabel, parseSlotKey, byDateTime, addMinutesStr, formatForClipboard, copyToClipboard, isPastDay } from '@/utils/dateUtils';
import { checkConflictInDb } from '@/utils/appointments/checkConflictInDb';
import { checkPractitionerAvailability } from '@/utils/appointments/checkPractitionerAvailability';
import { supabase } from '@/integrations/supabase/client';

interface MassCreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlotKeys: string[];
}

interface SlotInfo {
  key: string;
  dateISO: string;
  hour: string;
  subSlot: number;
  displayText: string;
  treatmentType?: TreatmentType;
}


export const MassCreateAppointmentDialog = ({ open, onOpenChange, selectedSlotKeys }: MassCreateAppointmentDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  
  const [patientId, setPatientId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [failedSlots, setFailedSlots] = useState<string[]>([]);
  const [perItemPractitioner, setPerItemPractitioner] = useState<Record<string, string>>({});
  const [perItemTreatment, setPerItemTreatment] = useState<Record<string, TreatmentType>>({});

  // Preparar slots ordenados con tratamiento prefijado
  const sortedSlots: SlotInfo[] = selectedSlotKeys
    .sort(byDateTime)
    .map(key => {
      const { dateISO, hour, subSlot } = parseSlotKey(key);
      return {
        key,
        dateISO,
        hour,
        subSlot,
        displayText: displaySelectedLabel({ dateISO, hour, subSlot: (subSlot + 1) as 1 | 2 | 3 | 4 | 5 }),
        treatmentType: state.selectedTreatmentType,
      };
    });

  // Flag para conflictos (se validan al confirmar)
  const hasAnyExclusiveConflict = false; // Se valida directamente en handleConfirm desde BD

  // Filtrar pacientes por búsqueda
  const filteredPatients = state.patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Función para detectar solapamiento de rangos horarios
  const overlap = (a: {start: string, end: string}, b: {start: string, end: string}) => 
    a.start < b.end && b.start < a.end;

  // Verificar si un slot ya tiene cita (cualquier doctor) usando el índice del estado
  const collidesSameSlot = (slot: SlotInfo): boolean => {
    // Construir clave usando formato del estado: date:time:S{subSlot}
    const key = `${slot.dateISO}:${slot.hour}:S${slot.subSlot + 1}`;
    return state.appointmentsBySlotKey.has(key);
  };

  // Función para verificar conflictos de citas (cualquier doctor)
  const hasAppointmentConflict = (slot: SlotInfo): boolean => {
    return collidesSameSlot(slot);
  };

  const removeSlot = (keyToRemove: string) => {
    dispatch({ type: 'TOGGLE_SLOT_SELECTION', payload: keyToRemove });
  };

  const handleConfirm = async () => {
    // Validación: todos los slots deben tener tratamiento
    const slotsWithoutTreatment = sortedSlots.filter(slot => {
      const treatment = perItemTreatment[slot.key] ?? slot.treatmentType;
      return !treatment;
    });

    if (slotsWithoutTreatment.length > 0) {
      toast({
        title: "Datos incompletos",
        description: "Todos los turnos deben tener un tipo de tratamiento",
        variant: "destructive",
      });
      return;
    }

    // Validación de paciente
    if (!patientId) {
      toast({
        title: "Datos incompletos",
        description: "Falta la información del paciente para poder agendar las citas",
        variant: "destructive",
      });
      return;
    }

    // Validar disponibilidad de profesionales
    if (state.currentClinicId) {
      const availabilityConflicts: string[] = [];
      for (const slot of sortedSlots) {
        const slotPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
        if (slotPractitionerId) {
          const availCheck = await checkPractitionerAvailability({
            practitionerId: slotPractitionerId,
            date: slot.dateISO,
            startTime: slot.hour,
            clinicId: state.currentClinicId,
          });
          if (!availCheck.available && availCheck.hasAvailabilityConfigured) {
            const practitionerName = state.practitioners.find(p => p.id === slotPractitionerId)?.name || 'Profesional';
            availabilityConflicts.push(`${slot.displayText} - ${practitionerName}: ${availCheck.message}`);
          }
        }
      }
      if (availabilityConflicts.length > 0) {
        toast({
          title: "Fuera de horario",
          description: `${availabilityConflicts.length} turno(s) fuera del horario del profesional. Revisa la disponibilidad.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validar conflictos de tratamientos exclusivos desde BD
    if (state.currentClinicId) {
      const conflictsExclusive: string[] = [];
      for (const slot of sortedSlots) {
        const slotPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
        const slotTreatmentType = perItemTreatment[slot.key] ?? slot.treatmentType;
        
        if (slotPractitionerId && slotTreatmentType) {
          const validation = await checkConflictInDb({
            date: slot.dateISO,
            startTime: slot.hour,
            practitionerId: slotPractitionerId,
            treatmentType: slotTreatmentType,
            clinicId: state.currentClinicId,
          });
          
          if (!validation.ok && validation.conflict) {
            const practitionerName = state.practitioners.find(p => p.id === slotPractitionerId)?.name || 'Profesional';
            conflictsExclusive.push(`${slot.displayText} - ${practitionerName} ya tiene ${treatmentLabel[validation.conflict.treatmentType as TreatmentType]} en ${slot.hour}`);
          }
        }
      }
      
      if (conflictsExclusive.length > 0) {
        toast({
          title: "Conflictos de disponibilidad",
          description: "No se pudo confirmar: hay conflictos por Drenaje/Masaje. El profesional ya tiene una cita en ese horario.",
          variant: "destructive",
        });
        return;
      }
    }

    // Salvaguarda por rol para días pasados
    const allowedSlots = (state.userRole === 'admin_clinic' || state.userRole === 'tenant_owner')
      ? sortedSlots 
      : sortedSlots.filter(slot => !isPastDay(slot.dateISO));
    
    if (allowedSlots.length === 0 && sortedSlots.length > 0 && state.userRole !== 'admin_clinic' && state.userRole !== 'tenant_owner') {
      toast({
        title: "Acceso denegado",
        description: "No puedes realizar cambios en días anteriores",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const appointmentsToCreate = [];
      const failed: string[] = [];
      const conflictingSlots: string[] = [];

      // Mapeo de tratamientos a IDs
      const treatmentTypeMapping: Record<TreatmentType, string> = {
        fkt: 'fkt',
        atm: 'atm',
        drenaje: 'drenaje',
        drenaje_ultra: 'drenaje_ultra',
        masaje: 'masaje',
        vestibular: 'vestibular',
        otro: 'otro',
      };

      for (const slot of allowedSlots) {
        const slotPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
        const slotTreatmentType = perItemTreatment[slot.key] ?? slot.treatmentType;
        
        if (!slotPractitionerId) {
          failed.push(`${slot.displayText} - Sin kinesiólogo asignado`);
          continue;
        }

        if (!slotTreatmentType) {
          failed.push(`${slot.displayText} - Sin tratamiento asignado`);
          continue;
        }

        // Check if appointment already exists at this exact time and practitioner
        const { data: existingAppts, error: checkError } = await supabase
          .from('appointments')
          .select('id')
          .eq('practitioner_id', slotPractitionerId)
          .eq('date', slot.dateISO)
          .eq('start_time', slot.hour)
          .eq('sub_slot', slot.subSlot + 1)
          .eq('clinic_id', state.currentClinicId!);

        if (checkError) {
          console.error('Error checking conflicts:', checkError);
          failed.push(`${slot.displayText} - Error al verificar conflictos`);
          continue;
        }

        if (existingAppts && existingAppts.length > 0) {
          conflictingSlots.push(`${slot.displayText} - Ya existe una cita en este horario`);
          continue;
        }

        // Get treatment type ID
        const { data: treatmentData } = await supabase
          .from('treatment_types')
          .select('id')
          .eq('name', slotTreatmentType)
          .eq('clinic_id', state.currentClinicId!)
          .maybeSingle();

        appointmentsToCreate.push({
          clinic_id: state.currentClinicId!,
          practitioner_id: slotPractitionerId,
          patient_id: patientId,
          date: slot.dateISO,
          start_time: slot.hour,
          duration_minutes: 30,
          sub_slot: slot.subSlot + 1,
          status: 'scheduled',
          mode: 'in_person',
          treatment_type_id: treatmentData?.id || null,
          notes: notes || null,
        });
      }

      // Insert appointments in batch
      if (appointmentsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentsToCreate);

        if (insertError) {
          throw insertError;
        }
      }

      // Clear selection
      dispatch({ type: 'CLEAR_SLOT_SELECTION' });

      // Trigger refresh
      window.dispatchEvent(new Event('appointmentUpdated'));

      // Show results
      const createdCount = appointmentsToCreate.length;
      const failedCount = failed.length + conflictingSlots.length;

      if (failedCount > 0) {
        setFailedSlots([...failed, ...conflictingSlots]);
        setShowFailureDialog(true);
        
        if (createdCount > 0) {
          toast({
            title: 'Citas creadas parcialmente',
            description: `Se crearon ${createdCount} citas. ${failedCount} citas se omitieron por conflictos.`,
          });
        }
      } else {
        toast({
          title: 'Citas creadas exitosamente',
          description: `Se crearon ${createdCount} citas para ${state.patients.find(p => p.id === patientId)?.name}`,
        });
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error creating appointments:', error);
      toast({
        title: 'Error al crear citas',
        description: error.message || 'No se pudieron crear las citas',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    // Conservar selección al cancelar
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setPatientId('');
    setNotes('');
    setPatientSearch('');
    setPerItemPractitioner({});
    setPerItemTreatment({});
  };

  const handleFailureDialogClose = () => {
    setShowFailureDialog(false);
    onOpenChange(false);
    resetForm();
  };

  const handleCopySelected = async () => {
    const { formatCopyLine } = await import('@/utils/copyFormat');
    
    const items = sortedSlots.map(slot => {
      const practitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
      const doctor = state.practitioners.find(p => p.id === practitionerId);
      const treatmentType = perItemTreatment[slot.key] ?? slot.treatmentType;
      return formatCopyLine(slot.dateISO, slot.hour, doctor, treatmentType);
    });
    
    if (items.length === 0) return;
    
    await copyToClipboard(items.join('\n'));
    toast({
      title: "Horarios copiados",
      description: `${items.length} horarios copiados al portapapeles`,
    });
  };

  if (selectedSlotKeys.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Nueva cita masiva</DialogTitle>
              <Button 
                size="sm" 
                onClick={handleCopySelected} 
                disabled={selectedSlotKeys.length === 0}
                className="flex items-center gap-1 mr-8"
              >
                <Copy className="h-4 w-4" />
                Copiar Horarios
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Lista de slots seleccionados con kinesiólogos por ítem */}
            <div>
              <Label className="text-sm font-medium">
                Horarios seleccionados ({sortedSlots.length})
              </Label>
              <div className="mt-2 max-h-80 overflow-y-auto border rounded-md p-3 space-y-3">
                {sortedSlots.map((slot) => {
                  const currentPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
                  const currentTreatmentType = perItemTreatment[slot.key] ?? slot.treatmentType;
                  
                  // Los conflictos se validan al confirmar desde BD
                  const exclusiveWarning: string | null = null;
                  
                  return (
                    <div key={slot.key} className="bg-muted/50 p-3 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{slot.displayText}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(slot.key)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground min-w-[80px]">Kinesiólogo:</span>
                        <Select 
                          value={currentPractitionerId || ''} 
                          onValueChange={(value) => {
                            if (value) {
                              setPerItemPractitioner(prev => ({
                                ...prev,
                                [slot.key]: value
                              }));
                            } else {
                              // Si limpian, restaurar al global
                              setPerItemPractitioner(prev => {
                                const newState = { ...prev };
                                delete newState[slot.key];
                                return newState;
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar kinesiólogo" />
                          </SelectTrigger>
                          <SelectContent>
                            {state.practitioners.length === 0 ? (
                              <div className="p-2 text-center text-xs text-muted-foreground">
                                Cargando...
                              </div>
                            ) : (
                              state.practitioners.map((practitioner) => (
                                <SelectItem key={practitioner.id} value={practitioner.id}>
                                  {practitioner.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground min-w-[80px]">Tratamiento:</span>
                        <Select
                          value={perItemTreatment[slot.key] ?? slot.treatmentType ?? ''}
                          onValueChange={(value) => {
                            if (value) {
                              setPerItemTreatment(prev => ({
                                ...prev,
                                [slot.key]: value as TreatmentType
                              }));
                            } else {
                              setPerItemTreatment(prev => {
                                const newState = { ...prev };
                                delete newState[slot.key];
                                return newState;
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Seleccionar tratamiento *" />
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
                      </div>
                      
                      {/* Warning de conflicto exclusivo */}
                      {exclusiveWarning && (
                        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{exclusiveWarning}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Búsqueda y selección de paciente */}
            <div>
              <Label htmlFor="patient">Paciente *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {patientSearch && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          className="w-full text-left p-3 hover:bg-muted/50 border-b last:border-b-0 flex items-center gap-2"
                          onClick={() => {
                            setPatientId(patient.id);
                            setPatientSearch(patient.name);
                          }}
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-sm text-muted-foreground">{patient.phone}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground">
                        No se encontraron pacientes
                      </div>
                    )}
                  </div>
                )}
                {patientId && (
                  <Badge variant="secondary" className="mt-2">
                    {state.patients.find(p => p.id === patientId)?.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales para todas las citas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isCreating || !patientId || hasAnyExclusiveConflict}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? 'Creando...' : 'Confirmar selección'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de fallos */}
      <AlertDialog open={showFailureDialog} onOpenChange={setShowFailureDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Algunos turnos no pudieron crearse
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  Los siguientes horarios no pudieron ser agendados porque el doctor ya tiene un turno en ese Slot y horario:
                </p>
                <div className="bg-muted/50 p-3 rounded max-h-40 overflow-y-auto">
                  {failedSlots.map((slot, index) => (
                    <div key={index} className="text-sm py-1">
                      • {slot}
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFailureDialogClose}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};