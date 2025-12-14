import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate, displaySelectedLabel, parseSlotKey } from '@/utils/dateUtils';
import { Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useApp, type Appointment } from '@/contexts/AppContext';
import { deleteAppointment as deleteAppointmentInDb } from '@/lib/appointmentService';

interface FreeAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

export const FreeAppointmentDialog = ({ open, onOpenChange, appointment }: FreeAppointmentDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  if (!appointment) return null;

  const patient = state.patients.find(p => p.id === appointment.patientId);

  // Obtener turnos futuros del mismo paciente
  const getFutureAppointments = () => {
    const now = new Date();
    const currentDateStr = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    return state.appointments.filter(apt => {
      // Solo turnos del mismo paciente, excluir continuaciones
      if (apt.patientId !== appointment.patientId || apt.isContinuation) return false;
      
      // Solo estado scheduled
      if (apt.status !== 'scheduled') return false;

      // Comparar fecha y hora
      const aptDateStr = apt.date.length === 10 ? apt.date : format(parseISO(apt.date), 'yyyy-MM-dd');
      
      // Si es fecha futura
      if (aptDateStr > currentDateStr) return true;
      
      // Si es fecha actual, verificar hora
      if (aptDateStr === currentDateStr && apt.startTime >= currentTimeStr) return true;
      
      return false;
    }).sort((a, b) => {
      // Ordenar por fecha y hora ascendente
      const aDateStr = a.date.length === 10 ? a.date : format(parseISO(a.date), 'yyyy-MM-dd');
      const bDateStr = b.date.length === 10 ? b.date : format(parseISO(b.date), 'yyyy-MM-dd');
      
      if (aDateStr !== bDateStr) {
        return aDateStr.localeCompare(bDateStr);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const futureAppointments = getFutureAppointments();
  
  // Inicializar selección al abrir el modal
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(futureAppointments.map(a => a.id)));
    }
  }, [open, futureAppointments.length]);

  const selectedAppointments = futureAppointments.filter(apt => selectedIds.has(apt.id));
  const selectedCount = selectedIds.size;

  // Función para alternar selección de un turno
  const toggleOne = (id: string) => {
    setSelectedIds(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Función para seleccionar/deseleccionar todos
  const toggleAll = (all: boolean) => {
    setSelectedIds(all ? new Set(futureAppointments.map(a => a.id)) : new Set());
  };

  // Manejar estado indeterminado del checkbox maestro
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const input = selectAllCheckboxRef.current.querySelector('input') as HTMLInputElement;
      if (input) {
        const isIndeterminate = selectedIds.size > 0 && selectedIds.size < futureAppointments.length;
        input.indeterminate = isIndeterminate;
      }
    }
  }, [selectedIds.size, futureAppointments.length]);

  // Función para formatear turno
  const formatAppointmentDisplay = (apt: Appointment) => {
    const practitioner = state.practitioners.find(p => p.id === apt.practitionerId);
    const dateStr = apt.date.length === 10 ? apt.date : format(parseISO(apt.date), 'yyyy-MM-dd');
    const slotIndex = apt.subSlot;
    
    return {
      displayText: `${format(parseLocalDate(dateStr), 'EEE dd/MM', { locale: es })} • ${apt.startTime} • Slot ${slotIndex} • ${practitioner?.name || 'Sin asignar'}`,
      dateObj: parseLocalDate(dateStr)
    };
  };

  // Eliminar turno actual
  const handleDeleteCurrent = async () => {
    setIsLoading(true);
    
    try {
      await deleteAppointmentInDb(appointment.id);
      dispatch({ type: 'DELETE_APPOINTMENT', payload: appointment.id });
      
      // Limpiar selección si existe
      if (state.selectedSlots.size > 0) {
        dispatch({ type: 'CLEAR_SLOT_SELECTION' });
      }
      
      toast({
        title: "Turno liberado",
        description: "1 turno eliminado",
      });
      
      window.dispatchEvent(new Event('appointmentUpdated'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el turno",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar turnos seleccionados
  const handleDeleteAll = async () => {
    setIsLoading(true);
    
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const apt of selectedAppointments) {
      try {
        await deleteAppointmentInDb(apt.id);
        dispatch({ type: 'DELETE_APPOINTMENT', payload: apt.id });
        deletedCount++;
      } catch (error) {
        console.error('Error deleting appointment:', error);
        failedCount++;
      }
    }
    
    // Limpiar selección si existe
    if (state.selectedSlots.size > 0) {
      dispatch({ type: 'CLEAR_SLOT_SELECTION' });
    }
    
    const message = failedCount > 0 
      ? `${deletedCount} turnos eliminados (${failedCount} fallidos)`
      : `${deletedCount} turnos eliminados`;
    
    toast({
      title: "Turnos liberados",
      description: message,
    });
    
    window.dispatchEvent(new Event('appointmentUpdated'));
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Liberar Cita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del turno */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Turno actual</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {patient?.name} • {format(appointment.date.length === 10 ? parseLocalDate(appointment.date) : parseISO(appointment.date), 'EEE dd/MM/yyyy', { locale: es })} • {appointment.startTime}
            </p>
          </div>

          {/* Lista de turnos futuros */}
          {futureAppointments.length > 0 && (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-900">
                    Turnos futuros encontrados ({selectedCount} seleccionados)
                  </span>
                </div>
                <p className="text-sm text-orange-700">
                  {selectedCount === 0 
                    ? "No hay turnos seleccionados para eliminar" 
                    : `${selectedCount} turno${selectedCount !== 1 ? 's' : ''} seleccionado${selectedCount !== 1 ? 's' : ''} para eliminación`
                  }
                </p>
              </div>

              {/* Checkbox maestro "Seleccionar todo" */}
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  ref={selectAllCheckboxRef}
                  checked={selectedIds.size === futureAppointments.length}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
                <span className="text-sm font-medium">Seleccionar todo</span>
              </div>

              {/* Lista scrollable de turnos */}
              <div className="max-h-80 overflow-auto divide-y border rounded-lg">
                {futureAppointments.map((apt) => {
                  const { displayText } = formatAppointmentDisplay(apt);
                  const isSelected = selectedIds.has(apt.id);
                  
                  return (
                    <div 
                      key={apt.id} 
                      className={`flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-muted/50 ${
                        !isSelected ? 'text-muted-foreground' : 'bg-background'
                      }`}
                      onClick={() => toggleOne(apt.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(apt.id)}
                      />
                      <span className="flex-1">{displayText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-3">
            {/* Eliminar turno actual */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar turno actual
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este turno?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará únicamente el turno seleccionado. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteCurrent}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Eliminar turno
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Eliminación múltiple */}
            {futureAppointments.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                    disabled={isLoading || selectedCount === 0}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Eliminación Múltiple ({selectedCount} turnos)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar turnos seleccionados?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>Se eliminarán estos {selectedCount} turnos:</p>
                        <div className="max-h-60 overflow-auto divide-y border rounded-lg bg-muted/30">
                          {selectedAppointments.map((apt) => {
                            const { displayText } = formatAppointmentDisplay(apt);
                            return (
                              <div key={apt.id} className="p-2 text-sm">
                                {displayText}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={selectedCount === 0}
                    >
                      Eliminar {selectedCount} turnos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};