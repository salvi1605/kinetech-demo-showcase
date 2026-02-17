import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClinicalHistoryBlock } from './ClinicalHistoryBlock';
import { useApp, Patient } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { usePatientClinicalNotes } from '@/hooks/usePatientClinicalNotes';
import { ensureEvolutionStubs } from '@/lib/clinicalNotesService';
import { getTodayISO, getLatestSummaryBefore } from '@/lib/clinicalSummaryHelpers';
import { parseSmartDOB, formatDisplayDate } from '@/utils/dateUtils';
import { differenceInYears } from 'date-fns';
import { formatPatientFullName } from '@/utils/formatters';
import type { EvolutionEntry } from '@/types/patient';
import type { ClinicalSummaryDay } from '@/contexts/AppContext';

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
  const { state } = useApp();
  const { toast } = useToast();
  const [tempPrefill, setTempPrefill] = useState<ClinicalSummaryDay['clinicalData'] | null>(null);
  const [stubsCreated, setStubsCreated] = useState(false);

  // Fetch clinical notes from database
  const { evolutions, snapshots, isLoading, refetch } = usePatientClinicalNotes(
    patient.id,
    state.currentClinicId
  );

  // Create stubs for today's appointments when modal opens
  useEffect(() => {
    if (!open || !patient.id || !state.currentClinicId || stubsCreated) return;

    const createStubs = async () => {
      const today = getTodayISO(state.testCurrentDate);
      
      // Get today's appointments for this patient
      const todayAppointments = state.appointments
        .filter(a => 
          a.patientId === patient.id && 
          a.date === today &&
          a.status !== 'cancelled'
        )
        .map(a => ({
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          treatmentType: a.treatmentType,
          practitionerId: a.practitionerId,
        }));

      if (todayAppointments.length > 0) {
        console.log('[ClinicalHistoryDialog] Creating stubs for', todayAppointments.length, 'appointments');
        await ensureEvolutionStubs(
          patient.id,
          state.currentClinicId!,
          todayAppointments,
          state.currentUserId
        );
        setStubsCreated(true);
        refetch();
      }
    };

    createStubs();
  }, [open, patient.id, state.currentClinicId, state.appointments, state.currentUserId, state.testCurrentDate, stubsCreated, refetch]);

  // Reset stubsCreated when patient changes
  useEffect(() => {
    setStubsCreated(false);
  }, [patient.id]);

  // Calculate temp prefill from snapshots
  useEffect(() => {
    if (open) {
      const today = getTodayISO(state.testCurrentDate);
      
      // Find latest snapshot before today from DB snapshots
      const sortedSnapshots = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
      const lastSnapshotBefore = sortedSnapshots.find(s => s.date < today);
      
      if (lastSnapshotBefore) {
        console.log('[ClinicalHistoryDialog] Prefill desde snapshot previo:', lastSnapshotBefore.date);
        setTempPrefill(lastSnapshotBefore.clinicalData);
      } else {
        // Fallback to legacy patient data
        const legacyPrefill = getLatestSummaryBefore(patient, today);
        if (legacyPrefill) {
          setTempPrefill(legacyPrefill.clinicalData);
        } else {
          setTempPrefill(null);
        }
      }
    }
  }, [open, snapshots, patient, state.testCurrentDate]);

  const handleHistoryChange = useCallback((entries: EvolutionEntry[]) => {
    // No longer need to track pending changes - changes are saved directly to DB
    console.log('[ClinicalHistoryDialog] History changed, entries count:', entries.length);
  }, []);

  const handleSaveAndClose = () => {
    toast({
      title: 'Cambios guardados',
      description: 'El historial clínico ha sido guardado correctamente.',
    });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const age = patient.birthDate 
    ? differenceInYears(new Date(), parseSmartDOB(patient.birthDate))
    : null;
  
  const birthDateFormatted = patient.birthDate 
    ? formatDisplayDate(parseSmartDOB(patient.birthDate))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial del Paciente - {formatPatientFullName(patient)}</DialogTitle>
          {age !== null && birthDateFormatted && (
            <DialogDescription className="text-base">
              {age} años • Nacimiento: {birthDateFormatted}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ClinicalHistoryBlock
            patient={patient}
            historyByAppointment={evolutions}
            snapshots={snapshots}
            currentUserId={state.currentUserId}
            currentUserName={state.currentUserName}
            currentUserRole={state.userRole || 'health_pro'}
            tempPrefill={tempPrefill}
            onHistoryChange={handleHistoryChange}
            onPatientChange={() => refetch()}
            testCurrentDate={state.testCurrentDate}
            clinicId={state.currentClinicId}
          />
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={handleSaveAndClose}>Guardar Cambios</Button>
          <Button variant="outline" onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
