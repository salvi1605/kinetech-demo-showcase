import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, User, Phone, Stethoscope, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { isPastDate, fromISODate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

type Lateralidad = 'Derecha' | 'Izquierda' | 'Bilateral' | '';
type ObraSocial = 'osde' | 'luis_pasteur' | 'particular' | '';
type ReminderPref = '24h' | 'none';

type PatientForm = {
  identificacion: {
    fullName: string;
    preferredName: string;
    documentId: string;
    dateOfBirth: string;
    mobilePhone: string;
    email: string;
  };
  emergencia: {
    contactName: string;
    relationship: string;
    emergencyPhone: string;
  };
  clinico: {
    mainReason: string;
    diagnosis: string;
    laterality: Lateralidad;
    painLevel: number;
    redFlags: { embarazo: boolean; cancer: boolean; marcapasos: boolean; };
    restricciones: { noMagnetoterapia: boolean; noElectroterapia: boolean; };
  };
  seguro: {
    obraSocial: ObraSocial;
    numeroAfiliado?: string;
    sesionesAutorizadas?: number;
    copago?: number;
    contactAuth: { whatsapp: boolean; email: boolean; };
    reminderPref: ReminderPref;
  };
};

interface EditPatientDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

const steps = [
  { id: 1, title: 'Identificación', icon: User },
  { id: 2, title: 'Emergencia', icon: Phone },
  { id: 3, title: 'Clínico', icon: Stethoscope },
  { id: 4, title: 'Seguro', icon: CreditCard },
];

export const EditPatientDialogV2 = ({ open, onOpenChange, patient }: EditPatientDialogV2Props) => {
  const [currentStep, setCurrentStep] = useState(1);
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
      setForm({
        identificacion: {
          fullName: patient.name || '',
          preferredName: '',
          documentId: '',
          dateOfBirth: patient.birthDate || '',
          mobilePhone: patient.phone || '',
          email: patient.email || '',
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
          redFlags: {
            embarazo: patient.conditions?.includes('Embarazo') || false,
            cancer: patient.conditions?.includes('Cáncer') || false,
            marcapasos: patient.conditions?.includes('Marcapasos') || false,
          },
          restricciones: {
            noMagnetoterapia: patient.conditions?.includes('No Magnetoterapia') || false,
            noElectroterapia: patient.conditions?.includes('No Electroterapia') || false,
          },
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
      setErrors({});
      setCurrentStep(1);
    }
  }, [open, patient]);

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
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

    if (step === 2) {
      if (!form.emergencia.contactName.trim()) {
        newErrors.contactName = 'El nombre de contacto es requerido';
      }
      if (!form.emergencia.emergencyPhone.trim()) {
        newErrors.emergencyPhone = 'El teléfono de emergencia es requerido';
      }
    }

    if (step === 4) {
      if (!form.seguro.obraSocial) {
        newErrors.obraSocial = 'Campo obligatorio';
      }
      if (form.seguro.obraSocial !== 'particular' && form.seguro.obraSocial !== '') {
        if (!form.seguro.numeroAfiliado?.trim()) {
          newErrors.numeroAfiliado = 'Requerido para OSDE o Luis Pasteur';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        setTimeout(() => {
          const firstInput = document.querySelector('[data-step-content] input, [data-step-content] textarea, [data-step-content] button') as HTMLElement;
          firstInput?.focus();
        }, 100);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!patient) return;

    // Validate all steps
    let allValid = true;
    for (let i = 1; i <= 4; i++) {
      if (!validateStep(i)) {
        allValid = false;
        setCurrentStep(i);
        break;
      }
    }

    if (!allValid) return;

    const updatedPatient = {
      id: patient.id,
      name: form.identificacion.fullName,
      email: form.identificacion.email || '',
      phone: form.identificacion.mobilePhone,
      birthDate: form.identificacion.dateOfBirth,
      conditions: [
        ...(form.clinico.redFlags.embarazo ? ['Embarazo'] : []),
        ...(form.clinico.redFlags.cancer ? ['Cáncer'] : []),
        ...(form.clinico.redFlags.marcapasos ? ['Marcapasos'] : []),
        ...(form.clinico.restricciones.noMagnetoterapia ? ['No Magnetoterapia'] : []),
        ...(form.clinico.restricciones.noElectroterapia ? ['No Electroterapia'] : []),
      ],
    };

    dispatch({ type: 'UPDATE_PATIENT', payload: { id: patient.id, updates: updatedPatient } });
    toast({
      title: "Paciente actualizado",
      description: "Los datos del paciente se han actualizado correctamente.",
    });

    // Close dialog
    onOpenChange(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
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

      case 2:
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

      case 3:
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

      case 4:
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

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-muted'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-2 text-center hidden lg:block">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-[2px] flex-1 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentStep < 4 ? (
            <Button onClick={nextStep} className="min-h-[44px]">
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="min-h-[44px]">
              Guardar cambios
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
