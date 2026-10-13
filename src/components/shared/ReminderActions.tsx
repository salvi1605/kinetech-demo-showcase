import { useEffect, useMemo, useState } from 'react';
import { Bell, FileText, CalendarDays, MessageCircle, Mail, Layers, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WhatsAppMessageDialog } from '@/components/dialogs/WhatsAppMessageDialog';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import {
  buildWhatsAppReminderMessage,
  buildWhatsAppAppointmentInfoMessage,
  buildWhatsAppUpcomingMessage,
  type WhatsAppUpcomingItem,
} from '@/utils/whatsapp';

export type ReminderChannel = 'whatsapp' | 'email' | 'both';
export type ReminderAction = 'reminder' | 'info' | 'upcoming';

export interface ReminderAppointment {
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime?: string | null;
  practitionerName?: string | null;
  treatmentName?: string | null;
}

interface Props {
  patientFirstName?: string | null;
  patientPhone?: string | null;
  whatsappConsent: boolean;
  /** Motivo por el que el canal email no está disponible (clínica, consentimiento, sin email). */
  emailBlockedReason: string | null;
  /** Turno que usan «recordatorio» e «info». */
  appointment: ReminderAppointment | null;
  /** Motivo por el que no se puede usar el turno (cancelado, pasado, sin turno futuro). */
  appointmentBlockedReason?: string | null;
  upcoming: WhatsAppUpcomingItem[];
  /** El padre abre el diálogo de email correspondiente. */
  onEmail: (action: ReminderAction) => void;
}

const ACTIONS: { key: ReminderAction; label: string; icon: typeof Bell; waTitle: string }[] = [
  { key: 'reminder', label: 'Enviar recordatorio', icon: Bell, waTitle: 'Recordatorio por WhatsApp' },
  { key: 'info', label: 'Enviar info de cita', icon: FileText, waTitle: 'Info del turno por WhatsApp' },
  { key: 'upcoming', label: 'Enviar próximos turnos', icon: CalendarDays, waTitle: 'Próximos turnos por WhatsApp' },
];

const WA_CONSENT_REASON = 'El paciente no autorizó recibir WhatsApp. Habilitalo desde su ficha.';

export const ReminderActions = ({
  patientFirstName,
  patientPhone,
  whatsappConsent,
  emailBlockedReason,
  appointment,
  appointmentBlockedReason,
  upcoming,
  onEmail,
}: Props) => {
  const { state } = useApp();
  const [channel, setChannel] = useState<ReminderChannel>(whatsappConsent || emailBlockedReason ? 'whatsapp' : 'email');
  const [waAction, setWaAction] = useState<ReminderAction | null>(null);
  const [clinicAddress, setClinicAddress] = useState<string | null>(null);

  const clinicName = state.currentClinicName;

  useEffect(() => {
    if (waAction !== 'info' || !state.currentClinicId) return;
    let mounted = true;
    supabase
      .from('clinics')
      .select('address')
      .eq('id', state.currentClinicId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setClinicAddress((data as { address: string | null } | null)?.address ?? null);
      });
    return () => {
      mounted = false;
    };
  }, [waAction, state.currentClinicId]);

  const waReason = whatsappConsent ? null : WA_CONSENT_REASON;
  const channelReason =
    channel === 'whatsapp' ? waReason : channel === 'email' ? emailBlockedReason : waReason || emailBlockedReason;

  const actionReason = (a: ReminderAction): string | null => {
    if (channelReason) return channelReason;
    if (a === 'upcoming') return upcoming.length === 0 ? 'El paciente no tiene turnos futuros.' : null;
    if (!appointment) return 'No hay un turno para enviar.';
    return appointmentBlockedReason ?? null;
  };

  const message = useMemo(() => {
    if (!waAction) return '';
    if (waAction === 'upcoming') return buildWhatsAppUpcomingMessage({ patientFirstName, clinicName, items: upcoming });
    if (!appointment) return '';
    const base = { patientFirstName, clinicName, ...appointment };
    return waAction === 'reminder'
      ? buildWhatsAppReminderMessage(base)
      : buildWhatsAppAppointmentInfoMessage({ ...base, clinicAddress });
  }, [waAction, patientFirstName, clinicName, upcoming, appointment, clinicAddress]);

  const handleAction = (a: ReminderAction) => {
    if (actionReason(a)) return;
    if (channel === 'email') onEmail(a);
    else setWaAction(a);
  };

  const currentWa = ACTIONS.find((x) => x.key === waAction);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={channel}
          onValueChange={(v) => v && setChannel(v as ReminderChannel)}
          aria-label="Canal de envío"
          className="rounded-md border bg-background p-1"
        >
          <ToggleGroupItem value="whatsapp" className="min-h-[44px] gap-1.5 px-3" aria-label="WhatsApp">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </ToggleGroupItem>
          <ToggleGroupItem value="email" className="min-h-[44px] gap-1.5 px-3" aria-label="Email">
            <Mail className="h-4 w-4" aria-hidden="true" /> Email
          </ToggleGroupItem>
          <ToggleGroupItem value="both" className="min-h-[44px] gap-1.5 px-3" aria-label="Ambos">
            <Layers className="h-4 w-4" aria-hidden="true" /> Ambos
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-2" role="group" aria-label="Acciones de envío">
          {ACTIONS.map(({ key, label, icon: Icon }) => {
            const reason = actionReason(key);
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  {/* span para que el tooltip funcione con el botón deshabilitado */}
                  <span tabIndex={reason ? 0 : -1} aria-label={reason ? `${label}: ${reason}` : undefined}>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={() => handleAction(key)}
                      disabled={!!reason}
                      aria-label={label}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{reason ? `${label} — ${reason}` : label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {channelReason && (
        <p role="note" className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {channel === 'both' ? (waReason ? 'WhatsApp: ' : 'Email: ') : ''}
          {channelReason}
        </p>
      )}

      <WhatsAppMessageDialog
        open={!!waAction}
        onOpenChange={(o) => !o && setWaAction(null)}
        title={currentWa?.waTitle ?? 'WhatsApp'}
        patientPhone={patientPhone}
        message={message}
        confirmLabel={channel === 'both' ? 'Abrir WhatsApp y seguir con email' : 'Abrir WhatsApp'}
        onOpened={channel === 'both' && waAction ? ((a) => () => onEmail(a))(waAction) : undefined}
      />
    </div>
  );
};
