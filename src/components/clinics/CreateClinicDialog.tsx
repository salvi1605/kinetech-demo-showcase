import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const createClinicSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  country_code: z.string().min(1, 'País requerido'),
  timezone: z.string().min(1, 'Zona horaria requerida'),
  default_currency: z.string().min(1, 'Moneda requerida'),
});

type CreateClinicFormData = z.infer<typeof createClinicSchema>;

interface CreateClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (clinicId: string) => void;
}

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina - Buenos Aires' },
  { value: 'America/Toronto', label: 'Canadá - Toronto' },
  { value: 'America/Vancouver', label: 'Canadá - Vancouver' },
  { value: 'America/New_York', label: 'EE.UU. - Nueva York' },
  { value: 'America/Los_Angeles', label: 'EE.UU. - Los Ángeles' },
  { value: 'America/Mexico_City', label: 'México - Ciudad de México' },
  { value: 'Europe/Madrid', label: 'España - Madrid' },
];

const COUNTRIES = [
  { value: 'AR', label: 'Argentina' },
  { value: 'CA', label: 'Canadá' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'MX', label: 'México' },
  { value: 'ES', label: 'España' },
];

const CURRENCIES = [
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
  { value: 'CAD', label: 'Dólar Canadiense (CAD)' },
  { value: 'USD', label: 'Dólar Estadounidense (USD)' },
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

export function CreateClinicDialog({ open, onOpenChange, onSuccess }: CreateClinicDialogProps) {
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<CreateClinicFormData>({
    resolver: zodResolver(createClinicSchema),
    defaultValues: {
      name: '',
      country_code: 'AR',
      timezone: 'America/Argentina/Buenos_Aires',
      default_currency: 'ARS',
    },
  });

  const onSubmit = async (data: CreateClinicFormData) => {
    setIsCreating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user record
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User record not found');

      // Create clinic
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: data.name,
          country_code: data.country_code,
          timezone: data.timezone,
          default_locale: 'es',
          default_currency: data.default_currency,
          is_active: true,
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Create default clinic settings
      const { error: settingsError } = await supabase
        .from('clinic_settings')
        .insert({
          clinic_id: clinic.id,
          min_slot_minutes: 30,
          workday_start: '08:00',
          workday_end: '19:00',
          allow_professional_self_block: true,
          auto_mark_no_show: true,
          auto_mark_no_show_time: '00:00',
        });

      if (settingsError) throw settingsError;

      // Assign current user as admin_clinic
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          clinic_id: clinic.id,
          role_id: 'admin_clinic',
          active: true,
        });

      if (roleError) throw roleError;

      form.reset();
      onSuccess(clinic.id);
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      toast.error(error.message || 'Error al crear clínica');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Clínica</DialogTitle>
          <DialogDescription>
            Completa los datos para crear una nueva clínica. Serás asignado automáticamente como administrador.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Clínica *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Clínica Buenos Aires" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona Horaria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Define la zona horaria para la gestión de turnos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Clínica
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
