import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { fetchNoteVersions } from '@/lib/clinicalNotesService';
import { Skeleton } from '@/components/ui/skeleton';

interface NoteVersion {
  id: string;
  body: string;
  clinical_data: any;
  edited_by: string | null;
  edited_at: string;
  change_reason: string | null;
  editor_name?: string;
}

interface NoteVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteType: 'evolution' | 'snapshot';
}

export const NoteVersionHistory = ({
  open,
  onOpenChange,
  noteId,
  noteType,
}: NoteVersionHistoryProps) => {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !noteId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNoteVersions(noteId);
        setVersions(data);
      } catch (err) {
        console.error('[NoteVersionHistory] Error fetching versions:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, noteId]);

  const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Historial de Versiones</DialogTitle>
          <DialogDescription>
            {noteType === 'evolution' ? 'Versiones anteriores de la evolución' : 'Versiones anteriores del resumen clínico'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-sm">
            No hay versiones anteriores registradas.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {versions.map((v, idx) => (
                <div key={v.id}>
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatDateTime(v.edited_at)}
                    {v.change_reason && ` — ${v.change_reason}`}
                  </div>
                  {noteType === 'evolution' ? (
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-3">
                      {v.body || <span className="italic text-muted-foreground">(vacío)</span>}
                    </p>
                  ) : v.clinical_data ? (
                    <div className="text-sm bg-muted/30 rounded p-3 space-y-1">
                      <p><span className="text-muted-foreground">Diagnóstico:</span> {v.clinical_data.diagnosis || '—'}</p>
                      <p><span className="text-muted-foreground">Motivo:</span> {v.clinical_data.mainReason || '—'}</p>
                      <p><span className="text-muted-foreground">Dolor:</span> {v.clinical_data.painLevel !== undefined ? `${v.clinical_data.painLevel}/10` : '—'}</p>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-3">
                      {v.body || <span className="italic text-muted-foreground">(vacío)</span>}
                    </p>
                  )}
                  {idx < versions.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
