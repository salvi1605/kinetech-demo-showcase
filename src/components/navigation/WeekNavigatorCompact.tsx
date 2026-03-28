import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { parseLocalDate } from '@/utils/dateUtils';

interface WeekNavigatorCompactProps {
  onDateSelect?: (date: Date) => void;
}

export const WeekNavigatorCompact = ({ onDateSelect }: WeekNavigatorCompactProps) => {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(undefined);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentWeek = state.calendarWeekStart 
    ? parseLocalDate(state.calendarWeekStart) 
    : new Date();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const displayMonth = calendarMonth ?? weekStart;

  const navigateToDate = (date: Date, fromPicker = false) => {
    const weekStartISO = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    dispatch({ type: 'SET_CALENDAR_WEEK', payload: weekStartISO });
    setOpen(false);
    setCalendarMonth(undefined);
    if (fromPicker && onDateSelect) {
      onDateSelect(date);
    }
  };

  const handlePrevWeek = () => navigateToDate(subWeeks(currentWeek, 1));
  const handleNextWeek = () => navigateToDate(addWeeks(currentWeek, 1));

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      setCalendarMonth(prev => {
        const base = prev ?? weekStart;
        return deltaX > 0 ? addMonths(base, 1) : subMonths(base, 1);
      });
    }
  }, [weekStart]);

  const formatWeekLabel = () => {
    return `Semana ${format(weekStart, 'd', { locale: es })}–${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevWeek}
        className="h-7 w-7 p-0"
        aria-label="Semana anterior"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>

      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCalendarMonth(undefined); }}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground text-nowrap px-1 hover:text-foreground transition-colors cursor-pointer rounded-sm hover:bg-accent/50 py-0.5"
            aria-label="Abrir selector de fecha"
          >
            <CalendarIcon className="h-3 w-3" />
            {formatWeekLabel()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Calendar
              mode="single"
              selected={weekStart}
              onSelect={(date) => date && navigateToDate(date, true)}
              month={displayMonth}
              onMonthChange={setCalendarMonth}
              locale={es}
              weekStartsOn={1}
              className={cn("p-3 pointer-events-auto")}
              initialFocus
            />
          </div>
          <div className="border-t p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigateToDate(new Date(), true)}
            >
              Hoy
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextWeek}
        className="h-7 w-7 p-0"
        aria-label="Semana siguiente"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
};
