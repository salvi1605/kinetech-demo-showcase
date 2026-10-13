import { useEffect, useState } from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeArPhoneForWhatsApp, buildWhatsAppUrl } from '@/utils/whatsapp';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  patientPhone?: string | null;
  message: string;
  /** Texto del botón principal (ej. «Abrir WhatsApp y seguir con email»). */
  confirmLabel?: string;
  /** Se llama después de abrir wa.me (para encadenar el email en «Ambos»). */
  onOpened?: () => void;
}

export const WhatsAppMessageDialog = ({
  open,
  onOpenChange,
  title,
  patientPhone,
  message,
  confirmLabel = 'Abrir WhatsApp',
  onOpened,
}: Props) => {
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (open) setPhone(patientPhone?.trim() || '');
  }, [open, patientPhone]);

  const original = patientPhone?.trim() || '';
  const normalized = normalizeArPhoneForWhatsApp(phone);
  const hasOverride = phone.trim() !== '' && phone.trim() !== original;

  const handleOpen = () => {
    if (!normalized) return;
    window.open(buildWhatsAppUrl(normalized, message), '_blank', 'noopener,noreferrer');
    onOpenChange(false);
    onOpened?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-whatsapp" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Se abre WhatsApp con el mensaje escrito. Nada se envía solo: revisalo y envialo desde WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wa-phone">Teléfono</Label>
            <Input
              id="wa-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 11 1234-5678"
              autoComplete="off"
              aria-invalid={!normalized}
              aria-describedby="wa-phone-help"
            />
            <div id="wa-phone-help" className="space-y-1">
              {!normalized ? (
                <p className="text-xs text-destructive">
                  {phone.trim() ? 'El número no es válido.' : 'El paciente no tiene teléfono. Ingresá uno para este envío.'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Se enviará a +{normalized}</p>
              )}
              {hasOverride && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  ⚠️ Este número se usa <strong>solo para este envío</strong>. No actualiza la ficha del paciente.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-preview">Mensaje</Label>
            <div
              id="wa-preview"
              className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap"
            >
              {message}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleOpen}
            disabled={!normalized}
            className="min-h-[44px] gap-2 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
