import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDisplayDate, parseDisplayDate, toStoreDOB, fromStoreDOB, isValidDate } from "@/utils/dateUtils";
import { addYears, subYears, startOfDecade, setMonth, setYear, getYear } from "date-fns";

interface DateOfBirthInputProps {
  valueStoreDOB?: string;
  onChangeStoreDOB: (dob: string) => void;
  required?: boolean;
  error?: string;
}

type ViewMode = 'month' | 'year' | 'decade';

export function DateOfBirthInput({ valueStoreDOB, onChangeStoreDOB, required, error }: DateOfBirthInputProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(valueStoreDOB ? fromStoreDOB(valueStoreDOB) : new Date());
  const [inputValue, setInputValue] = useState(
    valueStoreDOB ? formatDisplayDate(fromStoreDOB(valueStoreDOB)) : ""
  );
  
  const selected = valueStoreDOB ? fromStoreDOB(valueStoreDOB) : undefined;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseDisplayDate(inputValue);
    if (parsed && isValidDate(parsed)) {
      onChangeStoreDOB(toStoreDOB(parsed));
      setInputValue(formatDisplayDate(parsed));
    } else if (inputValue && !isValidDate(parsed)) {
      setInputValue(valueStoreDOB ? formatDisplayDate(fromStoreDOB(valueStoreDOB)) : "");
    }
  };

  const handleSelectDay = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    onChangeStoreDOB(toStoreDOB(selectedDate));
    setInputValue(formatDisplayDate(selectedDate));
    setOpen(false);
  };

  const handleYearChange = (delta: number) => {
    setCursor(d => delta > 0 ? addYears(d, delta) : subYears(d, Math.abs(delta)));
  };

  const handleSelectYear = (year: number) => {
    setCursor(d => setYear(d, year));
    setView('month');
  };

  const handleSelectMonth = (month: number) => {
    setCursor(d => setMonth(d, month));
    setView('month');
  };

  const renderYearSelector = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const monthNames = months.map(m => new Date(2000, m, 1).toLocaleString('es-ES', { month: 'short' }));

    return (
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, idx) => (
            <Button
              key={month}
              variant="outline"
              size="sm"
              onClick={() => handleSelectMonth(month)}
              className={cn(
                "capitalize",
                cursor.getMonth() === month && "bg-primary text-primary-foreground"
              )}
            >
              {monthNames[idx]}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderDecadeSelector = () => {
    const currentYear = getYear(cursor);
    const decadeStart = Math.floor(currentYear / 10) * 10;
    const years = Array.from({ length: 10 }, (_, i) => decadeStart + i);

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(d => subYears(d, 10))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold">
            {decadeStart} - {decadeStart + 9}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(d => addYears(d, 10))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {years.map((year) => (
            <Button
              key={year}
              variant="outline"
              size="sm"
              onClick={() => handleSelectYear(year)}
              className={cn(
                getYear(cursor) === year && "bg-primary text-primary-foreground"
              )}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-2 p-3 border-b">
      {/* Año */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleYearChange(-1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => setView('decade')}
          className="text-lg font-semibold hover:bg-accent"
        >
          {getYear(cursor)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleYearChange(1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {/* Mes */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => setView('year')}
          className="text-base capitalize hover:bg-accent"
        >
          {cursor.toLocaleString('es-ES', { month: 'long' })}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        Fecha de Nacimiento {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder="dd/MM/yyyy"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className={cn(error && "border-destructive")}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" type="button" size="icon">
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {renderHeader()}
            {view === 'decade' && renderDecadeSelector()}
            {view === 'year' && renderYearSelector()}
            {view === 'month' && (
              <Calendar
                mode="single"
                selected={selected}
                onSelect={handleSelectDay}
                month={cursor}
                onMonthChange={setCursor}
                ISOWeek
                locale={es}
                showOutsideDays
                disabled={(date) => date > new Date()}
                className="pointer-events-auto"
              />
            )}
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
