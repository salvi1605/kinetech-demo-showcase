import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, User, Phone, Stethoscope, CreditCard, LifeBuoy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useApp, Patient } from '@/contexts/AppContext';
import { DateOfBirthInput } from '@/components/patients/DateOfBirthInput';
import { parseSmartDOB, toStoreDOB } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { 
  PatientForm, 
  Lateralidad, 
  ObraSocial,
  ReminderPref, 
  normalizePatientForm, 
  toFormFromPatient, 
  toPatientFromForm 
} from '@/utils/patientForm.normalize';

interface EditPatientDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

const sections = ['identificacion', 'emergencia', 'clinico', 'seguro'] as const;
type Section = typeof sections[number];

const sectionConfig = [
  { key: 'identificacion' as Section, label: 'Identificación', Icon: User },
  { key: 'emergencia' as Section, label: 'Emergencia', Icon: LifeBuoy },
  { key: 'clinico' as Section, label: 'Clínico', Icon: Stethoscope },
  { key: 'seguro' as Section, label: 'Seguro', Icon: ShieldCheck },
];

export const EditPatientDialogV2 = ({ open, onOpenChange, patient }: EditPatientDialogV2Props) => {
  const [section, setSection] = useState<Section>('identificacion');
  const { dispatch } = useApp();
  const { toast } = useToast();

  const [form, setForm] = useState<PatientForm>({
    identificacion: {
      fullName: '',
      preferredName: '',
      documentId: '',
      dateOfBirth: '',
      mobilePhone: '',
      email: '',
    },
    emergencia: {
      contactName: '',
      relationship: '',
      emergencyPhone: '',
    },
    clinico: {
      mainReason: '',
      diagnosis: '',
      laterality: '',
      painLevel: 0,
      redFlags: { embarazo: false, cancer: false, marcapasos: false },
      restricciones: { noMagnetoterapia: false, noElectroterapia: false },
    },
    seguro: {
      obraSocial: '',
      numeroAfiliado: '',
      sesionesAutorizadas: undefined,
      copago: undefined,
      contactAuth: { whatsapp: false, email: false },
      reminderPref: 'none',
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load patient data when dialog opens
  useEffect(() => {
    if (open && patient) {
      const loadedForm = toFormFromPatient(patient);
      setForm(loadedForm);
      setErrors({});
      setSection('identificacion');
    }
  }, [open, patient]);

  const validateSection = (sec: Section): { ok: boolean; errors: Record<string, string> } => {
    const newErrors: { [key: string]: string } = {};

    if (sec === 'identificacion') {
      if (!form.identificacion.fullName.trim()) {
        newErrors.fullName = 'El nombre completo es requerido';
      }
      if (!form.identificacion.dateOfBirth) {
        newErrors.dateOfBirth = 'La fecha de nacimiento es requerida';
      }
      if (!form.identificacion.mobilePhone.trim()) {
        newErrors.mobilePhone = 'El teléfono móvil es requerido';
      }
      if (form.identificacion.email && !form.identificacion.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        newErrors.email = 'Email inválido';
      }
    }

    if (sec === 'emergencia') {
      if (!form.emergencia.contactName.trim()) {
        newErrors.contactName = 'El nombre de contacto es requerido';
      }
      if (!form.emergencia.emergencyPhone.trim()) {
        newErrors.emergencyPhone = 'El teléfono de emergencia es requerido';
      }
    }

    if (sec === 'seguro') {
      if (!form.seguro.obraSocial) {
        newErrors.obraSocial = 'Campo obligatorio';
      }
      if (form.seguro.obraSocial !== 'particular' && form.seguro.obraSocial !== '') {
        if (!form.seguro.numeroAfiliado?.trim()) {
          newErrors.numeroAfiliado = 'Requerido para OSDE o Luis Pasteur';
        }
      }
    }

    return { ok: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const validateExceptSeguro = (): { ok: boolean; errors: Record<string, string> } => {
    let allErrors: Record<string, string> = {};
    
    for (const sec of ['identificacion', 'emergencia', 'clinico'] as Section[]) {
      const { ok, errors } = validateSection(sec);
      if (!ok) {
        allErrors = { ...allErrors, ...errors };
      }
    }
    
    return { ok: Object.keys(allErrors).length === 0, errors: allErrors };
  };

  const goPrev = () => {
    const idx = sections.indexOf(section);
    if (idx > 0) {
      setSection(sections[idx - 1]);
    }
  };

  const goNext = () => {
    const idx = sections.indexOf(section);
    if (idx < sections.length - 1) {
      setSection(sections[idx + 1]);
    }
  };

  const handleGlobalSave = () => {
    if (!patient) return;

    const { ok, errors: validationErrors } = validateExceptSeguro();
    
    if (!ok) {
      setErrors(validationErrors);
      toast({
        title: "Error de validación",
        description: "Por favor, corrige los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const normalizedForm = normalizePatientForm(form);
    const updatedPatient = toPatientFromForm(patient.id, normalizedForm);

    dispatch({ type: 'UPDATE_PATIENT', payload: { id: patient.id, updates: updatedPatient } });
    toast({
      title: "Paciente actualizado",
      description: "Los datos del paciente se han actualizado correctamente.",
    });

    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!patient) return;

    // Validate all sections
    let allErrors: Record<string, string> = {};
    let firstInvalidSection: Section | null = null;
    
    for (const sec of sections) {
      const { ok, errors: secErrors } = validateSection(sec);
      if (!ok) {
        allErrors = { ...allErrors, ...secErrors };
        if (!firstInvalidSection) {
          firstInvalidSection = sec;
        }
      }
    }

    if (firstInvalidSection) {
      setErrors(allErrors);
      setSection(firstInvalidSection);
      return;
    }

    const normalizedForm = normalizePatientForm(form);
    const updatedPatient = toPatientFromForm(patient.id, normalizedForm);

    dispatch({ type: 'UPDATE_PATIENT', payload: { id: patient.id, updates: updatedPatient } });
    toast({
      title: "Paciente actualizado",
      description: "Los datos del paciente se han actualizado correctamente.",
    });

    onOpenChange(false);
  };

  const renderStepContent = () => {
    switch (section) {
      case 'identificacion':
        return (
          <div className="space-y-4" data-step-content>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={form.identificacion.fullName}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, fullName: e.target.value } }))}
                  placeholder="Nombre y apellido completo"
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label htmlFor="preferredName">Nombre Preferido</Label>
                <Input
                  id="preferredName"
                  value={form.identificacion.preferredName}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, preferredName: e.target.value } }))}
                  placeholder="Como prefiere que lo llamen"
                />
              </div>

              <div>
                <Label htmlFor="documentId">Documento/ID</Label>
                <Input
                  id="documentId"
                  value={form.identificacion.documentId}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, documentId: e.target.value } }))}
                  placeholder="DNI, Pasaporte, etc."
                />
              </div>

              <div className="col-span-2">
                <DateOfBirthInput
                  valueStoreDOB={form.identificacion.dateOfBirth}
                  onChangeStoreDOB={(value) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, dateOfBirth: value } }))}
                  required
                  error={errors.dateOfBirth}
                />
              </div>

              <div>
                <Label htmlFor="mobilePhone">Teléfono Móvil *</Label>
                <Input
                  id="mobilePhone"
                  value={form.identificacion.mobilePhone}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, mobilePhone: e.target.value } }))}
                  placeholder="+54 11 1234-5678"
                  className={errors.mobilePhone ? 'border-destructive' : ''}
                />
                {errors.mobilePhone && <p className="text-sm text-destructive mt-1">{errors.mobilePhone}</p>}
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.identificacion.email}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, email: e.target.value } }))}
                  placeholder="email@ejemplo.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>
        );

      case 'emergencia':
        return (
          <div className="space-y-4" data-step-content>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Nombre de Contacto *</Label>
                <Input
                  id="contactName"
                  value={form.emergencia.contactName}
                  onChange={(e) => setForm(f => ({ ...f, emergencia: { ...f.emergencia, contactName: e.target.value } }))}
                  placeholder="Nombre del contacto de emergencia"
                  className={errors.contactName ? 'border-destructive' : ''}
                />
                {errors.contactName && <p className="text-sm text-destructive mt-1">{errors.contactName}</p>}
              </div>

              <div>
                <Label htmlFor="relationship">Relación</Label>
                <Input
                  id="relationship"
                  value={form.emergencia.relationship}
                  onChange={(e) => setForm(f => ({ ...f, emergencia: { ...f.emergencia, relationship: e.target.value } }))}
                  placeholder="Familiar, amigo, etc."
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="emergencyPhone">Teléfono de emergencia *</Label>
                <Input
                  id="emergencyPhone"
                  value={form.emergencia.emergencyPhone}
                  onChange={(e) => setForm(f => ({ ...f, emergencia: { ...f.emergencia, emergencyPhone: e.target.value } }))}
                  placeholder="+54 11 1234-5678"
                  className={errors.emergencyPhone ? 'border-destructive' : ''}
                />
                {errors.emergencyPhone && <p className="text-sm text-destructive mt-1">{errors.emergencyPhone}</p>}
              </div>
            </div>
          </div>
        );

      case 'clinico':
        return (
          <div className="space-y-6" data-step-content>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="mainReason">Motivo Principal</Label>
                <Textarea
                  id="mainReason"
                  value={form.clinico.mainReason}
                  onChange={(e) => setForm(f => ({ ...f, clinico: { ...f.clinico, mainReason: e.target.value } }))}
                  placeholder="Descripción del problema principal"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Input
                  id="diagnosis"
                  value={form.clinico.diagnosis}
                  onChange={(e) => setForm(f => ({ ...f, clinico: { ...f.clinico, diagnosis: e.target.value } }))}
                  placeholder="Diagnóstico médico"
                />
              </div>

              <div>
                <Label htmlFor="laterality">Lateralidad</Label>
                <Select
                  value={form.clinico.laterality}
                  onValueChange={(value) => setForm(f => ({ ...f, clinico: { ...f.clinico, laterality: value as Lateralidad } }))}
                >
                  <SelectTrigger id="laterality" className={!form.clinico.laterality ? 'text-muted-foreground italic' : ''}>
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
                  value={[form.clinico.painLevel]}
                  onValueChange={(value) => setForm(f => ({ ...f, clinico: { ...f.clinico, painLevel: value[0] } }))}
                  max={10}
                  min={0}
                  step={1}
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>0 (sin dolor)</span>
                  <span className="font-medium">{form.clinico.painLevel}</span>
                  <span>10 (Dolor Máximo)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <fieldset>
                <legend className="text-sm font-medium mb-3">Banderas Rojas</legend>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="embarazo"
                      checked={form.clinico.redFlags.embarazo}
                      onCheckedChange={(checked) =>
                        setForm(f => ({ ...f, clinico: { ...f.clinico, redFlags: { ...f.clinico.redFlags, embarazo: !!checked } } }))
                      }
                    />
                    <label htmlFor="embarazo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Embarazo
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cancer"
                      checked={form.clinico.redFlags.cancer}
                      onCheckedChange={(checked) =>
                        setForm(f => ({ ...f, clinico: { ...f.clinico, redFlags: { ...f.clinico.redFlags, cancer: !!checked } } }))
                      }
                    />
                    <label htmlFor="cancer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Cáncer
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="marcapasos-edit"
                      checked={form.clinico.redFlags.marcapasos}
                      onCheckedChange={(checked) =>
                        setForm(f => ({ ...f, clinico: { ...f.clinico, redFlags: { ...f.clinico.redFlags, marcapasos: !!checked } } }))
                      }
                    />
                    <label htmlFor="marcapasos-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Marcapasos
                    </label>
                  </div>
                </div>
              </fieldset>
              
              <fieldset>
                <legend className="text-sm font-medium mb-3">Restricciones</legend>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noMagnetoterapia-edit"
                      checked={form.clinico.restricciones.noMagnetoterapia}
                      onCheckedChange={(checked) =>
                        setForm(f => ({ ...f, clinico: { ...f.clinico, restricciones: { ...f.clinico.restricciones, noMagnetoterapia: !!checked } } }))
                      }
                    />
                    <label htmlFor="noMagnetoterapia-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      No Magnetoterapia
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noElectroterapia-edit"
                      checked={form.clinico.restricciones.noElectroterapia}
                      onCheckedChange={(checked) =>
                        setForm(f => ({ ...f, clinico: { ...f.clinico, restricciones: { ...f.clinico.restricciones, noElectroterapia: !!checked } } }))
                      }
                    />
                    <label htmlFor="noElectroterapia-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      No Electroterapia
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        );

      case 'seguro':
        return (
          <div className="space-y-4" data-step-content>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="obraSocial">Obra Social/Seguro *</Label>
                <Select
                  value={form.seguro.obraSocial}
                  onValueChange={(value) => setForm(f => ({ ...f, seguro: { ...f.seguro, obraSocial: value as ObraSocial } }))}
                >
                  <SelectTrigger id="obraSocial" className={cn(!form.seguro.obraSocial ? 'text-muted-foreground italic' : '', errors.obraSocial ? 'border-destructive' : '')}>
                    <SelectValue placeholder="Seleccione Obra Social/Seguro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="osde">OSDE</SelectItem>
                    <SelectItem value="luis_pasteur">Luis Pasteur</SelectItem>
                    <SelectItem value="particular">Particular</SelectItem>
                  </SelectContent>
                </Select>
                {errors.obraSocial && <p className="text-sm text-destructive mt-1">{errors.obraSocial}</p>}
              </div>

              <div className="col-span-2">
                <Label htmlFor="numeroAfiliado">
                  Número de afiliado {form.seguro.obraSocial !== 'particular' && '*'}
                </Label>
                <Input
                  id="numeroAfiliado"
                  value={form.seguro.numeroAfiliado || ''}
                  onChange={(e) => setForm(f => ({ ...f, seguro: { ...f.seguro, numeroAfiliado: e.target.value } }))}
                  placeholder="Número de afiliado"
                  className={errors.numeroAfiliado ? 'border-destructive' : ''}
                />
                {errors.numeroAfiliado && <p className="text-sm text-destructive mt-1">{errors.numeroAfiliado}</p>}
              </div>

              <div>
                <Label htmlFor="sesionesAutorizadas">Sesiones Autorizadas</Label>
                <Input
                  id="sesionesAutorizadas"
                  type="number"
                  value={form.seguro.sesionesAutorizadas || ''}
                  onChange={(e) => setForm(f => ({ ...f, seguro: { ...f.seguro, sesionesAutorizadas: e.target.value ? parseInt(e.target.value) : undefined } }))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="copago">Copago</Label>
                <Input
                  id="copago"
                  type="number"
                  value={form.seguro.copago || ''}
                  onChange={(e) => setForm(f => ({ ...f, seguro: { ...f.seguro, copago: e.target.value ? parseFloat(e.target.value) : undefined } }))}
                  placeholder="0"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-3 block">Autorizaciones de contacto</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    checked={form.seguro.contactAuth.whatsapp}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, seguro: { ...f.seguro, contactAuth: { ...f.seguro.contactAuth, whatsapp: !!checked } } }))
                    }
                  />
                  <label htmlFor="whatsapp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    WhatsApp
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailAuth"
                    checked={form.seguro.contactAuth.email}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, seguro: { ...f.seguro, contactAuth: { ...f.seguro.contactAuth, email: !!checked } } }))
                    }
                  />
                  <label htmlFor="emailAuth" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    E-mail
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="reminderPref">Recordatorio</Label>
              <Select
                value={form.seguro.reminderPref}
                onValueChange={(value) => setForm(f => ({ ...f, seguro: { ...f.seguro, reminderPref: value as ReminderPref } }))}
              >
                <SelectTrigger id="reminderPref">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas antes</SelectItem>
                  <SelectItem value="none">Sin recordatorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
        </DialogHeader>

        {/* Icon Navigation */}
        <TooltipProvider>
          <nav role="tablist" aria-label="Secciones del paciente" className="flex gap-2 overflow-x-auto pb-4 border-b mb-6">
            {sectionConfig.map(({ key, label, Icon }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    role="tab"
                    aria-selected={section === key}
                    aria-label={label}
                    onClick={() => setSection(key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSection(key);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors min-h-[44px]",
                      section === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </TooltipProvider>

        {/* Section Content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={sections.indexOf(section) === 0}
            className="min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button 
              onClick={goNext} 
              disabled={sections.indexOf(section) === sections.length - 1}
              className="min-h-[44px]"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>

            {section !== 'seguro' && (
              <Button
                onClick={handleGlobalSave}
                className="min-h-[44px]"
                variant="default"
              >
                Guardar Cambios
              </Button>
            )}

            {section === 'seguro' && (
              <Button onClick={handleSubmit} className="min-h-[44px]">
                Guardar cambios
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
