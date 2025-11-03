import { useState, useCallback, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClinicalHistoryBlock } from './ClinicalHistoryBlock';
import { PatientClinicoModal } from './PatientClinicoModal';
import { useApp, Patient } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ensureTodayStubs } from '@/lib/historyStubs';
import type { EvolutionEntry } from '@/types/patient';
import dayjs from 'dayjs';
import { getTodayISO, getLatestSummaryBefore, upsertSummaryFor, hasAppointmentOn, getSummaryByDate } from '@/lib/clinicalSummaryHelpers';

const calcularEdad = (fechaNac: string): number => {
  const hoy = dayjs();
  const nac = dayjs(fechaNac, 'YYYY-MM-DD');
  return hoy.diff(nac, 'year');
};

const formatearFecha = (fecha: string): string => {
  return dayjs(fecha, 'YYYY-MM-DD').format('DD/MM/YYYY');
};

interface ClinicalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
}

export const ClinicalHistoryDialog = ({
  open,
  onOpenChange,
  patient,
}: ClinicalHistoryDialogProps) => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [pendingHistory, setPendingHistory] = useState<EvolutionEntry[]>([]);
  const [clinicoOpen, setClinicoOpen] = useState(false);

  // Check permissions: admin and kinesio can edit
  const canEditClinico = state.userRole === 'admin' || state.userRole === 'kinesio';

  // Process patient history: cleanup orphans + create stubs for current day + prefill snapshot
  const processPatientHistory = useCallback(() => {
    if (!patient.id) return;
    
    const today = getTodayISO(state.testCurrentDate);
    
    console.log('[ClinicalHistoryDialog] Procesando historia para fecha:', today);
    console.log('[ClinicalHistoryDialog] Appointments en estado:', state.appointments.length);
    console.log('[ClinicalHistoryDialog] Historia actual:', patient.clinico?.historyByAppointment?.length || 0, 'entradas');
    
    const patientCopy = { ...patient };
    
    // 1️⃣ LIMPIAR entries huérfanos (citas eliminadas)
    if (patientCopy.clinico?.historyByAppointment) {
      const validAppointmentIds = new Set(state.appointments.map(a => a.id));
      const beforeCleanup = patientCopy.clinico.historyByAppointment.length;
      
      patientCopy.clinico.historyByAppointment = 
        patientCopy.clinico.historyByAppointment.filter(
          entry => validAppointmentIds.has(entry.appointmentId)
        );
      
      const afterCleanup = patientCopy.clinico.historyByAppointment.length;
      const removed = beforeCleanup - afterCleanup;
      if (removed > 0) {
        console.log('[ClinicalHistoryDialog] Limpieza de huérfanos - eliminados:', removed);
      }
    }
    
    // 2️⃣ AGREGAR stubs para citas del día (según Time Travel)
    ensureTodayStubs(patientCopy, state.appointments, state.currentUserId, state.testCurrentDate);
    
    // 3️⃣ PREFILL snapshot del día actual si tiene citas y no existe
    const hasTodayAppointment = hasAppointmentOn(state.appointments, patient.id, today);
    const todaySummary = getSummaryByDate(patientCopy, today);
    
    if (hasTodayAppointment && !todaySummary) {
      console.log('[ClinicalHistoryDialog] Hoy tiene citas pero no snapshot, creando prefill...');
      
      const lastSummary = getLatestSummaryBefore(patientCopy, today);
      
      if (lastSummary) {
        console.log('[ClinicalHistoryDialog] Prefill desde snapshot previo:', lastSummary.date);
        const prefillPatient = upsertSummaryFor(
          patientCopy,
          today,
          lastSummary.clinicalData,
          state.currentUserId
        );
        Object.assign(patientCopy, prefillPatient);
        
        console.log('[Analytics] summary_prefilled_from_previous', {
          patientId: patient.id,
          fromDate: lastSummary.date,
          toDate: today,
        });
      } else {
        // Si no hay snapshot previo, crear uno vacío
        console.log('[ClinicalHistoryDialog] No hay snapshot previo, creando vacío');
        const emptyPatient = upsertSummaryFor(
          patientCopy,
          today,
          {
            mainReason: '',
            diagnosis: '',
            laterality: '',
            painLevel: 0,
            redFlags: { embarazo: false, cancer: false, marcapasos: false, alergias: false },
            redFlagsDetail: { alergias: '' },
            restricciones: { noMagnetoterapia: false, noElectroterapia: false },
          },
          state.currentUserId
        );
        Object.assign(patientCopy, emptyPatient);
      }
    }
    
    // Si hubo cambios, actualizar
    const oldLength = patient.clinico?.historyByAppointment?.length || 0;
    const newLength = patientCopy.clinico?.historyByAppointment?.length || 0;
    const oldSummariesLength = patient.history?.clinicalSummaries?.length || 0;
    const newSummariesLength = patientCopy.history?.clinicalSummaries?.length || 0;
    
    console.log('[ClinicalHistoryDialog] Después de procesamiento - evolutions:', oldLength, '->', newLength);
    console.log('[ClinicalHistoryDialog] Después de procesamiento - snapshots:', oldSummariesLength, '->', newSummariesLength);
    
    if (newLength !== oldLength || newSummariesLength !== oldSummariesLength) {
      console.log('[ClinicalHistoryDialog] Actualizando paciente con cambios');
      dispatch({
        type: 'UPDATE_PATIENT',
        payload: {
          id: patient.id,
          updates: {
            clinico: patientCopy.clinico,
            history: patientCopy.history,
          },
        },
      });
    }
  }, [patient, state.appointments, state.currentUserId, state.testCurrentDate, dispatch]);

  // Process history when modal opens
  useEffect(() => {
    if (open) {
      console.log('[ClinicalHistoryDialog] Modal abierto para paciente:', patient.id);
      processPatientHistory();
    }
  }, [open, patient.id, processPatientHistory]);

  // Re-process history when Time Travel date changes (only if modal is open)
  useEffect(() => {
    if (open) {
      console.log('[ClinicalHistoryDialog] Time Travel cambió, reprocesando historia');
      processPatientHistory();
    }
  }, [state.testCurrentDate, open, processPatientHistory]);

  const handleHistoryChange = useCallback((entries: EvolutionEntry[]) => {
    setPendingHistory(entries);
  }, []);

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_PATIENT',
      payload: {
        id: patient.id,
        updates: {
          clinico: {
            ...patient.clinico,
            historyByAppointment: pendingHistory,
          },
        },
      },
    });

    toast({
      title: 'Historial actualizado',
      description: 'Los cambios se han guardado correctamente.',
    });

    onOpenChange(false);
  };

  const edad = patient.identificacion?.dateOfBirth 
    ? calcularEdad(patient.identificacion.dateOfBirth) 
    : null;

  // Mapeo de nombres técnicos a nombres legibles
  const redFlagsLabels: Record<string, string> = {
    embarazo: 'Embarazo',
    cancer: 'Cáncer',
    marcapasos: 'Marcapasos',
    alergias: 'Alergias'
  };

  const restriccionesLabels: Record<string, string> = {
    noMagnetoterapia: 'No Magnetoterapia',
    noElectroterapia: 'No Electroterapia'
  };

  // Formatear Banderas Rojas con detalle de alergias
  const formatBanderasRojas = (): string => {
    if (!patient.clinico?.redFlags) return '—';
    
    const flags = Object.entries(patient.clinico.redFlags)
      .filter(([_, value]) => value)
      .map(([key]) => {
        // Si es alergias y hay detalle, mostrar el detalle
        if (key === 'alergias' && patient.clinico?.redFlagsDetail?.alergias) {
          return `Alergias: ${patient.clinico.redFlagsDetail.alergias}`;
        }
        return redFlagsLabels[key] || key;
      });
    
    return flags.length > 0 ? flags.join(' • ') : '—';
  };

  // Formatear Restricciones
  const formatRestricciones = (): string => {
    if (!patient.clinico?.restricciones) return '—';
    
    const restricciones = Object.entries(patient.clinico.restricciones)
      .filter(([_, value]) => value)
      .map(([key]) => restriccionesLabels[key] || key);
    
    return restricciones.length > 0 ? restricciones.join(' • ') : '—';
  };

  const banderasRojas = formatBanderasRojas();
  const restricciones = formatRestricciones();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial del Paciente - {patient.name}</DialogTitle>
        </DialogHeader>

        {/* Resumen Clínico */}
        <Card className="mb-4 border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Resumen Clínico</CardTitle>
            {canEditClinico && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setClinicoOpen(true)}
                aria-label="Abrir Clínico del paciente"
                disabled={!patient.id}
                title={!patient.id ? "Guarda el paciente para editar el clínico" : undefined}
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Clínico
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Nombre Completo</p>
                <p className="font-medium">{patient.identificacion?.fullName || patient.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Diagnóstico</p>
                <p className="font-medium">{patient.clinico?.diagnosis || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {patient.identificacion?.dateOfBirth 
                    ? formatearFecha(patient.identificacion.dateOfBirth) 
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Lateralidad</p>
                <p className="font-medium">{patient.clinico?.laterality || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Edad</p>
                <p className="font-medium">{edad !== null ? `${edad} años` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Nivel de Dolor (0–10)</p>
                <p className="font-medium">
                  {patient.clinico?.painLevel !== undefined ? `${patient.clinico.painLevel}/10` : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Motivo Principal</p>
                <p className="font-medium">{patient.clinico?.mainReason || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Banderas Rojas</p>
                <p className="font-medium text-xs">{banderasRojas}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Restricciones</p>
                <p className="font-medium text-xs">{restricciones}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* Subtítulo Evolución */}
        <div className="mb-3">
          <h3 className="text-base font-semibold">Evolución del Día</h3>
        </div>

        <ClinicalHistoryBlock
          patient={patient}
          historyByAppointment={patient.clinico?.historyByAppointment ?? []}
          currentUserId={state.currentUserId}
          currentUserName={state.currentUserName}
          currentUserRole={state.userRole || 'kinesio'}
          onHistoryChange={handleHistoryChange}
          onPatientChange={(updatedPatient) => {
            dispatch({
              type: 'UPDATE_PATIENT',
              payload: {
                id: patient.id,
                updates: {
                  history: updatedPatient.history,
                },
              },
            });
          }}
          testCurrentDate={state.testCurrentDate}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal Clínico del paciente */}
      {patient.id && (
        <PatientClinicoModal
          open={clinicoOpen}
          onOpenChange={setClinicoOpen}
          patient={patient}
        />
      )}
    </Dialog>
  );
};
