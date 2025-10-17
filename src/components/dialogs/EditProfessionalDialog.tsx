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
  slotMinutes: z.number().min(15).max(120),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type ProfessionalFormData = z.infer<typeof professionalSchema>;

interface EditProfessionalDialogProps {
  professional: Practitioner;
  onClose: () => void;
}

const WEEKDAYS = [
  { value: 'lun', label: 'Lunes' },
  { value: 'mar', label: 'Martes' },
  { value: 'mié', label: 'Miércoles' },
  { value: 'jue', label: 'Jueves' },
  { value: 'vie', label: 'Viernes' },
  { value: 'sáb', label: 'Sábado' },
];

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

  const dayMap: Record<number, string> = { 1: 'lun', 2: 'mar', 3: 'mié', 4: 'jue', 5: 'vie', 6: 'sáb' };
  const initialDays = professional.schedule.map(s => dayMap[s.dayOfWeek]).filter(Boolean);
  const initialTime = professional.schedule[0] || { startTime: '08:00', endTime: '18:00' };

  const [selectedDays, setSelectedDays] = useState<string[]>(initialDays);
  const [workFrom, setWorkFrom] = useState(initialTime.startTime);
  const [workTo, setWorkTo] = useState(initialTime.endTime);

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
      slotMinutes: 30,
      status: 'active',
      notes: '',
    },
  });

  const prefix = watch('prefix');
  const status = watch('status');
  const currentColor = watch('color');

  const onSubmit = (data: ProfessionalFormData) => {
    // Validar horario
    if (workFrom >= workTo) {
      toast({
        title: 'Error',
        description: 'El horario de inicio debe ser menor al de fin',
        variant: 'destructive',
      });
      return;
    }

    const updatedPractitioner = {
      ...professional,
      name: `${data.prefix !== 'none' ? data.prefix + ' ' : ''}${data.firstName} ${data.lastName}`.trim(),
      specialty: data.specialty,
      email: data.email || '',
      phone: data.mobile || '',
      schedule: selectedDays.map(day => {
        const reverseDayMap: Record<string, number> = { lun: 1, mar: 2, mié: 3, jue: 4, vie: 5, sáb: 6 };
        return {
          dayOfWeek: reverseDayMap[day],
          startTime: workFrom,
          endTime: workTo,
          isAvailable: true,
        };
      }),
      color: data.color || '#3b82f6',
    };

    dispatch({ type: 'UPDATE_PRACTITIONER', payload: updatedPractitioner });

    toast({
      title: 'Profesional actualizado',
      description: `${updatedPractitioner.name} ha sido actualizado exitosamente`,
    });

    onClose();
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
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
              <div className="space-y-2">
                <Label>Días laborables</Label>
                <div className="grid grid-cols-2 gap-3">
                  {WEEKDAYS.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={value}
                        checked={selectedDays.includes(value)}
                        onCheckedChange={() => toggleDay(value)}
                      />
                      <Label htmlFor={value} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workFrom">Horario desde</Label>
                  <Input
                    id="workFrom"
                    type="time"
                    value={workFrom}
                    onChange={(e) => setWorkFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workTo">Horario hasta</Label>
                  <Input
                    id="workTo"
                    type="time"
                    value={workTo}
                    onChange={(e) => setWorkTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slotMinutes">Duración de slot (minutos)</Label>
                <Input
                  id="slotMinutes"
                  type="number"
                  {...register('slotMinutes', { valueAsNumber: true })}
                  min={15}
                  max={120}
                  step={15}
                />
                {errors.slotMinutes && (
                  <p className="text-sm text-destructive">{errors.slotMinutes.message}</p>
                )}
              </div>
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
