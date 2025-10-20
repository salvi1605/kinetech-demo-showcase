import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import { TimePicker } from '@/components/shared/TimePicker';

export type DayKey = 'lun' | 'mar' | 'mié' | 'jue' | 'vie' | 'sáb' | 'dom';

export interface DaySlot {
  from: string;
  to: string;
}

export interface AvailabilityDay {
  day: DayKey;
  active: boolean;
  slots: DaySlot[];
}

interface AvailabilityEditorProps {
  value: AvailabilityDay[];
  onChange: (value: AvailabilityDay[]) => void;
}

const DAY_LABELS: Record<DayKey, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mié: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sáb: 'Sábado',
  dom: 'Domingo',
};

export function AvailabilityEditor({ value, onChange }: AvailabilityEditorProps) {
  const dayOrder: DayKey[] = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

  // Utilidades para formato 24H
  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  
  const normalizeTime = (raw: string): string => {
    const v = raw.trim().replace('.', ':');
    // 3-4 dígitos: 800 -> 08:00, 930 -> 09:30
    const d = v.replace(/\D/g, '');
    if (d.length === 3 || d.length === 4) {
      const h = d.slice(0, d.length - 2);
      const m = d.slice(-2);
      const hh = String(Math.min(23, parseInt(h || '0', 10))).padStart(2, '0');
      const mm = String(Math.min(59, parseInt(m || '0', 10))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    // h:m, h:mm, hh:m
    const m1 = v.match(/^(\d{1,2}):(\d{1,2})$/);
    if (m1) {
      const hh = String(Math.min(23, parseInt(m1[1], 10))).padStart(2, '0');
      const mm = String(Math.min(59, parseInt(m1[2], 10))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return v;
  };
  
  const isValidHHmm = (s: string) => TIME_RE.test(s);

  const setDay = (d: DayKey, patch: Partial<AvailabilityDay>) => {
    onChange(value.map(v => (v.day === d ? { ...v, ...patch } : v)));
  };

  const addSlot = (d: DayKey) => {
    const day = value.find(v => v.day === d)!;
    setDay(d, { slots: [...day.slots, { from: '08:00', to: '12:00' }] });
  };

  const removeSlot = (d: DayKey, i: number) => {
    const day = value.find(v => v.day === d)!;
    setDay(d, { slots: day.slots.filter((_, idx) => idx !== i) });
  };

  const setSlot = (d: DayKey, i: number, slot: Partial<DaySlot>) => {
    const day = value.find(v => v.day === d)!;
    setDay(d, {
      slots: day.slots.map((s, idx) => (idx === i ? { ...s, ...slot } : s)),
    });
  };

  const clearDay = (d: DayKey) => {
    setDay(d, { active: false, slots: [] });
  };

  const copyDayTo = (from: DayKey, targets: DayKey[]) => {
    const sourceDay = value.find(x => x.day === from)!;
    onChange(
      value.map(v =>
        targets.includes(v.day)
          ? { ...v, active: sourceDay.active, slots: [...sourceDay.slots] }
          : v
      )
    );
  };

  // Validación de solapamientos
  const hasOverlap = (slots: DaySlot[]): boolean => {
    // Solo validar slots con formato válido
    const validSlots = slots.filter(s => isValidHHmm(s.from) && isValidHHmm(s.to));
    for (let i = 0; i < validSlots.length; i++) {
      for (let j = i + 1; j < validSlots.length; j++) {
        const a = validSlots[i];
        const b = validSlots[j];
        if (
          (a.from < b.to && a.to > b.from) ||
          (b.from < a.to && b.to > a.from)
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const validateSlot = (slot: DaySlot): string | null => {
    if (!isValidHHmm(slot.from) || !isValidHHmm(slot.to)) {
      return "Formato HH:mm";
    }
    if (slot.from >= slot.to) {
      return "'Hasta' debe ser mayor que 'Desde'";
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {dayOrder.map(d => {
          const day = value.find(v => v.day === d)!;
          const hasErrors = day.slots.some(s => validateSlot(s)) || hasOverlap(day.slots);

          return (
            <div 
              key={d} 
              className={`border rounded-lg p-4 space-y-3 transition-colors ${
                !day.active ? 'cursor-pointer hover:bg-accent/50' : ''
              }`}
              onClick={(e) => {
                // Solo activar si el día está inactivo y el click no fue en un control interactivo
                if (!day.active && e.target === e.currentTarget) {
                  setDay(d, { active: true });
                }
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <Checkbox
                    id={`day-${d}`}
                    checked={day.active}
                    onCheckedChange={ck => setDay(d, { active: !!ck })}
                  />
                  <Label htmlFor={`day-${d}`} className="font-medium cursor-pointer">
                    {DAY_LABELS[d]}
                  </Label>
                </div>

              <div className="flex-1 space-y-2">
                {day.slots.length === 0 && (
                  <div className="text-sm text-muted-foreground italic">Sin horarios</div>
                )}
                {day.slots.map((s, i) => {
                  const error = validateSlot(s);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <TimePicker
                        value={s.from}
                        onChange={(time) => setSlot(d, i, { from: time })}
                        placeholder="08:00"
                        className="w-28"
                      />
                      <span className="text-muted-foreground">–</span>
                      <TimePicker
                        value={s.to}
                        onChange={(time) => setSlot(d, i, { to: time })}
                        placeholder="12:00"
                        className="w-28"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(d, i)}
                        title="Eliminar turno"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {error && (
                        <span className="text-xs text-destructive">{error}</span>
                      )}
                    </div>
                  );
                })}
                {hasOverlap(day.slots) && (
                  <div className="text-xs text-destructive">
                    Los horarios no deben superponerse
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSlot(d)}
                        disabled={!day.active}
                      >
                        + Añadir horario
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!day.active && (
                    <TooltipContent>
                      <p>Marca el día primero para añadir horarios</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearDay(d)}
                  title="Limpiar día"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm">
                      📋
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52">
                    <div className="text-sm font-medium mb-3">
                      Copiar horarios a:
                    </div>
                    <div className="space-y-2">
                      {dayOrder
                        .filter(x => x !== d)
                        .map(x => (
                          <div key={x} className="flex items-center justify-between">
                            <span className="text-sm">{DAY_LABELS[x]}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                copyDayTo(d, [x]);
                              }}
                            >
                              Copiar
                            </Button>
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
