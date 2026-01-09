import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { todayYMD } from '@/lib/historyStubs';
import { 
  upsertEvolutionNote, 
  deleteSnapshotByDate,
} from '@/lib/clinicalNotesService';
import type { EvolutionEntry } from '@/types/patient';
import type { Patient, ClinicalSummaryDay } from '@/contexts/AppContext';
import { treatmentLabel } from '@/utils/formatters';
import { ClinicalSnapshotBlock } from './ClinicalSnapshotBlock';
import { PatientClinicoModal } from './PatientClinicoModal';
import { useToast } from '@/hooks/use-toast';

interface ClinicalHistoryBlockProps {
  patient: Patient;
  historyByAppointment?: EvolutionEntry[];
  snapshots?: ClinicalSummaryDay[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin_clinic' | 'tenant_owner' | 'receptionist' | 'health_pro';
  tempPrefill: any;
  onHistoryChange: (entries: EvolutionEntry[]) => void;
  onPatientChange: (patient: Patient) => void;
  testCurrentDate?: string;
  clinicId?: string;
}

export const ClinicalHistoryBlock = ({
  patient,
  historyByAppointment = [],
  snapshots = [],
  currentUserId,
  currentUserName,
  currentUserRole,
  tempPrefill,
  onHistoryChange,
  onPatientChange,
  testCurrentDate,
  clinicId,
}: ClinicalHistoryBlockProps) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<EvolutionEntry[]>([]);
  const [clinicoOpen, setClinicoOpen] = useState(false);
  const [editingSnapshotDate, setEditingSnapshotDate] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const today = todayYMD(testCurrentDate);
    
    console.log('[ClinicalHistoryBlock] historyByAppointment recibido:', historyByAppointment.length, 'entradas');
    
    // Only show entries up to today (no future)
    const visibleEntries = historyByAppointment.filter((e) => e.date <= today);
    
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
    
    if (currentUserRole === 'admin_clinic' || currentUserRole === 'tenant_owner') {
      return true;
    }
    
    if (currentUserRole === 'receptionist' || currentUserRole === 'health_pro') {
      return entry.date === today;
    }
    
    return false;
  };

  // Debounced save to database
  const saveToDb = useCallback(async (entry: EvolutionEntry) => {
    if (!clinicId) return;
    
    setSavingId(entry.appointmentId);
    try {
      await upsertEvolutionNote(patient.id, clinicId, entry);
      console.log('[ClinicalHistoryBlock] Saved evolution to DB:', entry.appointmentId);
    } catch (error) {
      console.error('[ClinicalHistoryBlock] Error saving evolution:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la evolución',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  }, [clinicId, patient.id, toast]);

  const handleTextChange = (appointmentId: string, value: string) => {
    const limited = value.slice(0, 3000);
    setDrafts((prev) => ({ ...prev, [appointmentId]: limited }));

    // Update local entries
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

  // Save on blur
  const handleBlur = useCallback((entry: EvolutionEntry) => {
    const currentText = drafts[entry.appointmentId] || '';
    const updatedEntry: EvolutionEntry = {
      ...entry,
      text: currentText,
      completed: currentText.trim() !== '',
      updatedAt: new Date().toISOString(),
    };
    saveToDb(updatedEntry);
  }, [drafts, saveToDb]);

  const handleRemove = async (appointmentId: string) => {
    if (currentUserRole !== 'admin_clinic' && currentUserRole !== 'tenant_owner') return;
    
    // Note: We don't actually delete evolution notes, just clear the text
    const entry = entries.find(e => e.appointmentId === appointmentId);
    if (entry && clinicId) {
      const clearedEntry: EvolutionEntry = {
        ...entry,
        text: '',
        completed: false,
        updatedAt: new Date().toISOString(),
      };
      await saveToDb(clearedEntry);
      
      setEntries((prev) => prev.map((e) => 
        e.appointmentId === appointmentId ? clearedEntry : e
      ));
      setDrafts((prev) => ({ ...prev, [appointmentId]: '' }));
    }
  };

  useEffect(() => {
    onHistoryChange(entries);
  }, [entries, onHistoryChange]);

  // Sort for display
  const sortedForDisplay = [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const today = todayYMD(testCurrentDate);
  const showSummaries = currentUserRole !== 'receptionist';

  const defaultClinicalData = {
    mainReason: '',
    diagnosis: '',
    laterality: '',
    painLevel: 0,
    redFlags: { embarazo: false, cancer: false, marcapasos: false, alergias: false },
    redFlagsDetail: { alergias: '' },
    restricciones: { noMagnetoterapia: false, noElectroterapia: false },
  };

  const canEditSnapshot = (date: string): boolean => {
    if (currentUserRole === 'admin_clinic' || currentUserRole === 'tenant_owner') return true;
    if (currentUserRole === 'health_pro') return date === today;
    return false;
  };

  const canDeleteSnapshot = currentUserRole === 'admin_clinic' || currentUserRole === 'tenant_owner';

  const handleEditSnapshot = (date: string) => {
    setEditingSnapshotDate(date);
    setClinicoOpen(true);
  };

  const handleDeleteSnapshot = async (date: string) => {
    if (!clinicId) return;
    
    try {
      await deleteSnapshotByDate(patient.id, clinicId, date);
      onPatientChange(patient); // Trigger refetch
      
      toast({
        title: 'Resumen eliminado',
        description: 'El resumen clínico del día ha sido eliminado.',
      });
    } catch (error) {
      console.error('[ClinicalHistoryBlock] Error deleting snapshot:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el resumen',
        variant: 'destructive',
      });
    }
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

  // Create snapshots lookup
  const snapshotsByDate: Record<string, ClinicalSummaryDay> = {};
  snapshots.forEach(s => {
    snapshotsByDate[s.date] = s;
  });

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
            const snapshot = snapshotsByDate[date];

            return (
              <div key={date} className="space-y-3">
                <h3 className="text-center font-semibold text-base">
                  {formatDateHeader(date)}
                </h3>

                {(() => {
                  let snapshotToShow = snapshot;
                  
                  if (isToday && !snapshot) {
                    snapshotToShow = {
                      date: today,
                      clinicalData: tempPrefill ?? defaultClinicalData,
                      authorId: currentUserId,
                      updatedAt: new Date().toISOString(),
                    };
                  }
                  
                  const shouldShowSnapshot = showSummaries && (isToday || !!snapshot);
                  
                  return shouldShowSnapshot && snapshotToShow ? (
                    <ClinicalSnapshotBlock
                      date={date}
                      snapshot={snapshotToShow}
                      isToday={isToday}
                      canEdit={canEditSnapshot(date)}
                      canDelete={canDeleteSnapshot}
                      onEdit={() => handleEditSnapshot(date)}
                      onDelete={() => handleDeleteSnapshot(date)}
                    />
                  ) : null;
                })()}

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
                          {savingId === entry.appointmentId && (
                            <Badge variant="secondary" className="text-xs">
                              Guardando...
                            </Badge>
                          )}
                        </div>
                        {canEdit(entry) && (currentUserRole === 'admin_clinic' || currentUserRole === 'tenant_owner') && entry.date < today && (
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
                        onBlur={() => handleBlur(entry)}
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

                {date !== datesWithAppointments[datesWithAppointments.length - 1] && (
                  <Separator className="my-4" />
                )}
              </div>
            );
          })}

          {datesWithAppointments.length === 0 && (
            <p className="text-foreground text-center py-4">
              No se ha creado Historial clínico
            </p>
          )}
        </CardContent>
      </Card>

      {patient.id && clinicId && (
        <PatientClinicoModal
          open={clinicoOpen}
          onOpenChange={(open) => {
            setClinicoOpen(open);
            if (!open) {
              setEditingSnapshotDate(null);
              onPatientChange(patient); // Trigger refetch on close
            }
          }}
          patient={patient}
          tempPrefill={tempPrefill}
          clinicId={clinicId}
        />
      )}
    </>
  );
};
