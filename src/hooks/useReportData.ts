import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { format, eachWeekOfInterval, startOfWeek, endOfWeek, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportFilters {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  practitionerId?: string;
  groupBy?: 'week' | 'month';
}

// ─── 1. Operational Report ───
export function useOperationalReport(filters: ReportFilters) {
  const { state } = useApp();
  const clinicId = state.currentClinicId;

  return useQuery({
    queryKey: ['report-operational', clinicId, filters],
    enabled: !!clinicId,
    queryFn: async () => {
      // Fetch appointments in range
      let q = supabase
        .from('appointments')
        .select('id, date, start_time, status, practitioner_id, duration_minutes')
        .eq('clinic_id', clinicId!)
        .gte('date', filters.dateFrom)
        .lte('date', filters.dateTo);

      if (filters.practitionerId) {
        q = q.eq('practitioner_id', filters.practitionerId);
      }

      const { data: appointments, error } = await q;
      if (error) throw error;

      // Fetch availability to estimate capacity
      let aq = supabase
        .from('practitioner_availability')
        .select('practitioner_id, weekday, from_time, to_time, slot_minutes')
        .eq('clinic_id', clinicId!);

      if (filters.practitionerId) {
        aq = aq.eq('practitioner_id', filters.practitionerId);
      }

      const { data: availability, error: aErr } = await aq;
      if (aErr) throw aErr;

      // Calculate slots per day of week from availability
      const slotsPerWeekday: Record<number, number> = {};
      (availability || []).forEach(a => {
        const from = timeToMinutes(a.from_time);
        const to = timeToMinutes(a.to_time);
        const slotMin = a.slot_minutes || 30;
        const slots = Math.floor((to - from) / slotMin);
        slotsPerWeekday[a.weekday] = (slotsPerWeekday[a.weekday] || 0) + slots;
      });

      // Group by period
      const periods = filters.groupBy === 'month'
        ? eachMonthOfInterval({ start: new Date(filters.dateFrom), end: new Date(filters.dateTo) })
        : eachWeekOfInterval({ start: new Date(filters.dateFrom), end: new Date(filters.dateTo) }, { weekStartsOn: 1 });

      const rangeStart = new Date(filters.dateFrom);
      const rangeEnd = new Date(filters.dateTo);

      const data = periods.map(periodStart => {
        const rawStart = filters.groupBy === 'month' ? startOfMonth(periodStart) : startOfWeek(periodStart, { weekStartsOn: 1 });
        const rawEnd = filters.groupBy === 'month' ? endOfMonth(periodStart) : endOfWeek(periodStart, { weekStartsOn: 1 });
        // Clamp to filter range
        const pStart = rawStart < rangeStart ? rangeStart : rawStart;
        const pEnd = rawEnd > rangeEnd ? rangeEnd : rawEnd;
        const pStartStr = format(pStart, 'yyyy-MM-dd');
        const pEndStr = format(pEnd, 'yyyy-MM-dd');

        const periodAppts = (appointments || []).filter(a => a.date >= pStartStr && a.date <= pEndStr);
        const noShows = periodAppts.filter(a => a.status === 'no_show').length;
        const attended = periodAppts.filter(a => a.status === 'completed').length;
        // Agendados = todo menos cancelados (scheduled + confirmed + completed + no_show)
        const booked = periodAppts.filter(a => a.status !== 'cancelled').length;

        // Estimate capacity: count business days in period * slots per weekday
        let capacity = 0;
        const d = new Date(pStart);
        while (d <= pEnd) {
          const dow = d.getDay();
          capacity += slotsPerWeekday[dow] || 0;
          d.setDate(d.getDate() + 1);
        }

        const label = filters.groupBy === 'month'
          ? format(pStart, 'MMM yyyy', { locale: es })
          : format(pStart, 'dd/MM', { locale: es });

        return {
          label,
          capacity,
          booked,
          attended,
          noShows,
          occupancyPct: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
          noShowPct: booked > 0 ? Math.round((noShows / booked) * 100) : 0,
          attendancePct: booked > 0 ? Math.round((attended / booked) * 100) : 0,
        };
      });

      const totals = data.reduce(
        (acc, d) => ({
          capacity: acc.capacity + d.capacity,
          booked: acc.booked + d.booked,
          attended: acc.attended + d.attended,
          noShows: acc.noShows + d.noShows,
        }),
        { capacity: 0, booked: 0, attended: 0, noShows: 0 }
      );

      return { periods: data, totals };
    },
  });
}

// ─── 2. Productivity Report ───
export function useProductivityReport(filters: ReportFilters) {
  const { state } = useApp();
  const clinicId = state.currentClinicId;

  return useQuery({
    queryKey: ['report-productivity', clinicId, filters],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, date, start_time, status, practitioner_id, duration_minutes')
        .eq('clinic_id', clinicId!)
        .gte('date', filters.dateFrom)
        .lte('date', filters.dateTo);
      if (error) throw error;

      const { data: practitioners, error: pErr } = await supabase
        .from('practitioners')
        .select('id, display_name, color')
        .eq('clinic_id', clinicId!)
        .eq('is_active', true);
      if (pErr) throw pErr;

      const { data: availability, error: aErr } = await supabase
        .from('practitioner_availability')
        .select('practitioner_id, weekday, from_time, to_time')
        .eq('clinic_id', clinicId!);
      if (aErr) throw aErr;

      // Unique days in range per practitioner
      const practMap = new Map<string, {
        name: string;
        color: string;
        attended: number;
        noShows: number;
        cancelled: number;
        totalAppts: number;
        workDays: Set<string>;
        availableHours: number;
        effectiveMinutes: number;
      }>();

      (practitioners || []).forEach(p => {
        // Calc available hours: count weekdays in range with availability
        let availMinutes = 0;
        const practAvail = (availability || []).filter(a => a.practitioner_id === p.id);
        const d = new Date(filters.dateFrom);
        const endD = new Date(filters.dateTo);
        while (d <= endD) {
          const dow = d.getDay();
          practAvail.filter(a => a.weekday === dow).forEach(a => {
            availMinutes += timeToMinutes(a.to_time) - timeToMinutes(a.from_time);
          });
          d.setDate(d.getDate() + 1);
        }

        practMap.set(p.id, {
          name: p.display_name,
          color: p.color || '#6366f1',
          attended: 0,
          noShows: 0,
          cancelled: 0,
          totalAppts: 0,
          workDays: new Set(),
          availableHours: Math.round(availMinutes / 60),
          effectiveMinutes: 0,
        });
      });

      (appointments || []).forEach(a => {
        const entry = practMap.get(a.practitioner_id);
        if (!entry) return;
        entry.totalAppts++;
        if (a.status === 'completed' || a.status === 'confirmed' || a.status === 'scheduled') {
          entry.attended++;
          entry.effectiveMinutes += a.duration_minutes;
          entry.workDays.add(a.date);
        }
        if (a.status === 'no_show') entry.noShows++;
        if (a.status === 'cancelled') entry.cancelled++;
      });

      return Array.from(practMap.values()).map(e => ({
        name: e.name,
        color: e.color,
        attended: e.attended,
        noShows: e.noShows,
        cancelled: e.cancelled,
        noShowPct: e.totalAppts > 0 ? Math.round((e.noShows / e.totalAppts) * 100) : 0,
        avgPerDay: e.workDays.size > 0 ? +(e.attended / e.workDays.size).toFixed(1) : 0,
        effectiveHours: +(e.effectiveMinutes / 60).toFixed(1),
        availableHours: e.availableHours,
      }));
    },
  });
}

// ─── 3. Treatment Report ───
export function useTreatmentReport(filters: ReportFilters) {
  const { state } = useApp();
  const clinicId = state.currentClinicId;

  return useQuery({
    queryKey: ['report-treatment', clinicId, filters],
    enabled: !!clinicId,
    queryFn: async () => {
      let q = supabase
        .from('appointments')
        .select('id, date, status, treatment_type_id, practitioner_id')
        .eq('clinic_id', clinicId!)
        .gte('date', filters.dateFrom)
        .lte('date', filters.dateTo)
        .neq('status', 'cancelled');

      if (filters.practitionerId) {
        q = q.eq('practitioner_id', filters.practitionerId);
      }

      const { data: appointments, error } = await q;
      if (error) throw error;

      const { data: treatments, error: tErr } = await supabase
        .from('treatment_types')
        .select('id, name, color')
        .eq('clinic_id', clinicId!)
        .eq('is_active', true);
      if (tErr) throw tErr;

      const treatmentMap = new Map<string, { name: string; color: string; count: number; byMonth: Record<string, number> }>();
      (treatments || []).forEach(t => {
        treatmentMap.set(t.id, { name: t.name, color: t.color || '#8884d8', count: 0, byMonth: {} });
      });

      (appointments || []).forEach(a => {
        if (!a.treatment_type_id) return;
        const entry = treatmentMap.get(a.treatment_type_id);
        if (!entry) return;
        entry.count++;
        const month = a.date.substring(0, 7); // YYYY-MM
        entry.byMonth[month] = (entry.byMonth[month] || 0) + 1;
      });

      const byTreatment = Array.from(treatmentMap.values())
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count);

      // Build monthly stacked data
      const allMonths = new Set<string>();
      byTreatment.forEach(t => Object.keys(t.byMonth).forEach(m => allMonths.add(m)));
      const months = Array.from(allMonths).sort();

      const monthlyData = months.map(m => {
        const row: Record<string, string | number> = { month: m };
        byTreatment.forEach(t => {
          row[t.name] = t.byMonth[m] || 0;
        });
        return row;
      });

      return { byTreatment, monthlyData, treatmentNames: byTreatment.map(t => ({ name: t.name, color: t.color })) };
    },
  });
}

// ─── 4. Compliance Report ───
export function useComplianceReport(filters: ReportFilters) {
  const { state } = useApp();
  const clinicId = state.currentClinicId;

  return useQuery({
    queryKey: ['report-compliance', clinicId, filters],
    enabled: !!clinicId,
    queryFn: async () => {
      // Completed appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, practitioner_id')
        .eq('clinic_id', clinicId!)
        .eq('status', 'completed')
        .gte('date', filters.dateFrom)
        .lte('date', filters.dateTo);
      if (error) throw error;

      // Completed clinical notes
      const { data: notes, error: nErr } = await supabase
        .from('patient_clinical_notes')
        .select('id, practitioner_id, body, is_completed')
        .eq('clinic_id', clinicId!)
        .eq('note_type', 'evolution')
        .gte('note_date', filters.dateFrom)
        .lte('note_date', filters.dateTo);
      if (nErr) throw nErr;

      const { data: practitioners, error: pErr } = await supabase
        .from('practitioners')
        .select('id, display_name, color')
        .eq('clinic_id', clinicId!)
        .eq('is_active', true);
      if (pErr) throw pErr;

      const practMap = new Map<string, { name: string; color: string; completedAppts: number; completedNotes: number }>();
      (practitioners || []).forEach(p => {
        practMap.set(p.id, { name: p.display_name, color: p.color || '#6366f1', completedAppts: 0, completedNotes: 0 });
      });

      (appointments || []).forEach(a => {
        const e = practMap.get(a.practitioner_id);
        if (e) e.completedAppts++;
      });

      (notes || []).forEach(n => {
        if (!n.practitioner_id) return;
        const e = practMap.get(n.practitioner_id);
        if (!e) return;
        // Note is "completed" if body is non-empty and is_completed = true
        if (n.body && n.body.trim() !== '' && n.is_completed) {
          e.completedNotes++;
        }
      });

      return Array.from(practMap.values())
        .filter(e => e.completedAppts > 0)
        .map(e => ({
          ...e,
          compliancePct: e.completedAppts > 0 ? Math.round((e.completedNotes / e.completedAppts) * 100) : 0,
        }))
        .sort((a, b) => b.compliancePct - a.compliancePct);
    },
  });
}

// ─── Practitioners for filters ───
export function useReportPractitioners() {
  const { state } = useApp();
  const clinicId = state.currentClinicId;

  return useQuery({
    queryKey: ['report-practitioners', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practitioners')
        .select('id, display_name')
        .eq('clinic_id', clinicId!)
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}
