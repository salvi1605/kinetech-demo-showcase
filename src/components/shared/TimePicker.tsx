import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({ value, onChange, placeholder = 'HH:mm', className }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  // Auto-formato mientras escribe (inserta ":" automáticamente)
  const formatTimeOnInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    return mm ? `${hh}:${mm}` : `${hh}:`;
  };

  // Normalización al salir del campo (completa valores parciales)
  const normalizeTime = (raw: string): string => {
    if (!raw) return '08:00';
    const digits = raw.replace(/\D/g, '');
    
    // 1-2 dígitos: "8" → "08:00"
    if (digits.length <= 2) {
      const h = Math.min(23, parseInt(digits || '0', 10));
      return `${String(h).padStart(2, '0')}:00`;
    }
    
    // 3-4 dígitos: "800" → "08:00", "1430" → "14:30"
    if (digits.length >= 3) {
      const h = digits.slice(0, digits.length - 2);
      const m = digits.slice(-2);
      const hh = String(Math.min(23, parseInt(h, 10))).padStart(2, '0');
      const mm = String(Math.min(59, parseInt(m, 10))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    
    // Ya con formato "HH:mm"
    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (match) {
      const hh = String(Math.min(23, parseInt(match[1], 10))).padStart(2, '0');
      const mm = String(Math.min(59, parseInt(match[2], 10))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    
    return raw;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimeOnInput(e.target.value);
    onChange(formatted);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeTime(e.target.value);
    onChange(normalized);
  };

  const handleHourClick = (hour: string) => {
    const [, min] = (value || '00:00').split(':');
    onChange(`${hour}:${min || '00'}`);
  };

  const handleMinuteClick = (min: string) => {
    const [hour] = (value || '00:00').split(':');
    onChange(`${hour || '00'}:${min}`);
  };

  const [currentHour, currentMin] = (value || '00:00').split(':');

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="pr-10 text-center"
      />
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
            aria-label="Abrir selector de hora"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex gap-2 p-2">
            {/* Columna de Horas */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs font-medium text-muted-foreground pb-1">Hora</div>
              <ScrollArea className="h-60 w-16">
                <div className="space-y-1 px-1">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = String(i).padStart(2, '0');
                    const isSelected = currentHour === hour;
                    
                    return (
                      <Button
                        key={hour}
                        type="button"
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-center h-8 text-sm"
                        onClick={() => handleHourClick(hour)}
                      >
                        {hour}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            {/* Columna de Minutos */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs font-medium text-muted-foreground pb-1">Min</div>
              <ScrollArea className="h-60 w-16">
                <div className="space-y-1 px-1">
                  {['00', '15', '30', '45'].map(min => {
                    const isSelected = currentMin === min;
                    
                    return (
                      <Button
                        key={min}
                        type="button"
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-center h-8 text-sm"
                        onClick={() => handleMinuteClick(min)}
                      >
                        {min}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
