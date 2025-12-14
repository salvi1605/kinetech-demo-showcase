import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { parseLocalDate } from '@/utils/dateUtils';

export const WeekNavigatorCompact = () => {
  const { state, dispatch } = useApp();

  const currentWeek = state.calendarWeekStart 
    ? parseLocalDate(state.calendarWeekStart) 
    : new Date();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const handlePrevWeek = () => {
    const prevWeek = subWeeks(currentWeek, 1);
    const weekStartISO = format(startOfWeek(prevWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    dispatch({ type: 'SET_CALENDAR_WEEK', payload: weekStartISO });
  };

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentWeek, 1);
    const weekStartISO = format(startOfWeek(nextWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    dispatch({ type: 'SET_CALENDAR_WEEK', payload: weekStartISO });
  };

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
      
      <span className="text-xs font-medium text-muted-foreground text-nowrap px-1">
        {formatWeekLabel()}
      </span>
      
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