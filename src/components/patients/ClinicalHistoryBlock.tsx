import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History } from 'lucide-react';
import { todayYMD } from '@/lib/historyStubs';
import { 
  upsertEvolutionNote, 
  deleteSnapshotByDate,
  saveNoteVersion,
  getNoteIdByAppointment,
} from '@/lib/clinicalNotesService';
import type { EvolutionEntry } from '@/types/patient';
import type { Patient, ClinicalSummaryDay } from '@/contexts/AppContext';
import { treatmentLabel } from '@/utils/formatters';
import { ClinicalSnapshotBlock } from './ClinicalSnapshotBlock';
import { PatientClinicoModal } from './PatientClinicoModal';
import { NoteVersionHistory } from './NoteVersionHistory';
import { useToast } from '@/hooks/use-toast';

interface ClinicalHistoryBlockProps {
  patient: Patient;
  historyByAppointment?: EvolutionEntry[];
  snapshots?: ClinicalSummaryDay[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin_clinic' | 'tenant_owner' | 'receptionist' | 'health_pro' | 'super_admin';
  currentPractitionerId?: string;
  tempPrefill: any;
  onHistoryChange: (entries: EvolutionEntry[]) => void;
  onPatientChange: (patient: Patient) => void;
  testCurrentDate?: string;
  clinicId?: string;
}

export interface ClinicalHistoryBlockHandle {
  flushDrafts: () => Promise<void>;
}

export const ClinicalHistoryBlock = forwardRef<ClinicalHistoryBlockHandle, ClinicalHistoryBlockProps>(({
  patient,
  historyByAppointment = [],
  snapshots = [],
  currentUserId,
  currentUserName,
  currentUserRole,
  currentPractitionerId,
  tempPrefill,
  onHistoryChange,
  onPatientChange,
  testCurrentDate,
  clinicId,
}, ref) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<EvolutionEntry[]>([]);
  const [clinicoOpen, setClinicoOpen] = useState(false);
  const [editingSnapshotDate, setEditingSnapshotDate] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [versionNoteId, setVersionNoteId] = useState<string | null>(null);
  const [versionNoteType, setVersionNoteType] = useState<'evolution' | 'snapshot'>('evolution');
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  // Check for offline drafts on mount
  useEffect(() => {
    historyByAppointment.forEach((e) => {
      try {
        const draftJson = localStorage.getItem(`clinical-draft-${e.appointmentId}`);
        if (draftJson) {
          const draft = JSON.parse(draftJson);
          toast({
            title: 'Borrador pendiente',
            description: `Hay cambios sin sincronizar para la cita del ${e.date} ${e.time}.`,
          });
        }
      } catch {}
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const today = todayYMD(testCurrentDate);
    
    // Only show entries up to today (no future)
    const visibleEntries = historyByAppointment.filter((e) => e.date <= today);
    
    // Initialize drafts, preferring offline drafts
    const initialDrafts: Record<string, string> = {};
    visibleEntries.forEach((e) => {
      try {
        const draftJson = localStorage.getItem(`clinical-draft-${e.appointmentId}`);
        if (draftJson) {
          const draft = JSON.parse(draftJson);
          initialDrafts[e.appointmentId] = draft.text;
          return;
        }
      } catch {}
      initialDrafts[e.appointmentId] = e.text;
    });

    setEntries(visibleEntries);
    setDrafts(initialDrafts);
  }, [historyByAppointment, testCurrentDate]);

  const canEdit = (entry: EvolutionEntry): boolean => {
    const today = todayYMD(testCurrentDate);
    
    // Receptionist: no edit access
    if (currentUserRole === 'receptionist') return false;
    
    // Admin/owner: can edit any date
    if (currentUserRole === 'admin_clinic' || currentUserRole === 'tenant_owner') {
      return true;
    }
    
    // Health pro: only today AND only their own evolutions
    if (currentUserRole === 'health_pro') {
      return entry.date === today && (!!currentPractitionerId && entry.doctorId === currentPractitionerId);
    }
    
    return false;
  };

  // Save to database with version tracking and offline fallback
  const saveToDb = useCallback(async (entry: EvolutionEntry) => {
    if (!clinicId) return;
    
    const today = todayYMD(testCurrentDate);
    const isEditingPast = entry.date < today;
    
    setSavingId(entry.appointmentId);
    try {
      // If admin editing past date, save version first
      if (isEditingPast && (currentUserRole === 'admin_clinic' || currentUserRole === 'tenant_owner')) {
        const noteId = await getNoteIdByAppointment(entry.appointmentId);
        if (noteId) {
          // Find the original text before this edit
          const originalEntry = historyByAppointment.find(e => e.appointmentId === entry.appointmentId);
          if (originalEntry && originalEntry.text !== entry.text) {
            await saveNoteVersion(noteId, originalEntry.text, null, currentUserId, 'Edición de fecha pasada');
          }
        }
      }
      
      await upsertEvolutionNote(patient.id, clinicId, entry);
      
      // Clear offline draft on success
      try { localStorage.removeItem(`clinical-draft-${entry.appointmentId}`); } catch {}
      
      console.log('[ClinicalHistoryBlock] Saved evolution to DB:', entry.appointmentId);
    } catch (error: any) {
      console.error('[ClinicalHistoryBlock] Error saving evolution:', error);
      
      // Detect RLS / permission errors
      const isPermissionError = error?.code === '42501' || error?.message?.includes('row-level security') || error?.code === 'PGRST301';
      
      // Offline fallback: save to localStorage
      try {
        localStorage.setItem(`clinical-draft-${entry.appointmentId}`, JSON.stringify({
          text: entry.text,
          updatedAt: new Date().toISOString(),
        }));
      } catch {}
      
      toast({
        title: isPermissionError ? 'Sin permiso' : 'Error de conexión',
        description: isPermissionError 
          ? 'No tenés permiso para editar esta evolución. Solo podés editar tus propias notas del día actual.'
          : 'Cambios guardados localmente. Se sincronizarán al recuperar conexión.',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  }, [clinicId, patient.id, toast, testCurrentDate, currentUserRole, currentUserId, historyByAppointment]);

  // Expose flushDrafts to parent via ref
  useImperativeHandle(ref, () => ({
    flushDrafts: async () => {
      const dirtyEntries = entries.filter((e) => {
        const draftText = drafts[e.appointmentId];
        return draftText !== undefined && draftText !== e.text;
      });
      // Also save entries where draft matches text but completed might need updating
      const allToSave = entries.filter((e) => {
        const draftText = drafts[e.appointmentId];
        if (draftText === undefined) return false;
        const shouldBeCompleted = draftText.trim() !== '';
        return draftText !== e.text || shouldBeCompleted !== e.completed;
      });
      await Promise.all(
        allToSave.map((e) => {
          const currentText = drafts[e.appointmentId] ?? e.text;
          return saveToDb({
            ...e,
            text: currentText,
            completed: currentText.trim() !== '',
            updatedAt: new Date().toISOString(),
          });
        })
      );
    },
  }), [entries, drafts, saveToDb]);


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

  const handleShowVersions = async (appointmentId: string) => {
    const noteId = await getNoteIdByAppointment(appointmentId);
    if (noteId) {
      setVersionNoteId(noteId);
      setVersionNoteType('evolution');
      setVersionDialogOpen(true);
    } else {
      toast({ title: 'Sin versiones', description: 'No hay historial de versiones para esta nota.' });
    }
  };

  const handleShowSnapshotVersions = async (date: string) => {
    if (!clinicId) return;
    const { getSnapshotNoteId } = await import('@/lib/clinicalNotesService');
    const noteId = await getSnapshotNoteId(patient.id, clinicId, date);
    if (noteId) {
      setVersionNoteId(noteId);
      setVersionNoteType('snapshot');
      setVersionDialogOpen(true);
    } else {
      toast({ title: 'Sin versiones', description: 'No hay historial de versiones para este resumen.' });
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
              <div key={date} data-date={date} className="space-y-3">
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
                      canViewVersions={true}
                      onEdit={() => handleEditSnapshot(date)}
                      onDelete={() => handleDeleteSnapshot(date)}
                      onShowVersions={() => handleShowSnapshotVersions(date)}
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
                          {currentUserRole === 'health_pro' && currentPractitionerId && entry.doctorId !== currentPractitionerId && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Solo lectura
                            </Badge>
                          )}
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
                        <div className="flex items-center gap-1">
                          {currentUserRole !== 'receptionist' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowVersions(entry.appointmentId)}
                              title="Ver historial de versiones"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {versionNoteId && (
        <NoteVersionHistory
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          noteId={versionNoteId}
          noteType={versionNoteType}
        />
      )}
    </>
  );
});
