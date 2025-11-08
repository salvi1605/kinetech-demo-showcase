import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClinicalHistoryBlock } from './ClinicalHistoryBlock';
import { useApp, Patient } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ensureTodayStubs } from '@/lib/historyStubs';
import type { EvolutionEntry } from '@/types/patient';
import type { ClinicalSummaryDay } from '@/contexts/AppContext';
import { getTodayISO, getLatestSummaryBefore } from '@/lib/clinicalSummaryHelpers';


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
  const [tempPrefill, setTempPrefill] = useState<ClinicalSummaryDay['clinicalData'] | null>(null);

  // Process patient history: cleanup orphans + create stubs for current day
  const processPatientHistory = useCallback(() => {
    if (!patient.id) return;
    
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
    
    // 2️⃣ AGREGAR stubs para citas del día (según Time Travel)
    ensureTodayStubs(patientCopy, state.appointments, state.currentUserId, state.testCurrentDate);
    
    // Si hubo cambios, actualizar
    const oldLength = patient.clinico?.historyByAppointment?.length || 0;
    const newLength = patientCopy.clinico?.historyByAppointment?.length || 0;
    
    if (newLength !== oldLength) {
      console.log('[ClinicalHistoryDialog] Actualizando paciente con cambios en stubs');
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
  }, [patient, state.appointments, state.currentUserId, state.testCurrentDate, dispatch]);

  // Process history when modal opens and calculate temp prefill
  useEffect(() => {
    if (open) {
      console.log('[ClinicalHistoryDialog] Modal abierto para paciente:', patient.id);
      processPatientHistory();
      
      // Calcular prefill temporal solo para el día actual si no existe snapshot
      const today = getTodayISO(state.testCurrentDate);
      const lastSummary = getLatestSummaryBefore(patient, today);
      
      if (lastSummary) {
        console.log('[ClinicalHistoryDialog] Prefill temporal desde snapshot previo:', lastSummary.date);
        setTempPrefill(lastSummary.clinicalData);
      } else {
        setTempPrefill(null);
      }
    }
  }, [open, patient.id, patient, state.testCurrentDate, processPatientHistory]);

  // Re-process history when Time Travel date changes (only if modal is open)
  useEffect(() => {
    if (open) {
      console.log('[ClinicalHistoryDialog] Time Travel cambió, reprocesando historia');
      processPatientHistory();
      
      // Recalcular prefill temporal
      const today = getTodayISO(state.testCurrentDate);
      const lastSummary = getLatestSummaryBefore(patient, today);
      
      if (lastSummary) {
        setTempPrefill(lastSummary.clinicalData);
      } else {
        setTempPrefill(null);
      }
    }
  }, [state.testCurrentDate, open, patient, processPatientHistory]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial del Paciente - {patient.name}</DialogTitle>
        </DialogHeader>

        <ClinicalHistoryBlock
          patient={patient}
          historyByAppointment={patient.clinico?.historyByAppointment ?? []}
          currentUserId={state.currentUserId}
          currentUserName={state.currentUserName}
          currentUserRole={state.userRole || 'kinesio'}
          tempPrefill={tempPrefill}
          onHistoryChange={handleHistoryChange}
          onPatientChange={(updatedPatient) => {
            dispatch({
              type: 'UPDATE_PATIENT',
              payload: {
                id: patient.id,
                updates: {
                  history: updatedPatient.history,
                },
              },
            });
          }}
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
