import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinicSettings, generateTimeSlots, formatTimeShort } from '@/hooks/useClinicSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RescheduleSlotPickerProps {
  clinicId: string;
  practitionerId: string;
  date: string; // YYYY-MM-DD
  currentAppointmentId: string;
  selectedTime: string; // HH:mm
  onSelectSlot: (time: string) => void;
}

interface SlotInfo {
  time: string;
  subSlots: { subSlot: number; appointmentId: string | null; isCurrent: boolean }[];
}

export const RescheduleSlotPicker = ({
  clinicId,
  practitionerId,
  date,
  currentAppointmentId,
  selectedTime,
  onSelectSlot,
}: RescheduleSlotPickerProps) => {
  const { settings, isLoading: settingsLoading } = useClinicSettings();
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [noAvailability, setNoAvailability] = useState(false);

  useEffect(() => {
    if (!clinicId || !practitionerId || !date || settingsLoading || !settings) return;

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setIsDayBlocked(false);
      setNoAvailability(false);

      // Parallel queries: appointments, exceptions, practitioner availability
      const weekday = new Date(date + 'T12:00:00').getDay(); // 0=Sun..6=Sat

      const [aptsRes, excRes, availRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, start_time, sub_slot, status')
          .eq('clinic_id', clinicId)
          .eq('practitioner_id', practitionerId)
          .eq('date', date)
          .neq('status', 'cancelled'),
        supabase
          .from('schedule_exceptions')
          .select('type, reason, practitioner_id')
          .eq('clinic_id', clinicId)
          .eq('date', date)
          .or(`practitioner_id.is.null,practitioner_id.eq.${practitionerId}`),
        supabase
          .from('practitioner_availability')
          .select('from_time, to_time')
          .eq('clinic_id', clinicId)
          .eq('practitioner_id', practitionerId)
          .eq('weekday', weekday),
      ]);

      if (cancelled) return;

      // Check blocked day
      const closedExc = excRes.data?.find(
        (e) => e.type === 'clinic_closed' || (e.type === 'practitioner_block' && (e.practitioner_id === practitionerId || !e.practitioner_id))
      );
      if (closedExc) {
        setIsDayBlocked(true);
        setBlockReason(closedExc.reason || 'Día bloqueado');
        setIsLoading(false);
        return;
      }

      // Check availability
      if (!availRes.data || availRes.data.length === 0) {
        setNoAvailability(true);
      }

      // Generate time slots from clinic settings
      const workStart = formatTimeShort(settings.workday_start);
      const workEnd = formatTimeShort(settings.workday_end);
      const slotMinutes = settings.min_slot_minutes;
      const maxSubSlots = settings.sub_slots_per_block;
      const timeList = generateTimeSlots(workStart, workEnd, slotMinutes);

      // Build occupied map: time -> sub_slot -> appointmentId
      const occupiedMap = new Map<string, Map<number, string>>();
      aptsRes.data?.forEach((apt) => {
        const t = apt.start_time.slice(0, 5);
        if (!occupiedMap.has(t)) occupiedMap.set(t, new Map());
        occupiedMap.get(t)!.set(apt.sub_slot, apt.id);
      });

      // Build slot info (exclude last time since it's end boundary)
      const slotInfos: SlotInfo[] = timeList.slice(0, -1).map((time) => {
        const occupied = occupiedMap.get(time) || new Map<number, string>();
        const subSlots = Array.from({ length: maxSubSlots }, (_, i) => {
          const subSlot = i + 1;
          const aptId = occupied.get(subSlot) || null;
          return {
            subSlot,
            appointmentId: aptId,
            isCurrent: aptId === currentAppointmentId,
          };
        });
        return { time, subSlots };
      });

      setSlots(slotInfos);
      setIsLoading(false);
    };

    fetchData();
    return () => { cancelled = true; };
  }, [clinicId, practitionerId, date, settingsLoading, settings, currentAppointmentId]);

  if (settingsLoading || isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Disponibilidad del día:</p>
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isDayBlocked) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-center gap-2">
        <Ban className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-destructive">
          Día bloqueado: {blockReason}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Disponibilidad del día:</p>
      
      {noAvailability && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-2 flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Sin disponibilidad configurada para este día
          </p>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/20 p-2 space-y-1">
        {slots.map((slot) => {
          const hasAnyFree = slot.subSlots.some((s) => !s.appointmentId);
          const isSelectedTime = slot.time === selectedTime;

          return (
            <div
              key={slot.time}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1 text-sm',
                isSelectedTime && 'bg-primary/10 ring-1 ring-primary'
              )}
            >
              <span className="w-12 font-mono text-xs text-muted-foreground shrink-0">
                {slot.time}
              </span>
              <div className="flex gap-1 flex-wrap">
                {slot.subSlots.map((sub) => {
                  if (sub.isCurrent) {
                    return (
                      <button
                        key={sub.subSlot}
                        type="button"
                        onClick={() => onSelectSlot(slot.time)}
                        className="h-6 min-w-[3.5rem] px-1 rounded text-xs font-medium border-2 border-primary bg-primary/20 text-primary cursor-pointer hover:bg-primary/30 transition-colors"
                      >
                        Actual
                      </button>
                    );
                  }
                  if (sub.appointmentId) {
                    return (
                      <div
                        key={sub.subSlot}
                        className="h-6 min-w-[3.5rem] px-1 rounded text-xs flex items-center justify-center bg-muted text-muted-foreground"
                      >
                        Ocupado
                      </div>
                    );
                  }
                  return (
                    <button
                      key={sub.subSlot}
                      type="button"
                      onClick={() => onSelectSlot(slot.time)}
                      className="h-6 min-w-[3.5rem] px-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 cursor-pointer transition-colors"
                    >
                      Libre
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Click en un slot libre para seleccionar esa hora
      </p>
    </div>
  );
};
