import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePendingClinicalNotes } from '@/hooks/usePendingClinicalNotes';
import { cn } from '@/lib/utils';

interface PendingNotesAdminBannerProps {
  clinicId: string | undefined;
  date: string;
}

export const PendingNotesAdminBanner = ({
  clinicId,
  date,
}: PendingNotesAdminBannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { pending, total, completed, byPractitioner, pendingItems, isLoading } = usePendingClinicalNotes(
    clinicId,
    date
  );

  if (isLoading || total === 0) return null;

  const allDone = pending === 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 100;

  if (allDone) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-medium">✓ Todas las historias completadas hoy</span>
        <Badge variant="secondary" className="bg-green-200 text-green-900 ml-auto">{total}/{total}</Badge>
      </div>
    );
  }

  // Group pending items by practitioner
  const groupedByPractitioner = pendingItems.reduce<Record<string, typeof pendingItems>>((acc, item) => {
    const key = item.practitionerName || 'Sin profesional';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
          )}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>
              <Badge variant="secondary" className="bg-blue-200 text-blue-900 mr-1">{pending}</Badge>
              historia{pending !== 1 ? 's' : ''} pendiente{pending !== 1 ? 's' : ''} hoy
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ({completed}/{total} completadas)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progressPercent} className="w-16 h-2 hidden sm:block" />
            <span className="text-xs text-blue-700">{progressPercent}%</span>
            {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-lg border border-blue-200 bg-blue-50/50 divide-y divide-blue-100">
          {byPractitioner
            .sort((a, b) => b.pending - a.pending)
            .map((p) => {
              const practitionerItems = groupedByPractitioner[p.practitionerName] || [];
              const hasPending = p.pending > 0;

              return (
                <div key={p.practitionerId} className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{p.practitionerName}</span>
                    {hasPending ? (
                      <Badge variant="secondary" className="bg-amber-200 text-amber-900 text-[10px]">
                        {p.pending} pendiente{p.pending !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-200 text-green-900 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> al día
                      </Badge>
                    )}
                  </div>

                  {hasPending && practitionerItems.length > 0 && (
                    <div className="mt-1.5 ml-5 space-y-0.5">
                      {practitionerItems.map((item) => (
                        <div
                          key={item.noteId}
                          className="flex items-center justify-between text-sm py-1"
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
                  )}
                </div>
              );
            })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
