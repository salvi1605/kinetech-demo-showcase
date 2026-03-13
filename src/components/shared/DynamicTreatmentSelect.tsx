import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTreatments } from '@/hooks/useTreatments';
import { cn } from '@/lib/utils';

interface DynamicTreatmentSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** If provided, only show treatments assigned to this practitioner */
  practitionerId?: string;
}

/**
 * Shared treatment Select that reads from treatment_types DB table.
 * Shows only the treatment name (no description, no color).
 * 
 * NOTE: Uses portal={false} to avoid Radix SelectBubbleInput crash
 * when rendered inside a Dialog portal (known Radix UI issue).
 */
export const DynamicTreatmentSelect = ({
  value,
  onValueChange,
  placeholder = 'Selecciona tratamiento',
  disabled,
  className,
  practitionerId,
}: DynamicTreatmentSelectProps) => {
  const { treatments, loading } = useTreatments();

  // Filter by practitioner if provided
  let options = treatments.filter(t => t.is_active);
  if (practitionerId) {
    const assigned = options.filter(t =>
      t.practitioners.some(p => p.id === practitionerId)
    );
    // Retrocompatibility: if practitioner has no assignments, show all
    if (assigned.length > 0) options = assigned;
  }

  // Don't render the Select at all while loading to avoid SelectBubbleInput crash
  if (loading) {
    return (
      <div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground", className)}>
        Cargando...
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled} key={`treatment-select-${options.length}`}>
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent portal={false}>
        {options.map(t => (
          <SelectItem key={t.id} value={t.name}>
            {t.name}
          </SelectItem>
        ))}
        {options.length === 0 && (
          <div className="p-2 text-center text-xs text-muted-foreground">
            Sin tratamientos configurados
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
