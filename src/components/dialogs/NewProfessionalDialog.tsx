import { useState } from 'react';
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
import { PractitionerColorPickerModal } from '@/components/practitioners/PractitionerColorPickerModal';
import { PROFESSIONAL_COLORS } from '@/constants/paletteProfessional';
import { AvailabilityEditor, type AvailabilityDay, type DayKey } from '@/components/practitioners/AvailabilityEditor';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useAvailableUsersForPractitioner } from '@/hooks/useAvailableUsersForPractitioner';

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

interface NewProfessionalDialogProps {
  onClose: () => void;
}

// Inicializar días con todos inactivos
const initialDays: AvailabilityDay[] = [
  { day: 'lun', active: false, slots: [] },
  { day: 'mar', active: false, slots: [] },
  { day: 'mié', active: false, slots: [] },
  { day: 'jue', active: false, slots: [] },
  { day: 'vie', active: false, slots: [] },
  { day: 'sáb', active: false, slots: [] },
  { day: 'dom', active: false, slots: [] },
];

export const NewProfessionalDialog = ({ onClose }: NewProfessionalDialogProps) => {
  const { dispatch, state } = useApp();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityDay[]>(initialDays);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Obtener usuarios disponibles para vincular
  const { users: availableUsers, loading: loadingUsers } = useAvailableUsersForPractitioner(
    state.currentClinicId
  );

  // Obtener colores ya usados
  const usedColors = state.practitioners.map(p => p.color).filter(Boolean) as string[];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      prefix: 'none',
      firstName: '',
      lastName: '',
      displayName: '',
      mobile: '',
      email: '',
      specialty: '',
      licenseId: '',
      color: PROFESSIONAL_COLORS[0],
      status: 'active',
      notes: '',
    },
  });

  const prefix = watch('prefix');
  const status = watch('status');
  const currentColor = watch('color');

  const onSubmit = async (data: ProfessionalFormData) => {
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

    if (!state.currentClinicId) {
      toast({
        title: 'Error',
        description: 'No hay clínica seleccionada',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convertir availability al formato de BD
      const dayKeyToNumber: Record<DayKey, number> = {
        lun: 1,
        mar: 2,
        mié: 3,
        jue: 4,
        vie: 5,
        sáb: 6,
        dom: 0,
      };

      const displayName = data.displayName || 
        `${data.prefix !== 'none' ? data.prefix + ' ' : ''}${data.firstName} ${data.lastName}`.trim();

      // Insertar en practitioners
      const { data: newPractitioner, error: practitionerError } = await supabase
        .from('practitioners')
        .insert({
          clinic_id: state.currentClinicId,
          display_name: displayName,
          prefix: data.prefix !== 'none' ? data.prefix : null,
          specialties: [data.specialty],
          color: data.color || '#3b82f6',
          is_active: data.status === 'active',
          notes: data.notes || null,
          user_id: selectedUserId || null,
        })
        .select()
        .single();

      if (practitionerError) {
        throw practitionerError;
      }

      // Insertar disponibilidad si hay días activos
      if (activeDays.length > 0 && newPractitioner) {
        const availabilityRows = activeDays.flatMap(day =>
          day.slots.map(slot => ({
            clinic_id: state.currentClinicId!,
            practitioner_id: newPractitioner.id,
            weekday: dayKeyToNumber[day.day],
            from_time: slot.from,
            to_time: slot.to,
            slot_minutes: 30,
            capacity: 1,
          }))
        );

        if (availabilityRows.length > 0) {
          const { error: availError } = await supabase
            .from('practitioner_availability')
            .insert(availabilityRows);

          if (availError) {
            console.error('Error inserting availability:', availError);
            // No es crítico, continuamos
          }
        }
      }

      // Disparar evento para refrescar listas
      window.dispatchEvent(new Event('practitionerUpdated'));

      toast({
        title: 'Profesional creado',
        description: `${displayName} ha sido agregado exitosamente`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error creating practitioner:', error);
      toast({
        title: 'Error al crear profesional',
        description: error.message || 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Profesional</DialogTitle>
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

              {/* Usuario asociado (login) */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="linkedUser">Usuario asociado (login)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Opcional. Vincula este profesional a un usuario con rol "Profesional" para que pueda iniciar sesión.
                </p>
                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
                ) : (
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger id="linkedUser">
                      <SelectValue placeholder="Sin usuario vinculado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin usuario vinculado</SelectItem>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
            </Button>
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
