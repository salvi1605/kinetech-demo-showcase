import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnlinkedPractitioners } from '@/hooks/useUnlinkedPractitioners';

interface LinkPractitionerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  clinicId: string;
  onSuccess: () => void;
}

export function LinkPractitionerModal({
  open,
  onOpenChange,
  userId,
  userName,
  clinicId,
  onSuccess,
}: LinkPractitionerModalProps) {
  const { practitioners, loading: loadingPractitioners } = useUnlinkedPractitioners(clinicId);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLink = async () => {
    if (!selectedPractitionerId) {
      toast.error('Selecciona un profesional');
      return;
    }

    setIsSubmitting(true);
    try {
      // Verificar que el practitioner no tenga ya un user_id
      const { data: existing, error: checkError } = await supabase
        .from('practitioners')
        .select('user_id')
        .eq('id', selectedPractitionerId)
        .single();

      if (checkError) throw checkError;

      if (existing?.user_id) {
        toast.error('Este profesional ya está vinculado a otro usuario');
        return;
      }

      // Verificar que el usuario no esté ya vinculado a otro practitioner
      const { data: existingLink, error: linkCheckError } = await supabase
        .from('practitioners')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('user_id', userId)
        .maybeSingle();

      if (linkCheckError) throw linkCheckError;

      if (existingLink) {
        toast.error('Este usuario ya está vinculado a otro profesional');
        return;
      }

      // Vincular
      const { error: updateError } = await supabase
        .from('practitioners')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('id', selectedPractitionerId);

      if (updateError) throw updateError;

      toast.success('Profesional vinculado exitosamente');
      window.dispatchEvent(new Event('practitionerUpdated'));
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error linking practitioner:', error);
      toast.error(error.message || 'Error al vincular profesional');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular a Profesional
          </DialogTitle>
          <DialogDescription>
            Vincula al usuario <strong>{userName}</strong> con un profesional de la clínica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="practitioner">Seleccionar Profesional</Label>
            {loadingPractitioners ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando profesionales...
              </div>
            ) : practitioners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay profesionales disponibles para vincular en esta clínica.
              </p>
            ) : (
              <Select
                value={selectedPractitionerId}
                onValueChange={setSelectedPractitionerId}
              >
                <SelectTrigger id="practitioner">
                  <SelectValue placeholder="Seleccionar profesional..." />
                </SelectTrigger>
                <SelectContent>
                  {practitioners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name} {p.specialty && `(${p.specialty})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleLink}
            disabled={isSubmitting || !selectedPractitionerId || practitioners.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              'Vincular'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
