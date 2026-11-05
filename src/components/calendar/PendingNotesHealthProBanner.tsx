import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePendingClinicalNotes } from '@/hooks/usePendingClinicalNotes';
import { cn } from '@/lib/utils';

interface PendingNotesHealthProBannerProps {
  clinicId: string | undefined;
  date: string; // YYYY-MM-DD
  practitionerId: string | undefined;
}

export const PendingNotesHealthProBanner = ({
  clinicId,
  date,
  practitionerId,
}: PendingNotesHealthProBannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { pending, total, pendingItems, isLoading } = usePendingClinicalNotes(
    practitionerId ? clinicId : undefined,
    date,
    practitionerId
  );

  if (!practitionerId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground animate-pulse">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>Cargando historias pendientes…</span>
      </div>
    );
  }

  if (total === 0) return null;

  const allDone = pending === 0;

  if (allDone) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-medium">✓ Historias al día</span>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
          )}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span>
              Te quedan <Badge variant="secondary" className="bg-amber-200 text-amber-900 mx-1">{pending}</Badge> 
              historia{pending !== 1 ? 's' : ''} por completar hoy
            </span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50/50 divide-y divide-amber-100">
          {pendingItems.map((item) => (
            <div
              key={item.noteId}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground text-xs w-12 shrink-0">
                  {item.startTime?.substring(0, 5) || '--:--'}
                </span>
                <span className="truncate font-medium">{item.patientName}</span>
                {item.treatmentType && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.treatmentType}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={() => navigate(`/patients/${item.patientId}`)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
