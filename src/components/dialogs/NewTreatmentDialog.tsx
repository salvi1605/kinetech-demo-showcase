import { useState } from 'react';
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

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  defaultDurationMinutes: z.coerce.number().min(5, 'Mínimo 5 minutos').max(480, 'Máximo 480 minutos'),
  maxConcurrent: z.coerce.number().min(1, 'Mínimo 1').max(10, 'Máximo 10'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewTreatmentDialog = ({ open, onOpenChange }: Props) => {
  const { state } = useApp();
  const { toast } = useToast();
  const [selectedPractitioners, setSelectedPractitioners] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', defaultDurationMinutes: 30, maxConcurrent: 2 },
  });

  const togglePractitioner = (id: string) => {
    setSelectedPractitioners(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: FormValues) => {
    if (!state.currentClinicId) return;
    setSaving(true);

    try {
      // Insert treatment type
      const { data: tt, error: ttErr } = await supabase
        .from('treatment_types')
        .insert({
          clinic_id: state.currentClinicId,
          name: data.name,
          default_duration_minutes: data.defaultDurationMinutes,
          max_concurrent: data.maxConcurrent,
        } as any)
        .select('id')
        .single();

      if (ttErr) throw ttErr;

      // Update description separately since it may not be in generated types yet
      if (data.description) {
        await supabase
          .from('treatment_types')
          .update({ description: data.description } as any)
          .eq('id', tt.id);
      }

      // Insert practitioner links
      if (selectedPractitioners.length > 0) {
        const links = selectedPractitioners.map(pid => ({
          practitioner_id: pid,
          treatment_type_id: tt.id,
          clinic_id: state.currentClinicId!,
        }));

        const { error: linkErr } = await supabase
          .from('practitioner_treatments' as any)
          .insert(links);

        if (linkErr) throw linkErr;
      }

      toast({ title: 'Tratamiento creado', description: `"${data.name}" se creó correctamente` });
      form.reset();
      setSelectedPractitioners([]);
      window.dispatchEvent(new Event('treatmentUpdated'));
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'No se pudo crear el tratamiento', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Tratamiento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl><Input placeholder="Ej: FKT, Drenaje linfático..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Breve descripción del tratamiento..." {...field} /></FormControl>
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

            <FormField control={form.control} name="maxConcurrent" render={({ field }) => (
              <FormItem>
                <FormLabel>Pacientes simultáneos *</FormLabel>
                <FormControl><Input type="number" min={1} max={10} {...field} /></FormControl>
                {Number(field.value) === 1 && (
                  <p className="text-xs text-amber-600 font-medium">⚠ Exclusivo: el profesional no podrá atender otros pacientes en el mismo horario.</p>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {/* Practitioners multi-select */}
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
                <p className="text-xs text-muted-foreground">Si no seleccionás ninguno, todos los profesionales podrán realizar este tratamiento.</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear tratamiento'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
