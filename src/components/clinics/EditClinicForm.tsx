import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { TimePicker } from '@/components/shared/TimePicker';

const editClinicSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  country_code: z.string().min(1, 'País requerido'),
  timezone: z.string().min(1, 'Zona horaria requerida'),
  default_locale: z.string().min(1, 'Idioma requerido'),
  default_currency: z.string().min(1, 'Moneda requerida'),
  is_active: z.boolean(),
  min_slot_minutes: z.number().min(15).max(60),
  sub_slots_per_block: z.number().min(1, 'Mínimo 1').max(10, 'Máximo 10'),
  workday_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido (HH:mm)'),
  workday_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido (HH:mm)'),
  allow_professional_self_block: z.boolean(),
  auto_mark_no_show: z.boolean(),
  auto_mark_no_show_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido (HH:mm)'),
});

type EditClinicFormData = z.infer<typeof editClinicSchema>;

interface Clinic {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string;
  default_locale: string | null;
  default_currency: string | null;
  is_active: boolean | null;
}

interface ClinicSettings {
  id: string;
  clinic_id: string;
  min_slot_minutes: number | null;
  sub_slots_per_block: number | null;
  workday_start: string | null;
  workday_end: string | null;
  allow_professional_self_block: boolean | null;
  auto_mark_no_show: boolean | null;
  auto_mark_no_show_time: string | null;
}

interface EditClinicFormProps {
  clinic: Clinic;
  settings: ClinicSettings | null;
  onSuccess: () => void;
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

export function EditClinicForm({ clinic, settings, onSuccess }: EditClinicFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<EditClinicFormData>({
    resolver: zodResolver(editClinicSchema),
    values: {
      name: clinic.name,
      country_code: clinic.country_code || 'AR',
      timezone: clinic.timezone,
      default_locale: clinic.default_locale || 'es',
      default_currency: clinic.default_currency || 'ARS',
      is_active: clinic.is_active ?? true,
      min_slot_minutes: settings?.min_slot_minutes || 30,
      sub_slots_per_block: settings?.sub_slots_per_block ?? 5,
      workday_start: settings?.workday_start || '08:00',
      workday_end: settings?.workday_end || '19:00',
      allow_professional_self_block: settings?.allow_professional_self_block ?? true,
      auto_mark_no_show: settings?.auto_mark_no_show ?? true,
      auto_mark_no_show_time: settings?.auto_mark_no_show_time || '00:00',
    },
  });

  // Asegurar formato HH:mm (5 caracteres) antes de guardar
  const formatTimeValue = (value: string | undefined, defaultValue: string): string => {
    if (!value) return defaultValue;
    const parts = value.split(':');
    if (parts.length >= 2) {
      const hours = String(Math.min(23, parseInt(parts[0] || '0', 10))).padStart(2, '0');
      const minutes = String(Math.min(59, parseInt(parts[1] || '0', 10))).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return defaultValue;
  };

  const onSubmit = async (data: EditClinicFormData) => {
    setIsSaving(true);
    try {
      // Normalizar valores de hora antes de guardar
      const workday_start = formatTimeValue(data.workday_start, "08:00");
      const workday_end = formatTimeValue(data.workday_end, "19:00");
      const auto_mark_no_show_time = formatTimeValue(data.auto_mark_no_show_time, "00:00");

      // Update clinic
      const { error: clinicError } = await supabase
        .from('clinics')
        .update({
          name: data.name,
          country_code: data.country_code,
          timezone: data.timezone,
          default_locale: data.default_locale,
          default_currency: data.default_currency,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinic.id);

      if (clinicError) throw clinicError;

      // Upsert clinic settings
      const { error: settingsError } = await supabase
        .from('clinic_settings')
        .upsert({
          clinic_id: clinic.id,
          min_slot_minutes: data.min_slot_minutes,
          sub_slots_per_block: data.sub_slots_per_block,
          workday_start,
          workday_end,
          allow_professional_self_block: data.allow_professional_self_block,
          auto_mark_no_show: data.auto_mark_no_show,
          auto_mark_no_show_time,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'clinic_id'
        });

      if (settingsError) throw settingsError;

      toast.success('Configuración guardada correctamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving clinic:', error);
      toast.error(error.message || 'Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Clínica</CardTitle>
            <CardDescription>
              Datos básicos y configuración regional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Clínica</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
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
                    <FormLabel>Zona Horaria</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Estado de la Clínica</FormLabel>
                    <FormDescription>
                      {field.value ? 'Clínica activa' : 'Clínica inactiva'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configuración de Agenda */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Agenda</CardTitle>
            <CardDescription>
              Parámetros de funcionamiento de la agenda de turnos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="min_slot_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración de Bloque Base (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      max={60}
                      step={15}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Duración estándar de cada bloque de tiempo (recomendado: 30)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sub_slots_per_block"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-slots por Bloque</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Número de citas simultáneas permitidas en cada bloque de 30 minutos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="workday_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value || "08:00"}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Primera hora disponible para turnos (formato 24h: 08:00)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workday_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value || "19:00"}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Última hora de inicio permitida (formato 24h: 19:00)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="allow_professional_self_block"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Autobloqueo de Profesionales</FormLabel>
                    <FormDescription>
                      Permitir que los profesionales bloqueen sus propios horarios
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_mark_no_show"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-marcar No Asistió</FormLabel>
                    <FormDescription>
                      Marcar automáticamente turnos como "No Asistió" a cierta hora
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('auto_mark_no_show') && (
              <FormField
                control={form.control}
                name="auto_mark_no_show_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Auto-marcado</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value || "00:00"}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Hora del día para ejecutar el auto-marcado (formato 24h: 00:00 = medianoche)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Configuración
          </Button>
        </div>
      </form>
    </Form>
  );
}
