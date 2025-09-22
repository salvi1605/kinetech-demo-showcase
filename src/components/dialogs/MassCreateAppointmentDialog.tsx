import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApp, Appointment } from '@/contexts/AppContext';
import { Search, User, Clock, AlertCircle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { displaySelectedLabel, parseSlotKey, byDateTime, addMinutesStr } from '@/utils/dateUtils';

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

  // Preparar slots ordenados
  const sortedSlots: SlotInfo[] = selectedSlotKeys
    .sort(byDateTime)
    .map(key => {
      const { dateISO, hour, subSlot } = parseSlotKey(key);
      return {
        key,
        dateISO,
        hour,
        subSlot,
        displayText: displaySelectedLabel({ dateISO, hour, subSlot: (subSlot + 1) as 1 | 2 | 3 | 4 | 5 })
      };
    });

  // Filtrar pacientes por búsqueda
  const filteredPatients = state.patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Función para detectar solapamiento de rangos horarios
  const overlap = (a: {start: string, end: string}, b: {start: string, end: string}) => 
    a.start < b.end && b.start < a.end;

  // Función para verificar choques en el mismo subSlot
  const collidesSameSlot = (slot: SlotInfo, appointment: Appointment, practitionerId: string) => {
    const slotEnd = addMinutesStr(slot.hour, state.preferences.slotMinutes || 30);
    const appointmentSubSlot = appointment.slotIndex ?? 0; // Asumir subSlot=0 si no está definido
    
    return (
      appointment.practitionerId === practitionerId &&
      appointmentSubSlot === slot.subSlot &&
      appointment.date === slot.dateISO &&
      overlap(
        { start: slot.hour, end: slotEnd },
        { start: appointment.startTime, end: appointment.endTime }
      )
    );
  };

  // Función para verificar conflictos de citas
  const hasAppointmentConflict = (slot: SlotInfo, practitionerId: string): boolean => {
    if (!practitionerId) return false;
    
    return state.appointments.some(apt => collidesSameSlot(slot, apt, practitionerId));
  };

  const removeSlot = (keyToRemove: string) => {
    dispatch({ type: 'TOGGLE_SLOT_SELECTION', payload: keyToRemove });
  };

  const handleConfirm = async () => {
    // Validación
    if (!patientId) {
      toast({
        title: "Datos incompletos",
        description: "Falta la información del paciente para poder agendar las citas",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const successfulAppointments: Appointment[] = [];
      const failed: string[] = [];

      // Crear citas para cada slot válido
      for (const slot of sortedSlots) {
        // Calcular practitionerId para este slot
        const slotPractitionerId = perItemPractitioner[slot.key] ?? state.selectedPractitionerId;
        
        if (!slotPractitionerId) {
          failed.push(`${slot.displayText} - Sin kinesiólogo asignado`);
          continue;
        }

        // Verificar conflictos solo en el mismo subSlot con solapamiento
        if (hasAppointmentConflict(slot, slotPractitionerId)) {
          failed.push(slot.displayText);
          continue;
        }

        // Crear la cita
        const appointment: Appointment = {
          id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          patientId,
          practitionerId: slotPractitionerId,
          date: slot.dateISO,
          startTime: slot.hour,
          endTime: addMinutesStr(slot.hour, state.preferences.slotMinutes || 30),
          type: 'consultation',
          status: 'scheduled',
          notes: notes || undefined,
          slotIndex: slot.subSlot,
        };

        successfulAppointments.push(appointment);
      }

      // Agregar las citas exitosas
      if (successfulAppointments.length > 0) {
        dispatch({ type: 'ADD_MULTIPLE_APPOINTMENTS', payload: successfulAppointments });
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
  };

  const handleFailureDialogClose = () => {
    setShowFailureDialog(false);
    onOpenChange(false);
    resetForm();
  };

  if (selectedSlotKeys.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva cita masiva</DialogTitle>
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
              disabled={isCreating || !patientId}
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