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
  className 
}: TreatmentMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const toggleTreatment = (treatment: TreatmentType) => {
    const newValue = value.includes(treatment)
      ? value.filter(t => t !== treatment)
      : [...value, treatment];
    onChange(newValue);
  };

  const removeTreatment = (treatment: TreatmentType) => {
    onChange(value.filter(t => t !== treatment));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map(treatment => (
                <Badge
                  key={treatment}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTreatment(treatment);
                  }}
                >
                  {treatmentLabel[treatment]}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
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
