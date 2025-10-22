import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { todayYMD } from '@/lib/historyStubs';
import type { EvolutionEntry } from '@/types/patient';
import { treatmentLabel } from '@/utils/formatters';

interface ClinicalHistoryBlockProps {
  historyByAppointment?: EvolutionEntry[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'recep' | 'kinesio';
  onHistoryChange: (entries: EvolutionEntry[]) => void;
}

export const ClinicalHistoryBlock = ({
  historyByAppointment = [],
  currentUserId,
  currentUserName,
  currentUserRole,
  onHistoryChange,
}: ClinicalHistoryBlockProps) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<EvolutionEntry[]>([]);

  useEffect(() => {
    // Initialize local state from props
    const today = todayYMD();
    
    console.log('[ClinicalHistoryBlock] historyByAppointment recibido:', historyByAppointment.length, 'entradas');
    console.log('[ClinicalHistoryBlock] Fecha de hoy:', today);
    
    // Only show entries up to today (no future)
    const visibleEntries = historyByAppointment.filter((e) => e.date <= today);
    
    console.log('[ClinicalHistoryBlock] Entradas visibles (<=hoy):', visibleEntries.length);
    if (visibleEntries.length > 0) {
      console.log('[ClinicalHistoryBlock] Detalles:', visibleEntries.map(e => ({
        date: e.date,
        time: e.time,
        treatmentType: e.treatmentType,
        appointmentId: e.appointmentId
      })));
    }
    
    // Initialize drafts
    const initialDrafts: Record<string, string> = {};
    visibleEntries.forEach((e) => {
      initialDrafts[e.appointmentId] = e.text;
    });

    setEntries(visibleEntries);
    setDrafts(initialDrafts);
  }, [historyByAppointment]);

  const canEdit = (entry: EvolutionEntry): boolean => {
    const today = todayYMD();
    if (currentUserRole === 'admin') return true;
    return entry.date === today;
  };

  const handleTextChange = (appointmentId: string, value: string) => {
    const limited = value.slice(0, 3000);
    setDrafts((prev) => ({ ...prev, [appointmentId]: limited }));

    // Update entries
    setEntries((prev) =>
      prev.map((e) =>
        e.appointmentId === appointmentId
          ? {
              ...e,
              text: limited,
              completed: limited.trim() !== '',
              updatedAt: new Date().toISOString(),
            }
          : e
      )
    );
  };

  const handleRemove = (appointmentId: string) => {
    if (currentUserRole !== 'admin') return;
    
    setEntries((prev) => prev.filter((e) => e.appointmentId !== appointmentId));
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[appointmentId];
      return copy;
    });
  };

  useEffect(() => {
    // Notify parent of changes
    onHistoryChange(entries);
  }, [entries, onHistoryChange]);

  // Sort for display: ascending (oldest first, today last)
  const sortedForDisplay = [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const formatHeader = (entry: EvolutionEntry): string => {
    const [year, month, day] = entry.date.split('-');
    const dateStr = `${day}/${month}/${year}`;
    const treatment = treatmentLabel[entry.treatmentType] || entry.treatmentType;
    return `${dateStr} • ${entry.time} • ${treatment}`;
  };

  const today = todayYMD();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución por Cita</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedForDisplay.map((entry) => (
          <div key={entry.appointmentId} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {formatHeader(entry)}
                </span>
                {entry.status === 'canceled' && (
                  <Badge variant="outline" className="text-xs">
                    Cancelada
                  </Badge>
                )}
              </div>
              {canEdit(entry) && currentUserRole === 'admin' && entry.date < today && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(entry.appointmentId)}
                >
                  Borrar
                </Button>
              )}
            </div>
            <Textarea
              value={drafts[entry.appointmentId] || ''}
              onChange={(e) => handleTextChange(entry.appointmentId, e.target.value)}
              maxLength={3000}
              readOnly={!canEdit(entry)}
              placeholder={
                entry.date === today && !entry.text ? 'Escribe la evolución de hoy…' : undefined
              }
              className="min-h-[96px]"
            />
            <div className="text-xs text-muted-foreground text-right">
              {(drafts[entry.appointmentId] || '').length}/3000
            </div>
          </div>
        ))}
        {sortedForDisplay.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No hay citas registradas aún
          </p>
        )}
      </CardContent>
    </Card>
  );
};
