import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { parseLocalDate } from '@/utils/dateUtils';

export const WeekNavigator = () => {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);

  const currentWeek = state.calendarWeekStart 
    ? parseLocalDate(state.calendarWeekStart) 
    : new Date();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const navigateToDate = (date: Date) => {
    const weekStartISO = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    dispatch({ type: 'SET_CALENDAR_WEEK', payload: weekStartISO });
    setOpen(false);
  };

  const handlePrevWeek = () => navigateToDate(subWeeks(currentWeek, 1));
  const handleNextWeek = () => navigateToDate(addWeeks(currentWeek, 1));

  const formatWeekLabel = () => {
    return `${format(weekStart, 'd', { locale: es })}–${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevWeek}
        className="h-8 w-8 p-0"
        aria-label="Semana anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-nowrap hover:text-primary transition-colors cursor-pointer rounded-sm hover:bg-accent/50 px-2 py-1"
            aria-label="Abrir selector de fecha"
          >
            <CalendarIcon className="h-4 w-4" />
            Semana {formatWeekLabel()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={weekStart}
            onSelect={(date) => date && navigateToDate(date)}
            defaultMonth={weekStart}
            locale={es}
            weekStartsOn={1}
            className={cn("p-3 pointer-events-auto")}
            initialFocus
          />
          <div className="border-t p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigateToDate(new Date())}
            >
              Hoy
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextWeek}
        className="h-8 w-8 p-0"
        aria-label="Semana siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
