import { useState } from 'react';
import { ChevronLeft, ChevronRight, User, Phone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { DateOfBirthTripleInput } from '@/components/patients/DateOfBirthTripleInput';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
type ObraSocial = '' | 'osde' | 'luis_pasteur' | 'particular';
type ReminderPref = '24h' | 'none';

interface PatientFormData {
  identificacion: {
    firstSurname: string;
    secondSurname: string;
    firstName: string;
    secondName: string;
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
  seguro: {
    obraSocial: ObraSocial;
    numeroAfiliado: string;
    sesionesAutorizadas?: number;
    copago?: number;
    contactAuth: { whatsapp: boolean; email: boolean };
    reminderPref: ReminderPref;
  };
}

interface NewPatientDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const steps = [
  { id: 1, title: 'Identificación', icon: User },
  { id: 2, title: 'Emergencia', icon: Phone },
  { id: 3, title: 'Seguro', icon: CreditCard },
];

const obraSocialLabels: Record<Exclude<ObraSocial, ''>, string> = {
  osde: 'OSDE',
  luis_pasteur: 'Luis Pasteur',
  particular: 'Particular',
};

export const NewPatientDialogV2 = ({ open, onOpenChange, onSuccess }: NewPatientDialogV2Props) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const [form, setForm] = useState<PatientFormData>({
    identificacion: {
      firstSurname: '',
      secondSurname: '',
      firstName: '',
      secondName: '',
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

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
      if (!form.identificacion.firstSurname.trim()) {
        newErrors.firstSurname = 'El primer apellido es requerido';
      }
      if (!form.identificacion.firstName.trim()) {
        newErrors.firstName = 'El primer nombre es requerido';
      }
      if (!form.identificacion.documentId.trim()) {
        newErrors.documentId = 'El DNI/Pasaporte es requerido';
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
      // Los campos de emergencia ahora son opcionales
    }

    if (step === 3) {
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
      if (currentStep < 3) {
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

  const handleSubmit = async () => {
    // Validate all steps
    let allValid = true;
    for (let i = 1; i <= 3; i++) {
      if (!validateStep(i)) {
        allValid = false;
        setCurrentStep(i);
        break;
      }
    }

    if (!allValid) return;

    if (!state.currentClinicId) {
      toast({
        title: "Error",
        description: "No hay clínica seleccionada",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Convertir fecha DD-MM-YYYY a YYYY-MM-DD para PostgreSQL
      const dobForDb = form.identificacion.dateOfBirth 
        ? (() => {
            const [d, m, y] = form.identificacion.dateOfBirth.split('-');
            return `${y}-${m}-${d}`;
          })()
        : null;
      
      // Construir full_name desde campos estructurados
      const fullName = [
        form.identificacion.firstSurname.trim(),
        form.identificacion.secondSurname.trim(),
        form.identificacion.firstName.trim(),
        form.identificacion.secondName.trim(),
      ].filter(Boolean).join(' ');

      const { data, error } = await supabase
        .from('patients')
        .insert({
          clinic_id: state.currentClinicId,
          full_name: fullName,
          first_surname: form.identificacion.firstSurname.trim() || null,
          second_surname: form.identificacion.secondSurname.trim() || null,
          first_name: form.identificacion.firstName.trim() || null,
          second_name: form.identificacion.secondName.trim() || null,
          preferred_name: form.identificacion.preferredName.trim() || null,
          document_id: form.identificacion.documentId.trim() || null,
          email: form.identificacion.email.trim() || null,
          phone: form.identificacion.mobilePhone.trim() || null,
          date_of_birth: dobForDb,
          emergency_contact_name: form.emergencia.contactName.trim() || null,
          emergency_contact_phone: form.emergencia.emergencyPhone.trim() || null,
          emergency_contact_relationship: form.emergencia.relationship.trim() || null,
          // Campos de seguro
          obra_social: form.seguro.obraSocial || null,
          numero_afiliado: form.seguro.numeroAfiliado?.trim() || null,
          sesiones_autorizadas: form.seguro.sesionesAutorizadas || 0,
          copago: form.seguro.copago || 0,
          contact_auth_whatsapp: form.seguro.contactAuth.whatsapp,
          contact_auth_email: form.seguro.contactAuth.email,
          reminder_preference: form.seguro.reminderPref || 'none',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Paciente creado",
        description: "El nuevo paciente se ha registrado correctamente.",
      });

      // Notify parent to refresh list
      onSuccess?.();

      // Reset and close
      onOpenChange(false);
      setCurrentStep(1);
      setForm({
        identificacion: {
          firstSurname: '',
          secondSurname: '',
          firstName: '',
          secondName: '',
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
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error al crear paciente",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4" data-step-content>
          <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstSurname">Primer Apellido *</Label>
                <Input
                  id="firstSurname"
                  value={form.identificacion.firstSurname}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, firstSurname: e.target.value } }))}
                  placeholder="Ej: Alvarez"
                  className={errors.firstSurname ? 'border-destructive' : ''}
                />
                {errors.firstSurname && <p className="text-sm text-destructive mt-1">{errors.firstSurname}</p>}
              </div>

              <div>
                <Label htmlFor="secondSurname">Segundo Apellido</Label>
                <Input
                  id="secondSurname"
                  value={form.identificacion.secondSurname}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, secondSurname: e.target.value } }))}
                  placeholder="Ej: Arroyo (opcional)"
                />
              </div>

              <div>
                <Label htmlFor="firstName">Primer Nombre *</Label>
                <Input
                  id="firstName"
                  value={form.identificacion.firstName}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, firstName: e.target.value } }))}
                  placeholder="Ej: Leilany"
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <Label htmlFor="secondName">Segundo Nombre</Label>
                <Input
                  id="secondName"
                  value={form.identificacion.secondName}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, secondName: e.target.value } }))}
                  placeholder="Ej: Carolina (opcional)"
                />
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
                <Label htmlFor="documentId">DNI/Pasaporte *</Label>
                <Input
                  id="documentId"
                  value={form.identificacion.documentId}
                  onChange={(e) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, documentId: e.target.value } }))}
                  placeholder="DNI, Pasaporte, etc."
                  className={errors.documentId ? 'border-destructive' : ''}
                />
                {errors.documentId && <p className="text-sm text-destructive mt-1">{errors.documentId}</p>}
              </div>

              <div className="col-span-2">
                <DateOfBirthTripleInput
                  valueDOB={form.identificacion.dateOfBirth}
                  onChangeDOB={(value) => setForm(f => ({ ...f, identificacion: { ...f.identificacion, dateOfBirth: value } }))}
                  required
                  showErrors={!!errors.dateOfBirth}
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
                <Label htmlFor="contactName">Nombre de Contacto</Label>
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
                <Label htmlFor="emergencyPhone">Teléfono de emergencia</Label>
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
          <DialogTitle>Nuevo Paciente</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8 px-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              {/* Contenedor del paso */}
              <div className="flex flex-col items-center min-w-[100px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-muted'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-2 text-center">{step.title}</span>
              </div>
              
              {/* Línea conectora entre pasos */}
              {index < steps.length - 1 && (
                <div
                  className={`h-[2px] w-16 mx-2 ${
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

          {currentStep < 3 ? (
            <Button onClick={nextStep} className="min-h-[44px]">
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSaving} className="min-h-[44px]">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
