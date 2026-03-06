import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchEvolutionNotes, 
  fetchClinicalSnapshots 
} from '@/lib/clinicalNotesService';
import { toast } from '@/hooks/use-toast';
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

      // Fallback: detect appointments missing evolution stubs and auto-create them
      const existingAppointmentIds = new Set(evolutionsData.map(e => e.appointmentId));
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, date, start_time, practitioner_id, treatment_types(name)')
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .neq('status', 'cancelled')
        .lte('date', new Date().toISOString().slice(0, 10));

      const missing = (appointments || []).filter(a => !existingAppointmentIds.has(a.id));

      if (missing.length > 0) {
        console.log(`[usePatientClinicalNotes] Creating ${missing.length} missing evolution stubs`);
        const inserts = missing.map(a => ({
          patient_id: patientId,
          clinic_id: clinicId,
          practitioner_id: a.practitioner_id,
          appointment_id: a.id,
          note_date: a.date,
          start_time: a.start_time,
          note_type: 'evolution' as const,
          body: '',
          treatment_type: (a.treatment_types as any)?.name || 'FKT',
          status: 'active',
        }));

        const { error: insertError } = await supabase
          .from('patient_clinical_notes')
          .insert(inserts);

        if (!insertError) {
          // Re-fetch evolutions to include the newly created stubs
          const refreshed = await fetchEvolutionNotes(patientId, clinicId);
          setEvolutions(refreshed);
          setSnapshots(snapshotsData);
          return;
        } else {
          console.error('[usePatientClinicalNotes] Error creating stubs:', insertError);
        }
      }

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
