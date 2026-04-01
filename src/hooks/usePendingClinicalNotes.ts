import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PractitionerNoteSummary {
  practitionerId: string;
  practitionerName: string;
  total: number;
  completed: number;
  pending: number;
}

export interface PendingNoteItem {
  noteId: string;
  patientId: string;
  patientName: string;
  practitionerName: string;
  startTime: string | null;
  treatmentType: string | null;
  isCompleted: boolean;
}

export interface UsePendingClinicalNotesResult {
  total: number;
  completed: number;
  pending: number;
  byPractitioner: PractitionerNoteSummary[];
  pendingItems: PendingNoteItem[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function usePendingClinicalNotes(
  clinicId: string | undefined,
  date: string, // YYYY-MM-DD
  practitionerId?: string
): UsePendingClinicalNotesResult {
  const [data, setData] = useState<Omit<UsePendingClinicalNotesResult, 'isLoading' | 'refetch'>>({
    total: 0,
    completed: 0,
    pending: 0,
    byPractitioner: [],
    pendingItems: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clinicId || !date) {
      setData({ total: 0, completed: 0, pending: 0, byPractitioner: [], pendingItems: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Build query for clinical notes on this date
      let query = supabase
        .from('patient_clinical_notes')
        .select('id, patient_id, practitioner_id, start_time, treatment_type, is_completed, patients(full_name), practitioners(display_name)')
        .eq('clinic_id', clinicId)
        .eq('note_date', date)
        .eq('note_type', 'evolution')
        .eq('status', 'active');

      if (practitionerId) {
        query = query.eq('practitioner_id', practitionerId);
      }

      const { data: notes, error } = await query;

      if (error) {
        console.error('[usePendingClinicalNotes] Error:', error);
        setIsLoading(false);
        return;
      }

      const allNotes = notes || [];
      const total = allNotes.length;
      const completed = allNotes.filter((n: any) => n.is_completed).length;
      const pending = total - completed;

      // Group by practitioner
      const practMap = new Map<string, { name: string; total: number; completed: number }>();
      for (const note of allNotes as any[]) {
        const pId = note.practitioner_id || 'unknown';
        const pName = note.practitioners?.display_name || 'Sin asignar';
        if (!practMap.has(pId)) {
          practMap.set(pId, { name: pName, total: 0, completed: 0 });
        }
        const entry = practMap.get(pId)!;
        entry.total++;
        if (note.is_completed) entry.completed++;
      }

      const byPractitioner: PractitionerNoteSummary[] = Array.from(practMap.entries()).map(
        ([id, v]) => ({
          practitionerId: id,
          practitionerName: v.name,
          total: v.total,
          completed: v.completed,
          pending: v.total - v.completed,
        })
      );

      // Pending items for health_pro banner
      const pendingItems: PendingNoteItem[] = (allNotes as any[])
        .filter((n) => !n.is_completed)
        .map((n) => ({
          noteId: n.id,
          patientId: n.patient_id,
          patientName: n.patients?.full_name || 'Paciente',
          startTime: n.start_time,
          treatmentType: n.treatment_type,
          isCompleted: false,
        }))
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      setData({ total, completed, pending, byPractitioner, pendingItems });
    } catch (err) {
      console.error('[usePendingClinicalNotes] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, date, practitionerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, isLoading, refetch: fetchData };
}
