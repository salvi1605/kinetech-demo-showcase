import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchEvolutionNotes, 
  fetchClinicalSnapshots 
} from '@/lib/clinicalNotesService';
import type { EvolutionEntry } from '@/types/patient';
import type { ClinicalSummaryDay } from '@/contexts/AppContext';

interface UsePatientClinicalNotesResult {
  evolutions: EvolutionEntry[];
  snapshots: ClinicalSummaryDay[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePatientClinicalNotes(
  patientId: string | undefined,
  clinicId: string | undefined
): UsePatientClinicalNotesResult {
  const [evolutions, setEvolutions] = useState<EvolutionEntry[]>([]);
  const [snapshots, setSnapshots] = useState<ClinicalSummaryDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId || !clinicId) {
      setEvolutions([]);
      setSnapshots([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [evolutionsData, snapshotsData] = await Promise.all([
        fetchEvolutionNotes(patientId, clinicId),
        fetchClinicalSnapshots(patientId, clinicId),
      ]);

      setEvolutions(evolutionsData);
      setSnapshots(snapshotsData);
    } catch (err) {
      console.error('[usePatientClinicalNotes] Error fetching data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch clinical notes'));
    } finally {
      setIsLoading(false);
    }
  }, [patientId, clinicId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!patientId || !clinicId) return;

    const channel = supabase
      .channel(`clinical-notes-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_clinical_notes',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log('[usePatientClinicalNotes] Realtime update:', payload.eventType);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, clinicId, fetchData]);

  return {
    evolutions,
    snapshots,
    isLoading,
    error,
    refetch: fetchData,
  };
}
