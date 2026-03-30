import { useState } from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePendingClinicalNotes } from '@/hooks/usePendingClinicalNotes';
import { cn } from '@/lib/utils';

interface PendingNotesAdminBannerProps {
  clinicId: string | undefined;
  date: string; // YYYY-MM-DD
}

export const PendingNotesAdminBanner = ({
  clinicId,
  date,
}: PendingNotesAdminBannerProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pending, total, completed, byPractitioner, isLoading } = usePendingClinicalNotes(
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

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
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
        </div>
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Historias clínicas del día
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progreso total</span>
                  <span>{completed}/{total}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              <Badge
                variant={allDone ? 'default' : 'secondary'}
                className={allDone ? 'bg-green-600' : ''}
              >
                {progressPercent}%
              </Badge>
            </div>

            {/* Table by practitioner */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesional</TableHead>
                  <TableHead className="text-center w-20">Total</TableHead>
                  <TableHead className="text-center w-24">Completadas</TableHead>
                  <TableHead className="text-center w-24">Pendientes</TableHead>
                  <TableHead className="w-20">Progreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPractitioner
                  .sort((a, b) => b.pending - a.pending)
                  .map((p) => {
                    const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 100;
                    return (
                      <TableRow key={p.practitionerId}>
                        <TableCell className="font-medium text-sm">{p.practitionerName}</TableCell>
                        <TableCell className="text-center">{p.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {p.completed}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.pending > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {p.pending}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              0
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
