import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { todayYMD, isSameYMD, formatYMD_ddMMyyyy, isToday, isBefore } from '@/lib/clinicTime';

export type PatientHistoryEntry = {
  date: string; // 'YYYY-MM-DD'
  text: string; // max 3000 chars
  authorId: string;
  authorName?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

interface ClinicalHistoryBlockProps {
  history?: PatientHistoryEntry[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'recep' | 'kinesio';
  onHistoryChange: (entries: PatientHistoryEntry[]) => void;
}

export const ClinicalHistoryBlock = ({
  history = [],
  currentUserId,
  currentUserName,
  currentUserRole,
  onHistoryChange,
}: ClinicalHistoryBlockProps) => {
  const [draftsByDate, setDraftsByDate] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<PatientHistoryEntry[]>([]);

  useEffect(() => {
    // Purge empty entries with date < today
    const today = todayYMD();
    const purged = history.filter(
      (e) => e.text.trim() !== '' || isSameYMD(e.date, today)
    );

    // Initialize drafts
    const drafts: Record<string, string> = {};
    purged.forEach((e) => {
      drafts[e.date] = e.text;
    });

    // If no entry for today, initialize one
    const hasToday = purged.some((e) => isSameYMD(e.date, today));
    if (!hasToday) {
      drafts[today] = '';
      purged.push({
        date: today,
        text: '',
        authorId: currentUserId,
        authorName: currentUserName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setEntries(purged);
    setDraftsByDate(drafts);
  }, [history]);

  const canEdit = (entry: PatientHistoryEntry): boolean => {
    if (currentUserRole === 'admin') return true;
    return isToday(entry.date);
  };

  const handleTextChange = (date: string, value: string) => {
    const limited = value.slice(0, 3000);
    setDraftsByDate((prev) => ({ ...prev, [date]: limited }));

    // Update entries
    setEntries((prev) =>
      prev.map((e) =>
        isSameYMD(e.date, date)
          ? { ...e, text: limited, updatedAt: new Date().toISOString() }
          : e
      )
    );
  };

  const handleRemove = (date: string) => {
    setEntries((prev) => prev.filter((e) => !isSameYMD(e.date, date)));
    setDraftsByDate((prev) => {
      const copy = { ...prev };
      delete copy[date];
      return copy;
    });
  };

  useEffect(() => {
    // Collect and filter entries, sort ascending
    const finalEntries = entries
      .filter((e) => e.text.trim() !== '')
      .sort((a, b) => a.date.localeCompare(b.date));

    onHistoryChange(finalEntries);
  }, [entries]);

  // Sort for display: most recent first (desc)
  const sortedForDisplay = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial del Paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedForDisplay.map((entry) => (
          <div key={entry.date} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-medium">
                {formatYMD_ddMMyyyy(entry.date)}
              </span>
              {canEdit(entry) && currentUserRole === 'admin' && !isToday(entry.date) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(entry.date)}
                >
                  Borrar
                </Button>
              )}
            </div>
            <Textarea
              value={draftsByDate[entry.date] || ''}
              onChange={(e) => handleTextChange(entry.date, e.target.value)}
              maxLength={3000}
              readOnly={!canEdit(entry)}
              placeholder={
                isToday(entry.date) ? 'Escribe la evolución de hoy…' : undefined
              }
              className="min-h-[100px]"
            />
            <div className="text-xs text-muted-foreground">
              {(draftsByDate[entry.date] || '').length}/3000
            </div>
          </div>
        ))}
        {sortedForDisplay.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No hay entradas en el historial
          </p>
        )}
      </CardContent>
    </Card>
  );
};
