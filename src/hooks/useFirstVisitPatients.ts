import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that detects first-visit patients for the visible week.
 * Returns a Map<patientId, firstDate> for patients whose earliest appointment falls within the week.
 * The badge should only show on the appointment matching that exact firstDate.
 */
export const useFirstVisitPatients = (
  clinicId: string | undefined,
  patientIds: string[],
  weekStartISO: string,
  weekEndISO: string
): Map<string, string> => {
  const [firstVisitMap, setFirstVisitMap] = useState<Map<string, string>>(new Map());

  const patientKey = useMemo(() => [...patientIds].sort().join(','), [patientIds]);

  useEffect(() => {
    if (!clinicId || patientIds.length === 0) {
      setFirstVisitMap(new Map());
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
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

      // Keep only patients whose first date is within the visible week
      const result = new Map<string, string>();
      for (const [pid, firstDate] of minDateMap) {
        if (firstDate >= weekStartISO && firstDate <= weekEndISO) {
          result.set(pid, firstDate);
        }
      }

      setFirstVisitMap(result);
    };

    fetchData();
    return () => { cancelled = true; };
  }, [clinicId, patientKey, weekStartISO, weekEndISO]);

  return firstVisitMap;
};
