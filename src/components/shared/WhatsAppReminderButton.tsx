import { useId } from 'react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  normalizeArPhoneForWhatsApp,
  buildWhatsAppReminderMessage,
  buildWhatsAppUrl,
} from '@/utils/whatsapp';

interface Props {
  phone?: string | null;
  whatsappConsent: boolean;
  patientFirstName?: string | null;
  clinicName?: string | null;
  practitionerName?: string | null;
  appointment?: { date: string; startTime: string } | null;
  /** Motivo extra de bloqueo (ej. turno cancelado o pasado). */
  extraBlockedReason?: string | null;
  showReason?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export const getWhatsAppBlockedReason = (
  phone: string | null | undefined,
  whatsappConsent: boolean,
): string | null => {
  if (!whatsappConsent) return 'El paciente no autorizó recibir WhatsApp. Habilítalo desde su ficha.';
  if (!normalizeArPhoneForWhatsApp(phone)) return 'El paciente no tiene un teléfono válido. Cárgalo desde su ficha.';
  return null;
};

export const WhatsAppReminderButton = ({
  phone,
  whatsappConsent,
  patientFirstName,
  clinicName,
  practitionerName,
  appointment,
  extraBlockedReason,
  showReason = true,
  size = 'default',
  className,
}: Props) => {
  const reasonId = useId();
  const blockedReason =
    getWhatsAppBlockedReason(phone, whatsappConsent) ||
    extraBlockedReason ||
    (!appointment ? 'No hay un turno para recordar.' : null);

  const handleClick = () => {
    const normalized = normalizeArPhoneForWhatsApp(phone);
    if (!normalized || !appointment || blockedReason) return;
    const text = buildWhatsAppReminderMessage({
      patientFirstName,
      clinicName,
      date: appointment.date,
      startTime: appointment.startTime,
      practitionerName,
    });
    window.open(buildWhatsAppUrl(normalized, text), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        onClick={handleClick}
        disabled={!!blockedReason}
        title={blockedReason ?? 'Abrir WhatsApp con el recordatorio pre-armado'}
        aria-label="Enviar recordatorio por WhatsApp"
        aria-describedby={blockedReason && showReason ? reasonId : undefined}
        className={cn(
          'min-h-[44px] gap-2 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90',
          className,
        )}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        WhatsApp
      </Button>
      {blockedReason && showReason && (
        <p id={reasonId} role="note" className="w-full flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          WhatsApp: {blockedReason}
        </p>
      )}
    </>
  );
};
