import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';
import { Trash2, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useApp, type Appointment } from '@/contexts/AppContext';
import { deleteAppointment as deleteAppointmentInDb, deleteAppointmentsBatchRpc } from '@/lib/appointmentService';
import { supabase } from '@/integrations/supabase/client';

interface FreeAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

interface FutureAppointmentRow {
  id: string;
  date: string;
  startTime: string;
  subSlot: number;
  practitionerId: string;
}

export const FreeAppointmentDialog = ({ open, onOpenChange, appointment }: FreeAppointmentDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [futureAppointments, setFutureAppointments] = useState<FutureAppointmentRow[]>([]);
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  // Fetch future appointments from DB when dialog opens
  useEffect(() => {
    if (!open || !appointment?.patientId || !state.currentClinicId) {
      setFutureAppointments([]);
      return;
    }

    const fetchFuture = async () => {
      setIsFetching(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, start_time, sub_slot, practitioner_id')
        .eq('clinic_id', state.currentClinicId)
        .eq('patient_id', appointment.patientId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date')
        .order('start_time');

      if (error) {
        console.error('Error fetching future appointments:', error);
        setFutureAppointments([]);
      } else {
        const rows: FutureAppointmentRow[] = (data || []).map(r => ({
          id: r.id,
          date: r.date,
          startTime: r.start_time,
          subSlot: r.sub_slot,
          practitionerId: r.practitioner_id,
        }));
        setFutureAppointments(rows);
        setSelectedIds(new Set(rows.map(r => r.id)));
      }
      setIsFetching(false);
    };

    fetchFuture();
  }, [open, appointment?.patientId, state.currentClinicId]);

  if (!appointment) return null;

  const patient = state.patients.find(p => p.id === appointment.patientId);

  const selectedAppointments = futureAppointments.filter(apt => selectedIds.has(apt.id));
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string) => {
    setSelectedIds(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

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

  const formatAppointmentDisplay = (apt: FutureAppointmentRow) => {
    const practitioner = state.practitioners.find(p => p.id === apt.practitionerId);
    return `${format(parseLocalDate(apt.date), 'EEE dd/MM', { locale: es })} • ${apt.startTime} • Slot ${apt.subSlot} • ${practitioner?.name || 'Sin asignar'}`;
  };

  const handleDeleteCurrent = async () => {
    setIsLoading(true);
    try {
      await deleteAppointmentInDb(appointment.id);
      dispatch({ type: 'DELETE_APPOINTMENT', payload: appointment.id });
      if (state.selectedSlots.size > 0) {
        dispatch({ type: 'CLEAR_SLOT_SELECTION' });
      }
      toast({ title: "Turno liberado", description: "1 turno eliminado" });
      window.dispatchEvent(new Event('appointmentUpdated'));

      // Update local list and close if empty
      const remaining = futureAppointments.filter(a => a.id !== appointment.id);
      setFutureAppointments(remaining);
      setSelectedIds(prev => {
        const n = new Set(prev);
        n.delete(appointment.id);
        return n;
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({ title: "Error", description: "No se pudo eliminar el turno", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsLoading(true);
    const ids = selectedAppointments.map(apt => apt.id);

    try {
      const result = await deleteAppointmentsBatchRpc(ids);

      // Actualizar estado local
      for (const id of ids) {
        dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
      }

      if (state.selectedSlots.size > 0) {
        dispatch({ type: 'CLEAR_SLOT_SELECTION' });
      }

      const failedCount = result.requested_count - result.deleted_count;
      const message = failedCount > 0
        ? `${result.deleted_count} turnos eliminados (${failedCount} fallidos)`
        : `${result.deleted_count} turnos eliminados`;

      toast({ title: "Turnos liberados", description: message });
      window.dispatchEvent(new Event('appointmentUpdated'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error batch deleting appointments:', error);
      toast({ title: "Error", description: "No se pudieron eliminar los turnos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Liberar Cita
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Información del turno */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Turno actual</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {patient?.name} • {format(appointment.date.length === 10 ? parseLocalDate(appointment.date) : parseISO(appointment.date), 'EEE dd/MM/yyyy', { locale: es })} • {appointment.startTime}
            </p>
          </div>

          {/* Loading */}
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando turnos futuros…</span>
            </div>
          )}

          {/* Lista de turnos futuros */}
          {!isFetching && futureAppointments.length > 0 && (
            <div className="space-y-2">
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-sm text-orange-900">
                    {futureAppointments.length} turnos futuros · {selectedCount} seleccionados
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <Checkbox
                  ref={selectAllCheckboxRef}
                  checked={selectedIds.size === futureAppointments.length}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
                <span className="text-sm font-medium">Seleccionar todo</span>
              </div>

              <div className="max-h-48 sm:max-h-64 overflow-auto divide-y border rounded-lg">
                {futureAppointments.map((apt) => {
                  const displayText = formatAppointmentDisplay(apt);
                  const isSelected = selectedIds.has(apt.id);

                    return (
                    <div
                      key={apt.id}
                      className={`flex items-center gap-3 p-2.5 text-sm cursor-pointer hover:bg-muted/50 ${
                        !isSelected ? 'text-muted-foreground' : 'bg-background'
                      }`}
                      onClick={(e) => {
                        // Prevent double-toggle when clicking the checkbox itself
                        if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                        toggleOne(apt.id);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(apt.id)}
                      />
                      <span className="flex-1 text-xs sm:text-sm">{displayText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky action footer — always visible */}
        <DialogFooter className="flex-shrink-0 flex flex-col gap-2 pt-3 border-t sm:flex-col">
          {/* Bulk delete first when items selected */}
          {futureAppointments.length > 0 && selectedCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isLoading}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Eliminar {selectedCount} turnos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar turnos seleccionados?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>Se eliminarán estos {selectedCount} turnos:</p>
                      <div className="max-h-48 overflow-auto divide-y border rounded-lg bg-muted/30">
                        {selectedAppointments.map((apt) => (
                          <div key={apt.id} className="p-2 text-sm">
                            {formatAppointmentDisplay(apt)}
                          </div>
                        ))}
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
                  >
                    Eliminar {selectedCount} turnos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full" disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar solo turno actual
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
                <AlertDialogAction onClick={handleDeleteCurrent} className="bg-red-600 hover:bg-red-700">
                  Eliminar turno
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
