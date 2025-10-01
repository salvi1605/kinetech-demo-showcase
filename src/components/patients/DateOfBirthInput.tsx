import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { formatDisplayDate, parseDisplayDate, toISODate, fromISODate, isPastDate, yearRange } from "@/utils/dateUtils";

interface DateOfBirthInputProps {
  valueISO?: string;
  onChangeISO: (iso: string) => void;
  required?: boolean;
  error?: string;
}

export function DateOfBirthInput({ valueISO, onChangeISO, required, error }: DateOfBirthInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    valueISO ? formatDisplayDate(fromISODate(valueISO)) : ""
  );
  const { from, to } = yearRange();
  const date = valueISO ? fromISODate(valueISO) : undefined;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseDisplayDate(inputValue);
    if (parsed && isPastDate(parsed)) {
      onChangeISO(toISODate(parsed));
      setInputValue(formatDisplayDate(parsed));
    } else if (inputValue && !parsed) {
      // Invalid format, reset to previous value or empty
      setInputValue(valueISO ? formatDisplayDate(fromISODate(valueISO)) : "");
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    if (isPastDate(selectedDate)) {
      onChangeISO(toISODate(selectedDate));
      setInputValue(formatDisplayDate(selectedDate));
      setOpen(false);
    }
  };

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
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleCalendarSelect}
              captionLayout="dropdown-buttons"
              fromDate={from}
              toDate={to}
              locale={es}
              disabled={(date) => date > new Date() || date < from}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
