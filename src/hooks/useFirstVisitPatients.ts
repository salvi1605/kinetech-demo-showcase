import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that detects first-visit patients for the visible week.
 *
 * Uses the RPC `get_first_visit_dates` (SECURITY DEFINER) so the calculation
 * ignores RLS asymmetry between roles (health_pro only sees their own
 * appointments, receptionist sees the whole clinic) and produces a stable
 * "first visit" date that is identical across all clinic roles.
 *
 * The RPC excludes `no_show` and `cancelled` appointments, so when the first
 * appointment is marked as no_show/cancelled the badge automatically moves to
 * the next scheduled/completed appointment.
 */
export const useFirstVisitPatients = (
  clinicId: string | undefined,
  patientIds: string[],
  weekStartISO: string,
  weekEndISO: string,
  refreshKey: number | string = 0
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
      const { data, error } = await supabase.rpc('get_first_visit_dates', {
        p_clinic_id: clinicId,
        p_patient_ids: patientIds,
      });

      if (cancelled || error || !data) return;

      const result = new Map<string, string>();
      for (const row of data as Array<{ patient_id: string; first_date: string }>) {
        if (!row.patient_id || !row.first_date) continue;
        if (row.first_date >= weekStartISO && row.first_date <= weekEndISO) {
          result.set(row.patient_id, row.first_date);
        }
      }

      setFirstVisitMap(result);
    };

    fetchData();
    return () => { cancelled = true; };
  }, [clinicId, patientKey, weekStartISO, weekEndISO, refreshKey]);

  return firstVisitMap;
};
