import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface TreatmentWithPractitioners {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  color: string | null;
  is_active: boolean;
  max_concurrent: number;
  practitioners: { id: string; display_name: string; color: string | null }[];
}

export const useTreatments = () => {
  const { state } = useApp();
  const clinicId = state.currentClinicId;
  const [treatments, setTreatments] = useState<TreatmentWithPractitioners[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTreatments = useCallback(async () => {
    if (!clinicId) { setTreatments([]); setLoading(false); return; }

    try {
      setLoading(true);

      // Fetch treatment types
      const { data: ttData, error: ttErr } = await supabase
        .from('treatment_types')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (ttErr) throw ttErr;

      // Fetch practitioner_treatments links
      const { data: ptData, error: ptErr } = await supabase
        .from('practitioner_treatments' as any)
        .select('practitioner_id, treatment_type_id')
        .eq('clinic_id', clinicId);

      if (ptErr) throw ptErr;

      // Fetch practitioners for mapping
      const { data: pracData } = await supabase
        .from('practitioners')
        .select('id, display_name, color')
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      const pracMap = new Map((pracData || []).map(p => [p.id, p]));
      const linksArray = (ptData || []) as unknown as { practitioner_id: string; treatment_type_id: string }[];

      const mapped: TreatmentWithPractitioners[] = (ttData || []).map(tt => {
        const linkedPracIds = linksArray
          .filter(pt => pt.treatment_type_id === tt.id)
          .map(pt => pt.practitioner_id);

        const practitioners = linkedPracIds
          .map(pid => pracMap.get(pid))
          .filter(Boolean) as { id: string; display_name: string; color: string | null }[];

        return {
          id: tt.id,
          name: tt.name,
          description: (tt as any).description ?? null,
          default_duration_minutes: tt.default_duration_minutes,
          color: tt.color,
          is_active: tt.is_active ?? true,
          max_concurrent: (tt as any).max_concurrent ?? 2,
          practitioners,
        };
      });

      setTreatments(mapped);
    } catch (err) {
      console.error('Error fetching treatments:', err);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchTreatments(); }, [fetchTreatments]);

  useEffect(() => {
    const handler = () => fetchTreatments();
    window.addEventListener('treatmentUpdated', handler);
    return () => window.removeEventListener('treatmentUpdated', handler);
  }, [fetchTreatments]);

  return { treatments, loading, refetch: fetchTreatments };
};

/**
 * Hook to get treatments assigned to a specific practitioner.
 * Returns all treatments if practitioner has none assigned (retrocompatibility).
 */
export const usePractitionerTreatments = (practitionerId: string | undefined) => {
  const { treatments, loading } = useTreatments();
  
  if (!practitionerId || loading) return { filteredTreatments: treatments, loading, hasAssignments: false };

  const assigned = treatments.filter(t => 
    t.is_active && t.practitioners.some(p => p.id === practitionerId)
  );

  // If practitioner has no assignments, show all active treatments (retrocompatibility)
  const hasAssignments = assigned.length > 0;
  const filteredTreatments = hasAssignments ? assigned : treatments.filter(t => t.is_active);

  return { filteredTreatments, loading, hasAssignments };
};
