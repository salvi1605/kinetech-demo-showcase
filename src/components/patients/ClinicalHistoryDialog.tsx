import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClinicalHistoryBlock } from './ClinicalHistoryBlock';
import { useApp, Patient } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ensureTodayStubs } from '@/lib/historyStubs';
import type { EvolutionEntry } from '@/types/patient';
import dayjs from 'dayjs';

const calcularEdad = (fechaNac: string): number => {
  const hoy = dayjs();
  const nac = dayjs(fechaNac, 'YYYY-MM-DD');
  return hoy.diff(nac, 'year');
};

const formatearFecha = (fecha: string): string => {
  return dayjs(fecha, 'YYYY-MM-DD').format('DD/MM/YYYY');
};

interface ClinicalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
}

export const ClinicalHistoryDialog = ({
  open,
  onOpenChange,
  patient,
}: ClinicalHistoryDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [pendingHistory, setPendingHistory] = useState<EvolutionEntry[]>([]);

  // Ensure stubs for today's appointments when dialog opens
  useEffect(() => {
    if (open && patient.id) {
      console.log('[ClinicalHistoryDialog] Modal abierto para paciente:', patient.id);
      console.log('[ClinicalHistoryDialog] Appointments en estado:', state.appointments.length);
      console.log('[ClinicalHistoryDialog] Historia actual:', patient.clinico?.historyByAppointment?.length || 0, 'entradas');
      
      const patientCopy = { ...patient };
      
      // 1️⃣ LIMPIAR entries huérfanos (citas eliminadas)
      if (patientCopy.clinico?.historyByAppointment) {
        const validAppointmentIds = new Set(state.appointments.map(a => a.id));
        const beforeCleanup = patientCopy.clinico.historyByAppointment.length;
        
        patientCopy.clinico.historyByAppointment = 
          patientCopy.clinico.historyByAppointment.filter(
            entry => validAppointmentIds.has(entry.appointmentId)
          );
        
        const afterCleanup = patientCopy.clinico.historyByAppointment.length;
        const removed = beforeCleanup - afterCleanup;
        if (removed > 0) {
          console.log('[ClinicalHistoryDialog] Limpieza de huérfanos - eliminados:', removed);
        }
      }
      
      // 2️⃣ AGREGAR stubs para citas nuevas de hoy
      ensureTodayStubs(patientCopy, state.appointments, state.currentUserId, state.testCurrentDate);
      
      // If anything changed (cleanup or new stubs), update
      const oldLength = patient.clinico?.historyByAppointment?.length || 0;
      const newLength = patientCopy.clinico?.historyByAppointment?.length || 0;
      
      console.log('[ClinicalHistoryDialog] Después de procesamiento - oldLength:', oldLength, 'newLength:', newLength);
      
      if (newLength !== oldLength) {
        console.log('[ClinicalHistoryDialog] Actualizando paciente con cambios');
        dispatch({
          type: 'UPDATE_PATIENT',
          payload: {
            id: patient.id,
            updates: {
              clinico: patientCopy.clinico,
            },
          },
        });
      }
    }
  }, [open, patient, state.appointments, state.currentUserId, state.testCurrentDate, dispatch]);

  const handleHistoryChange = useCallback((entries: EvolutionEntry[]) => {
    setPendingHistory(entries);
  }, []);

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_PATIENT',
      payload: {
        id: patient.id,
        updates: {
          clinico: {
            ...patient.clinico,
            historyByAppointment: pendingHistory,
          },
        },
      },
    });

    toast({
      title: 'Historial actualizado',
      description: 'Los cambios se han guardado correctamente.',
    });

    onOpenChange(false);
  };

  const edad = patient.identificacion?.dateOfBirth 
    ? calcularEdad(patient.identificacion.dateOfBirth) 
    : null;

  const banderasYRestricciones = [
    ...(patient.clinico?.redFlags 
      ? Object.keys(patient.clinico.redFlags).filter(k => patient.clinico.redFlags?.[k])
      : []),
    ...(patient.clinico?.restricciones 
      ? Object.keys(patient.clinico.restricciones).filter(k => patient.clinico.restricciones?.[k])
      : [])
  ].join(' • ') || 'Ninguna';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial del Paciente - {patient.name}</DialogTitle>
        </DialogHeader>

        {/* Resumen Clínico */}
        <Card className="mb-4 border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Resumen Clínico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Nombre Completo</p>
                <p className="font-medium">{patient.identificacion?.fullName || patient.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Diagnóstico</p>
                <p className="font-medium">{patient.clinico?.diagnosis || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {patient.identificacion?.dateOfBirth 
                    ? formatearFecha(patient.identificacion.dateOfBirth) 
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Lateralidad</p>
                <p className="font-medium">{patient.clinico?.laterality || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Edad</p>
                <p className="font-medium">{edad !== null ? `${edad} años` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Nivel de Dolor (0–10)</p>
                <p className="font-medium">
                  {patient.clinico?.painLevel !== undefined ? `${patient.clinico.painLevel}/10` : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Motivo Principal</p>
                <p className="font-medium">{patient.clinico?.mainReason || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Banderas Rojas / Restricciones</p>
                <p className="font-medium text-xs">{banderasYRestricciones}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* Subtítulo Evolución */}
        <div className="mb-3">
          <h3 className="text-base font-semibold">Evolución del Día</h3>
        </div>

        <ClinicalHistoryBlock
          historyByAppointment={patient.clinico?.historyByAppointment ?? []}
          currentUserId={state.currentUserId}
          currentUserName={state.currentUserName}
          currentUserRole={state.userRole || 'kinesio'}
          onHistoryChange={handleHistoryChange}
          testCurrentDate={state.testCurrentDate}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
