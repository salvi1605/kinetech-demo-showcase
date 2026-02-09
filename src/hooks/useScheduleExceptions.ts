import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface ExceptionInfo {
  id: string;
  type: 'clinic_closed' | 'practitioner_block' | 'extended_hours';
  reason?: string | null;
  practitionerId?: string | null;
  practitionerName?: string;
  fromTime?: string | null;
  toTime?: string | null;
  isHoliday: boolean;
  holidayName?: string;
  date: string;
}

export interface ScheduleExceptionRow {
  id: string;
  clinic_id: string;
  practitioner_id: string | null;
  date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string | null;
  type: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HolidayRow {
  id: string;
  clinic_id: string | null;
  date: string;
  name: string;
  country_code: string | null;
  created_at: string | null;
}

/**
 * Hook to load schedule exceptions and holidays for a date range.
 * Returns a Map<YYYY-MM-DD, ExceptionInfo[]> for quick lookups.
 */
export const useScheduleExceptions = (startDate?: Date, endDate?: Date) => {
  const { state } = useApp();
  const clinicId = state.currentClinicId;

  const [exceptionsMap, setExceptionsMap] = useState<Map<string, ExceptionInfo[]>>(new Map());
  const [exceptions, setExceptions] = useState<ScheduleExceptionRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clinicId || !startDate || !endDate) {
      setExceptionsMap(new Map());
      setExceptions([]);
      setHolidays([]);
      return;
    }

    setIsLoading(true);
    const startISO = format(startDate, 'yyyy-MM-dd');
    const endISO = format(endDate, 'yyyy-MM-dd');

    try {
      // Fetch exceptions and holidays in parallel
      const [exceptionsRes, holidaysRes, practitionersRes] = await Promise.all([
        supabase
          .from('schedule_exceptions')
          .select('*')
          .eq('clinic_id', clinicId)
          .gte('date', startISO)
          .lte('date', endISO)
          .order('date'),
        supabase
          .from('holiday_calendar')
          .select('*')
          .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
          .gte('date', startISO)
          .lte('date', endISO)
          .order('date'),
        supabase
          .from('practitioners')
          .select('id, display_name')
          .eq('clinic_id', clinicId),
      ]);

      const practitionerMap = new Map<string, string>();
      (practitionersRes.data || []).forEach(p => {
        practitionerMap.set(p.id, p.display_name);
      });

      const map = new Map<string, ExceptionInfo[]>();

      // Process schedule_exceptions
      const excRows = (exceptionsRes.data || []) as ScheduleExceptionRow[];
      setExceptions(excRows);
      excRows.forEach(exc => {
        const info: ExceptionInfo = {
          id: exc.id,
          type: exc.type as ExceptionInfo['type'],
          reason: exc.reason,
          practitionerId: exc.practitioner_id,
          practitionerName: exc.practitioner_id ? practitionerMap.get(exc.practitioner_id) : undefined,
          fromTime: exc.from_time,
          toTime: exc.to_time,
          isHoliday: false,
          date: exc.date,
        };
        const existing = map.get(exc.date) || [];
        existing.push(info);
        map.set(exc.date, existing);
      });

      // Process holidays
      const holRows = (holidaysRes.data || []) as HolidayRow[];
      setHolidays(holRows);
      holRows.forEach(hol => {
        const info: ExceptionInfo = {
          id: hol.id,
          type: 'clinic_closed',
          reason: hol.name,
          isHoliday: true,
          holidayName: hol.name,
          date: hol.date,
        };
        const existing = map.get(hol.date) || [];
        existing.push(info);
        map.set(hol.date, existing);
      });

      setExceptionsMap(map);
    } catch (err) {
      console.error('Error fetching schedule exceptions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for refresh events
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('exceptionsUpdated', handler);
    return () => window.removeEventListener('exceptionsUpdated', handler);
  }, [fetchData]);

  /**
   * Check if a specific date/time is blocked for a given practitioner.
   */
  const isBlocked = useCallback((dateISO: string, time?: string, practitionerId?: string): { blocked: boolean; reason?: string } => {
    const entries = exceptionsMap.get(dateISO);
    if (!entries) return { blocked: false };

    for (const entry of entries) {
      // Clinic closed or holiday blocks everything
      if (entry.type === 'clinic_closed' || entry.isHoliday) {
        return { blocked: true, reason: entry.reason || entry.holidayName || 'Día cerrado' };
      }

      // Practitioner block
      if (entry.type === 'practitioner_block' && practitionerId && entry.practitionerId === practitionerId) {
        // If no time range, it's a full-day block
        if (!entry.fromTime || !entry.toTime) {
          return { blocked: true, reason: entry.reason || 'Profesional bloqueado' };
        }
        // Check time range
        if (time && time >= entry.fromTime && time < entry.toTime) {
          return { blocked: true, reason: entry.reason || 'Profesional bloqueado en este horario' };
        }
      }
    }

    return { blocked: false };
  }, [exceptionsMap]);

  return {
    exceptionsMap,
    exceptions,
    holidays,
    isLoading,
    isBlocked,
    refetch: fetchData,
  };
};
