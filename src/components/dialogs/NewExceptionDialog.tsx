import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, eachDayOfInterval, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, AlertTriangle, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TimePicker } from '@/components/shared/TimePicker';
import { KinesioCombobox } from '@/components/shared/KinesioCombobox';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { ScheduleExceptionRow } from '@/hooks/useScheduleExceptions';

const EXCEPTION_TYPES = [
  { value: 'clinic_closed', label: 'Día cerrado (clínica)' },
  { value: 'practitioner_block', label: 'Bloqueo profesional' },
  { value: 'extended_hours', label: 'Horario extendido' },
] as const;

const MAX_RANGE_DAYS = 90;

const exceptionSchema = z.object({
  type: z.enum(['clinic_closed', 'practitioner_block', 'extended_hours']),
  dateFrom: z.date({ required_error: 'La fecha inicio es requerida' }),
  dateTo: z.date().optional().nullable(),
  practitionerId: z.string().optional(),
  fromTime: z.string().optional(),
  toTime: z.string().optional(),
  reason: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.dateTo && data.dateFrom && data.dateTo < data.dateFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fecha fin debe ser igual o posterior a fecha inicio',
      path: ['dateTo'],
    });
  }
  if (data.dateTo && data.dateFrom && differenceInCalendarDays(data.dateTo, data.dateFrom) > MAX_RANGE_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `El rango máximo es de ${MAX_RANGE_DAYS} días`,
      path: ['dateTo'],
    });
  }
  if (data.type === 'practitioner_block' && !data.practitionerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecciona un profesional',
      path: ['practitionerId'],
    });
  }
  if (data.type === 'extended_hours') {
    if (!data.fromTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hora inicio requerida', path: ['fromTime'] });
    }
    if (!data.toTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hora fin requerida', path: ['toTime'] });
    }
    if (data.fromTime && data.toTime && data.fromTime >= data.toTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hora fin debe ser mayor a hora inicio', path: ['toTime'] });
    }
  }
  if (data.type === 'practitioner_block' && data.fromTime && data.toTime && data.fromTime >= data.toTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hora fin debe ser mayor a hora inicio', path: ['toTime'] });
  }
});

type ExceptionFormValues = z.infer<typeof exceptionSchema>;

interface NewExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingException?: ScheduleExceptionRow | null;
}

export const NewExceptionDialog = ({ open, onOpenChange, editingException }: NewExceptionDialogProps) => {
  const { state } = useApp();
  const { toast } = useToast();
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!editingException;

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(exceptionSchema),
    defaultValues: {
      type: 'clinic_closed',
      reason: '',
      practitionerId: '',
      fromTime: '',
      toTime: '',
      dateTo: null,
    },
  });

  const watchType = form.watch('type');
  const watchDateFrom = form.watch('dateFrom');
  const watchDateTo = form.watch('dateTo');
  const watchPractitionerId = form.watch('practitionerId');

  const rangeDayCount = watchDateFrom && watchDateTo
    ? differenceInCalendarDays(watchDateTo, watchDateFrom) + 1
    : null;

  // Populate form when editing
  useEffect(() => {
    if (editingException && open) {
      form.reset({
        type: editingException.type as ExceptionFormValues['type'],
        dateFrom: new Date(editingException.date + 'T12:00:00'),
        dateTo: null,
        practitionerId: editingException.practitioner_id || '',
        fromTime: editingException.from_time?.substring(0, 5) || '',
        toTime: editingException.to_time?.substring(0, 5) || '',
        reason: editingException.reason || '',
      });
    } else if (open) {
      form.reset({
        type: 'clinic_closed',
        reason: '',
        practitionerId: '',
        fromTime: '',
        toTime: '',
        dateTo: null,
      });
    }
  }, [editingException, open, form]);

  // Check affected appointments when date/type/practitioner changes
  useEffect(() => {
    const checkAffected = async () => {
      if (!watchDateFrom || !state.currentClinicId) {
        setAffectedCount(null);
        return;
      }
      if (watchType !== 'clinic_closed' && watchType !== 'practitioner_block') {
        setAffectedCount(null);
        return;
      }

      const dateFromISO = format(watchDateFrom, 'yyyy-MM-dd');
      const dateToISO = watchDateTo ? format(watchDateTo, 'yyyy-MM-dd') : dateFromISO;

      let query = supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', state.currentClinicId)
        .gte('date', dateFromISO)
        .lte('date', dateToISO)
        .in('status', ['scheduled', 'confirmed']);

      if (watchType === 'practitioner_block' && watchPractitionerId) {
        query = query.eq('practitioner_id', watchPractitionerId);
      }

      const { count } = await query;
      setAffectedCount(count ?? 0);
    };

    checkAffected();
  }, [watchDateFrom, watchDateTo, watchType, watchPractitionerId, state.currentClinicId]);

  const practitionerOptions = state.practitioners.map(p => ({
    value: p.id,
    label: p.name,
  }));

  const onSubmit = async (data: ExceptionFormValues) => {
    if (!state.currentClinicId) return;

    setIsSaving(true);
    try {
      const basePayload = {
        clinic_id: state.currentClinicId,
        type: data.type,
        practitioner_id: data.type === 'clinic_closed' ? null : (data.practitionerId || null),
        from_time: data.type === 'clinic_closed' ? null : (data.fromTime || null),
        to_time: data.type === 'clinic_closed' ? null : (data.toTime || null),
        reason: data.reason || null,
      };

      if (isEditing) {
        const dateISO = format(data.dateFrom, 'yyyy-MM-dd');
        const { error } = await supabase
          .from('schedule_exceptions')
          .update({ ...basePayload, date: dateISO })
          .eq('id', editingException!.id);
        if (error) throw error;
        toast({ title: 'Excepción actualizada' });
      } else {
        const endDate = data.dateTo || data.dateFrom;
        const dates = eachDayOfInterval({ start: data.dateFrom, end: endDate });
        const payloads = dates.map(d => ({
          ...basePayload,
          date: format(d, 'yyyy-MM-dd'),
        }));

        const { error } = await supabase
          .from('schedule_exceptions')
          .insert(payloads);
        if (error) throw error;

        toast({
          title: dates.length === 1
            ? 'Excepción creada'
            : `${dates.length} excepciones creadas`,
        });
      }

      window.dispatchEvent(new Event('exceptionsUpdated'));
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving exception:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Excepción' : 'Nueva Excepción'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de excepción</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXCEPTION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha inicio */}
            <div className={cn("grid gap-4", isEditing ? "grid-cols-1" : "grid-cols-2")}>
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{isEditing ? 'Fecha' : 'Fecha inicio'}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccionar'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fecha fin (solo en creación) */}
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="dateTo"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha fin (opcional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccionar'}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={(date) => field.onChange(date ?? null)}
                            disabled={(date) => watchDateFrom ? date < watchDateFrom : false}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Info: cuántas excepciones se crearán */}
            {!isEditing && rangeDayCount && rangeDayCount > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                <span>Se crearán <strong className="text-foreground">{rangeDayCount}</strong> excepciones (una por día)</span>
              </div>
            )}

            {/* Profesional (visible for practitioner_block and extended_hours) */}
            {watchType !== 'clinic_closed' && (
              <FormField
                control={form.control}
                name="practitionerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Profesional {watchType === 'practitioner_block' ? '(obligatorio)' : '(opcional)'}
                    </FormLabel>
                    <FormControl>
                      <KinesioCombobox
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || '')}
                        options={practitionerOptions}
                        placeholder="Seleccionar profesional"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Rango horario (visible for practitioner_block and extended_hours) */}
            {watchType !== 'clinic_closed' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Desde {watchType === 'extended_hours' ? '(obligatorio)' : '(opcional)'}
                      </FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="08:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Hasta {watchType === 'extended_hours' ? '(obligatorio)' : '(opcional)'}
                      </FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="18:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Motivo */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Ej: Feriado, vacaciones, mantenimiento..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning: affected appointments */}
            {affectedCount !== null && affectedCount > 0 && (
              <Alert variant="default" className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Hay <strong>{affectedCount}</strong> cita(s) programada(s) {rangeDayCount && rangeDayCount > 1 ? 'en este rango de fechas' : 'para esta fecha'}.
                  No se cancelarán automáticamente.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : rangeDayCount && rangeDayCount > 1 ? `Crear ${rangeDayCount} excepciones` : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
