import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';
import { Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useApp, type Appointment } from '@/contexts/AppContext';

interface FreeAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

export const FreeAppointmentDialog = ({ open, onOpenChange, appointment }: FreeAppointmentDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (!appointment) return null;

  const patient = state.patients.find(p => p.id === appointment.patientId);

  // Obtener turnos futuros del mismo paciente
  const getFutureAppointments = () => {
    const now = new Date();
    const currentDateStr = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    return state.appointments.filter(apt => {
      // Solo turnos del mismo paciente
      if (apt.patientId !== appointment.patientId) return false;
      
      // Solo estados scheduled y checked_in
      if (!['scheduled', 'checked_in'].includes(apt.status)) return false;

      // Comparar fecha y hora
      const aptDateStr = apt.date.length === 10 ? apt.date : format(parseISO(apt.date), 'yyyy-MM-dd');
      
      // Si es fecha futura
      if (aptDateStr > currentDateStr) return true;
      
      // Si es fecha actual, verificar hora
      if (aptDateStr === currentDateStr && apt.startTime >= currentTimeStr) return true;
      
      return false;
    });
  };

  const futureAppointments = getFutureAppointments();

  // Eliminar turno actual
  const handleDeleteCurrent = () => {
    setIsLoading(true);
    
    // Simular delay
    setTimeout(() => {
      dispatch({ type: 'DELETE_APPOINTMENT', payload: appointment.id });
      
      // Limpiar selección si existe
      if (state.selectedSlots.size > 0) {
        dispatch({ type: 'CLEAR_SLOT_SELECTION' });
      }
      
      toast({
        title: "Turno liberado",
        description: "1 turno eliminado",
      });
      
      setIsLoading(false);
      onOpenChange(false);
    }, 500);
  };

  // Eliminar todos los turnos futuros
  const handleDeleteAll = () => {
    setIsLoading(true);
    
    // Simular delay
    setTimeout(() => {
      let deletedCount = 0;
      let failedCount = 0;
      
      futureAppointments.forEach(apt => {
        try {
          dispatch({ type: 'DELETE_APPOINTMENT', payload: apt.id });
          deletedCount++;
        } catch (error) {
          failedCount++;
        }
      });
      
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
      
      setIsLoading(false);
      onOpenChange(false);
    }, 800);
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

          {/* Información de turnos futuros */}
          {futureAppointments.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-900">Turnos futuros encontrados</span>
              </div>
              <p className="text-sm text-orange-700">
                Este paciente tiene {futureAppointments.length} turno{futureAppointments.length !== 1 ? 's' : ''} programado{futureAppointments.length !== 1 ? 's' : ''} para fechas futuras.
              </p>
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

            {/* Eliminar todos los turnos futuros */}
            {futureAppointments.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                    disabled={isLoading}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Eliminar Todo ({futureAppointments.length} turnos)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar todos los turnos futuros?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán {futureAppointments.length} turno{futureAppointments.length !== 1 ? 's' : ''} futuro{futureAppointments.length !== 1 ? 's' : ''} de {patient?.name || 'este paciente'}. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Eliminar {futureAppointments.length} turnos
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