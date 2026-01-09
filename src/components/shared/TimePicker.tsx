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

  // SIEMPRE retorna formato "HH:mm" (5 caracteres exactos)
  const formatValue = (val: string): string => {
    if (!val) return "00:00";
    
    // Si viene con segundos "HH:mm:ss", tomar solo "HH:mm"
    const parts = val.split(':');
    if (parts.length >= 2) {
      const hours = String(Math.min(23, parseInt(parts[0] || '0', 10))).padStart(2, '0');
      const minutes = String(Math.min(59, parseInt(parts[1] || '0', 10))).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Si solo hay dígitos
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 2) {
      const hours = String(Math.min(23, parseInt(digits.slice(0, 2), 10))).padStart(2, '0');
      const minutes = digits.length >= 4 
        ? String(Math.min(59, parseInt(digits.slice(2, 4), 10))).padStart(2, '0')
        : '00';
      return `${hours}:${minutes}`;
    }
    
    return "00:00";
  };

  // Normaliza el valor para mostrar siempre HH:mm (sin segundos)
  const displayValue = (val: string): string => {
    if (!val) return '';
    return formatValue(val);
  };

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
    return formatValue(raw || '08:00');
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
    const currentValue = formatValue(value);
    const [, min] = currentValue.split(':');
    const newValue = `${hour.padStart(2, '0')}:${min}`;
    onChange(newValue);
  };

  const handleMinuteClick = (min: string) => {
    const currentValue = formatValue(value);
    const [hour] = currentValue.split(':');
    const newValue = `${hour}:${min.padStart(2, '0')}`;
    onChange(newValue);
  };

  const [currentHour, currentMin] = formatValue(value).split(':');

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder={placeholder}
        value={displayValue(value)}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="pr-10 text-left"
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
