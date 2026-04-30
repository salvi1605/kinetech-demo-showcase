import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClinicalHistoryBlock, ClinicalHistoryBlockHandle } from './ClinicalHistoryBlock';
import { useApp, Patient } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { usePatientClinicalNotes } from '@/hooks/usePatientClinicalNotes';
import { getTodayISO, getLatestSummaryBefore } from '@/lib/clinicalSummaryHelpers';
import { parseSmartDOB, formatDisplayDate } from '@/utils/dateUtils';
import { differenceInYears } from 'date-fns';
import { formatPatientFullName } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';
import type { EvolutionEntry } from '@/types/patient';
import type { ClinicalSummaryDay } from '@/contexts/AppContext';

interface ClinicalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  scrollToDate?: string;
}

export const ClinicalHistoryDialog = ({
  open,
  onOpenChange,
  patient,
  scrollToDate,
}: ClinicalHistoryDialogProps) => {
  const { state } = useApp();
  const { toast } = useToast();
  const [tempPrefill, setTempPrefill] = useState<ClinicalSummaryDay['clinicalData'] | null>(null);
  const [currentPractitionerId, setCurrentPractitionerId] = useState<string | undefined>();
  const [isFlushing, setIsFlushing] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const historyBlockRef = useRef<ClinicalHistoryBlockHandle>(null);

  // Fetch clinical notes from database
  const { evolutions, snapshots, isLoading, refetch } = usePatientClinicalNotes(
    patient.id,
    state.currentClinicId
  );

  // Stubs are now auto-created by the RPC when appointments are created

  // Fetch current practitioner ID for health_pro role
  useEffect(() => {
    if (!open || state.userRole !== 'health_pro') {
      setCurrentPractitionerId(undefined);
      return;
    }
    supabase.rpc('current_practitioner_id').then(({ data, error }) => {
      if (!error && data) {
        setCurrentPractitionerId(data);
      }
    });
  }, [open, state.userRole]);

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

  // Auto-scroll to the target date after loading
  useEffect(() => {
    if (!open || isLoading || !scrollToDate) return;
    const timer = setTimeout(() => {
      const container = contentRef.current;
      if (!container) return;
      const target = container.querySelector(`[data-date="${scrollToDate}"]`) as HTMLElement | null;
      if (target) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop - 16;
        container.scrollTo({ top: offset, behavior: 'smooth' });
        // Flash highlight
        target.classList.add('bg-primary/10', 'ring-2', 'ring-primary/30', 'rounded-lg', 'transition-all', 'duration-500');
        setTimeout(() => {
          target.classList.remove('bg-primary/10', 'ring-2', 'ring-primary/30');
        }, 1500);
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open, isLoading, scrollToDate]);

  const handleHistoryChange = useCallback((entries: EvolutionEntry[]) => {
    // No longer need to track pending changes - changes are saved directly to DB
    console.log('[ClinicalHistoryDialog] History changed, entries count:', entries.length);
  }, []);

  // Silent auto-save on ANY close path (X button, Esc, click outside, "Cerrar" button).
  // No confirmation modal. Toast feedback only when there were drafts to flush.
  const handleDialogOpenChange = useCallback(async (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isFlushing) return; // prevent double-trigger
    setIsFlushing(true);
    try {
      const result = await historyBlockRef.current?.flushDrafts();
      if (result && result.attempted > 0) {
        if (result.failed === 0) {
          toast({
            title: 'Guardado',
            description: `${result.succeeded} evolución(es) guardadas.`,
          });
        } else if (result.succeeded > 0) {
          toast({
            title: 'Guardado parcial',
            description: `${result.succeeded} guardadas, ${result.failed} pendientes en este dispositivo. Se reintentarán al reabrir.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Sin conexión',
            description: `${result.failed} evolución(es) guardadas localmente. Se sincronizarán al reabrir el historial.`,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('[ClinicalHistoryDialog] Auto-flush error:', err);
      toast({
        title: 'Error al guardar',
        description: 'Algunos cambios podrían no haberse sincronizado. Se conservan localmente.',
        variant: 'destructive',
      });
    } finally {
      setIsFlushing(false);
      onOpenChange(false); // always close — never trap the user
    }
  }, [isFlushing, onOpenChange, toast]);

  const handleSaveAndClose = async () => {
    await handleDialogOpenChange(false);
  };

  const age = patient.birthDate 
    ? differenceInYears(new Date(), parseSmartDOB(patient.birthDate))
    : null;
  
  const birthDateFormatted = patient.birthDate 
    ? formatDisplayDate(parseSmartDOB(patient.birthDate))
    : null;

  // Receptionist has no access
  if (state.userRole === 'receptionist') return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent ref={contentRef} className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            ref={historyBlockRef}
            patient={patient}
            historyByAppointment={evolutions}
            snapshots={snapshots}
            currentUserId={state.currentUserId}
            currentUserName={state.currentUserName}
            currentUserRole={state.userRole || 'health_pro'}
            currentPractitionerId={currentPractitionerId}
            tempPrefill={tempPrefill}
            onHistoryChange={handleHistoryChange}
            onPatientChange={() => refetch()}
            testCurrentDate={state.testCurrentDate}
            clinicId={state.currentClinicId}
          />
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={handleSaveAndClose} disabled={isFlushing}>
            {isFlushing ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isFlushing}>
            {isFlushing ? 'Guardando…' : 'Cerrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
