import { useState, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { parse, isValid, isBefore, format, differenceInYears, startOfToday } from "date-fns";

interface DateOfBirthTripleInputProps {
  valueDOB?: string; // formato DD-MM-YYYY
  onChangeDOB: (dob: string) => void;
  required?: boolean;
  showErrors?: boolean;
}

export function DateOfBirthTripleInput({ valueDOB, onChangeDOB, required, showErrors = false }: DateOfBirthTripleInputProps) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const lastEmittedRef = useRef<string>("");

  // Cargar valores iniciales desde valueDOB
  useEffect(() => {
    // Solo sincronizar si el cambio viene del PADRE (no de nosotros)
    if (valueDOB === lastEmittedRef.current) {
      return; // Es el valor que nosotros mismos emitimos, ignorar
    }
    
    if (valueDOB && valueDOB.length === 10) {
      const [d, m, y] = valueDOB.split("-");
      setDay(d || "");
      setMonth(m || "");
      setYear(y || "");
    } else if (!valueDOB) {
      setDay("");
      setMonth("");
      setYear("");
    }
  }, [valueDOB]);

  // Validar y emitir cambios
  const validateAndEmit = (d: string, m: string, y: string) => {
    setError("");
    
    // Si está vacío
    if (!d && !m && !y) {
      onChangeDOB("");
      lastEmittedRef.current = "";
      if (required) {
        setError("Fecha de nacimiento requerida");
      }
      return;
    }

    // Si está incompleto → NO limpiar el valor previo
    if (!d || !m || !y || d.length !== 2 || m.length !== 2 || y.length !== 4) {
      setError("Fecha incompleta");
      return;
    }

    // Validar fecha
    const dateStr = `${d}-${m}-${y}`;
    const parsedDate = parse(dateStr, "dd-MM-yyyy", new Date());
    
    if (!isValid(parsedDate)) {
      setError("Fecha inválida");
      return;
    }

    // Validar que sea en el pasado
    const today = startOfToday();
    if (!isBefore(parsedDate, today) && parsedDate.getTime() !== today.getTime()) {
      setError("La fecha debe ser en el pasado");
      return;
    }

    // Validar edad (0-120 años)
    const age = differenceInYears(today, parsedDate);
    if (age < 0 || age > 120) {
      setError("Edad fuera de rango (0-120 años)");
      return;
    }

    // Todo válido
    onChangeDOB(dateStr);
    lastEmittedRef.current = dateStr;
    setError("");
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(value);
    
    // Auto-advance
    if (value.length === 2) {
      monthRef.current?.focus();
    }
  };

  const handleDayBlur = () => {
    if (day && day.length === 1 && parseInt(day) > 0) {
      const padded = day.padStart(2, "0");
      setDay(padded);
      validateAndEmit(padded, month, year);
    } else if (day && day.length === 2) {
      validateAndEmit(day, month, year);
    } else {
      validateAndEmit(day, month, year);
    }
  };

  const handleDayPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    
    // Si pegó 6 dígitos (ddmmyy) o 8 (ddmmyyyy)
    if (paste.length === 6) {
      e.preventDefault();
      const d = paste.slice(0, 2);
      const m = paste.slice(2, 4);
      const y = "20" + paste.slice(4, 6);
      setDay(d);
      setMonth(m);
      setYear(y);
      validateAndEmit(d, m, y);
      yearRef.current?.focus();
    } else if (paste.length === 8) {
      e.preventDefault();
      const d = paste.slice(0, 2);
      const m = paste.slice(2, 4);
      const y = paste.slice(4, 8);
      setDay(d);
      setMonth(m);
      setYear(y);
      validateAndEmit(d, m, y);
      yearRef.current?.focus();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonth(value);
    
    // Auto-advance
    if (value.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleMonthBlur = () => {
    if (month && month.length === 1 && parseInt(month) > 0) {
      const padded = month.padStart(2, "0");
      setMonth(padded);
      validateAndEmit(day, padded, year);
    } else if (month && month.length === 2) {
      validateAndEmit(day, month, year);
    } else {
      validateAndEmit(day, month, year);
    }
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !month) {
      dayRef.current?.focus();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(value);
  };

  const handleYearBlur = () => {
    validateAndEmit(day, month, year);
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !year) {
      monthRef.current?.focus();
    }
  };

  const handleSelectDay = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    const d = format(selectedDate, "dd");
    const m = format(selectedDate, "MM");
    const y = format(selectedDate, "yyyy");
    
    setDay(d);
    setMonth(m);
    setYear(y);
    
    const dateStr = `${d}-${m}-${y}`;
    onChangeDOB(dateStr);
    lastEmittedRef.current = dateStr;
    setError("");
    setOpen(false);
  };

  // Convertir inputs a Date para el calendario
  const selectedDate = (() => {
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      const parsed = parse(`${day}-${month}-${year}`, "dd-MM-yyyy", new Date());
      return isValid(parsed) ? parsed : undefined;
    }
    return undefined;
  })();

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        Fecha de Nacimiento {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2 items-start">
        <Input
          ref={dayRef}
          placeholder="DD"
          value={day}
          onChange={handleDayChange}
          onBlur={handleDayBlur}
          onPaste={handleDayPaste}
          inputMode="numeric"
          maxLength={2}
          className={cn("w-16 text-center", showErrors && error && "border-destructive")}
          aria-label="Día"
        />
        <Input
          ref={monthRef}
          placeholder="MM"
          value={month}
          onChange={handleMonthChange}
          onBlur={handleMonthBlur}
          onKeyDown={handleMonthKeyDown}
          inputMode="numeric"
          maxLength={2}
          className={cn("w-16 text-center", showErrors && error && "border-destructive")}
          aria-label="Mes"
        />
        <Input
          ref={yearRef}
          placeholder="AAAA"
          value={year}
          onChange={handleYearChange}
          onBlur={handleYearBlur}
          onKeyDown={handleYearKeyDown}
          inputMode="numeric"
          maxLength={4}
          className={cn("w-20 text-center", showErrors && error && "border-destructive")}
          aria-label="Año"
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
              selected={selectedDate}
              onSelect={handleSelectDay}
              defaultMonth={selectedDate || new Date(2000, 0, 1)}
              ISOWeek
              locale={es}
              showOutsideDays
              disabled={(date) => date > new Date()}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {showErrors && error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
