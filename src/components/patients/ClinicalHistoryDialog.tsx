import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClinicalHistoryBlock } from './ClinicalHistoryBlock';
import { useApp, Patient } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ensureTodayStubs } from '@/lib/historyStubs';
import type { EvolutionEntry } from '@/types/patient';
import { getTodayISO, getLatestSummaryBefore, upsertSummaryFor, hasAppointmentOn, getSummaryByDate } from '@/lib/clinicalSummaryHelpers';


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

  // Process patient history: cleanup orphans + create stubs for current day + prefill snapshot
  const processPatientHistory = useCallback(() => {
    if (!patient.id) return;
    
    const today = getTodayISO(state.testCurrentDate);
    
    console.log('[ClinicalHistoryDialog] Procesando historia para fecha:', today);
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
    
    // 2️⃣ AGREGAR stubs para citas del día (según Time Travel)
    ensureTodayStubs(patientCopy, state.appointments, state.currentUserId, state.testCurrentDate);
    
    // 3️⃣ PREFILL snapshot del día actual si tiene citas y no existe
    const hasTodayAppointment = hasAppointmentOn(state.appointments, patient.id, today);
    const todaySummary = getSummaryByDate(patientCopy, today);
    
    if (hasTodayAppointment && !todaySummary) {
      console.log('[ClinicalHistoryDialog] Hoy tiene citas pero no snapshot, creando prefill...');
      
      const lastSummary = getLatestSummaryBefore(patientCopy, today);
      
      if (lastSummary) {
        console.log('[ClinicalHistoryDialog] Prefill desde snapshot previo:', lastSummary.date);
        const prefillPatient = upsertSummaryFor(
          patientCopy,
          today,
          lastSummary.clinicalData,
          state.currentUserId
        );
        Object.assign(patientCopy, prefillPatient);
        
        console.log('[Analytics] summary_prefilled_from_previous', {
          patientId: patient.id,
          fromDate: lastSummary.date,
          toDate: today,
        });
      } else {
        // Si no hay snapshot previo, crear uno vacío
        console.log('[ClinicalHistoryDialog] No hay snapshot previo, creando vacío');
        const emptyPatient = upsertSummaryFor(
          patientCopy,
          today,
          {
            mainReason: '',
            diagnosis: '',
            laterality: '',
            painLevel: 0,
            redFlags: { embarazo: false, cancer: false, marcapasos: false, alergias: false },
            redFlagsDetail: { alergias: '' },
            restricciones: { noMagnetoterapia: false, noElectroterapia: false },
          },
          state.currentUserId
        );
        Object.assign(patientCopy, emptyPatient);
      }
    }
    
    // Si hubo cambios, actualizar
    const oldLength = patient.clinico?.historyByAppointment?.length || 0;
    const newLength = patientCopy.clinico?.historyByAppointment?.length || 0;
    const oldSummariesLength = patient.history?.clinicalSummaries?.length || 0;
    const newSummariesLength = patientCopy.history?.clinicalSummaries?.length || 0;
    
    console.log('[ClinicalHistoryDialog] Después de procesamiento - evolutions:', oldLength, '->', newLength);
    console.log('[ClinicalHistoryDialog] Después de procesamiento - snapshots:', oldSummariesLength, '->', newSummariesLength);
    
    if (newLength !== oldLength || newSummariesLength !== oldSummariesLength) {
      console.log('[ClinicalHistoryDialog] Actualizando paciente con cambios');
      dispatch({
        type: 'UPDATE_PATIENT',
        payload: {
          id: patient.id,
          updates: {
            clinico: patientCopy.clinico,
            history: patientCopy.history,
          },
        },
      });
    }
  }, [patient, state.appointments, state.currentUserId, state.testCurrentDate, dispatch]);

  // Process history when modal opens
  useEffect(() => {
    if (open) {
      console.log('[ClinicalHistoryDialog] Modal abierto para paciente:', patient.id);
      processPatientHistory();
    }
  }, [open, patient.id, processPatientHistory]);

  // Re-process history when Time Travel date changes (only if modal is open)
  useEffect(() => {
    if (open) {
      console.log('[ClinicalHistoryDialog] Time Travel cambió, reprocesando historia');
      processPatientHistory();
    }
  }, [state.testCurrentDate, open, processPatientHistory]);

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
