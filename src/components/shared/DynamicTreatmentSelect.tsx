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

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={loading ? 'Cargando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(t => (
          <SelectItem key={t.id} value={t.name}>
            {t.name}
          </SelectItem>
        ))}
        {options.length === 0 && !loading && (
          <div className="p-2 text-center text-xs text-muted-foreground">
            Sin tratamientos configurados
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
