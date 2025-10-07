import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { TreatmentType } from '@/types/appointments';
import { treatmentLabel } from '@/utils/formatters';

interface TreatmentMultiSelectProps {
  value: TreatmentType[];
  onChange: (value: TreatmentType[]) => void;
  placeholder?: string;
  className?: string;
  maxVisible?: number; // Número máximo de chips visibles antes de mostrar "+N más"
}

const treatmentOptions: Array<{ value: TreatmentType; label: string }> = [
  { value: 'fkt', label: treatmentLabel.fkt },
  { value: 'atm', label: treatmentLabel.atm },
  { value: 'drenaje', label: treatmentLabel.drenaje },
  { value: 'drenaje_ultra', label: treatmentLabel.drenaje_ultra },
  { value: 'masaje', label: treatmentLabel.masaje },
  { value: 'vestibular', label: treatmentLabel.vestibular },
  { value: 'otro', label: treatmentLabel.otro },
];

export const TreatmentMultiSelect = ({ 
  value, 
  onChange, 
  placeholder = "Selecciona tratamiento(s)",
  className,
  maxVisible = 2
}: TreatmentMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [showAllPopover, setShowAllPopover] = useState(false);

  const toggleTreatment = (treatment: TreatmentType) => {
    const newValue = value.includes(treatment)
      ? value.filter(t => t !== treatment)
      : [...value, treatment];
    onChange(newValue);
  };

  const removeTreatment = (treatment: TreatmentType) => {
    onChange(value.filter(t => t !== treatment));
  };

  const visibleTreatments = value.slice(0, maxVisible);
  const remainingCount = value.length - maxVisible;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-1 flex-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {visibleTreatments.map(treatment => (
                  <Badge
                    key={treatment}
                    variant="secondary"
                    className="shrink-0 whitespace-nowrap flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTreatment(treatment);
                    }}
                  >
                    {treatmentLabel[treatment]}
                    <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Popover open={showAllPopover} onOpenChange={setShowAllPopover}>
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer shrink-0 text-muted-foreground hover:bg-accent"
                      >
                        +{remainingCount} más ▾
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="p-2 w-56 max-h-64 overflow-y-auto" align="start">
                      <div className="space-y-1">
                        {value.map(t => (
                          <div key={t} className="flex justify-between items-center text-sm p-2 rounded hover:bg-accent">
                            <span>{treatmentLabel[t]}</span>
                            <X 
                              onClick={() => removeTreatment(t)} 
                              className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" 
                            />
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar tratamiento..." />
          <CommandList>
            <CommandEmpty>No se encontraron tratamientos.</CommandEmpty>
            <CommandGroup>
              {treatmentOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggleTreatment(option.value)}
                  className="cursor-pointer"
                >
                  <Checkbox
                    checked={value.includes(option.value)}
                    className="mr-2"
                  />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
