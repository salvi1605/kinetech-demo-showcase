import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { HolidayRow } from '@/hooks/useScheduleExceptions';

const holidaySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  date: z.date({ required_error: 'La fecha es requerida' }),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

interface NewHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHoliday?: HolidayRow | null;
}

export const NewHolidayDialog = ({ open, onOpenChange, editingHoliday }: NewHolidayDialogProps) => {
  const { state } = useApp();
  const { toast } = useToast();

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { name: '', date: undefined },
  });

  // Populate when editing
  if (editingHoliday && open && !form.formState.isDirty) {
    form.reset({
      name: editingHoliday.name,
      date: new Date(editingHoliday.date + 'T12:00:00'),
    });
  }

  const onSubmit = async (data: HolidayFormValues) => {
    if (!state.currentClinicId) return;

    try {
      const dateISO = format(data.date, 'yyyy-MM-dd');

      if (editingHoliday) {
        const { error } = await supabase
          .from('holiday_calendar')
          .update({ name: data.name, date: dateISO })
          .eq('id', editingHoliday.id);
        if (error) throw error;
        toast({ title: 'Feriado actualizado' });
      } else {
        const { error } = await supabase
          .from('holiday_calendar')
          .insert({
            clinic_id: state.currentClinicId,
            name: data.name,
            date: dateISO,
            country_code: 'AR',
          });
        if (error) throw error;
        toast({ title: 'Feriado agregado' });
      }

      window.dispatchEvent(new Event('exceptionsUpdated'));
      form.reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving holiday:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {editingHoliday ? 'Editar Feriado' : 'Agregar Feriado'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del feriado</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Día de la Independencia" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
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
                          {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccionar fecha'}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingHoliday ? 'Actualizar' : 'Agregar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
