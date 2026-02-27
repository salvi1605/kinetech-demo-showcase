import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import type { TreatmentWithPractitioners } from '@/hooks/useTreatments';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  defaultDurationMinutes: z.coerce.number().min(5).max(480),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment: TreatmentWithPractitioners | null;
}

export const EditTreatmentDialog = ({ open, onOpenChange, treatment }: Props) => {
  const { state } = useApp();
  const { toast } = useToast();
  const [selectedPractitioners, setSelectedPractitioners] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', defaultDurationMinutes: 30 },
  });

  useEffect(() => {
    if (treatment && open) {
      form.reset({
        name: treatment.name,
        description: treatment.description || '',
        defaultDurationMinutes: treatment.default_duration_minutes,
      });
      setSelectedPractitioners(treatment.practitioners.map(p => p.id));
    }
  }, [treatment, open, form]);

  const togglePractitioner = (id: string) => {
    setSelectedPractitioners(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: FormValues) => {
    if (!treatment || !state.currentClinicId) return;
    setSaving(true);

    try {
      // Update treatment_types
      const { error: upErr } = await supabase
        .from('treatment_types')
        .update({
          name: data.name,
          default_duration_minutes: data.defaultDurationMinutes,
          description: data.description || null,
        } as any)
        .eq('id', treatment.id);

      if (upErr) throw upErr;

      // Sync practitioner links: delete all then re-insert
      await supabase
        .from('practitioner_treatments' as any)
        .delete()
        .eq('treatment_type_id', treatment.id);

      if (selectedPractitioners.length > 0) {
        const links = selectedPractitioners.map(pid => ({
          practitioner_id: pid,
          treatment_type_id: treatment.id,
          clinic_id: state.currentClinicId!,
        }));

        const { error: linkErr } = await supabase
          .from('practitioner_treatments' as any)
          .insert(links);

        if (linkErr) throw linkErr;
      }

      toast({ title: 'Tratamiento actualizado', description: `"${data.name}" se actualizó correctamente` });
      window.dispatchEvent(new Event('treatmentUpdated'));
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!treatment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tratamiento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="defaultDurationMinutes" render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (min) *</FormLabel>
                <FormControl><Input type="number" min={5} max={480} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <Label>Profesionales que realizan este tratamiento</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {state.practitioners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay profesionales configurados</p>
                ) : (
                  state.practitioners.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <Checkbox
                        checked={selectedPractitioners.includes(p.id)}
                        onCheckedChange={() => togglePractitioner(p.id)}
                      />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#3b82f6' }} />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedPractitioners.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin profesionales asignados = todos pueden realizar este tratamiento.</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
