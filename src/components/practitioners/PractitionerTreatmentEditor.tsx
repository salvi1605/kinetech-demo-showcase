import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTreatments } from '@/hooks/useTreatments';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';

interface PractitionerTreatmentEditorProps {
  /** IDs of currently assigned treatment_types */
  selectedTreatmentIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Allows selecting treatments from DB and creating new ones inline.
 * Used inside NewProfessionalDialog and EditProfessionalDialog.
 */
export const PractitionerTreatmentEditor = ({
  selectedTreatmentIds,
  onChange,
}: PractitionerTreatmentEditorProps) => {
  const { state } = useApp();
  const { treatments, loading, refetch } = useTreatments();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [creating, setCreating] = useState(false);

  const activeTreatments = treatments.filter(t => t.is_active);

  const toggleTreatment = (id: string) => {
    if (selectedTreatmentIds.includes(id)) {
      onChange(selectedTreatmentIds.filter(tid => tid !== id));
    } else {
      onChange([...selectedTreatmentIds, id]);
    }
  };

  const handleCreateNew = async () => {
    if (!newName.trim() || !state.currentClinicId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('treatment_types')
        .insert({
          clinic_id: state.currentClinicId,
          name: newName.trim(),
          default_duration_minutes: newDuration,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Auto-select the new treatment
      onChange([...selectedTreatmentIds, data.id]);
      setNewName('');
      setNewDuration(30);
      setShowNewForm(false);
      refetch();
      window.dispatchEvent(new Event('treatmentUpdated'));

      toast({ title: 'Tratamiento creado', description: `"${newName.trim()}" fue agregado` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo crear', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tratamientos que realiza</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => setShowNewForm(!showNewForm)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </Button>
      </div>

      {/* Inline new treatment form */}
      {showNewForm && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ej: RPG"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duración (min)</Label>
              <Input
                type="number"
                value={newDuration}
                onChange={e => setNewDuration(Number(e.target.value))}
                min={5}
                step={5}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleCreateNew} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Crear
            </Button>
          </div>
        </div>
      )}

      {/* Treatment checklist */}
      {activeTreatments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay tratamientos configurados. Creá uno nuevo.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
          {activeTreatments.map(t => (
            <label
              key={t.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedTreatmentIds.includes(t.id)}
                onCheckedChange={() => toggleTreatment(t.id)}
              />
              <span className="text-sm">{t.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{t.default_duration_minutes} min</span>
            </label>
          ))}
        </div>
      )}

      {/* Selected summary */}
      {selectedTreatmentIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTreatmentIds.map(id => {
            const t = treatments.find(tr => tr.id === id);
            return t ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                {t.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleTreatment(id)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Si no se selecciona ninguno, el profesional podrá atender todos los tratamientos.
      </p>
    </div>
  );
};
