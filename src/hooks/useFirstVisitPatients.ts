import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that detects first-visit patients for the visible week.
 * Returns a Set<string> of patientIds whose earliest appointment falls within [weekStart, weekEnd].
 */
export const useFirstVisitPatients = (
  clinicId: string | undefined,
  patientIds: string[],
  weekStartISO: string,
  weekEndISO: string
): Set<string> => {
  const [firstVisitSet, setFirstVisitSet] = useState<Set<string>>(new Set());

  // Stable key to avoid re-fetching when array reference changes but content is the same
  const patientKey = useMemo(() => [...patientIds].sort().join(','), [patientIds]);

  useEffect(() => {
    if (!clinicId || patientIds.length === 0) {
      setFirstVisitSet(new Set());
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      // Query: for each patient, get their earliest non-cancelled appointment date
      const { data, error } = await supabase
        .from('appointments')
        .select('patient_id, date')
        .eq('clinic_id', clinicId)
        .in('patient_id', patientIds)
        .neq('status', 'cancelled')
        .order('date', { ascending: true });

      if (cancelled || error || !data) return;

      // Build map: patient_id -> min date
      const minDateMap = new Map<string, string>();
      for (const row of data) {
        if (!row.patient_id) continue;
        const existing = minDateMap.get(row.patient_id);
        if (!existing || row.date < existing) {
          minDateMap.set(row.patient_id, row.date);
        }
      }

      // Check which patients have their first date within the visible week
      const newSet = new Set<string>();
      for (const [pid, firstDate] of minDateMap) {
        if (firstDate >= weekStartISO && firstDate <= weekEndISO) {
          newSet.add(pid);
        }
      }

      setFirstVisitSet(newSet);
    };

    fetch();
    return () => { cancelled = true; };
  }, [clinicId, patientKey, weekStartISO, weekEndISO]);

  return firstVisitSet;
};
