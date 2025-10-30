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
import { Search, User, Clock, AlertCircle, Copy, AlertTriangle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { displaySelectedLabel, parseSlotKey, byDateTime, addMinutesStr, formatForClipboard, copyToClipboard, isPastDay } from '@/utils/dateUtils';
import { hasExclusiveConflict } from '@/utils/appointments/validateExclusiveTreatment';

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

  // Calcular si hay algún conflicto de tratamiento exclusivo
  const hasAnyExclusiveConflict = useMemo(() => {
    return sortedSlots.some(slot => {
      const currentPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
      const currentTreatmentType = perItemTreatment[slot.key] ?? slot.treatmentType;
      
      if (!currentPractitionerId || !currentTreatmentType) return false;
      
      const candidate = {
        date: slot.dateISO,
        startTime: slot.hour,
        practitionerId: currentPractitionerId,
        treatmentType: currentTreatmentType,
      };
      
      const validation = hasExclusiveConflict(state.appointments, candidate);
      return !validation.ok;
    });
  }, [sortedSlots, perItemPractitioner, perItemTreatment, state.appointments, state.selectedPractitionerId]);

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

    // Validación
    if (!patientId) {
      toast({
        title: "Datos incompletos",
        description: "Falta la información del paciente para poder agendar las citas",
        variant: "destructive",
      });
      return;
    }

    // Validar conflictos de tratamientos exclusivos
    const conflictsExclusive: string[] = [];
    for (const slot of sortedSlots) {
      const slotPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
      const slotTreatmentType = perItemTreatment[slot.key] ?? slot.treatmentType;
      
      if (slotPractitionerId && slotTreatmentType) {
        const candidate = {
          date: slot.dateISO,
          startTime: slot.hour,
          practitionerId: slotPractitionerId,
          treatmentType: slotTreatmentType,
        };
        
        const validation = hasExclusiveConflict(state.appointments, candidate);
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

    // Salvaguarda por rol para días pasados
    const allowedSlots = state.userRole === 'admin' 
      ? sortedSlots 
      : sortedSlots.filter(slot => !isPastDay(slot.dateISO));
    
    if (allowedSlots.length === 0 && sortedSlots.length > 0 && state.userRole !== 'admin') {
      toast({
        title: "Acceso denegado",
        description: "No puedes realizar cambios en días anteriores",
        variant: "destructive",
      });
      return; // No crear nada
    }

    setIsCreating(true);

    try {
      const successfulAppointments: Appointment[] = [];
      const failed: string[] = [];

      // Crear citas para cada slot válido
      for (const slot of allowedSlots) {
        // Calcular practitionerId y treatmentType para este slot
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

        // Verificar conflictos solo en el mismo subSlot con solapamiento
        if (hasAppointmentConflict(slot)) {
          failed.push(slot.displayText);
          continue;
        }

        // Crear la cita
        const primaryId = `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const appointment: Appointment = {
          id: primaryId,
          patientId,
          practitionerId: slotPractitionerId,
          date: slot.dateISO,
          startTime: slot.hour,
          type: 'consultation',
          status: 'scheduled',
          notes: notes || undefined,
          subSlot: (slot.subSlot + 1) as 1 | 2 | 3 | 4 | 5,
          treatmentType: slotTreatmentType,
        };

        // Validación en DEV
        if (import.meta.env.DEV && (appointment.subSlot == null || appointment.subSlot < 1 || appointment.subSlot > 5)) {
          console.warn('subSlot inválido en payload', appointment);
        }

        successfulAppointments.push(appointment);
      }

      // RE-VALIDAR contra estado actual antes del dispatch final (Opción 1)
      const finalValidAppointments: Appointment[] = [];
      
      for (const apt of successfulAppointments) {
        // Verificar si este slot ya está ocupado en state.appointments (cualquier doctor)
        const hasConflictInState = state.appointments.some(existingApt => 
          existingApt.date === apt.date &&
          existingApt.startTime === apt.startTime &&
          existingApt.subSlot === apt.subSlot
        );
        
        if (hasConflictInState) {
          // Este slot ya está ocupado, no agregar y marcar como fallido
          const slotInfo = `${apt.date} ${apt.startTime} (Slot ${apt.subSlot})`;
          failed.push(`${slotInfo} - Ya existe una cita en este slot`);
        } else {
          finalValidAppointments.push(apt);
        }
      }
      
      // Agregar solo las citas que pasaron la re-validación
      if (finalValidAppointments.length > 0) {
        dispatch({ type: 'ADD_MULTIPLE_APPOINTMENTS', payload: finalValidAppointments });
      }

      // Limpiar selección
      dispatch({ type: 'CLEAR_SLOT_SELECTION' });

      // Mostrar resultado
      if (failed.length > 0) {
        setFailedSlots(failed);
        setShowFailureDialog(true);
      }

      toast({
        title: "Citas creadas",
        description: `${successfulAppointments.length} turnos creados exitosamente`,
      });

      // Cerrar modal solo si no hay fallos o después de cerrar el diálogo de fallos
      if (failed.length === 0) {
        onOpenChange(false);
        resetForm();
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al crear las citas",
        variant: "destructive",
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
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1"
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
                  
                  // Verificar conflicto de tratamiento exclusivo
                  let exclusiveWarning: string | null = null;
                  if (currentPractitionerId && currentTreatmentType) {
                    const candidate = {
                      date: slot.dateISO,
                      startTime: slot.hour,
                      practitionerId: currentPractitionerId,
                      treatmentType: currentTreatmentType,
                    };
                    
                    const validation = hasExclusiveConflict(state.appointments, candidate);
                    if (!validation.ok && validation.conflict) {
                      const practitionerName = state.practitioners.find(p => p.id === currentPractitionerId)?.name || 'Profesional';
                      exclusiveWarning = `⚠️ ${practitionerName} no disponible: ya tiene ${treatmentLabel[validation.conflict.treatmentType as TreatmentType]} en ${slot.hour}`;
                    }
                  }
                  
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
                            {state.practitioners.map((practitioner) => (
                              <SelectItem key={practitioner.id} value={practitioner.id}>
                                {practitioner.name}
                              </SelectItem>
                            ))}
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