import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { todayYMD } from '@/lib/historyStubs';
import type { EvolutionEntry } from '@/types/patient';
import type { Patient } from '@/contexts/AppContext';
import { treatmentLabel } from '@/utils/formatters';
import { getSummaryByDate as getSnapshotByDate, deleteSummaryFor } from '@/lib/clinicalSummaryHelpers';
import { ClinicalSnapshotBlock } from './ClinicalSnapshotBlock';
import { PatientClinicoModal } from './PatientClinicoModal';
import { useToast } from '@/hooks/use-toast';

interface ClinicalHistoryBlockProps {
  patient: Patient;
  historyByAppointment?: EvolutionEntry[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'recep' | 'kinesio';
  onHistoryChange: (entries: EvolutionEntry[]) => void;
  onPatientChange: (patient: Patient) => void;
  testCurrentDate?: string;
}

export const ClinicalHistoryBlock = ({
  patient,
  historyByAppointment = [],
  currentUserId,
  currentUserName,
  currentUserRole,
  onHistoryChange,
  onPatientChange,
  testCurrentDate,
}: ClinicalHistoryBlockProps) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<EvolutionEntry[]>([]);
  const [clinicoOpen, setClinicoOpen] = useState(false);
  const [editingSnapshotDate, setEditingSnapshotDate] = useState<string | null>(null);

  useEffect(() => {
    // Initialize local state from props
    const today = todayYMD(testCurrentDate);
    
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
  }, [historyByAppointment, testCurrentDate]);

  const canEdit = (entry: EvolutionEntry): boolean => {
    const today = todayYMD(testCurrentDate);
    
    // Solo admin puede editar días pasados
    if (currentUserRole === 'admin') {
      return true;
    }
    
    // Recepcionista y Kinesiólogo solo pueden editar el día actual
    if (currentUserRole === 'recep' || currentUserRole === 'kinesio') {
      return entry.date === today;
    }
    
    return false;
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

  const today = todayYMD(testCurrentDate);

  // Recepcionista no ve el bloque de resumen
  const showSummaries = currentUserRole !== 'recep';

  const canEditSnapshot = (date: string): boolean => {
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'kinesio') return date === today;
    return false;
  };

  const canDeleteSnapshot = currentUserRole === 'admin';

  const handleEditSnapshot = (date: string) => {
    setEditingSnapshotDate(date);
    setClinicoOpen(true);
  };

  const handleDeleteSnapshot = (date: string) => {
    const updatedPatient = deleteSummaryFor(patient, date);
    onPatientChange(updatedPatient);
    
    toast({
      title: 'Resumen eliminado',
      description: `El resumen clínico del día ha sido eliminado.`,
    });
    
    console.log('[Analytics] summary_deleted', { patientId: patient.id, date });
  };

  // Group entries by date
  const entriesByDate: Record<string, EvolutionEntry[]> = {};
  sortedForDisplay.forEach(entry => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date].push(entry);
  });

  // Get all unique dates with appointments
  const datesWithAppointments = Object.keys(entriesByDate).sort();

  const formatDateHeader = (date: string): string => {
    const [year, month, day] = date.split('-');
    const dateStr = `${day}/${month}/${year}`;
    return date === today ? `${dateStr} (hoy)` : dateStr;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial Clínico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {datesWithAppointments.map((date) => {
            const dateEntries = entriesByDate[date];
            const isToday = date === today;
            const snapshot = getSnapshotByDate(patient, date);

            return (
              <div key={date} className="space-y-3">
                {/* Date header */}
                <h3 className="text-center font-semibold text-base">
                  {formatDateHeader(date)}
                </h3>

                {/* Clinical Snapshot (only for admin and kinesio, and only if exists) */}
                {showSummaries && snapshot && (
                  <ClinicalSnapshotBlock
                    date={date}
                    snapshot={snapshot}
                    isToday={isToday}
                    canEdit={canEditSnapshot(date)}
                    canDelete={canDeleteSnapshot}
                    onEdit={() => handleEditSnapshot(date)}
                    onDelete={() => handleDeleteSnapshot(date)}
                  />
                )}

                {/* Evolution entries for this date */}
                <div className="space-y-3">
                  {dateEntries.map((entry) => (
                    <div key={entry.appointmentId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {entry.time} • {treatmentLabel[entry.treatmentType] || entry.treatmentType}
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
                          entry.date === today && !entry.text ? 'Escribe la evolución de esta cita…' : undefined
                        }
                        className="min-h-[48px]"
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {(drafts[entry.appointmentId] || '').length}/3000
                      </div>
                    </div>
                  ))}
                </div>

                {/* Separator between days */}
                {date !== datesWithAppointments[datesWithAppointments.length - 1] && (
                  <Separator className="my-4" />
                )}
              </div>
            );
          })}

          {datesWithAppointments.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No hay citas registradas aún
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal Clínico para editar snapshots */}
      {patient.id && (
        <PatientClinicoModal
          open={clinicoOpen}
          onOpenChange={(open) => {
            setClinicoOpen(open);
            if (!open) setEditingSnapshotDate(null);
          }}
          patient={patient}
        />
      )}
    </>
  );
};
