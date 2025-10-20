import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';
import type { Practitioner } from '@/contexts/AppContext';
import { PractitionerColorPickerModal } from '@/components/practitioners/PractitionerColorPickerModal';
import { PROFESSIONAL_COLORS } from '@/constants/paletteProfessional';
import { AvailabilityEditor, type AvailabilityDay, type DayKey } from '@/components/practitioners/AvailabilityEditor';

const professionalSchema = z.object({
  prefix: z.enum(['Dr.', 'Lic.', 'none']),
  firstName: z.string().min(1, 'El nombre es requerido').max(100),
  lastName: z.string().min(1, 'El apellido es requerido').max(100),
  displayName: z.string().max(100).optional(),
  mobile: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  specialty: z.string().min(1, 'La especialidad es requerida'),
  licenseId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido').optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type ProfessionalFormData = z.infer<typeof professionalSchema>;

interface EditProfessionalDialogProps {
  professional: Practitioner;
  onClose: () => void;
}

// Convertir schedule existente a AvailabilityDay[]
const scheduleToAvailability = (schedule: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[]): AvailabilityDay[] => {
  const numberToDayKey: Record<number, DayKey> = {
    0: 'dom',
    1: 'lun',
    2: 'mar',
    3: 'mié',
    4: 'jue',
    5: 'vie',
    6: 'sáb',
  };

  const allDays: DayKey[] = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const daySlots: Record<DayKey, { from: string; to: string }[]> = {
    lun: [],
    mar: [],
    mié: [],
    jue: [],
    vie: [],
    sáb: [],
    dom: [],
  };

  schedule.forEach(s => {
    const dayKey = numberToDayKey[s.dayOfWeek];
    if (dayKey && s.isAvailable) {
      daySlots[dayKey].push({ from: s.startTime, to: s.endTime });
    }
  });

  return allDays.map(day => ({
    day,
    active: daySlots[day].length > 0,
    slots: daySlots[day],
  }));
};

export const EditProfessionalDialog = ({ professional, onClose }: EditProfessionalDialogProps) => {
  const { dispatch, state } = useApp();
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Obtener colores ya usados (excluyendo el del profesional actual)
  const usedColors = state.practitioners
    .filter(p => p.id !== professional.id)
    .map(p => p.color)
    .filter(Boolean) as string[];

  // Parse existing data
  const nameParts = professional.name.split(' ');
  const prefixMatch = nameParts[0] === 'Dr.' || nameParts[0] === 'Lic.' ? nameParts[0] : 'none';
  const firstName = prefixMatch !== 'none' ? nameParts.slice(1, -1).join(' ') : nameParts.slice(0, -1).join(' ');
  const lastName = nameParts[nameParts.length - 1];

  const [availability, setAvailability] = useState<AvailabilityDay[]>(
    scheduleToAvailability(professional.schedule)
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      prefix: prefixMatch as any,
      firstName,
      lastName,
      displayName: '',
      mobile: professional.phone,
      email: professional.email,
      specialty: professional.specialty,
      licenseId: '',
      color: professional.color,
      status: 'active',
      notes: '',
    },
  });

  const prefix = watch('prefix');
  const status = watch('status');
  const currentColor = watch('color');

  const onSubmit = (data: ProfessionalFormData) => {
    // Validar disponibilidad
    const activeDays = availability.filter(d => d.active);
    for (const day of activeDays) {
      for (const slot of day.slots) {
        if (slot.from >= slot.to) {
          toast({
            title: 'Error de validación',
            description: "Revisa los horarios: 'Hasta' debe ser mayor que 'Desde'",
            variant: 'destructive',
          });
          return;
        }
      }
      // Verificar solapamientos
      for (let i = 0; i < day.slots.length; i++) {
        for (let j = i + 1; j < day.slots.length; j++) {
          const a = day.slots[i];
          const b = day.slots[j];
          if ((a.from < b.to && a.to > b.from) || (b.from < a.to && b.to > a.from)) {
            toast({
              title: 'Error de validación',
              description: 'Los horarios no deben superponerse',
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    // Convertir availability al formato schedule existente
    const dayKeyToNumber: Record<DayKey, number> = {
      lun: 1,
      mar: 2,
      mié: 3,
      jue: 4,
      vie: 5,
      sáb: 6,
      dom: 0,
    };

    const schedule = activeDays.flatMap(day =>
      day.slots.map(slot => ({
        dayOfWeek: dayKeyToNumber[day.day],
        startTime: slot.from,
        endTime: slot.to,
        isAvailable: true,
      }))
    );

    const updatedPractitioner = {
      ...professional,
      name: `${data.prefix !== 'none' ? data.prefix + ' ' : ''}${data.firstName} ${data.lastName}`.trim(),
      specialty: data.specialty,
      email: data.email || '',
      phone: data.mobile || '',
      schedule,
      color: data.color || '#3b82f6',
    };

    dispatch({ type: 'UPDATE_PRACTITIONER', payload: updatedPractitioner });

    toast({
      title: 'Profesional actualizado',
      description: `${updatedPractitioner.name} ha sido actualizado exitosamente`,
    });

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Profesional</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="identificacion">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="identificacion">Identificación</TabsTrigger>
              <TabsTrigger value="profesional">Profesional</TabsTrigger>
              <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
              <TabsTrigger value="visibilidad">Visibilidad</TabsTrigger>
            </TabsList>

            {/* Identificación */}
            <TabsContent value="identificacion" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefijo</Label>
                  <Select value={prefix} onValueChange={(val) => setValue('prefix', val as any)}>
                    <SelectTrigger id="prefix">
                      <SelectValue placeholder="Prefijo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin prefijo</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Lic.">Lic.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Nombre para mostrar (opcional)</Label>
                  <Input id="displayName" {...register('displayName')} placeholder="Ej: Dra. Ana" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Teléfono Móvil</Label>
                  <Input id="mobile" type="tel" {...register('mobile')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Profesional */}
            <TabsContent value="profesional" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad *</Label>
                <Input id="specialty" {...register('specialty')} placeholder="Ej: Kinesiología Deportiva" />
                {errors.specialty && (
                  <p className="text-sm text-destructive">{errors.specialty.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseId">Matrícula / Colegiatura (opcional)</Label>
                <Input id="licenseId" {...register('licenseId')} />
              </div>

              <div className="space-y-2">
                <Label>Color para agenda</Label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-5 h-5 rounded-full border" 
                    style={{ backgroundColor: currentColor }} 
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowColorPicker(true)}
                  >
                    Elegir color
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Disponibilidad */}
            <TabsContent value="disponibilidad" className="space-y-4">
              <AvailabilityEditor value={availability} onChange={setAvailability} />
            </TabsContent>

            {/* Visibilidad */}
            <TabsContent value="visibilidad" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={status} onValueChange={(val) => setValue('status', val as any)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Nota interna</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Notas internas sobre el profesional..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>

        <PractitionerColorPickerModal
          open={showColorPicker}
          initialColor={currentColor}
          usedColors={usedColors}
          onClose={() => setShowColorPicker(false)}
          onConfirm={(hex) => {
            setValue('color', hex);
            setShowColorPicker(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
