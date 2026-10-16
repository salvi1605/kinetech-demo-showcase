import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { setAppointmentCharged, suggestNoShowCharge, type ChargeSuggestion } from '@/lib/noShowCharge';

interface Props {
  appointmentId: string;
  clinicId: string;
  patientId: string;
  treatmentTypeId?: string;
  date: string;
  isCharged: boolean;
  canEdit: boolean;
  size?: 'sm' | 'md';
  onChanged?: (value: boolean) => void;
}

/** Botón «$» que alterna el cobro de un no-show. Solo se renderiza en estado no_show. */
export function NoShowChargeButton({ appointmentId, clinicId, patientId, treatmentTypeId, date, isCharged, canEdit, size = 'md', onChanged }: Props) {
  const { toast } = useToast();
  const [value, setValue] = useState(isCharged);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<ChargeSuggestion | null>(null);

  useEffect(() => setValue(isCharged), [isCharged]);
  useEffect(() => {
    if (!canEdit) return;
    let alive = true;
    suggestNoShowCharge({ clinicId, patientId, treatmentTypeId, appointmentId, date }).then(s => alive && setSuggestion(s));
    return () => { alive = false; };
  }, [canEdit, clinicId, patientId, treatmentTypeId, appointmentId, date]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit || busy) return;
    const next = !value;
    setValue(next);
    setBusy(true);
    try {
      await setAppointmentCharged(appointmentId, clinicId, next);
      onChanged?.(next);
      toast({ title: next ? 'Inasistencia con cargo' : 'Inasistencia sin cargo' });
    } catch {
      setValue(!next);
      toast({ title: 'Error', description: 'No se pudo actualizar el cargo', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const suggestPending = canEdit && suggestion && suggestion.suggestCharge !== value;
  const label = value ? 'Con cargo' : 'Sin cargo';
  const tip = canEdit
    ? `${label}. Clic para ${value ? 'quitar' : 'aplicar'} el cargo.${suggestion ? ` ${suggestion.reason}.` : ''}`
    : `${label} (solo recepción, administración o dueño pueden cambiarlo)`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={value}
          aria-label={`Cargo de la inasistencia: ${label}`}
          aria-disabled={!canEdit}
          onClick={toggle}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            size === 'sm' ? 'h-5 w-5 mt-0.5' : 'h-6 w-6 ml-1',
            value ? 'bg-amber-500 border-amber-600 text-white' : 'bg-background border-muted-foreground/50 text-muted-foreground',
            suggestPending && 'ring-2 ring-amber-400',
            canEdit ? 'cursor-pointer' : 'cursor-default opacity-70',
          )}
        >
          <DollarSign className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        </button>
      </TooltipTrigger>
      <TooltipContent><p className="max-w-[220px]">{tip}</p></TooltipContent>
    </Tooltip>
  );
}

export function ChargedBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex w-fit items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800', className)}>
      con cargo
    </span>
  );
}
