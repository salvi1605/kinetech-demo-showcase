import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SubSlotPickerProps {
  clinicId: string;
  practitionerId: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  selectedSubSlot: number | null;
  onSelect: (subSlot: number | null) => void;
  excludeAppointmentId?: string;
}

export const SubSlotPicker = ({
  clinicId,
  practitionerId,
  date,
  startTime,
  selectedSubSlot,
  onSelect,
  excludeAppointmentId,
}: SubSlotPickerProps) => {
  const { settings } = useClinicSettings();
  const totalSlots = settings?.sub_slots_per_block ?? 5;

  const [occupiedSlots, setOccupiedSlots] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch occupied sub-slots for this specific block
  useEffect(() => {
    if (!clinicId || !practitionerId || !date || !startTime) {
      setOccupiedSlots(new Set());
      return;
    }

    let cancelled = false;
    const fetchOccupied = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('appointments')
          .select('sub_slot')
          .eq('clinic_id', clinicId)
          .eq('practitioner_id', practitionerId)
          .eq('date', date)
          .eq('start_time', startTime)
          .neq('status', 'cancelled');

        if (excludeAppointmentId) {
          query = query.neq('id', excludeAppointmentId);
        }

        const { data, error } = await query;
        if (cancelled) return;

        if (error) {
          console.error('SubSlotPicker fetch error:', error);
          setOccupiedSlots(new Set());
          return;
        }

        const occupied = new Set((data || []).map(r => r.sub_slot));
        setOccupiedSlots(occupied);

        // Auto-select first free if current selection is occupied or null
        if (selectedSubSlot === null || occupied.has(selectedSubSlot)) {
          const firstFree = Array.from({ length: totalSlots }, (_, i) => i + 1)
            .find(s => !occupied.has(s));
          onSelect(firstFree ?? null);
        }
      } catch (err) {
        console.error('SubSlotPicker error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchOccupied();
    return () => { cancelled = true; };
  }, [clinicId, practitionerId, date, startTime, totalSlots, excludeAppointmentId]);

  const allOccupied = useMemo(() => {
    for (let i = 1; i <= totalSlots; i++) {
      if (!occupiedSlots.has(i)) return false;
    }
    return true;
  }, [occupiedSlots, totalSlots]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando disponibilidad…
      </div>
    );
  }

  if (!startTime || !practitionerId) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Sub-turno disponible
      </p>

      {allOccupied ? (
        <p className="text-sm text-destructive font-medium">
          Sin disponibilidad en este horario — todos los sub-turnos están ocupados
        </p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: totalSlots }, (_, i) => i + 1).map(slot => {
            const isOccupied = occupiedSlots.has(slot);
            const isSelected = selectedSubSlot === slot;

            return (
              <button
                key={slot}
                type="button"
                disabled={isOccupied}
                onClick={() => onSelect(slot)}
                className={cn(
                  'w-10 h-10 rounded-md text-sm font-medium border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  isOccupied && 'bg-muted text-muted-foreground/50 cursor-not-allowed border-muted',
                  !isOccupied && !isSelected && 'bg-background border-border hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-primary text-primary-foreground border-primary shadow-sm',
                )}
                title={isOccupied ? `Sub-turno ${slot}: Ocupado` : `Sub-turno ${slot}: Libre`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
