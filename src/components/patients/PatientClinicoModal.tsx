import { useState, useEffect, useCallback } from 'react';
import { Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useApp, Patient } from '@/contexts/AppContext';
import { getTodayISO } from '@/lib/clinicalSummaryHelpers';
import { upsertClinicalSnapshot } from '@/lib/clinicalNotesService';

interface PatientClinicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  tempPrefill?: {
    mainReason?: string;
    diagnosis?: string;
    laterality?: string;
    painLevel?: number;
    redFlags?: { embarazo: boolean; cancer: boolean; marcapasos: boolean; alergias: boolean };
    redFlagsDetail?: { alergias: string };
    restricciones?: { noMagnetoterapia: boolean; noElectroterapia: boolean };
  } | null;
  clinicId?: string;
}

export const PatientClinicoModal = ({ 
  open, 
  onOpenChange, 
  patient, 
  tempPrefill,
  clinicId,
}: PatientClinicoModalProps) => {
  const { state } = useApp();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    mainReason: '',
    diagnosis: '',
    laterality: '',
    painLevel: 0,
    redFlags: { embarazo: false, cancer: false, marcapasos: false, alergias: false },
    redFlagsDetail: { alergias: '' },
    restricciones: { noMagnetoterapia: false, noElectroterapia: false },
  });

  const [initialForm, setInitialForm] = useState(form);

  useEffect(() => {
    if (open) {
      const dataToLoad = patient?.clinico ? {
        mainReason: patient.clinico.mainReason || '',
        diagnosis: patient.clinico.diagnosis || '',
        laterality: patient.clinico.laterality || '',
        painLevel: patient.clinico.painLevel || 0,
        redFlags: patient.clinico.redFlags || { embarazo: false, cancer: false, marcapasos: false, alergias: false },
        redFlagsDetail: patient.clinico.redFlagsDetail || { alergias: '' },
        restricciones: patient.clinico.restricciones || { noMagnetoterapia: false, noElectroterapia: false },
      } : tempPrefill ? {
        mainReason: tempPrefill.mainReason || '',
        diagnosis: tempPrefill.diagnosis || '',
        laterality: tempPrefill.laterality || '',
        painLevel: tempPrefill.painLevel || 0,
        redFlags: tempPrefill.redFlags || { embarazo: false, cancer: false, marcapasos: false, alergias: false },
        redFlagsDetail: tempPrefill.redFlagsDetail || { alergias: '' },
        restricciones: tempPrefill.restricciones || { noMagnetoterapia: false, noElectroterapia: false },
      } : {
        mainReason: '',
        diagnosis: '',
        laterality: '',
        painLevel: 0,
        redFlags: { embarazo: false, cancer: false, marcapasos: false, alergias: false },
        redFlagsDetail: { alergias: '' },
        restricciones: { noMagnetoterapia: false, noElectroterapia: false },
      };
      
      setForm(dataToLoad);
      setInitialForm(dataToLoad);
    }
  }, [open, patient, tempPrefill]);

  const handleSave = useCallback(async () => {
    const hasChanges = 
      form.mainReason !== initialForm.mainReason ||
      form.diagnosis !== initialForm.diagnosis ||
      form.laterality !== initialForm.laterality ||
      form.painLevel !== initialForm.painLevel ||
      JSON.stringify(form.redFlags) !== JSON.stringify(initialForm.redFlags) ||
      JSON.stringify(form.redFlagsDetail) !== JSON.stringify(initialForm.redFlagsDetail) ||
      JSON.stringify(form.restricciones) !== JSON.stringify(initialForm.restricciones);

    if (!hasChanges) {
      toast({
        title: 'Sin cambios',
        description: 'No se detectaron cambios en el resumen clínico.',
      });
      onOpenChange(false);
      return;
    }

    const effectiveClinicId = clinicId || state.currentClinicId;
    if (!effectiveClinicId) {
      toast({
        title: 'Error',
        description: 'No se pudo determinar la clínica actual.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const today = getTodayISO(state.testCurrentDate);

      const clinicalData = {
        mainReason: form.mainReason,
        diagnosis: form.diagnosis,
        laterality: form.laterality as 'Derecha' | 'Izquierda' | 'Bilateral' | '',
        painLevel: form.painLevel,
        redFlags: form.redFlags,
        redFlagsDetail: form.redFlagsDetail,
        restricciones: form.restricciones,
      };

      const snapshot = {
        date: today,
        clinicalData,
        authorId: state.currentUserId,
        updatedAt: new Date().toISOString(),
      };

      await upsertClinicalSnapshot(patient.id, effectiveClinicId, snapshot, state.currentUserId);

      console.log('[PatientClinicoModal] Snapshot guardado en BD para:', today);

      toast({
        title: 'Clínico actualizado',
        description: 'Los cambios se han guardado correctamente.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('[PatientClinicoModal] Error saving snapshot:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el resumen clínico.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [state.testCurrentDate, state.currentUserId, state.currentClinicId, clinicId, patient.id, form, initialForm, toast, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  }, [handleSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Clínico del paciente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="mainReason">Motivo Principal</Label>
              <Textarea
                id="mainReason"
                value={form.mainReason}
                onChange={(e) => setForm(f => ({ ...f, mainReason: e.target.value }))}
                placeholder="Descripción del problema principal"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Input
                id="diagnosis"
                value={form.diagnosis}
                onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                placeholder="Diagnóstico médico"
              />
            </div>

            <div>
              <Label htmlFor="laterality">Lateralidad</Label>
              <Select
                value={form.laterality}
                onValueChange={(value) => setForm(f => ({ ...f, laterality: value }))}
              >
                <SelectTrigger id="laterality" className={!form.laterality ? 'text-muted-foreground italic' : ''}>
                  <SelectValue placeholder="Seleccione lateralidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Derecha">Derecha</SelectItem>
                  <SelectItem value="Izquierda">Izquierda</SelectItem>
                  <SelectItem value="Bilateral">Bilateral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Nivel de dolor (0-10)</Label>
            <div className="px-4 py-6">
              <Slider
                value={[form.painLevel]}
                onValueChange={(value) => setForm(f => ({ ...f, painLevel: value[0] }))}
                max={10}
                min={0}
                step={1}
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>0 (Sin dolor)</span>
                <span className="font-medium">{form.painLevel}</span>
                <span>10 (Dolor máximo)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <fieldset>
              <legend className="text-sm font-medium mb-3">Banderas Rojas</legend>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="embarazo-clinico"
                    checked={form.redFlags.embarazo}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, redFlags: { ...f.redFlags, embarazo: !!checked } }))
                    }
                  />
                  <label htmlFor="embarazo-clinico" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Embarazo
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cancer-clinico"
                    checked={form.redFlags.cancer}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, redFlags: { ...f.redFlags, cancer: !!checked } }))
                    }
                  />
                  <label htmlFor="cancer-clinico" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Cáncer
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marcapasos-clinico"
                    checked={form.redFlags.marcapasos}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, redFlags: { ...f.redFlags, marcapasos: !!checked } }))
                    }
                  />
                  <label htmlFor="marcapasos-clinico" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Marcapasos
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alergias-clinico"
                    checked={form.redFlags.alergias}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, redFlags: { ...f.redFlags, alergias: !!checked } }))
                    }
                  />
                  <label htmlFor="alergias-clinico" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-shrink-0">
                    Alergias
                  </label>
                  <Input
                    id="alergias-detail-clinico"
                    value={form.redFlagsDetail.alergias}
                    onChange={(e) => setForm(f => ({ ...f, redFlagsDetail: { ...f.redFlagsDetail, alergias: e.target.value.slice(0, 120) } }))}
                    placeholder="Tipo de alergia"
                    disabled={!form.redFlags.alergias}
                    maxLength={120}
                    className="flex-1"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium mb-3">Restricciones</legend>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noMagnetoterapia-clinico"
                    checked={form.restricciones.noMagnetoterapia}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, restricciones: { ...f.restricciones, noMagnetoterapia: !!checked } }))
                    }
                  />
                  <label htmlFor="noMagnetoterapia-clinico" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    No Magnetoterapia
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noElectroterapia-clinico"
                    checked={form.restricciones.noElectroterapia}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, restricciones: { ...f.restricciones, noElectroterapia: !!checked } }))
                    }
                  />
                  <label htmlFor="noElectroterapia-clinico" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    No Electroterapia
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
