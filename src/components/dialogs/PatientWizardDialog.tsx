import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronLeft, ChevronRight, User, Phone, Heart, Stethoscope, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { Patient } from '@/contexts/AppContext';
import { DateOfBirthInput } from '@/components/patients/DateOfBirthInput';
import { toISODate, fromISODate } from '@/utils/dateUtils';

export type ObraSocial = 'osde' | 'luis_pasteur' | 'particular';
export type ReminderPref = '24h' | 'none';

const patientSchema = z.object({
  // Identificación/Contacto
  fullName: z.string().min(1, "El nombre completo es requerido"),
  preferredName: z.string().optional(),
  documentId: z.string().optional(),
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  pronouns: z.string().optional(),
  phone: z.string().min(1, "El teléfono móvil es requerido"),
  alternatePhone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  language: z.string().optional(),
  preferredContact: z.string().optional(),
  contactWindow: z.string().optional(),
  
  // Emergencia
  emergencyName: z.string().min(1, "El nombre de contacto de emergencia es requerido"),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().min(1, "El teléfono de emergencia es requerido"),
  
  // Clínico
  chiefComplaint: z.string().optional(),
  referringProvider: z.string().optional(),
  diagnosis: z.string().optional(),
  onsetDate: z.date().optional(),
  laterality: z.string().optional(),
  painLevel: z.number().min(0).max(10).optional(),
  redFlags: z.array(z.string()).optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  comorbidities: z.string().optional(),
  contraindications: z.string().optional(),
  goals: z.string().optional(),
  treatmentPlan: z.string().optional(),
  
  // Seguro/Consentimientos
  obraSocial: z.enum(['osde', 'luis_pasteur', 'particular']).optional(),
  numeroAfiliado: z.string().optional(),
  plan: z.string().optional(),
  authorizedSessions: z.number().optional(),
  usedSessions: z.number().optional(),
  copay: z.number().optional(),
  coverageExpiry: z.date().optional(),
  billingName: z.string().optional(),
  billingTaxId: z.string().optional(),
  billingAddress: z.string().optional(),
  whatsappAuthorization: z.boolean().optional(),
  emailAuthorization: z.boolean().optional(),
  reminderPreference: z.enum(['24h', 'none']).optional(),
  privacyNotes: z.string().optional(),
}).refine(
  (data) => {
    if (data.obraSocial && data.obraSocial !== 'particular') {
      return !!data.numeroAfiliado && data.numeroAfiliado.trim().length > 0;
    }
    return true;
  },
  {
    message: "Requerido para OSDE o Luis Pasteur",
    path: ["numeroAfiliado"],
  }
);

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
}

const steps = [
  { id: 1, title: 'Identificación', icon: User },
  { id: 2, title: 'Emergencia', icon: Phone },
  { id: 3, title: 'Clínico', icon: Stethoscope },
  { id: 4, title: 'Seguro', icon: CreditCard },
];

const redFlagOptions = [
  'Pérdida de peso no explicada', 'Fiebre', 'Antecedente de cáncer',
  'Dolor nocturno intenso', 'Pérdida de control de esfínteres',
  'Debilidad progresiva', 'Entumecimiento en silla de montar',
  'Cáncer', 'Marcapaso', 'Embarazo'
];

const obraSocialLabels: Record<ObraSocial, string> = {
  osde: 'OSDE',
  luis_pasteur: 'Luis Pasteur',
  particular: 'Particular',
};

export const PatientWizardDialog = ({ open, onOpenChange, patient }: PatientWizardDialogProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState([0]);
  const { dispatch } = useApp();
  const { toast } = useToast();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? {
      // Identificación/Contacto
      fullName: patient.name || "",
      preferredName: "",
      documentId: "",
      birthDate: patient.birthDate || "",
      pronouns: "",
      phone: patient.phone || "",
      alternatePhone: "",
      email: patient.email || "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      language: "",
      preferredContact: "",
      contactWindow: "",
      // Emergencia
      emergencyName: "",
      emergencyRelation: "",
      emergencyPhone: "",
      // Clínico
      chiefComplaint: "",
      referringProvider: "",
      diagnosis: "",
      onsetDate: undefined,
      laterality: "",
      painLevel: 0,
      redFlags: [],
      allergies: "",
      medications: "",
      comorbidities: "",
      contraindications: "",
      goals: "",
      treatmentPlan: "",
      // Seguro/Consentimientos
      obraSocial: 'particular',
      numeroAfiliado: "",
      plan: "",
      authorizedSessions: 0,
      usedSessions: 0,
      copay: 0,
      coverageExpiry: undefined,
      billingName: "",
      billingTaxId: "",
      billingAddress: "",
      whatsappAuthorization: false,
      emailAuthorization: false,
      reminderPreference: 'none',
      privacyNotes: "",
    } : {
      // Identificación/Contacto
      fullName: "",
      preferredName: "",
      documentId: "",
      birthDate: "",
      pronouns: "",
      phone: "",
      alternatePhone: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      language: "",
      preferredContact: "",
      contactWindow: "",
      // Emergencia
      emergencyName: "",
      emergencyRelation: "",
      emergencyPhone: "",
      // Clínico
      chiefComplaint: "",
      referringProvider: "",
      diagnosis: "",
      onsetDate: undefined,
      laterality: "",
      painLevel: 0,
      redFlags: [],
      allergies: "",
      medications: "",
      comorbidities: "",
      contraindications: "",
      goals: "",
      treatmentPlan: "",
      // Seguro/Consentimientos
      obraSocial: 'particular',
      numeroAfiliado: "",
      plan: "",
      authorizedSessions: 0,
      usedSessions: 0,
      copay: 0,
      coverageExpiry: undefined,
      billingName: "",
      billingTaxId: "",
      billingAddress: "",
      whatsappAuthorization: false,
      emailAuthorization: false,
      reminderPreference: 'none',
      privacyNotes: "",
    }
  });

  const nextStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      // Focus first input of next step
      setTimeout(() => {
        const firstInput = document.querySelector('[data-step-content] input, [data-step-content] textarea, [data-step-content] button') as HTMLElement;
        firstInput?.focus();
      }, 100);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onSubmit = (data: PatientFormData) => {
    const newPatient: Patient = {
      id: patient?.id || Date.now().toString(),
      name: data.fullName,
      email: data.email || '',
      phone: data.phone,
      birthDate: data.birthDate,
      conditions: selectedRedFlags,
    };

    if (patient) {
      dispatch({ type: 'UPDATE_PATIENT', payload: { id: patient.id, updates: newPatient } });
      toast({
        title: "Paciente actualizado",
        description: "Los datos del paciente se han actualizado correctamente.",
      });
    } else {
      dispatch({ type: 'ADD_PATIENT', payload: newPatient });
      toast({
        title: "Paciente creado",
        description: "El nuevo paciente se ha registrado correctamente.",
      });
    }

    onOpenChange(false);
    setCurrentStep(1);
    form.reset();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre y apellido completo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Preferido</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Como prefiere que lo llamen" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento/ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DNI, Pasaporte, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field, fieldState }) => (
                  <FormItem className="col-span-2">
                    <DateOfBirthInput
                      valueISO={field.value}
                      onChangeISO={field.onChange}
                      required
                      error={fieldState.error?.message}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Móvil *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+54 11 1234-5678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@ejemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Contacto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre del contacto de emergencia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyRelation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relación</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Familiar, amigo, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Teléfono de Emergencia *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+54 11 1234-5678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chiefComplaint"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Motivo Principal</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripción del problema principal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Diagnóstico médico" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="laterality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lateralidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="derecha">Derecha</SelectItem>
                        <SelectItem value="izquierda">Izquierda</SelectItem>
                        <SelectItem value="bilateral">Bilateral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Nivel de Dolor (0-10)</Label>
              <div className="px-4 py-6">
                <Slider
                  value={painLevel}
                  onValueChange={setPainLevel}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>0 (Sin dolor)</span>
                  <span className="font-medium">{painLevel[0]}</span>
                  <span>10 (Dolor máximo)</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Banderas Rojas</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {redFlagOptions.map((flag) => (
                  <div key={flag} className="flex items-center space-x-2">
                    <Checkbox
                      id={flag}
                      checked={selectedRedFlags.includes(flag)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRedFlags([...selectedRedFlags, flag]);
                        } else {
                          setSelectedRedFlags(selectedRedFlags.filter(f => f !== flag));
                        }
                      }}
                    />
                    <Label htmlFor={flag} className="text-sm">{flag}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="obraSocial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Obra Social</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar obra social" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="osde">OSDE</SelectItem>
                        <SelectItem value="luis_pasteur">Luis Pasteur</SelectItem>
                        <SelectItem value="particular">Particular</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numeroAfiliado"
                render={({ field }) => {
                  const obraSocial = form.watch('obraSocial');
                  const isRequired = obraSocial && obraSocial !== 'particular';
                  return (
                    <FormItem>
                      <FormLabel>
                        Número de afiliado {isRequired && <span className="text-destructive">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número de afiliado" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="authorizedSessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sesiones Autorizadas</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="copay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copago</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">

              <div className="space-y-3">
                <Label className="text-sm font-medium">Autorizaciones de Contacto</Label>
                
                <FormField
                  control={form.control}
                  name="whatsappAuthorization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">WhatsApp</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailAuthorization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Email</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reminderPreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recordatorios</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar preferencia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="24h">24 horas antes</SelectItem>
                        <SelectItem value="none">Sin recordatorio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                currentStep >= step.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted text-muted-foreground"
              )}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={cn(
                  "text-sm font-medium",
                  currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-4",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div data-step-content>
              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="min-h-[44px]"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" className="min-h-[44px]">
                    {patient ? 'Actualizar' : 'Crear'} Paciente
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};